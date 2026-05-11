import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from ai_engine.models import AIAvatar
from catalog.models import Book

def run():
    b = Book.objects.get(slug='el-principe-feliz')
    ed = b.editions.first()
    
    # Limpiar Oscar Wilde si existe como avatar
    AIAvatar.objects.filter(edition__book=b, name__icontains='Oscar Wilde').delete()
    
    characters = [
        ('El Príncipe Feliz', 'Una estatua cubierta de oro y joyas que, al ver la miseria de su ciudad, decide ayudar a los pobres.', 'avatars/happy_prince.png'),
        ('La Golondrina', 'Un ave que se refugia en la estatua y actúa como mensajera del príncipe.', 'avatars/swallow.png'),
        ('La Costurera', 'Una mujer pobre que trabaja incansablemente mientras su hijo sufre de fiebre.', 'avatars/seamstress.png'),
        ('El Dramaturgo', 'Un joven escritor que pasa hambre y frío en una buhardilla mientras intenta terminar su obra.', 'avatars/playwright.png'),
        ('La Niña de los Fósforos', 'Una pequeña vendedora de cerillas que vive en la extrema pobreza en las calles frías.', 'avatars/match_girl.png'),
        ('El Alcalde', 'El líder de la ciudad, más preocupado por las apariencias y los monumentos que por la gente.', 'avatars/mayor.png'),
        ('El Ángel', 'Enviado por Dios para recoger las dos cosas más valiosas de la ciudad.', None)
    ]
    
    for name, desc, img in characters:
        defaults = {'description': desc}
        if img:
            defaults['avatar_image'] = img
            
        avatar, created = AIAvatar.objects.update_or_create(
            edition=ed, 
            name=name, 
            defaults=defaults
        )
        print(f'Avatar {name} {"creado" if created else "actualizado"}.')

if __name__ == "__main__":
    run()
