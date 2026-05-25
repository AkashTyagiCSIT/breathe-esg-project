from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from emissions.models import EmissionRecord
from emissions.serializers import EmissionRecordSerializer
from audit.models import AuditLog
from tenants.models import Tenant


def get_tenant(request):
    membership = request.user.memberships.select_related('tenant').first()
    return membership.tenant if membership else None


class ReviewRecordView(APIView):
    def patch(self, request, pk):
        tenant = get_tenant(request)
        if not tenant:
            return Response({'error': 'No tenant'}, status=400)

        try:
            record = EmissionRecord.objects.get(pk=pk, tenant=tenant)
        except EmissionRecord.DoesNotExist:
            return Response({'error': 'Record not found'}, status=404)

        if record.is_locked:
            return Response({'error': 'Record is locked and cannot be modified'}, status=403)

        allowed_statuses = [
            EmissionRecord.STATUS_APPROVED,
            EmissionRecord.STATUS_FLAGGED,
            EmissionRecord.STATUS_REJECTED,
        ]

        new_status = request.data.get('status')
        note = request.data.get('reviewer_note', '')

        if new_status not in allowed_statuses:
            return Response({'error': f'Invalid status. Choose: {allowed_statuses}'}, status=400)

        before = {'status': record.status, 'reviewer_note': record.reviewer_note}

        record.status = new_status
        record.reviewer_note = note
        record.reviewed_by = request.user
        record.reviewed_at = timezone.now()

        if new_status == EmissionRecord.STATUS_APPROVED:
            record.is_locked = True
            record.locked_at = timezone.now()

        record.save()

        AuditLog.objects.create(
            tenant=tenant,
            actor=request.user,
            action=new_status,
            target_model='EmissionRecord',
            target_id=record.id,
            before_state=before,
            after_state={'status': new_status, 'reviewer_note': note},
            note=note,
        )

        return Response(EmissionRecordSerializer(record).data)


class BulkReviewView(APIView):
    def post(self, request):
        tenant = get_tenant(request)
        if not tenant:
            return Response({'error': 'No tenant'}, status=400)

        ids = request.data.get('ids', [])
        new_status = request.data.get('status')
        note = request.data.get('reviewer_note', '')

        allowed_statuses = ['approved', 'flagged', 'rejected']
        if new_status not in allowed_statuses:
            return Response({'error': 'Invalid status'}, status=400)

        records = EmissionRecord.objects.filter(pk__in=ids, tenant=tenant, is_locked=False)
        updated = 0
        for record in records:
            before = {'status': record.status}
            record.status = new_status
            record.reviewer_note = note
            record.reviewed_by = request.user
            record.reviewed_at = timezone.now()
            if new_status == 'approved':
                record.is_locked = True
                record.locked_at = timezone.now()
            record.save()
            AuditLog.objects.create(
                tenant=tenant,
                actor=request.user,
                action=new_status,
                target_model='EmissionRecord',
                target_id=record.id,
                before_state=before,
                after_state={'status': new_status},
            )
            updated += 1

        return Response({'updated': updated})
