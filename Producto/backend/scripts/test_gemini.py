import os
import sys
import os
# Add parent directory to path to allow importing django config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from catalog.management.commands.sync_gutenberg import Command

c = Command()
c.api_keys = [os.environ.get("GOOGLE_API_KEY")]
from google import genai
c.gemini_client = genai.Client(api_key=c.api_keys[0])

print("Llamando a Gemini...")
res = c._call_gemini('Don Quijote', 'Miguel de Cervantes Saavedra', ['Literatura', 'Clásico'])
print("Respuesta:")
print(res)
