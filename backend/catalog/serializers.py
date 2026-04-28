from rest_framework import serializers
from .models import Author, Genre, Book, Edition, BookAuthor, Review
from ai_engine.models import AIAvatar

class AuthorReadSerializer(serializers.ModelSerializer):
    """
    Lectura de modelo Autor. Incluye el slug precalculado útil para rutas SEO.
    """
    class Meta:
        model = Author
        fields = ['id', 'full_name', 'slug', 'bio', 'nationality']

class GenreSerializer(serializers.ModelSerializer):
    """
    Metadatos de clasificación que acompañarán anidados a los libros.
    """
    class Meta:
        model = Genre
        fields = ['id', 'name', 'slug']

class EditionSerializer(serializers.ModelSerializer):
    """
    Versiones comerciales de un libro que indican formato, precio e ISO de lenguaje.
    """
    class Meta:
        model = Edition
        fields = ['id', 'language', 'isbn', 'format', 'price', 'published_date', 'publisher']

class BookAuthorSerializer(serializers.ModelSerializer):
    """
    Estructura puente: muestra el ROL que ejerció la persona sobre la obra 
    y adjunta toda su información en el objeto `author`.
    """
    author = AuthorReadSerializer(read_only=True)
    
    class Meta:
        model = BookAuthor
        fields = ['role', 'author']

class BookListSerializer(serializers.ModelSerializer):
    """
    Serializador liviano para vistas de listado general (Pagination/Search).
    Prevenir el impacto N+1, no extraemos Ediciones ni Autores pesados.
    """
    genres = GenreSerializer(many=True, read_only=True)
    
    class Meta:
        model = Book
        fields = ['id', 'title', 'slug', 'synopsis', 'is_featured', 'cover_image', 'genres']

class BookDetailSerializer(serializers.ModelSerializer):
    """
    Serializador profundo mediante Nested Relations para la ficha de detalle final 
    del catálogo. Consolida Autores (roles), Categorías multietiqueta y Ediciones en venta.
    """
    genres = GenreSerializer(many=True, read_only=True)
    book_authors = BookAuthorSerializer(many=True, read_only=True)
    editions = EditionSerializer(many=True, read_only=True)

    class Meta:
        model = Book
        fields = ['id', 'title', 'slug', 'synopsis', 'cover_image', 'genres', 'book_authors', 'editions', 'created_at']

class AIAvatarLightSerializer(serializers.ModelSerializer):
    """
    Serializador ligero para mostrar avatares en la ficha del libro.
    """
    class Meta:
        model = AIAvatar
        fields = ['id', 'name', 'description', 'avatar_image', 'is_major_character', 'is_author']

class ReviewSerializer(serializers.ModelSerializer):
    """
    Reseñas de usuarios.
    """
    username = serializers.CharField(source='user.username', read_only=True)
    user_avatar = serializers.ImageField(source='user.profile.avatar', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'username', 'user_avatar', 'rating', 'comment', 'created_at']

class BookDetailFullSerializer(BookDetailSerializer):
    """
    Serializador completo para el modal, incluye información nutricional:
    avatares, tiempo estimado de lectura y comentarios.
    """
    reviews = ReviewSerializer(many=True, read_only=True)
    avatars = serializers.SerializerMethodField()
    estimated_reading_time = serializers.SerializerMethodField()
    is_owned = serializers.SerializerMethodField()
    inventory_id = serializers.SerializerMethodField()
    ink_balance = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()

    class Meta(BookDetailSerializer.Meta):
        fields = BookDetailSerializer.Meta.fields + [
            'difficulty_level', 'is_published', 'reviews', 'avatars', 'estimated_reading_time',
            'is_owned', 'inventory_id', 'ink_balance', 'price'
        ]

    def get_avatars(self, obj):
        # Recolectar todos los avatares de todas las ediciones del libro
        # Esto asume prefetch_related('editions__avatars') en la view
        avatars = AIAvatar.objects.filter(edition__book=obj)
        return AIAvatarLightSerializer(avatars, many=True, context=self.context).data

    def get_estimated_reading_time(self, obj):
        """
        Calcula el tiempo estimado basado en 200 palabras por minuto.
        Suma las palabras de todos los capítulos del libro.
        """
        chapters = obj.chapters.all()
        total_words = 0
        for chapter in chapters:
            if chapter.content_html:
                # Aproximación simple: contar espacios
                total_words += len(chapter.content_html.split())
        
        if total_words == 0:
            # Fallback a un tiempo basado en la sinopsis si no hay contenido
            total_words = len(obj.synopsis.split()) * 5 # mock multiplicador
            if total_words == 0:
                return "1 hora" # Default
                
        minutes = total_words // 200
        if minutes < 60:
            return f"{max(1, minutes)} min"
        else:
            hours = minutes // 60
            remaining_mins = minutes % 60
            if remaining_mins > 0:
                return f"{hours}h {remaining_mins}m"
            return f"{hours}h"

    def get_is_owned(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from library.models import UserInventory
            return UserInventory.objects.filter(user=request.user, edition__book=obj).exists()
        return False

    def get_inventory_id(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from library.models import UserInventory
            inv = UserInventory.objects.filter(user=request.user, edition__book=obj).first()
            return str(inv.id) if inv else None
        return None

    def get_ink_balance(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and hasattr(request.user, 'profile'):
            return request.user.profile.ink_balance
        return 0
        
    def get_price(self, obj):
        edition = obj.editions.first()
        return int(edition.price) if edition else 0
