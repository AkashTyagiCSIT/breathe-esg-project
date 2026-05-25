from django.urls import path
from .views import TenantInfoView

urlpatterns = [
    path('tenant/', TenantInfoView.as_view(), name='tenant_info'),
]
