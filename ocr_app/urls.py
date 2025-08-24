from django.urls import path
from .views import OCRAPIView, AIOCRAPIView, BrandsAPIView, BrandDetailAPIView

urlpatterns = [
    path('ocr/', OCRAPIView.as_view(), name='ocr'),
    path('ai-ocr/', AIOCRAPIView.as_view(), name='ai-ocr'),
    path('brands/', BrandsAPIView.as_view(), name='brands'),
    path('brands/<int:pk>/', BrandDetailAPIView.as_view(), name='brand-detail'),
]
