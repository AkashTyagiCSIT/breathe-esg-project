from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('tenants.urls')),
    path('api/', include('ingestion.urls')),
    path('api/', include('emissions.urls')),
    path('api/', include('review_dashboard.urls')),
    path('api/', include('audit.urls')),
]
