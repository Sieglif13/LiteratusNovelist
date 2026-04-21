"""
library/models.py — Propiedad digital y progreso de lectura.

DISEÑO 3NF:

    UserInventory:
        - Modela el concepto de "propiedad" de una edición digital.
        - UniqueConstraint(user, edition): garantiza que un usuario no pueda
          comprar la misma edición dos veces. Esto también se valida en la capa
          de negocio (view de compra), pero tener la constraint en la DB es la
          última línea de defensa (Defense in Depth).

    ReadingProgress:
        - Decisión clave de 3NF: el progreso depende del PAR (usuario, edición).
          Ponerlo en Profile violaría 3NF: 'current_page' dependería de
          (user_id, edition_id), no de user_id solo (la PK de Profile).
          1:1 con UserInventory: un progreso por adquisición, no por usuario.

    UserBookmark:
        - FK a UserInventory (no directo a User ni Edition) porque un marcador
          solo tiene sentido si el usuario POSEE el libro. Esto refuerza la
          integridad referencial a nivel de modelo.
"""

from django.db import models
from core.models import TimeStampedModel
from users.models import User
from catalog.models import Edition


class UserInventory(TimeStampedModel):
    """
    Registro de la propiedad digital de un usuario sobre una edición.
    Actúa como tabla puente entre User y Edition con metadatos adicionales.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inventory')
    edition = models.ForeignKey(Edition, on_delete=models.CASCADE, related_name='owners')
    # Timestamp explícito de adquisición. Distinto de created_at (TimeStampedModel)
    # porque en el futuro podría haber un delay entre la creación del registro y
    # la confirmación real del pago (acquired_at = cuando se confirma).
    acquired_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'User Inventory'
        verbose_name_plural = 'User Inventories'
        constraints = [
            # Un usuario no puede poseer la misma edición dos veces.
            # Esta constraint en DB es la segunda línea de defensa tras
            # la validación en la view de compra.
            models.UniqueConstraint(
                fields=['user', 'edition'],
                name='unique_ownership',
                violation_error_message="El usuario ya posee esta edición."
            )
        ]

    def __str__(self):
        return f"{self.user.username} → {self.edition}"


class ReadingProgress(TimeStampedModel):
    """
    Progreso de lectura del usuario para una edición específica.

    1:1 con UserInventory: solo se puede tener un progreso por (usuario, edición).
    Separado de UserInventory para mantener la tabla de inventario compacta
    (el progreso cambia en cada sesión de lectura; el inventario es estático).
    """
    inventory = models.OneToOneField(
        UserInventory,
        on_delete=models.CASCADE,
        related_name='progress'
    )
    # CFI (Canonical Fragment Identifier): estándar EPUB para indicar posición exacta.
    # Formato: "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)"
    current_cfi = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="EPUB CFI: puntero de posición estándar EPUB/W3C."
    )
    # Para formatos no-EPUB (PDF, audio por página/minuto).
    current_page = models.PositiveIntegerField(default=0)
    completion_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00
    )

    class Meta:
        verbose_name = 'Reading Progress'
        verbose_name_plural = 'Reading Progresses'
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(completion_percentage__gte=0.00) &
                    models.Q(completion_percentage__lte=100.00)
                ),
                name='valid_percentage',
                violation_error_message="El porcentaje debe estar entre 0 y 100."
            )
        ]
        indexes = [
            # Índice en updated_at: para queries de "libros con actividad reciente".
            models.Index(fields=['updated_at'])
        ]

    def __str__(self):
        return f"{self.inventory} — {self.completion_percentage}%"


class UserBookmark(TimeStampedModel):
    """
    Marcador o anotación dentro de un libro que el usuario posee.

    FK a UserInventory (no a User directamente): garantiza que el marcador
    solo puede existir si el usuario posee la edición. Integridad referencial
    semántica, no solo técnica.
    """
    inventory = models.ForeignKey(
        UserInventory,
        on_delete=models.CASCADE,
        related_name='bookmarks'
    )
    position_cfi = models.CharField(max_length=255)
    note = models.TextField(blank=True, default='')
    # Color en hex para UI (subrayado, resaltado, etc.)
    color = models.CharField(max_length=7, default='#FFFF00')

    class Meta:
        verbose_name = 'User Bookmark'
        verbose_name_plural = 'User Bookmarks'
        indexes = [
            # Índice compuesto: queries de "marcadores de este usuario en este libro"
            # ordenados por fecha de creación.
            models.Index(fields=['inventory', 'created_at'])
        ]

    def __str__(self):
        return f"Bookmark @ {self.position_cfi[:30]} [{self.inventory.user.username}]"
