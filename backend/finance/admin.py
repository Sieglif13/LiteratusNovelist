from django.contrib import admin
from .models import Order, OrderItem, Transaction

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['unit_price']

class TransactionInline(admin.TabularInline):
    model = Transaction
    extra = 0
    readonly_fields = ['token', 'metadata', 'created_at']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'total_amount', 'created_at']
    list_filter = ['status', 'created_at']
    inlines = [OrderItemInline, TransactionInline]

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['token', 'order', 'provider', 'status', 'amount']
    list_filter = ['status', 'provider']
