"""
ai_engine/views.py — Controladores de interacciones AI (Roleplay Inmersivo)
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404

from library.models import UserInventory
from .models import AIAvatar, ChatSession, ChatMessage
from .serializers import (
    AIAvatarListSerializer,
    ChatSessionSerializer,
    ChatMessageSerializer,
    ChatInteractionSerializer,
)
from .services import AIService


class AvatarListView(APIView):
    """
    GET /api/v1/ai/avatars/?inventory_id=<uuid>
    Devuelve todos los avatares de la edición con el campo 'is_unlocked'
    calculado según el progreso real del usuario autenticado.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        inventory_id = request.query_params.get('inventory_id')
        if not inventory_id:
            return Response(
                {"error": "Se requiere el parámetro 'inventory_id'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que el inventario pertenece al usuario
        inventory = get_object_or_404(
            UserInventory,
            id=inventory_id,
            user=request.user
        )
        edition = inventory.edition

        # Obtener el capítulo actual del usuario (base 0 = índice desde 0)
        current_chapter = 0
        if hasattr(inventory, 'progress') and inventory.progress:
            current_chapter = inventory.progress.current_page  # guardamos capítulo aquí

        avatars = AIAvatar.objects.filter(edition=edition).order_by('unlock_at_chapter', 'name')
        serializer = AIAvatarListSerializer(
            avatars,
            many=True,
            context={
                'request': request,
                'current_chapter': current_chapter,
            }
        )
        return Response(serializer.data)


class ChatSessionView(APIView):
    """
    GET  /api/v1/ai/sessions/?avatar_id=<int> → Recuperar o crear sesión
    POST /api/v1/ai/sessions/ → (reservado, se crea vía GET con get_or_create)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        avatar_id = request.query_params.get('avatar_id')
        if not avatar_id:
            return Response(
                {"error": "Se requiere el parámetro 'avatar_id'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        avatar = get_object_or_404(AIAvatar, id=avatar_id)

        # Verificar que el usuario posee la edición
        owns = UserInventory.objects.filter(
            user=request.user,
            edition=avatar.edition
        ).exists()
        if not owns:
            return Response(
                {"error": "No posees esta obra."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Obtener o crear la sesión (una por usuario+avatar)
        session, _ = ChatSession.objects.get_or_create(
            user=request.user,
            avatar=avatar,
            defaults={'title': f'Chat con {avatar.name}'}
        )

        # Añadir el greeting como primer mensaje si la sesión es nueva
        if not session.messages.exists():
            ChatMessage.objects.create(
                session=session,
                role=ChatMessage.RoleChoices.ASSISTANT,
                content=avatar.greeting_message
            )

        serializer = ChatSessionSerializer(session)
        return Response(serializer.data)


class ChatHistoryView(APIView):
    """
    GET /api/v1/ai/sessions/<session_id>/messages/
    Devuelve los últimos 50 mensajes de la sesión.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(ChatSession, id=session_id, user=request.user)
        messages = session.messages.order_by('created_at')[:50]
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)


class ChatInteractionView(APIView):
    """
    POST /api/v1/ai/chat/
    Orquesta la validación de propiedad, descuento de tinta, inyección de
    historial y entrega de la respuesta del LLM.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ChatInteractionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        session_id = serializer.validated_data['session_id']
        message_content = serializer.validated_data['message']
        mode = serializer.validated_data['mode']

        session = get_object_or_404(ChatSession, id=session_id)

        # Verificar pertenencia de sesión
        if session.user != request.user:
            return Response(
                {"error": "No tienes permiso sobre esta sesión de chat."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar inventario
        edition_id = session.avatar.edition.id
        inventory_check = UserInventory.objects.filter(
            user=request.user, edition_id=edition_id
        ).exists()
        if not inventory_check:
            return Response(
                {"error": "No posees esta obra en tu biblioteca."},
                status=status.HTTP_403_FORBIDDEN
            )

        # SISTEMA DE TINTA: Verificar y descontar
        profile = getattr(request.user, 'profile', None)
        if profile is None:
            from users.models import Profile
            profile, _ = Profile.objects.get_or_create(user=request.user)

        if profile.ink_balance <= 0:
            return Response(
                {
                    "error": "Sin tinta",
                    "ink_balance": 0,
                    "message": "Te has quedado sin tinta. Recarga para continuar."
                },
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        # Guardar mensaje del usuario
        user_msg = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.RoleChoices.USER,
            content=message_content
        )

        try:
            ai_service = AIService(avatar=session.avatar, session=session, mode=mode)
            ai_response_text = ai_service.generate_reply(message_content)

            assistant_msg = ChatMessage.objects.create(
                session=session,
                role=ChatMessage.RoleChoices.ASSISTANT,
                content=ai_response_text
            )

            # Descontar 1 tinta SOLO si la IA respondió exitosamente
            profile.ink_balance = max(0, profile.ink_balance - 1)
            profile.save(update_fields=['ink_balance'])

            return Response({
                "mode_active": mode,
                "reply": assistant_msg.content,
                "timestamp": assistant_msg.created_at,
                "ink_balance": profile.ink_balance,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            user_msg.delete()
            return Response(
                {"error": f"Error del motor de IA: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
