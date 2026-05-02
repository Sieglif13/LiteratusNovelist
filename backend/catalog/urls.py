"""
catalog/urls.py — Enrutador DRF
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookViewSet, AuthorViewSet

router = DefaultRouter()
# /api/v1/catalog/authors/
router.register(r'authors', AuthorViewSet, basename='author')
# /api/v1/catalog/books/
router.register(r'books', BookViewSet, basename='book')

urlpatterns = [
    path('', include(router.urls)),
]
