from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Tenant, TenantMembership


class TenantInfoView(APIView):
    def get(self, request):
        membership = request.user.memberships.select_related('tenant').first()
        if not membership:
            return Response({'error': 'No tenant'}, status=404)
        return Response({
            'id': membership.tenant.id,
            'name': membership.tenant.name,
            'slug': membership.tenant.slug,
            'role': membership.role,
        })
