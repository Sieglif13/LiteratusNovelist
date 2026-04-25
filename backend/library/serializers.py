from rest_framework import serializers
from .models import UserInventory, ReadingProgress, UserBookmark
from catalog.serializers import EditionSerializer

class ReadingProgressSerializer(serializers.ModelSerializer):
    """
    Endpoint para inyecciones asíncronas PATCH.
    Permite enviar de parte de EPUB.js el current_cfi y 
    actualizar visualmente las barras de progreso front-end.
    """
    class Meta:
        model = ReadingProgress
        fields = ['id', 'current_cfi', 'current_page', 'completion_percentage', 'updated_at']
        read_only_fields = ['id', 'updated_at']

class UserBookmarkSerializer(serializers.ModelSerializer):
    """
    Manejo CRUD personal de anotaciones de libros adquiridos.
    """
    class Meta:
        model = UserBookmark
        fields = ['id', 'inventory', 'position_cfi', 'note', 'color', 'created_at']
        read_only_fields = ['id', 'created_at']

class UserInventorySerializer(serializers.ModelSerializer):
    """
    Vista global del inventario personal para la portada 'Mi Biblioteca'.
    Incluye un Edition nested read_only y el progreso numérico de lectura total.
    """
    edition = EditionSerializer(read_only=True)
    progress = ReadingProgressSerializer(read_only=True)
    book_id = serializers.ReadOnlyField(source='edition.book.id')

    class Meta:
        model = UserInventory
        fields = ['id', 'book_id', 'edition', 'acquired_at', 'progress']
        read_only_fields = ['id', 'book_id', 'edition', 'acquired_at', 'progress']
