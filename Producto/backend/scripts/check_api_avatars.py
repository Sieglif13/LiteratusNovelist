
import os
import django
import sys
import json
from uuid import UUID

class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)

# Set up Django environment
sys.path.append(r'c:\Users\emili\Proyecto\LiteratusNovelist\Producto\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from library.models import UserInventory
from rest_framework.test import APIRequestFactory, force_authenticate
from ai_engine.views import AIAvatarViewSet

inventory_id = 'b5fff027-e10a-4aab-97da-8e2ea5a15ed4' # El príncipe feliz y otros cuentos

try:
    inventory = UserInventory.objects.get(id=inventory_id)
    user = inventory.user
    
    factory = APIRequestFactory()
    view = AIAvatarViewSet.as_view({'get': 'list'})
    request = factory.get(f'/api/v1/ai/avatars/?inventory_id={inventory_id}')
    force_authenticate(request, user=user)
    
    response = view(request)
    print(f"Status Code: {response.status_code}")
    print("Response Data:")
    print(json.dumps(response.data, indent=2, cls=UUIDEncoder))
    
except Exception as e:
    print(f"Error: {e}")
