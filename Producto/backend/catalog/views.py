"""
catalog/views.py — Vistas de listado y consultas para libros.
"""
from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from library.models import UserInventory
from .models import Book, Author, Genre, Tag
from .serializers import (
    BookListSerializer, BookDetailSerializer, BookDetailFullSerializer, 
    AuthorDetailSerializer, AuthorReadSerializer, GenreSerializer
)
from core.pagination import StandardResultsSetPagination

class GenreViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar géneros (Genre).
    Permite listar, crear y editar géneros desde el Dashboard.
    """
    queryset = Genre.objects.all().order_by('name')
    serializer_class = GenreSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class AuthorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Vista de Lectura del Catálogo de Autores.
    Permite listar y obtener detalles completos de un autor y sus obras.
    """
    queryset = Author.objects.prefetch_related('author_books__book__genres')
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'bio', 'nationality']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AuthorDetailSerializer
        return AuthorReadSerializer

class BookViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Vista de Lectura del Catálogo.
    Permite listar libros usando BookListSerializer (ligero)
    y detallar el libro uniendo autores y géneros (BookDetailSerializer).
    """
    queryset = Book.objects.prefetch_related('genres', 'book_authors__author', 'editions')
    pagination_class = StandardResultsSetPagination
    # Filtros exactos: ?genres__name=Cuentos
    filterset_fields = {
        'genres__name': ['exact', 'icontains'],
        'is_featured': ['exact'],
    }
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    lookup_field = 'slug'
    
    # Búsqueda múltiple DRF: ?search=garcia
    search_fields = ['title', 'synopsis', 'book_authors__author__full_name', 'genres__name']
    
    # Ordenamiento DRF: ?ordering=-created_at
    ordering_fields = ['title', 'created_at', 'is_featured']
    ordering = ['-is_featured', '-created_at'] # Por defecto los destacados y luego más nuevos

    def get_queryset(self):
        qs = Book.objects.prefetch_related('genres', 'book_authors__author', 'editions')
        genre_name = self.request.query_params.get('genres__name', None)
        if genre_name:
            qs = qs.filter(genres__name__iexact=genre_name).distinct()
        return qs

    def get_serializer_class(self):
        """Usa el serializador detallado si es GET /books/{id}/, o el ligero en list"""
        if self.action == 'retrieve':
            return BookDetailSerializer
        return BookListSerializer

    @action(detail=False, methods=['GET'])
    def recommendations(self, request):
        """
        SERVICIO DE RECOMENDACIONES INTELIGENTE.
        Calcula el perfil del usuario basado en Géneros (Categorías) y Tags de sus compras.
        """
        if not request.user.is_authenticated:
            # Usuarios anónimos ven los destacados
            qs = self.get_queryset().filter(is_featured=True)[:6]
            if not qs.exists(): qs = self.get_queryset()[:6]
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        
        # 1. Obtener inventario del usuario
        owned_book_ids = UserInventory.objects.filter(
            user=request.user
        ).values_list('edition__book_id', flat=True)
        
        if not owned_book_ids:
            # Si no tiene libros, devolver destacados o más populares
            qs = self.get_queryset().filter(is_featured=True)[:6]
            if not qs.exists(): qs = self.get_queryset()[:6]
            return Response(self.get_serializer(qs, many=True).data)

        # 2. Calcular "Perfil de Interés" por Géneros y Tags
        from django.db.models import Count, Q
        
        # Géneros favoritos
        favorite_genres = Genre.objects.filter(
            books__id__in=owned_book_ids
        ).annotate(
            genre_count=Count('books')
        ).order_by('-genre_count')
        
        # Tags de interés
        user_tags = Tag.objects.filter(books__id__in=owned_book_ids).values_list('id', flat=True)

        # 3. Buscar candidatos (excluyendo lo que ya tiene)
        candidates = self.get_queryset().exclude(id__in=owned_book_ids)
        
        # Si tiene géneros favoritos, filtrar/anotar por ellos
        if favorite_genres.exists():
            genre_ids = list(favorite_genres.values_list('id', flat=True))
            candidates = candidates.filter(genres__id__in=genre_ids).annotate(
                matching_genres=Count('genres', filter=Q(genres__id__in=genre_ids))
            )
            # Ordenar por el número de géneros coincidentes
            order_by_fields = ['-matching_genres']
        else:
            order_by_fields = []

        # Si además tiene tags de interés, podemos ordenar o filtrar secundariamente
        if user_tags:
            tag_ids = list(user_tags)
            candidates = candidates.annotate(
                matching_tags=Count('tags', filter=Q(tags__id__in=tag_ids))
            )
            order_by_fields.append('-matching_tags')
            
        order_by_fields.extend(['-view_count', '-id'])
        
        if order_by_fields:
            candidates = candidates.order_by(*order_by_fields).distinct()
        else:
            candidates = candidates.order_by('-view_count').distinct()

        # 4. Limitar y enviar
        serializer = self.get_serializer(candidates[:10], many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['GET'])
    def details(self, request, slug=None):
        """
        Ficha Detallada de Obra (Fase 7.5).
        Devuelve información "nutricional" completa: avatares, tiempo de lectura, reseñas.
        """
        # Añadir prefetch adicionales para optimizar queries anidadas en el Full Serializer
        queryset = self.get_queryset().prefetch_related(
            'editions__avatars', 
            'reviews__user__profile',
            'chapters'
        )
        book = get_object_or_404(queryset, slug=slug)

        # Incrementar contador de visitas de forma atómica
        from django.db.models import F
        Book.objects.filter(pk=book.pk).update(view_count=F('view_count') + 1)
        book.refresh_from_db()

        serializer = BookDetailFullSerializer(book, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['POST'])
    def purchase(self, request, slug=None):
        """
        Compra de una obra usando Tinta (ink_balance).
        """
        if not request.user.is_authenticated:
            return Response({'error': 'Debes iniciar sesión para comprar.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        book = self.get_object()
        
        # Obtenemos la edición principal (por defecto la primera, o EPUB)
        edition = book.editions.first()
        if not edition:
            return Response({'error': 'Este libro no tiene ediciones disponibles.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Costo en tinta basado en el precio de la edición
        cost = int(edition.price)
        
        with transaction.atomic():
            # Bloquear la fila del perfil para evitar race conditions
            # en la lectura/escritura del balance de tinta
            from users.models import Profile
            profile = Profile.objects.select_for_update().get(user=request.user)
            
            if profile.ink_balance < cost:
                return Response({
                    'error': 'INSUFFICIENT_INK',
                    'message': f'No tienes tinta suficiente. Necesitas {cost} de Tinta, tienes {profile.ink_balance}.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Verificar si ya lo posee
            if UserInventory.objects.filter(user=request.user, edition=edition).exists():
                return Response({'error': 'Ya posees este libro.'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Restar tinta
            profile.ink_balance -= cost
            profile.save()
            
            # Crear inventario
            UserInventory.objects.create(user=request.user, edition=edition)
            
        return Response({'message': 'Libro adquirido con éxito.', 'ink_balance': profile.ink_balance}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['POST'])
    def purchase_narration(self, request, slug=None):
        """
        Desbloquea la narración premium usando Tinta.
        Costo fijo: 200 de Tinta.
        """
        if not request.user.is_authenticated:
            return Response({'error': 'Debes iniciar sesión.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        book = self.get_object()
        edition = book.editions.first()
        if not edition:
            return Response({'error': 'Edición no encontrada.'}, status=status.HTTP_400_BAD_REQUEST)

        # Costo fijo para la narración premium
        cost = 200 
        
        with transaction.atomic():
            from users.models import Profile
            profile = Profile.objects.select_for_update().get(user=request.user)
            
            inventory = UserInventory.objects.filter(user=request.user, edition=edition).first()
            if not inventory:
                return Response({'error': 'Debes poseer el libro para comprar la narración.'}, status=status.HTTP_400_BAD_REQUEST)
                
            if inventory.has_premium_narration:
                return Response({'error': 'Ya posees la narración premium.'}, status=status.HTTP_400_BAD_REQUEST)
                
            if profile.ink_balance < cost:
                return Response({
                    'error': 'INSUFFICIENT_INK',
                    'message': f'Necesitas {cost} de Tinta, tienes {profile.ink_balance}.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            profile.ink_balance -= cost
            profile.save()
            
            inventory.has_premium_narration = True
            inventory.save()
            
        return Response({
            'message': 'Narración premium desbloqueada.', 
            'ink_balance': profile.ink_balance
        }, status=status.HTTP_200_OK)
