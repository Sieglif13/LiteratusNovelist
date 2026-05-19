from django.contrib.auth import get_user_model
from catalog.models import Edition
from library.models import UserInventory
from users.models import Profile

User = get_user_model()
u = User.objects.get(username='admin')
u.is_staff = True
u.is_superuser = True
u.save()

p, _ = Profile.objects.get_or_create(user=u)
p.ink_balance = 2000
p.save()

# Borrar inventario viejo y recrear
UserInventory.objects.filter(user=u).delete()
for ed in Edition.objects.all():
    inv = UserInventory.objects.create(user=u, edition=ed)
    print(f"Asignado: {ed.book.title} -> ID Inventario: {inv.id}")

print("--- TODO LISTO PARA ADMIN ---")
