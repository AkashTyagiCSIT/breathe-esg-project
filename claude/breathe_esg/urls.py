from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health(request):
    return JsonResponse({"status": "healthy"})


urlpatterns = [
    path('', health),
    path('api/health/', health),

    path('admin/', admin.site.urls),

    # API routes
    path('api/', include('ingestion.urls')),
]
