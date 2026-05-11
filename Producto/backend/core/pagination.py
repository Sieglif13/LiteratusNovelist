"""
core/pagination.py — Clases globales de paginación
"""
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    """
    Paginación estándar para todo el proyecto Literatus.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
