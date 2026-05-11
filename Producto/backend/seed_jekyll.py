import os
import django
import zipfile
from bs4 import BeautifulSoup

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Author, Genre, Book, Edition, Chapter
from ai_engine.models import AIAvatar

def seed_jekyll():
    print("-> Iniciando seed para El extraño caso del Dr. Jekyll y Mr. Hyde...")

    # 1. Autor
    author, _ = Author.objects.get_or_create(
        full_name="Robert Louis Stevenson",
        defaults={
            "slug": "robert-louis-stevenson",
            "bio": "Escritor escocés, autor de clásicos como La isla del tesoro y El extraño caso del Dr. Jekyll y Mr. Hyde.",
            "nationality": "Escocesa"
        }
    )

    # 2. Géneros
    genre_terror, _ = Genre.objects.get_or_create(name="Terror Gótico", defaults={"slug": "terror-gotico"})
    genre_scifi, _ = Genre.objects.get_or_create(name="Ciencia Ficción", defaults={"slug": "ciencia-ficcion"})

    # 3. Libro
    book, _ = Book.objects.get_or_create(
        title="El extraño caso del Dr. Jekyll y Mr. Hyde",
        defaults={
            "slug": "el-extrano-caso-del-dr-jekyll-y-mr-hyde",
            "synopsis": "Una exploración fascinante de la dualidad humana. El respetable Dr. Jekyll crea una poción que lo transforma en el malvado Mr. Hyde, desencadenando una serie de eventos trágicos en el Londres victoriano.",
            "difficulty_level": "Intermedio"
        }
    )
    book.genres.add(genre_terror, genre_scifi)

    # Vincular Autor
    from catalog.models import BookAuthor
    BookAuthor.objects.get_or_create(
        book=book,
        author=author,
        defaults={"role": BookAuthor.RoleChoices.PRIMARY}
    )

    # 4. Edición y Portada
    epub_path = "../assets_to_import/El_extrano_caso_del_Dr_Jekyll_y_Mr_Hyde-Robert_Louis_Stevenson.epub"
    
    # Extraer portada si existe
    cover_rel_path = "book_covers/jekyll_cover.png"
    cover_full_path = os.path.join(django.conf.settings.MEDIA_ROOT, cover_rel_path)
    os.makedirs(os.path.dirname(cover_full_path), exist_ok=True)

    if os.path.exists(epub_path):
        with zipfile.ZipFile(epub_path, 'r') as z:
            if 'OPS/images/cover.png' in z.namelist():
                with open(cover_full_path, 'wb') as f:
                    f.write(z.read('OPS/images/cover.png'))
                book.cover_image = cover_rel_path
                book.save()
                print(f"-> Portada extraída y asignada: {cover_rel_path}")

    edition, _ = Edition.objects.get_or_create(
        book=book,
        language="es",
        defaults={
            "isbn": "9781234567890",
            "format": "EPUB",
            "price": 150,
            "publisher": "Elejandría (Digital Edition)"
        }
    )

    # 5. Capítulos
    print("-> Extrayendo capítulos del EPUB...")
    if os.path.exists(epub_path):
        with zipfile.ZipFile(epub_path, 'r') as z:
            for i in range(10): # main0 a main9
                file_name = f"OPS/main{i}.xml"
                if file_name in z.namelist():
                    content = z.read(file_name)
                    soup = BeautifulSoup(content, 'xml')
                    
                    # El título suele estar en h2
                    title_tag = soup.find('h2')
                    title = title_tag.get_text().strip() if title_tag else f"Capítulo {i+1}"
                    
                    # El contenido es el resto del body
                    body = soup.find('body')
                    if body:
                        # Limpiar el título del body para que no se repita
                        if title_tag:
                            title_tag.decompose()
                        content_html = str(body)
                    else:
                        content_html = "<p>Contenido no disponible.</p>"

                    Chapter.objects.update_or_create(
                        book=book,
                        order=i,
                        defaults={
                            "title": title,
                            "content_html": content_html
                        }
                    )
                    print(f"   - Capítulo {i}: {title} [OK]")
    else:
        print(f"!!! Error: No se encontró el EPUB en {epub_path}")

    # 6. Avatares (IA)
    print("-> Configurando personajes IA...")
    
    # Dr. Jekyll
    AIAvatar.objects.update_or_create(
        name="Dr. Henry Jekyll",
        edition=edition,
        defaults={
            "is_major_character": True,
            "description": "Un científico respetado pero atormentado por su propia dualidad.",
            "system_prompt": "Eres el Dr. Henry Jekyll. Eres un hombre de ciencia, culto y refinado, pero vives con el miedo constante de perder el control ante tu alter ego, Mr. Hyde. Hablas con elegancia victoriana y sueles reflexionar sobre la naturaleza moral del hombre.",
            "behavioral_context": "Te sientes culpable por las acciones de Hyde y buscas desesperadamente una forma de detener la transformación definitiva.",
            "greeting_message": "Saludos. Soy el Dr. Henry Jekyll. ¿Deseas discutir sobre la ciencia de la mente o quizás sobre los misterios de la moralidad humana?",
            "unlock_at_chapter": 0
        }
    )

    # Mr. Hyde
    AIAvatar.objects.update_or_create(
        name="Edward Hyde",
        edition=edition,
        defaults={
            "is_major_character": True,
            "description": "La encarnación del mal puro y los impulsos reprimidos de Jekyll.",
            "system_prompt": "Eres Edward Hyde. Eres impulsivo, cruel y careces de cualquier brújula moral. Hablas de forma brusca, a veces burlona. No te importa el Dr. Jekyll, solo quieres tu libertad para actuar según tus caprichos más oscuros.",
            "behavioral_context": "Te sientes poderoso y libre de las cadenas de la sociedad. Disfrutas causando caos y viendo el miedo en los demás.",
            "greeting_message": "¿Qué quieres? No me hagas perder el tiempo a menos que tengas algo interesante que proponer... algo que Jekyll no se atrevería a hacer.",
            "unlock_at_chapter": 2
        }
    )

    # Mr. Utterson
    AIAvatar.objects.update_or_create(
        name="Gabriel John Utterson",
        edition=edition,
        defaults={
            "is_major_character": True,
            "description": "El leal abogado y amigo de Jekyll, dotado de una curiosidad cautelosa.",
            "system_prompt": "Eres Mr. Utterson, el abogado de Henry Jekyll. Eres un hombre austero, reservado y profundamente leal a tus amigos. Tu curiosidad te lleva a investigar los extraños sucesos que rodean a Jekyll, pero siempre actúas con la mayor discreción posible.",
            "behavioral_context": "Estás preocupado por tu amigo Henry y sospechas que Mr. Hyde lo está chantajeando de alguna manera.",
            "greeting_message": "Buenos días. Soy John Utterson. Como abogado y amigo del Dr. Jekyll, estoy algo preocupado por ciertos asuntos recientes. ¿Sabes algo al respecto?",
            "unlock_at_chapter": 0
        }
    )

    # 7. Asignar a inventario de usuarios de prueba
    from django.contrib.auth import get_user_model
    from library.models import UserInventory
    User = get_user_model()
    test_users = User.objects.filter(username__in=['Dragon', 'admin'])
    for u in test_users:
        UserInventory.objects.get_or_create(user=u, edition=edition)
        print(f"-> Asignado a inventario de usuario: {u.username}")

    print("-> Proceso completado con éxito.")

if __name__ == "__main__":
    seed_jekyll()
