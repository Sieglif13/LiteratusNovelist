import os
from google import genai
from django.conf import settings
import sys
import os
# Add parent directory to path to allow importing django config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

# Setup django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def list_models():
    api_key = getattr(settings, 'GOOGLE_API_KEY', os.environ.get('GOOGLE_API_KEY'))
    client = genai.Client(api_key=api_key)
    print(f"\n--- LISTANDO MODELOS DISPONIBLES PARA TU LLAVE ---")
    try:
        # Intentar listar modelos
        for model in client.models.list():
            print(f"ID: {model.name} | Display: {model.display_name}")
    except Exception as e:
        print(f"Error al listar: {e}")
    print("--------------------------------------------------\n")

if __name__ == "__main__":
    list_models()
