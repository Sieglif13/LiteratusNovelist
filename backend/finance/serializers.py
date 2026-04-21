from rest_framework import serializers
from .models import Order, OrderItem, Transaction

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'edition', 'unit_price', 'quantity']
        read_only_fields = ['unit_price'] # Prevents manual manipulation in API

class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = ['id', 'items', 'total_amount']
        
    # Transaction atomic create would go here to set items

class OrderReadSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'status', 'total_amount', 'items', 'created_at']

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'order', 'provider', 'status', 'amount', 'token', 'created_at']
