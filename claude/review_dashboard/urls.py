from django.urls import path
from .views import ReviewRecordView, BulkReviewView

urlpatterns = [
    path('records/<int:pk>/review/', ReviewRecordView.as_view(), name='review_record'),
    path('records/bulk-review/', BulkReviewView.as_view(), name='bulk_review'),
]
