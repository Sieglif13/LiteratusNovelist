"""
ai_engine/views.py — Controladores de interacciones AI (Roleplay Inmersivo)
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from library.models import UserInventory
from .models import ChatSession, ChatMessage
from .serializers import ChatInteractionSerializer
from .services import AIService

class ChatInteractionView(APIView):
    """
    Endpoint POST central interactivo: /api/v1/ai/chat/
    Orquesta la validación de propiedad, inyección de memoria histórica 
    y entrega de las peticiones dinámicas de Roleplay, Tutor o Critical.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # 1. Validar la estructura del JSON usando el Serializer
        serializer = ChatInteractionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        session_id = serializer.validated_data['session_id']
        message_content = serializer.validated_data['message']
        mode = serializer.validated_data['mode']

        # 2. Localizar la sesión de Chat
        session = get_object_or_404(ChatSession, id=session_id)

        # 3. SEGURIDAD INVENTARIO: Verificar pertenencia
        # Comprobar que esta sesión pertenece al request.user
        if session.user != request.user:
            return Response({"error": "No tienes permiso sobre esta sesión de chat."}, status=status.HTTP_403_FORBIDDEN)
        
        # Comprobar que el usuario posé la versión/edición correspondiente a este avatar
        edition_id = session.avatar.edition.id
        inventory_check = UserInventory.objects.filter(user=request.user, edition_id=edition_id).exists()
        if not inventory_check:
            return Response(
                {"error": "Autorización Bloqueada: No posees esta obra en tu baúl personal."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # 4. Guardar mensaje del usuario
        user_msg = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.RoleChoices.USER,
            content=message_content
        )

        try:
            # 5. Cargar Servicio Maestro de IA inyectando el Avatar, la Sesión (usada en History) y el Modo dinámico
            ai_service = AIService(avatar=session.avatar, session=session, mode=mode)
            
            # Generar Respuesta
            ai_response_text = ai_service.generate_reply(message_content)

            # 6. Almacenar la respuesta del Assistant en la DB
            assistant_msg = ChatMessage.objects.create(
                session=session,
                role=ChatMessage.RoleChoices.ASSISTANT,
                content=ai_response_text
            )

            # 7. Retornar final del ciclo (JSON al frontend)
            return Response({
                "mode_active": mode,
                "reply": assistant_msg.content,
                "timestamp": assistant_msg.created_at
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # Si falla la red de Gemini o el Auth API_KEY, protegemos la DB. 
            # Lo óptimo sería borrar 'user_msg' para mantener integridad de turnos
            user_msg.delete()
            return Response(
                {"error": f"Error del LLM de procesamiento neural: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
