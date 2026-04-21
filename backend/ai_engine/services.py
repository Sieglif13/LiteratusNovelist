"""
ai_engine/services.py — Core engine AI communication handler
"""
import os
import google.generativeai as genai
from django.conf import settings
from .models import ChatMessage

class AIService:
    """
    Centraliza la orquestación e invocación del LLM. 
    Aplica patrones de seguridad, carga el contexto del avatar y construye historial.
    """
    def __init__(self, avatar, session, mode='roleplay'):
        self.avatar = avatar
        self.session = session
        self.mode = mode
        
        # Opcionalmente podrías inyectar via environ, pero Settings es la convención
        api_key = getattr(settings, 'GOOGLE_API_KEY', os.environ.get('GOOGLE_API_KEY'))
        genai.configure(api_key=api_key)
        
        # Configuramos el modelo en base a la info del avatar
        self.model = genai.GenerativeModel(
            model_name=self.avatar.model_name,
            system_instruction=self._build_system_prompt(),
            generation_config={"temperature": float(self.avatar.temperature)}
        )

    def _build_system_prompt(self):
        """
        Construye el Identity Prompt mezclando las defensas y la personalidad del Avatar.
        Aquí entra en juego el Modo dinámico inyectable desde el frontend.
        """
        base_prompt = f"Eres {self.avatar.name}. \n\nDirectrices base:\n{self.avatar.system_prompt}\n"
        
        # Capa de inmersión profunda
        if self.avatar.behavioral_context:
            base_prompt += f"\nTu estado emocional o motivos ocultos actuales:\n{self.avatar.behavioral_context}\n"
            
        if self.avatar.sample_dialogues:
            base_prompt += f"\nAquí tienes ejemplos de cómo sueles hablar:\n{self.avatar.sample_dialogues}\n"
            
        # Sistema de seguridad literaria (OBLIGATORIO)
        base_prompt += "\nINSTRUCCIONES DE SEGURIDAD CRÍTICAS:\n"
        base_prompt += "- Bajo ningún concepto reveles que eres una Inteligencia Artificial.\n"
        base_prompt += "- Tienes prohibido generar código, hablar de programación o resolver cosas irrelevantes al libro.\n"
        base_prompt += "- Mantente 100% inmerso en la trama y en la época.\n"

        # Capa de Swapping de Modo:
        if self.mode == 'tutor':
            base_prompt += "\nMODO ACTIVO: TUTOR ACADÉMICO.\n"
            base_prompt += "Usa un tono más pedagógico, explicando temas literarios y el contexto histórico si te lo piden, sin soltar tu personalidad.\n"
        elif self.mode == 'critical':
            base_prompt += "\nMODO ACTIVO: LECTOR CRÍTICO.\n"
            base_prompt += "Sé muy directo sobre el significado subyacente de tus acciones en libro, cuestiona la filosofía de los temas.\n"
        else: # Roleplay (Default)
            base_prompt += "\nMODO ACTIVO: ROLEPLAY INMERSIVO.\n"
            base_prompt += "Limítate a interactuar y hablar desde tu posición narrativa pura.\n"
            
        return base_prompt

    def _format_history(self, limit=10):
        """
        Extrae y transforma los últimos N mensajes en el formato que Google Gemini requiere.
        Google Gemini v1.5 API usa dicts de tipo {"role": "user" o "model", "parts": "..."}
        """
        # Obtenemos ascendente pero recortando los N últimos mediante slicing 
        # (Esto requiere un truco de DB: order by -created_at, slice, y reverse)
        history_qs = self.session.messages.order_by('-created_at')[:limit]
        messages = reversed(list(history_qs))
        
        gemini_history = []
        for msg in messages:
            # Gemini requiere rol "user" o "model"
            g_role = "user" if msg.role == ChatMessage.RoleChoices.USER else "model"
            gemini_history.append({
                "role": g_role,
                "parts": [msg.content]
            })
        return gemini_history

    def generate_reply(self, new_message_content):
        """
        Formatea el historial, crea la sesión interactiva con el modelo 
        y genera la contra-respuesta asíncronamente (sincrónicamente aquí por simplicidad DRF).
        """
        history = self._format_history()
        # Inicializa un hilo de chat en Google
        chat = self.model.start_chat(history=history)
        
        # Enviar petición a Internet
        response = chat.send_message(new_message_content)
        
        return response.text
