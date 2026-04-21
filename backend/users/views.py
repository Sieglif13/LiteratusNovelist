"""
users/views.py — Vistas para Autenticación (SimpleJWT), Registro y Gestión de Perfil.
"""
from rest_framework import generics, permissions
from django.contrib.auth import get_user_model
from .serializers import UserWriteSerializer, UserReadSerializer

User = get_user_model()

class RegisterUserView(generics.CreateAPIView):
    """
    Endpoint POST para registrar usuarios públicos.
    No requiere autenticación. Responde con 201 Created.
    Devuelve los datos vía UserWriteSerializer (limpiando password).
    """
    queryset = User.objects.all()
    serializer_class = UserWriteSerializer
    permission_classes = [permissions.AllowAny]


class UserMeView(generics.RetrieveUpdateAPIView):
    """
    Endpoint GET/PATCH central en /users/me/
    Retorna y actualiza el usuario autenticado actualmente y su Perfil asociado.
    Usa UserReadSerializer (que encubre campos de escritura) para responder.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            # Al actualizar podemos reciclar Write u obligar campos concretos.
            # Aquí, permitiremos la edición vía UserWriteSerializer en el cuerpo de JSON
            # NOTA: Para no sobre-escribir lógica compleja del Profile anidado ahora,
            # lo mantenemos simple. Django permite usar el mismo Serializer.
            return UserWriteSerializer
        return UserReadSerializer

    def get_object(self):
        # Exigimos devolver el objeto del request
        return self.request.user
