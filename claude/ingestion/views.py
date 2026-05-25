from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from tenants.models import Tenant
from emissions.models import IngestionRun, EmissionRecord
from audit.models import AuditLog
from .parsers import parse_sap_csv, parse_utility_csv, parse_travel_csv


def get_tenant(request):
    membership = request.user.memberships.select_related('tenant').first()
    if not membership:
        return None
    return membership.tenant


class IngestView(APIView):
    def post(self, request, source_type):
        tenant = get_tenant(request)
        if not tenant:
            return Response({'error': 'No tenant found for user'}, status=400)

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=400)

        file_content = file.read().decode('utf-8', errors='replace')
        run = IngestionRun.objects.create(
            tenant=tenant,
            source_type=source_type,
            uploaded_by=request.user,
            original_filename=file.name,
            status=IngestionRun.STATUS_PROCESSING,
        )

        AuditLog.objects.create(
            tenant=tenant,
            actor=request.user,
            action=AuditLog.ACTION_INGESTION_STARTED,
            target_model='IngestionRun',
            target_id=run.id,
            note=f"File: {file.name}",
        )

        parsers = {
            'sap': parse_sap_csv,
            'utility': parse_utility_csv,
            'travel': parse_travel_csv,
        }

        if source_type not in parsers:
            run.status = IngestionRun.STATUS_FAILED
            run.error_log = [f'Unknown source type: {source_type}']
            run.save()
            return Response({'error': 'Unknown source type'}, status=400)

        records_data, errors = parsers[source_type](file_content)

        created = []
        for r in records_data:
            record = EmissionRecord.objects.create(
                tenant=tenant,
                ingestion_run=run,
                **r,
            )
            AuditLog.objects.create(
                tenant=tenant,
                actor=request.user,
                action=AuditLog.ACTION_CREATED,
                target_model='EmissionRecord',
                target_id=record.id,
            )
            created.append(record.id)

        run.status = IngestionRun.STATUS_DONE
        run.total_rows = len(records_data) + len(errors)
        run.parsed_rows = len(records_data)
        run.failed_rows = len(errors)
        run.error_log = errors
        run.completed_at = timezone.now()
        run.save()

        AuditLog.objects.create(
            tenant=tenant,
            actor=request.user,
            action=AuditLog.ACTION_INGESTION_COMPLETED,
            target_model='IngestionRun',
            target_id=run.id,
            note=f"Parsed: {len(records_data)}, Failed: {len(errors)}",
        )

        return Response({
            'run_id': run.id,
            'parsed': len(records_data),
            'failed': len(errors),
            'errors': errors[:10],
        })
