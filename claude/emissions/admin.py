from django.contrib import admin
from .models import EmissionRecord, IngestionRun

admin.site.register(EmissionRecord)
admin.site.register(IngestionRun)
