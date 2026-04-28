"""
catalog/models.py — Modelos del catálogo de obras y autores.

DISEÑO 3NF (Tercera Forma Normal):
    Verificación formal del cumplimiento para cada entidad:

    Author:
        - 1NF: Cada columna tiene un valor atómico (full_name no es una lista).
        - 2NF: PK simple (uuid), no hay dependencias parciales posibles.
        - 3NF: No hay dependencias transitivas. 'nationality' no depende de
               'full_name'; depende directamente del autor (la PK).
               'slug' es derivado de 'full_name' pero en DB lo tratamos como
               campo calculado-y-almacenado por performance (razón documentada).

    Genre:
        - Cumple 3NF trivialmente. Solo name + slug, ambos del género.

    Book:
        - 1NF: synopsis es texto atómico. genres y authors son relaciones
               externas (M2M), NO listas dentro del registro → cumple 1NF.
        - 3NF: title, synopsis, cover_image → todos dependen del Book (PK).
               El diseño ERD separa autores y géneros en tablas propias,
               eliminando redundancia. Si un autor escribe 10 libros, su
               nombre aparece UNA vez en Author, no 10 en Book.

    BookAuthor (tabla intermedia explícita):
        - Motivación 3NF: Si guardáramos el campo 'role' (autor, traductor)
          directamente en Book o Author, crearíamos una dependencia transitiva:
          role dependería de (book_id, author_id), no de una sola PK.
          La tabla explícita tiene PK propia y 'role' depende SOLO de esa PK.

    Edition (separada de Book):
        - Motivación 1NF: Un Book puede publicarse en PDF, EPUB y audio.
          Guardar esos formatos como campos FORMAT_PDF, FORMAT_EPUB en Book
          violaría 1NF (grupos repetidos). Edition crea una fila por formato.
        - price está en Edition, NO en Book. Razón: el precio de una edición
          puede cambiar; además, distintos formatos tienen distintos precios.
          Si estuviera en Book, habría dependencia transitiva: price → format.
"""

from django.db import models
from django.utils.text import slugify
from core.models import TimeStampedModel


class Author(TimeStampedModel):
    """
    Entidad autor normalizada. Se desacopla del libro para evitar redundancia
    (3NF): si un autor escribe múltiples libros, sus datos persisten una sola
    vez y se referencian vía BookAuthor.
    """
    full_name = models.CharField(max_length=255)
    # -------------------------------------------------------------------------
    # SLUG: Identificador amigable para URLs (ej. /autores/gabriel-garcia-marquez)
    # blank=True porque lo generamos automáticamente en save() si está vacío.
    # unique=True para garantizar que no haya dos autores con el mismo slug.
    # -------------------------------------------------------------------------
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    bio = models.TextField(blank=True, default='')
    nationality = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        verbose_name = 'Author'
        verbose_name_plural = 'Authors'
        indexes = [
            models.Index(fields=['slug'])
        ]

    def save(self, *args, **kwargs):
        """
        Generación automática de slug en el método save().
        Si el slug está vacío (nuevo registro o se borró manualmente),
        lo generamos desde full_name usando slugify() de Django.

        Ejemplo: "Gabriel García Márquez" → "gabriel-garcia-marquez"

        slugify() maneja: acentos (á→a), espacios (→-), mayúsculas (→lower).
        Luego sanitizamos unicidad añadiendo un sufijo numérico si colisiona.
        """
        if not self.slug:
            base_slug = slugify(self.full_name)
            self.slug = self._unique_slug(base_slug)
        super().save(*args, **kwargs)

    def _unique_slug(self, base_slug):
        """Garantiza slug único añadiendo sufijo numérico si hay colisión."""
        slug = base_slug
        counter = 1
        # Excluimos el registro propio al actualizar (usando pk)
        while Author.all_objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def __str__(self):
        return self.full_name


class Genre(TimeStampedModel):
    """
    Género literario. Entidad independiente que cumple 3NF:
    cada atributo depende directamente de la PK (el género en sí).
    """
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        verbose_name = 'Genre'
        verbose_name_plural = 'Genres'
        indexes = [
            models.Index(fields=['slug'])
        ]

    def save(self, *args, **kwargs):
        """Auto-genera slug desde name si está vacío."""
        if not self.slug:
            base_slug = slugify(self.name)
            self.slug = self._unique_slug(base_slug)
        super().save(*args, **kwargs)

    def _unique_slug(self, base_slug):
        """Garantiza slug único con sufijo numérico."""
        slug = base_slug
        counter = 1
        while Genre.all_objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def __str__(self):
        return self.name


class Book(TimeStampedModel):
    """
    El concepto abstracto de una obra (e.g. "Cien años de soledad").
    NO contiene precio, formato ni archivo — violaria 1NF y 3NF.
    Esas responsabilidades son de Edition.
    """
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    synopsis = models.TextField(blank=True, default='')
    
    # Campo para destacar libros en la Landing Page
    is_featured = models.BooleanField(
        default=False,
        help_text="Marcar como True para destacar este libro en la Landing Page."
    )
    
    cover_image = models.ImageField(
        upload_to='book_covers/',
        null=True,
        blank=True
    )
    # M2M simple (sin datos extra en la relación)
    genres = models.ManyToManyField(Genre, related_name='books', blank=True)
    # M2M con tabla intermedia explícita para soportar el campo 'role'
    authors = models.ManyToManyField(Author, through='BookAuthor', related_name='books')

    class Meta:
        verbose_name = 'Book'
        verbose_name_plural = 'Books'
        indexes = [
            models.Index(fields=['slug'])
        ]

    def save(self, *args, **kwargs):
        """Auto-genera slug desde title si está vacío."""
        if not self.slug:
            base_slug = slugify(self.title)
            self.slug = self._unique_slug(base_slug)
        super().save(*args, **kwargs)

    def _unique_slug(self, base_slug):
        """Garantiza slug único con sufijo numérico."""
        slug = base_slug
        counter = 1
        while Book.all_objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def __str__(self):
        return self.title


