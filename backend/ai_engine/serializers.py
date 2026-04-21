from rest_framework import serializers
from .models import AIAvatar, ChatSession, ChatMessage

class AIAvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAvatar
        fields = ['id', 'name', 'model_name', 'avatar_image']
        # No se expone el system_prompt ni temperature al frontend por seguridad

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = ['role', 'created_at']

class ChatSessionSerializer(serializers.ModelSerializer):
    avatar = AIAvatarSerializer(read_only=True)
    
    class Meta:
        model = ChatSession
        fields = ['id', 'avatar', 'title', 'created_at']
