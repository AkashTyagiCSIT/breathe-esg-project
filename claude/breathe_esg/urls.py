from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({"status": "API running"})

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),

    # your existing app routes
    path('api/', include('ingestion.urls')),
]
