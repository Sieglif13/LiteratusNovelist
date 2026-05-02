from rest_framework import serializers
from .models import User, Profile

class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializador del perfil del usuario.
    Solo expone datos no-sensibles de visualización como Avatar y Biografía.
    """
    class Meta:
        model = Profile
        fields = ['id', 'avatar', 'bio', 'country', 'preferred_language', 'ink_balance']

class UserReadSerializer(serializers.ModelSerializer):
    """
    Serializador de LECTURA. 
    Se usa para proveer la información pública de un usuario logueado 
    o de otra cuenta. Excluye estrictamente campos de encriptación y hashes.
    """
    profile = ProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'profile', 'created_at']

class UserWriteSerializer(serializers.ModelSerializer):
    """
    Serializador de ESCRITURA (Creación/Registro).
    Garantiza que la contraseña nunca se exponga (write_only) y crea el 
    perfil paralelo atado en la misma transacción (Señal en DB / Create Override).
    """
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data) # Hash automático de pass
        # Perfil se crea vía señal en users/signals.py para asegurar ink_balance = 150
        return user
