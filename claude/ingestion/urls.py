from django.urls import path
from .views import IngestView

urlpatterns = [
    path('ingest/<str:source_type>/', IngestView.as_view(), name='ingest'),
]
