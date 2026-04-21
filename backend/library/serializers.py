from rest_framework import serializers
from .models import UserInventory, ReadingProgress, UserBookmark
from catalog.serializers import EditionSerializer

class ReadingProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadingProgress
        fields = ['id', 'current_cfi', 'current_page', 'completion_percentage', 'updated_at']

class UserBookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserBookmark
        fields = ['id', 'position_cfi', 'note', 'color', 'created_at']

class UserInventorySerializer(serializers.ModelSerializer):
    edition = EditionSerializer(read_only=True)
    progress = ReadingProgressSerializer(read_only=True)

    class Meta:
        model = UserInventory
        fields = ['id', 'edition', 'acquired_at', 'progress']
