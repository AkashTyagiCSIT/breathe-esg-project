from rest_framework import serializers
from .models import EmissionRecord, IngestionRun


class EmissionRecordSerializer(serializers.ModelSerializer):
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)
    scope_label = serializers.CharField(source='get_scope_display', read_only=True)
    category_label = serializers.CharField(source='get_category_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmissionRecord
        fields = [
            'id', 'scope', 'scope_label', 'category', 'category_label',
            'activity_date', 'description', 'location', 'cost_center',
            'raw_value', 'raw_unit', 'normalized_value_kg_co2e',
            'emission_factor_used', 'emission_factor_source',
            'status', 'status_label', 'is_suspicious', 'suspicious_reason',
            'reviewed_by', 'reviewed_by_username', 'reviewed_at', 'reviewer_note',
            'is_locked', 'locked_at', 'created_at', 'updated_at',
            'ingestion_run',
        ]
        read_only_fields = [
            'id', 'scope', 'category', 'activity_date', 'description', 'location',
            'raw_value', 'raw_unit', 'normalized_value_kg_co2e',
            'emission_factor_used', 'emission_factor_source',
            'is_suspicious', 'suspicious_reason', 'created_at', 'updated_at',
            'ingestion_run', 'reviewed_by', 'reviewed_at', 'is_locked', 'locked_at',
        ]


class IngestionRunSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = IngestionRun
        fields = [
            'id', 'source_type', 'uploaded_by', 'uploaded_by_username',
            'original_filename', 'status', 'total_rows', 'parsed_rows',
            'failed_rows', 'error_log', 'created_at', 'completed_at',
        ]
