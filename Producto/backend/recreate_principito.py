import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Author, Book, BookAuthor, Genre, Edition, Chapter

def run():
    print("Recreando El Principito...")
    author, _ = Author.objects.get_or_create(full_name="Antoine de Saint-Exupéry", defaults={"slug": "antoine-de-saint-exupery"})
    book, _ = Book.objects.get_or_create(title="El Principito", defaults={"slug": "el-principito"})
    BookAuthor.objects.get_or_create(book=book, author=author, role='primary')
    
    edition, _ = Edition.objects.get_or_create(book=book, format='pdf', defaults={"language": "es", "price": 0.00})
    
    # Cap 1 (order=2) as expected by seed_audio_alignment.py
    chapter, _ = Chapter.objects.get_or_create(
        book=book, 
        order=2, 
        defaults={
            "title": "Capítulo I",
            "content_html": "<p>Cuando tenía seis años vi, una vez, una imagen magnífica en un libro sobre la selva virgen titulado Historias vividas.</p>"
        }
    )
    print("El Principito recreado con éxito.")

if __name__ == "__main__":
    run()
