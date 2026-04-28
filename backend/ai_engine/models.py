"""
ai_engine/models.py — Modelos de IA conversacional y contexto narrativo.

DISEÑO 3NF:

    AIAvatar:
        - FK a Edition (no a Book): el avatar es específico a la edición porque
          el contexto narrativo puede variar entre idiomas o traducciones.
          Un avatar del El Quijote en español tiene un system_prompt diferente
          al de la versión en inglés. Tener FK a Book generalizaría incorrectamente.

    ChatSession:
        - Agrupa mensajes bajo un avatar+usuario. Permite múltiples conversaciones
          paralelas del mismo usuario con diferentes avatares.
        - FK a AIAvatar (no a Edition ni Book): la sesión es con un avatar específico,
          que ya sabe a qué edición pertenece.

    ChatMessage:
        - Entidad más atómica. Cada mensaje es independiente.
        - 'role' distingue quién habló (user/assistant/system) — necesario para
          reconstruir el historial de conversación para el LLM.
        - ordering = ['created_at']: por defecto, los mensajes se devuelven en
          orden cronológico. Crítico para la correcta reconstrucción del contexto.
        - Índice en (session, created_at): la query más frecuente es
          "dame los últimos N mensajes de esta sesión".
"""

from django.db import models
from core.models import TimeStampedModel
from users.models import User
from catalog.models import Edition


class AIAvatar(TimeStampedModel):
    """
    Perfil de IA para una edición específica.
    Define la personalidad, instrucciones (system_prompt) y configuración
    del modelo LLM que encarna a un personaje o narrador del libro.
    """
    edition = models.ForeignKey(
        Edition,
        on_delete=models.CASCADE,
        related_name='avatars'
    )
    name = models.CharField(max_length=100)
    # Descripción breve para mostrar en la ficha del personaje en el lector.
    description = models.TextField(
        blank=True,
        default='',
        help_text="Descripción breve del personaje para mostrar en su ficha de perfil."
    )
    # Instrucciones base para el LLM.
    system_prompt = models.TextField()
    temperature = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.70,
        help_text="Creatividad del LLM. 0.0 = determinista, 1.0 = máxima creatividad."
    )
    model_name = models.CharField(
        max_length=50,
        default='gemini-2.5-flash',
        help_text="Identificador del modelo LLM (e.g. 'gemini-2.5-flash', 'gpt-4o')."
    )
    avatar_image = models.ImageField(
        upload_to='ai_avatars/',
        null=True,
        blank=True
    )
    # SISTEMA DE DESBLOQUEO POR PROGRESO
    # El avatar se activa cuando el usuario llega a este capítulo (índice base-0).
    # unlock_at_chapter=0 significa disponible desde el inicio.
    unlock_at_chapter = models.PositiveIntegerField(
        default=0,
        help_text="Capítulo (base 0) a partir del cual el usuario puede chatear con este personaje."
    )
    is_major_character = models.BooleanField(
        default=True,
        help_text="Si es un personaje principal, aparece destacado en el panel."
    )
    # AUTOR: avatar del autor real de la obra (aparece en sección propia en el panel)
    # Siempre disponible desde el inicio (unlock_at_chapter=0 se ignora si is_author=True).
    is_author = models.BooleanField(
        default=False,
        help_text="Si True, este avatar representa al autor de la obra y aparece en sección propia."
    )
    # INMERSIÓN COMPLETA
    greeting_message = models.TextField(
        default="Hola, viajero.",
        help_text="Mensaje introductorio fijo que arranca la sesión."
    )
    behavioral_context = models.TextField(
        blank=True,
        help_text="Motivaciones secretas, situación emocional actual de este personaje."
    )
    sample_dialogues = models.TextField(
        blank=True,
        help_text="Bloques literales de la obra para guiar el estilo de respuesta."
    )

    class Meta:
        verbose_name = 'AI Avatar'
        verbose_name_plural = 'AI Avatars'
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(temperature__gte=0.00) &
                    models.Q(temperature__lte=1.00)
                ),
                name='valid_temperature',
                violation_error_message="La temperatura debe estar entre 0.0 y 1.0."
            )
        ]

    def __str__(self):
        return f"{self.name} [{self.edition.book.title}]"


class ChatSession(TimeStampedModel):
    """
    Sesión de conversación entre un usuario y un AIAvatar.
    Agrupa mensajes con un título para identificar el hilo de conversación.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    avatar = models.ForeignKey(AIAvatar, on_delete=models.CASCADE, related_name='sessions')
    title = models.CharField(max_length=255, blank=True, default='Nueva Conversación')

    class Meta:
        verbose_name = 'Chat Session'
        verbose_name_plural = 'Chat Sessions'
        indexes = [
            # Permite recuperar eficientemente "las sesiones del usuario X"
            # ordenadas por actividad más reciente.
            models.Index(fields=['user', 'created_at'])
        ]

    def __str__(self):
        return f"[{self.user.username}] {self.title} — {self.avatar.name}"


class ChatMessage(TimeStampedModel):
    """
    Mensaje individual dentro de una ChatSession.

    DISEÑO DE RENDIMIENTO:
    El índice en (session_id, created_at) es crítico. Cada request del chat
    recupera los últimos N mensajes de la sesión para enviarlos al LLM como
    contexto. Sin este índice, esa query haría un sequential scan en una tabla
    que puede tener millones de mensajes.
    """
    class RoleChoices(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        SYSTEM = 'system', 'System'

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    # role sigue el estándar de la API de OpenAI/Gemini para compatibilidad directa.
    role = models.CharField(max_length=20, choices=RoleChoices.choices)
    content = models.TextField()

    class Meta:
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'
        indexes = [
            # Índice compuesto (session, created_at): ver justificación en docstring.
            models.Index(fields=['session', 'created_at'])
        ]
        # ordering por defecto: cronológico ascendente.
        # Permite usar ChatMessage.objects.filter(session=s) y obtener historial en orden.
        ordering = ['created_at']

    def __str__(self):
        preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"[{self.get_role_display()}] {preview}"
