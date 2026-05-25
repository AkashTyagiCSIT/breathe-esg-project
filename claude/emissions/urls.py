from django.urls import path
from .views import EmissionRecordListView, DashboardSummaryView, IngestionRunListView

urlpatterns = [
    path('records/', EmissionRecordListView.as_view(), name='records'),
    path('dashboard/', DashboardSummaryView.as_view(), name='dashboard'),
    path('runs/', IngestionRunListView.as_view(), name='runs'),
]
