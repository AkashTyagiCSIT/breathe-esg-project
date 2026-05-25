from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'actor_username', 'action', 'target_model',
            'target_id', 'before_state', 'after_state', 'note', 'timestamp',
        ]


class AuditLogListView(APIView):
    def get(self, request):
        membership = request.user.memberships.select_related('tenant').first()
        if not membership:
            return Response({'error': 'No tenant'}, status=400)
        logs = AuditLog.objects.filter(tenant=membership.tenant).select_related('actor')[:100]
        return Response(AuditLogSerializer(logs, many=True).data)
