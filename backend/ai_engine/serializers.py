from rest_framework import serializers
from .models import AIAvatar, ChatSession, ChatMessage


class AIAvatarListSerializer(serializers.ModelSerializer):
    """
    Serializer para la lista de avatares en el panel del lector.
    Incluye campo computado 'is_unlocked' basado en el progreso del usuario.
    """
    is_unlocked = serializers.SerializerMethodField()
    avatar_image_url = serializers.SerializerMethodField()

    class Meta:
        model = AIAvatar
        fields = [
            'id', 'name', 'description', 'avatar_image_url',
            'unlock_at_chapter', 'is_major_character', 'is_author',
            'is_unlocked', 'greeting_message',
        ]

    def get_is_unlocked(self, obj):
        # El autor siempre está disponible para chatear
        if obj.is_author:
            return True
        # El contexto 'current_chapter' es inyectado por la vista
        current_chapter = self.context.get('current_chapter', 0)
        return current_chapter >= obj.unlock_at_chapter

    def get_avatar_image_url(self, obj):
        request = self.context.get('request')
        if obj.avatar_image and request:
            return request.build_absolute_uri(obj.avatar_image.url)
        return None


class ChatSessionSerializer(serializers.ModelSerializer):
    """Serializer para crear/recuperar una sesión de chat."""
    id = serializers.CharField(read_only=True)  # UUID como string
    avatar_name = serializers.CharField(source='avatar.name', read_only=True)

    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'avatar_name', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer para los mensajes individuales de una sesión."""
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'created_at']


class ChatInteractionSerializer(serializers.Serializer):
    """
    Serializador para la entrada del endpoint de chat.
    Valida session_id (UUID), mensaje y modo de comportamiento.
    """
    session_id = serializers.UUIDField(required=True)
    message = serializers.CharField(required=True, max_length=2000)
    mode = serializers.ChoiceField(
        choices=['roleplay', 'tutor', 'critical'],
        default='roleplay',
        required=False
    )
