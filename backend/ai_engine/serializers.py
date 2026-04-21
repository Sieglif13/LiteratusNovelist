from rest_framework import serializers

class ChatInteractionSerializer(serializers.Serializer):
    """
    Serializador diseñado para la entrada dinámica del endpoint de chat.
    Validando session de entrada, mensaje interactivoy el modo de comportamiento opcional.
    """
    session_id = serializers.IntegerField(required=True)
    message = serializers.CharField(required=True, max_length=2000)
    mode = serializers.ChoiceField(
        choices=['roleplay', 'tutor', 'critical'], 
        default='roleplay',
        required=False
    )
