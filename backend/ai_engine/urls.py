"""
ai_engine/urls.py — Enrutador de IA
"""
from django.urls import path
from .views import ChatInteractionView

urlpatterns = [
    # ---- Chat & Inmersion interactiva ----
    # Ruta: POST /api/v1/ai/chat/
    path('chat/', ChatInteractionView.as_view(), name='ai-chat'),
]
