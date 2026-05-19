import os
import sys
import os
# Add parent directory to path to allow importing django config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Book
from ai_engine.models import AIAvatar

def check_books_without_avatars():
    # Buscamos libros que no tengan avatares relacionados a través de sus ediciones
    books = Book.objects.all()
    missing = []
    
    for book in books:
        # Un libro puede tener varias ediciones, chequeamos si alguna tiene avatares
        has_avatars = AIAvatar.objects.filter(edition__book=book).exists()
        if not has_avatars:
            missing.append(book)
            
    print(f"--- REPORTE DE LIBROS ---")
    print(f"Total de libros: {books.count()}")
    print(f"Libros sin personajes: {len(missing)}")
    
    if missing:
        print("\nPrimeros 10 libros sin personajes:")
        for b in missing[:10]:
            print(f"  - {b.title} (Slug: {b.slug})")

if __name__ == "__main__":
    check_books_without_avatars()
