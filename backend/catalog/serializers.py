from rest_framework import serializers
from .models import Author, Genre, Book, Edition, BookAuthor

class AuthorReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'full_name', 'slug', 'bio', 'nationality']

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name', 'slug']

class EditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edition
        fields = ['id', 'language', 'isbn', 'format', 'price', 'published_date', 'publisher']

class BookAuthorSerializer(serializers.ModelSerializer):
    author = AuthorReadSerializer(read_only=True)
    
    class Meta:
        model = BookAuthor
        fields = ['role', 'author']

class BookListSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    
    class Meta:
        model = Book
        fields = ['id', 'title', 'slug', 'cover_image', 'genres']

class BookDetailSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    book_authors = BookAuthorSerializer(many=True, read_only=True)
    editions = EditionSerializer(many=True, read_only=True)

    class Meta:
        model = Book
        fields = ['id', 'title', 'slug', 'synopsis', 'cover_image', 'genres', 'book_authors', 'editions', 'created_at']
