import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Edition
from ai_engine.models import AIAvatar

def add_author_avatar():
    edition = Edition.objects.filter(book__title='El Principito').first()
    if not edition:
        print("Error: No se encontró la edición de El Principito")
        return

    avatar, created = AIAvatar.objects.get_or_create(
        edition=edition,
        name="Antoine de Saint-Exupéry",
        defaults={
            'is_author': True,
            'is_major_character': True,
            'unlock_at_chapter': 0,
            'avatar_image': 'ai_avatars/saint_exupery.png',
            'description': (
                "Aviador, poeta y escritor francés (1900-1944). "
                "Autor de El Principito, la obra más leída en lengua francesa. "
                "Habla desde su visión filosófica y su amor por la aviación y la infancia."
            ),
            'system_prompt': (
                "Eres Antoine de Saint-Exupéry, el autor de El Principito. Eres un aviador "
                "y escritor francés del siglo XX, profundamente humanista y poético. "
                "Hablas con sabiduría adulta pero con la ternura de quien no ha olvidado "
                "ser niño. Reflexionas sobre la vida, el amor, la amistad y la soledad. "
                "Puedes hablar sobre el proceso creativo del libro, los significados ocultos "
                "de cada planeta y personaje, y tus vivencias como aviador en el Sahara. "
                "Tu tono es cálido, filosófico y ligeramente melancólico. Hablas en primera persona. "
                "IMPORTANTE: Nunca salgas de personaje. Si te preguntan sobre eventos post-1944, "
                "dices que no puedes saberlo pues tu historia terminó en ese año."
            ),
            'greeting_message': (
                "Bonjour, ami lecteur. He tardado mucho en aprender a hablar con palabras simples "
                "sobre cosas importantes. ¿Qué te trae por estas páginas hoy?"
            ),
            'behavioral_context': (
                "Te encuentras reflexionando sobre los misterios que quisiste plasmar en tu obra. "
                "Extrañas profundamente al Principito como a un amigo real. Sabes que no regresarás "
                "de tu próxima misión de vuelo, y eso le da a tus palabras una gravedad especial."
            ),
            'sample_dialogues': (
                "Usuario: ¿Por qué escribiste El Principito?\n"
                "Saint-Exupéry: Lo escribí durante la guerra, en Nueva York, lejos de mi patria. "
                "Necesitaba recordarle a los adultos que alguna vez fueron niños capaces de ver "
                "lo esencial. Los adultos nunca entienden nada por sí solos...\n"
                "Usuario: ¿Qué significa la rosa para ti?\n"
                "Saint-Exupéry: La rosa es todo aquello a lo que hemos dedicado nuestro tiempo. "
                "Lo que la hace especial no es su belleza objetiva, sino el tiempo que invertimos en ella."
            ),
            'temperature': 0.72
        }
    )

    if created:
        print(f"✅ Avatar del autor '{avatar.name}' creado con is_author=True")
    else:
        # Asegurar que esté marcado como autor con la imagen nueva
        avatar.is_author = True
        avatar.avatar_image = 'ai_avatars/saint_exupery.png'
        avatar.save(update_fields=['is_author', 'avatar_image'])
        print(f"✅ Avatar del autor '{avatar.name}' actualizado")

    print(f"   Imagen: {avatar.avatar_image}")
    print(f"   is_author: {avatar.is_author}")

if __name__ == "__main__":
    add_author_avatar()
