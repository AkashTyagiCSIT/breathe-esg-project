from django.db import models
from django.contrib.auth.models import User
from tenants.models import Tenant


class AuditLog(models.Model):
    ACTION_CREATED = 'created'
    ACTION_APPROVED = 'approved'
    ACTION_FLAGGED = 'flagged'
    ACTION_REJECTED = 'rejected'
    ACTION_EDITED = 'edited'
    ACTION_LOCKED = 'locked'
    ACTION_INGESTION_STARTED = 'ingestion_started'
    ACTION_INGESTION_COMPLETED = 'ingestion_completed'
    ACTION_CHOICES = [
        (ACTION_CREATED, 'Record Created'),
        (ACTION_APPROVED, 'Record Approved'),
        (ACTION_FLAGGED, 'Record Flagged'),
        (ACTION_REJECTED, 'Record Rejected'),
        (ACTION_EDITED, 'Record Edited'),
        (ACTION_LOCKED, 'Record Locked'),
        (ACTION_INGESTION_STARTED, 'Ingestion Started'),
        (ACTION_INGESTION_COMPLETED, 'Ingestion Completed'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='audit_logs')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    target_model = models.CharField(max_length=100)
    target_id = models.IntegerField()
    before_state = models.JSONField(null=True, blank=True)
    after_state = models.JSONField(null=True, blank=True)
    note = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.actor} — {self.action} on {self.target_model}#{self.target_id}"
