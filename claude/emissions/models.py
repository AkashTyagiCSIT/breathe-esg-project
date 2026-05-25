from django.db import models
from django.contrib.auth.models import User
from tenants.models import Tenant


class IngestionRun(models.Model):
    SOURCE_SAP = 'sap'
    SOURCE_UTILITY = 'utility'
    SOURCE_TRAVEL = 'travel'
    SOURCE_CHOICES = [
        (SOURCE_SAP, 'SAP Fuel & Procurement'),
        (SOURCE_UTILITY, 'Utility Electricity'),
        (SOURCE_TRAVEL, 'Corporate Travel'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_DONE = 'done'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_DONE, 'Done'),
        (STATUS_FAILED, 'Failed'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='ingestion_runs')
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    original_filename = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    total_rows = models.IntegerField(default=0)
    parsed_rows = models.IntegerField(default=0)
    failed_rows = models.IntegerField(default=0)
    error_log = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.source_type} run #{self.id} for {self.tenant.name}"


class EmissionRecord(models.Model):
    SCOPE_1 = 1
    SCOPE_2 = 2
    SCOPE_3 = 3
    SCOPE_CHOICES = [(1, 'Scope 1'), (2, 'Scope 2'), (3, 'Scope 3')]

    CATEGORY_FUEL = 'fuel'
    CATEGORY_PROCUREMENT = 'procurement'
    CATEGORY_ELECTRICITY = 'electricity'
    CATEGORY_FLIGHT = 'flight'
    CATEGORY_HOTEL = 'hotel'
    CATEGORY_GROUND = 'ground_transport'
    CATEGORY_CHOICES = [
        (CATEGORY_FUEL, 'Fuel Combustion'),
        (CATEGORY_PROCUREMENT, 'Procurement'),
        (CATEGORY_ELECTRICITY, 'Electricity'),
        (CATEGORY_FLIGHT, 'Flight'),
        (CATEGORY_HOTEL, 'Hotel Stay'),
        (CATEGORY_GROUND, 'Ground Transport'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_FLAGGED = 'flagged'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_FLAGGED, 'Flagged'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='emission_records')
    ingestion_run = models.ForeignKey(IngestionRun, on_delete=models.CASCADE, related_name='records')

    scope = models.IntegerField(choices=SCOPE_CHOICES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)

    activity_date = models.DateField()
    description = models.CharField(max_length=500, blank=True)
    location = models.CharField(max_length=255, blank=True)
    cost_center = models.CharField(max_length=100, blank=True)

    raw_value = models.DecimalField(max_digits=18, decimal_places=4)
    raw_unit = models.CharField(max_length=50)
    raw_source_row = models.JSONField()

    normalized_value_kg_co2e = models.DecimalField(max_digits=18, decimal_places=4)
    emission_factor_used = models.DecimalField(max_digits=18, decimal_places=6)
    emission_factor_source = models.CharField(max_length=255)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    is_suspicious = models.BooleanField(default=False)
    suspicious_reason = models.CharField(max_length=500, blank=True)

    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_records'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer_note = models.TextField(blank=True)

    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-activity_date']

    def __str__(self):
        return f"{self.category} | {self.normalized_value_kg_co2e} kgCO2e | {self.activity_date}"
