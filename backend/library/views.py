"""
library/views.py — Vistas para la Biblioteca del Usuario.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404

from .models import UserInventory, ReadingProgress, UserBookmark
from .serializers import UserInventorySerializer, ReadingProgressSerializer, UserBookmarkSerializer

class UserInventoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Gestiona la biblioteca personal del usuario autenticado.
    No permite crear vía API (la compra se encarga de crear el UserInventory),
    ni editar/borrar por seguridad en la auditoría.
    """
    serializer_class = UserInventorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Restringe el queryset estrictamente al dueño de la petición."""
        return UserInventory.objects.filter(user=self.request.user).select_related('edition__book', 'progress')

    @action(detail=True, methods=['GET'], url_path='download')
    def download_edition(self, request, pk=None):
        """
        SERVICIO DE DESCARGAS SEGURAS.
        Endpoint custom: /api/v1/library/inventory/{id}/download/
        Valida explícitamente que el inventario pertenece al usuario antes 
        de servir el contenido protegido en FileResponse.
        """
        inventory_item = self.get_object() # Llama a self.get_queryset(), que ya valida el request.user
        edition = inventory_item.edition

        if not edition.file:
            return Response({"error": "No hay un archivo digital adjunto a esta edición."}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Django devuelve un iterador asíncrono para archivos grandes
            # En producción, esto se puede reemplazar por un response con "X-Accel-Redirect"
            response = FileResponse(edition.file.open('rb'))
            response['Content-Disposition'] = f'attachment; filename="{edition.file.name.split("/")[-1]}"'
            return response
        except FileNotFoundError:
            raise Http404("El archivo de la obra no fue localizado en el servidor privado.")

    @action(detail=True, methods=['GET'], url_path='chapters')
    def chapters(self, request, pk=None):
        """
        SERVICIO DE LECTURA HTML BROWSER-NATIVE.
        Devuelve el contenido en HTML de los capítulos guardados en base de datos.
        """
        inventory_item = self.get_object()
        book = inventory_item.edition.book
        chapters = book.chapters.all()
        data = [{'id': c.id, 'title': c.title, 'order': c.order, 'content_html': c.content_html} for c in chapters]
        return Response(data)

class ReadingProgressViewSet(viewsets.ModelViewSet):
    """
    Control de Progreso.
    Se limitan los métodos a Recuperar (GET) y Actualización Parcial Asíncrona (PATCH).
    """
    serializer_class = ReadingProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch'] # Bloqueamos POST, DELETE, PUT

    def get_queryset(self):
        # Filtramos por el usuario dueño a través del inventario
        return ReadingProgress.objects.filter(inventory__user=self.request.user)

class UserBookmarkViewSet(viewsets.ModelViewSet):
    """
    Control de Notas (Bookmarks).
    Permite CRUD completo. Restringido a que pertenezca al usuario.
    """
    serializer_class = UserBookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserBookmark.objects.filter(inventory__user=self.request.user)

    def perform_create(self, serializer):
        """
        Almacenar la nota. Validación extra: debemos confirmar que el `inventory` 
        que entra en la validación del Serializer de verdad es propiedad del `request.user`.
        """
        inventory = serializer.validated_data['inventory']
        if inventory.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No puedes añadir marcadores a una librería que no te pertenece.")
        serializer.save()
