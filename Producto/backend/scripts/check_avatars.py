import sys
import os
# Add parent directory to path to allow importing django config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from ai_engine.models import AIAvatar

# Buscar todos los "La Golondrina"
avs = AIAvatar.objects.filter(name__icontains='Golondrina').select_related('edition__book')
for av in avs:
    print("---")
    print(f"ID:       {av.pk}")
    print(f"Nombre:   {av.name}")
    print(f"Libro:    {av.edition.book.title}")
    print(f"Prompt:   {repr(av.system_prompt[:100]) if av.system_prompt else 'VACÍO'}")
    print(f"Saludo:   {repr(av.greeting_message[:60])}")

print("\n--- Todos los avatares con system_prompt vacío ---")
empty = AIAvatar.objects.filter(system_prompt='').select_related('edition__book')
print(f"Total vacíos: {empty.count()}")
for av in empty[:15]:
    print(f"  [{av.edition.book.title}] {av.name}")
