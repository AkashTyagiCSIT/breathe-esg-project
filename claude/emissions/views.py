from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Q
from .models import EmissionRecord, IngestionRun
from .serializers import EmissionRecordSerializer, IngestionRunSerializer
from tenants.models import Tenant


def get_tenant(request):
    membership = request.user.memberships.select_related('tenant').first()
    return membership.tenant if membership else None


class EmissionRecordListView(APIView):
    def get(self, request):
        tenant = get_tenant(request)
        if not tenant:
            return Response({'error': 'No tenant'}, status=400)

        qs = EmissionRecord.objects.filter(tenant=tenant)

        source = request.query_params.get('source')
        if source:
            qs = qs.filter(ingestion_run__source_type=source)

        scope = request.query_params.get('scope')
        if scope:
            qs = qs.filter(scope=scope)

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        suspicious = request.query_params.get('suspicious')
        if suspicious == 'true':
            qs = qs.filter(is_suspicious=True)

        serializer = EmissionRecordSerializer(qs.select_related('reviewed_by'), many=True)
        return Response(serializer.data)


class DashboardSummaryView(APIView):
    def get(self, request):
        tenant = get_tenant(request)
        if not tenant:
            return Response({'error': 'No tenant'}, status=400)

        records = EmissionRecord.objects.filter(tenant=tenant)

        total_co2e = records.aggregate(t=Sum('normalized_value_kg_co2e'))['t'] or 0
        scope_breakdown = {
            'scope_1': float(records.filter(scope=1).aggregate(t=Sum('normalized_value_kg_co2e'))['t'] or 0),
            'scope_2': float(records.filter(scope=2).aggregate(t=Sum('normalized_value_kg_co2e'))['t'] or 0),
            'scope_3': float(records.filter(scope=3).aggregate(t=Sum('normalized_value_kg_co2e'))['t'] or 0),
        }
        status_counts = {
            'pending': records.filter(status='pending').count(),
            'approved': records.filter(status='approved').count(),
            'flagged': records.filter(status='flagged').count(),
            'rejected': records.filter(status='rejected').count(),
            'suspicious': records.filter(is_suspicious=True).count(),
        }
        source_breakdown = {}
        for src in ['sap', 'utility', 'travel']:
            co2e = records.filter(ingestion_run__source_type=src).aggregate(t=Sum('normalized_value_kg_co2e'))['t'] or 0
            source_breakdown[src] = float(co2e)

        recent_runs = IngestionRun.objects.filter(tenant=tenant).order_by('-created_at')[:5]
        runs_data = IngestionRunSerializer(recent_runs, many=True).data

        return Response({
            'total_kg_co2e': float(total_co2e),
            'total_tonne_co2e': float(total_co2e) / 1000,
            'scope_breakdown': scope_breakdown,
            'status_counts': status_counts,
            'source_breakdown': source_breakdown,
            'recent_runs': runs_data,
        })


class IngestionRunListView(APIView):
    def get(self, request):
        tenant = get_tenant(request)
        if not tenant:
            return Response({'error': 'No tenant'}, status=400)
        runs = IngestionRun.objects.filter(tenant=tenant).order_by('-created_at')
        return Response(IngestionRunSerializer(runs, many=True).data)
