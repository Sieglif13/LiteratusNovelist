from rest_framework import serializers
from .models import Author, Genre, Book, Edition, BookAuthor

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