class BookAuthor(TimeStampedModel):
    """
    Tabla intermedia EXPLÍCITA para la relación M2M Book-Author.

    FUNDAMENTO 3NF: Si el campo 'role' (autor principal, traductor, editor)
    estuviera directamente en Book o Author, causaría una dependencia transitiva:
        role → dependería de (book_id, author_id), no de la PK de Book ni de Author.
    Al crear BookAuthor con su propio UUID PK, 'role' depende únicamente de
    esta PK, satisfaciendo 3NF formalmente.

    Fundamento adicional: permite que el mismo autor aparezca en el mismo libro
    con roles distintos (ej. traductor Y prologuista).
    """
    class RoleChoices(models.TextChoices):
        PRIMARY = 'primary', 'Primary Author'
        TRANSLATOR = 'translator', 'Translator'
        EDITOR = 'editor', 'Editor'

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='book_authors')
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name='author_books')
    role = models.CharField(max_length=20, choices=RoleChoices.choices, default=RoleChoices.PRIMARY)

    class Meta:
        unique_together = ('book', 'author', 'role')

    def __str__(self):
        return f"{self.author} ({self.get_role_display()}) → {self.book}"


class Edition(TimeStampedModel):
    """
    Una publicación específica de una obra: formato + precio + asset.

    FUNDAMENTO 1NF: Un libro puede publicarse en PDF, EPUB y audio.
    Almacenar esos formatos como columnas en Book (FORMAT_PDF, FORMAT_EPUB...)
    violaría 1NF al crear grupos repetidos. Edition crea una fila por formato.

    FUNDAMENTO 3NF: 'price' está aquí y NO en Book porque el precio es un
    atributo de la edición específica (puede variar entre formatos y cambiar
    en el tiempo), no del libro abstracto.

    PROTECCIÓN DE ARCHIVOS:
    Los archivos (PDF/EPUB/audio) se almacenan en 'book_files/' que debe ser
    configurado como directorio PRIVADO (fuera de MEDIA_ROOT público).
    El acceso se controla a través de la API (view requiere autenticación +
    verificación de UserInventory). Ver configuración en config/settings.py.
    """
    class FormatChoices(models.TextChoices):
        EPUB = 'epub', 'EPUB'
        PDF = 'pdf', 'PDF'
        AUDIO = 'audio', 'Audiobook'

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='editions')
    language = models.CharField(max_length=10, default='es')

    # ISBN: identificador estándar de la industria editorial. Puede ser NULL
    # para obras sin ISBN formal (e.g., autopublicaciones).
    isbn = models.CharField(max_length=13, unique=True, null=True, blank=True)

    format = models.CharField(max_length=10, choices=FormatChoices.choices, default=FormatChoices.EPUB)

    # DecimalField para dinero: NUNCA usar FloatField para valores monetarios.
    # FloatField usa punto flotante binario y acumula errores de redondeo
    # (0.1 + 0.2 ≠ 0.3 en IEEE 754). DecimalField es exacto.
    price = models.DecimalField(max_digits=10, decimal_places=2)

    # -------------------------------------------------------------------------
    # PROTECCIÓN DE ARCHIVOS DIGITALES
    # upload_to='protected/book_files/' → directorio 'protected/' que se
    # configura en settings.py como PRIVATE_MEDIA_ROOT (fuera de MEDIA_URL).
    # Django nunca servirá estos archivos directamente desde MEDIA_ROOT.
    # El acceso requiere pasar por una view autenticada que:
    #   1. Verifica JWT del usuario.
    #   2. Verifica que UserInventory.objects.filter(user=req.user, edition=edition).exists()
    #   3. Solo entonces devuelve el archivo con X-Accel-Redirect (Nginx) o
    #      sendfile (para producción) / FileResponse (para desarrollo).
    # -------------------------------------------------------------------------
    file = models.FileField(
        upload_to='protected/book_files/',
        help_text=(
            "Archivo del libro. Almacenado en directorio protegido. "
            "Nunca servir directamente desde MEDIA_URL; usar la view "
            "de descarga autenticada en library/views.py."
        )
    )

    published_date = models.DateField(null=True, blank=True)
    publisher = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        verbose_name = 'Edition'
        verbose_name_plural = 'Editions'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(price__gte=0),
                name='price_gte_0',
                # El precio puede ser 0 para obras gratuitas, pero nunca negativo.
                violation_error_message="El precio no puede ser negativo."
            )
        ]

    def __str__(self):
        return f"{self.book.title} [{self.get_format_display()}] - {self.language}"


class Chapter(TimeStampedModel):
    """
    Representa un capítulo individual de un libro con su contenido HTML procesado.
    """
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveIntegerField()
    content_html = models.TextField()

    class Meta:
        verbose_name = 'Chapter'
        verbose_name_plural = 'Chapters'
        ordering = ['order']

    def __str__(self):
        return f"{self.book.title} - {self.title or f'Chapter {self.order}'}"

