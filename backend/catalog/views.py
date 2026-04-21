"""
catalog/views.py — Vistas de listado y consultas para libros.
"""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from library.models import UserInventory
from .models import Book
from .serializers import BookListSerializer, BookDetailSerializer
from core.pagination import StandardResultsSetPagination

class BookViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Vista de Lectura del Catálogo.
    Permite listar libros usando BookListSerializer (ligero)
    y detallar el libro uniendo autores y géneros (BookDetailSerializer).
    """
    queryset = Book.objects.prefetch_related('genres', 'book_authors__author', 'editions')
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Búsqueda múltiple DRF: ?search=garcia
    search_fields = ['title', 'synopsis', 'book_authors__author__full_name', 'genres__name']
    
    # Ordenamiento DRF: ?ordering=-created_at
    ordering_fields = ['title', 'created_at']
    ordering = ['-created_at'] # Por defecto los más nuevos

    def get_serializer_class(self):
        """Usa el serializador detallado si es GET /books/{id}/, o el ligero en list"""
        if self.action == 'retrieve':
            return BookDetailSerializer
        return BookListSerializer

    @action(detail=False, methods=['GET'])
    def recommendations(self, request):
        """
        SERVICIO DE RECOMENDACIONES BASE.
        Si el usuario está autenticado, encuentra géneros que ya posee 
        y recomienda otros libros que compartan dichos géneros, omitiendo sus compras.
        Si no hay sesión, devuelve lo más nuevo de forma genérica.
        """
        if not request.user.is_authenticated:
            # Comportamiento anónimo
            qs = self.get_queryset()[:5]
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        
        # Extracción de la biblioteca actual del usuario
        user_inventories = UserInventory.objects.filter(user=request.user).select_related('edition__book')
        owned_book_ids = [inv.edition.book.id for inv in user_inventories]
        
        if not owned_book_ids:
            # Si tiene cuenta pero no tiene libros, devuelve lo usual
            qs = self.get_queryset()[:5]
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
            
        # Extraer IDs de los géneros que este usuario posee
        owned_genres = Book.objects.filter(id__in=owned_book_ids).values_list('genres', flat=True).distinct()
        
        # Filtra libros que NO posee, pero compartan géneros exactos. Excluye null.
        recommendations = self.get_queryset().exclude(id__in=owned_book_ids).filter(
            genres__in=[g for g in owned_genres if g is not None]
        ).distinct()[:5]
        
        # Serializar y retornar los 5 mejores candidatos
        serializer = self.get_serializer(recommendations, many=True)
        return Response(serializer.data)
