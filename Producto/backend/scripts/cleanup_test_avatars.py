import os
import sys
import os
# Add parent directory to path to allow importing django config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from ai_engine.models import AIAvatar

def cleanup_recent_avatars():
    # Buscamos avatares creados en los últimos 15 minutos
    time_threshold = timezone.now() - timedelta(minutes=15)
    recent_avatars = AIAvatar.objects.filter(created_at__gte=time_threshold)
    
    count = recent_avatars.count()
    if count > 0:
        print(f"Eliminando {count} personajes generados en la ultima prueba...")
        recent_avatars.delete()
        
        # También limpiamos el JSON para que empiece de cero
        if os.path.exists('json_data/characters_to_generate.json'):
            os.remove('json_data/characters_to_generate.json')
            
        print("Limpieza completada. Pizarra en blanco lista para la version Premium.")
    else:
        print("No se encontraron personajes recientes que limpiar.")

if __name__ == "__main__":
    cleanup_recent_avatars()
