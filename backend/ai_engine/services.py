"""
ai_engine/services.py — Core engine AI communication handler
"""
import os
from google import genai
from google.genai import types
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
        self.client = genai.Client(api_key=api_key)
        
        # Intentamos con el modelo configurado, pero tenemos un plan de respaldo
        self.model_name = self.avatar.model_name or 'gemini-2.5-flash'

        # Limpiamos el nombre si tiene 'models/' para compa con la nueva API
        if self.model_name.startswith('models/'):
            self.model_name = self.model_name.replace('models/', '')

    def _get_config(self):
        return types.GenerateContentConfig(
            system_instruction=self._build_system_prompt(),
            temperature=float(self.avatar.temperature)
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
        """
        # Obtenemos ascendente pero recortando los N últimos mediante slicing 
        # (Esto requiere un truco de DB: order by -created_at, slice, y reverse)
        history_qs = self.session.messages.order_by('-created_at')[:limit]
        messages = reversed(list(history_qs))
        
        gemini_history = []
        for msg in messages:
            # Gemini requiere rol "user" o "model"
            g_role = "user" if msg.role == ChatMessage.RoleChoices.USER else "model"
            gemini_history.append(
                types.Content(
                    role=g_role,
                    parts=[types.Part.from_text(text=msg.content)]
                )
            )
        return gemini_history

    def generate_reply(self, new_message_content):
        """
        Formatea el historial, crea la sesión interactiva con el modelo 
        y genera la contra-respuesta.
        """
        try:
            return self._send_to_gemini(new_message_content, self.model_name)
        except Exception as e:
            print(f"Error en respuesta con modelo {self.model_name}: {e}. Reintentando con gemini-2.5-flash...")
            return self._send_to_gemini(new_message_content, 'gemini-2.5-flash')

    def _send_to_gemini(self, content, current_model):
        history = self._format_history()
        config = self._get_config()
        chat = self.client.chats.create(
            model=current_model,
            config=config,
            history=history
        )
        response = chat.send_message(content)
        return response.text
