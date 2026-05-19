import os
import sys
import os
# Add parent directory to path to allow importing django config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Book, Author, Genre, Tag

def cleanup():
    # IDs of the books to KEEP
    PROTECTED_IDS = [
        'c776d72a-923a-4597-95c5-ddba161b967c', # El príncipe feliz
        '18881dea-6ccb-49d1-ae82-2d966fadef73', # El Principito
        'bbd06464-b035-47b8-b3f7-6c44253f3404'  # Dr. Jekyll
    ]

    print("--- DB CLEANUP START ---")
    
    # 1. Delete books not in protected list
    books_to_delete = Book.objects.exclude(id__in=PROTECTED_IDS)
    count = books_to_delete.count()
    print(f"Deleting {count} books from database...")
    
    # Cascade will handle Editions, Chapters, BookAuthors, Reviews
    books_to_delete.delete()
    print("Books deleted successfully.")

    # 2. Cleanup Authors without books
    authors_without_books = Author.objects.filter(books__isnull=True)
    author_count = authors_without_books.count()
    print(f"Deleting {author_count} authors without books...")
    authors_without_books.delete()

    # 3. Cleanup Genres without books
    genres_without_books = Genre.objects.filter(books__isnull=True)
    genre_count = genres_without_books.count()
    print(f"Deleting {genre_count} genres without books...")
    genres_without_books.delete()

    # 4. Cleanup Tags without books
    tags_without_books = Tag.objects.filter(books__isnull=True)
    tag_count = tags_without_books.count()
    print(f"Deleting {tag_count} tags without books...")
    tags_without_books.delete()

    print("--- DB CLEANUP FINISHED ---")

if __name__ == "__main__":
    cleanup()
