"""
finance/models.py — Modelos de Ventas y Pagos.

DISEÑO 3NF:

    Order:
        - 'total_amount' es un campo desnormalizado intencional.
          En 3NF estricta, podría derivarse sumando OrderItem.unit_price * quantity.
          Lo mantenemos como snapshot por dos razones:
          a) Rendimiento: evitar un SUM() en cada request.
          b) Inmutabilidad: el total del pedido debe quedar fijo en el momento de
             la venta; si un item se elimina por error, la Order refleja lo que
             el cliente VIO y PAGÓ.
          Esta desnormalización está documentada y es deliberada.

    OrderItem:
        - 'unit_price' es CRÍTICO para la normalización.
          Si usáramos edition.price al momento de renderizar, el historial
          de compras cambiaría retroactivamente cuando la editorial actualiza
          el precio. 'unit_price' captura el precio en el instante de la compra
          (snapshot inmutable), cumpliendo integridad temporal.

    Transaction:
        - Separada de Order para soportar múltiples intentos de pago.
          (Un usuario puede fallar el pago y reintentarlo).
          Cada Transaction es un log ACID inmutable del intento con la pasarela.
          'metadata' (JSONField) guarda la respuesta cruda de Webpay/Transbank
          para auditoría, sin definir su esquema en Column (flexibilidad).
"""

from django.db import models
from core.models import TimeStampedModel
from users.models import User
from catalog.models import Edition


class Order(TimeStampedModel):
    """
    Cabecera del pedido de compra.
    Agrupa los OrderItems y registra el estado del flujo de pago.
    """
    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'
        CANCELLED = 'cancelled', 'Cancelled'
        REFUNDED = 'refunded', 'Refunded'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders') # Referencia al usuario que realizó la compra.
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    ) # Estado actual del pedido (Pendiente, Pagado, Cancelado, etc).
    # Snapshot del total al momento de la compra. Ver justificación en el docstring del módulo.
    total_amount = models.DecimalField(max_digits=10, decimal_places=2) # Monto total cobrado por todo el pedido, inmutable tras el pago.

    class Meta:
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(total_amount__gte=0),
                name='order_total_gte_0',
                violation_error_message="El total del pedido no puede ser negativo."
            )
        ]
        indexes = [
            # Índice compuesto (user, status): optimiza la query más frecuente
            # de la API: "mis pedidos pendientes" → WHERE user_id=X AND status='pending'
            models.Index(fields=['user', 'status'])
        ]

    def __str__(self):
        return f"Order {self.pk} — {self.user.username} [{self.get_status_display()}]"


class OrderItem(TimeStampedModel):
    """
    Línea de pedido. Cada item corresponde a una Edition específica.
    'unit_price' es un snapshot inmutable — ver justificación en docstring del módulo.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items') # Referencia a la orden general.
    # PROTECT: no permitir borrar una Edition si hay OrderItems que la referencian.
    # Garantiza integridad del historial de ventas.
    edition = models.ForeignKey(Edition, on_delete=models.PROTECT, related_name='order_items') # Referencia a la Edición específica adquirida.

    # Snapshot del precio en el momento de la compra.
    # NUNCA modificar post-creación. Ver justificación en docstring del módulo.
    unit_price = models.DecimalField(max_digits=10, decimal_places=2) # Precio pagado por esta edición exacta, congelado en el tiempo.
    quantity = models.PositiveIntegerField(default=1) # Cantidad comprada de esta edición.

    class Meta:
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(unit_price__gte=0),
                name='item_price_gte_0',
                violation_error_message="El precio unitario no puede ser negativo."
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name='item_quantity_gt_0',
                violation_error_message="La cantidad debe ser al menos 1."
            )
        ]

    def __str__(self):
        return f"{self.edition} x{self.quantity} (${self.unit_price})"


class Transaction(TimeStampedModel):
    """
    Log inmutable de intentos de pago con la pasarela (Webpay/Transbank).

    RAZÓN DE SEPARACIÓN (3NF): Si los datos de pago estuvieran en Order,
    un segundo intento de pago (tras un fallo) requeriría actualizar campos
    en Order, perdiendo el historial del primer intento. Transaction permite
    múltiples filas por Order, preservando cada intento como registro separado.
    """
    class StatusChoices(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        PENDING = 'pending', 'Pending'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='transactions') # Referencia al pedido que se intentó pagar.
    # Nombre de la pasarela de pago (Webpay, MercadoPago, etc.)
    provider = models.CharField(max_length=50) # El nombre del proveedor de pagos utilizado.
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    ) # Estado de este intento de pago específico.
    amount = models.DecimalField(max_digits=10, decimal_places=2) # Monto procesado en esta transacción.
    # Token único de la transacción devuelto por la pasarela. Necesario para
    # confirmar o revertir el pago con la API del proveedor.
    token = models.CharField(max_length=255, unique=True) # Identificador de transacción de la pasarela de pago (ej. Token Webpay).
    # Log crudo de la respuesta de la pasarela (para auditoría y debugging).
    # JSONField→ flexible, no requiere migración si el proveedor cambia su respuesta.
    metadata = models.JSONField(blank=True, default=dict) # Registro de datos técnicos entregados por la pasarela de pago para auditoría.

    class Meta:
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        indexes = [
            # Índice en created_at: consultas de auditoría cronológica frecuentes.
            models.Index(fields=['created_at'])
        ]

    def __str__(self):
        return f"Txn {self.token[:12]}... [{self.get_status_display()}]"
