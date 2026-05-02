"""
ai_engine/urls.py — Enrutador de IA
"""
from django.urls import path
from .views import (
    AvatarListView,
    ChatSessionView,
    ChatHistoryView,
    ChatInteractionView,
    TTSGenerateView,
)

urlpatterns = [
    # Lista de personajes con estado de desbloqueo
    # GET /api/v1/ai/avatars/?inventory_id=<uuid>
    path('avatars/', AvatarListView.as_view(), name='ai-avatars'),

    # Obtener o crear sesión de chat con un personaje
    # GET /api/v1/ai/sessions/?avatar_id=<int>
    path('sessions/', ChatSessionView.as_view(), name='ai-sessions'),

    # Historial de mensajes de una sesión
    # GET /api/v1/ai/sessions/<session_uuid>/messages/
    path('sessions/<str:session_id>/messages/', ChatHistoryView.as_view(), name='ai-session-messages'),

    # Enviar mensaje al LLM (consume tinta)
    # POST /api/v1/ai/chat/
    path('chat/', ChatInteractionView.as_view(), name='ai-chat'),

    # Narración AI (TTS ElevenLabs)
    # POST /api/v1/ai/audio/generate/
    path('audio/generate/', TTSGenerateView.as_view(), name='ai-audio-generate'),
]
