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

def check_missing():
    books_without_avatars = []
    all_books = Book.objects.all()
    
    for b in all_books:
        if not AIAvatar.objects.filter(edition__book=b).exists():
            edition = b.editions.first()
            has_edition = "Yes" if edition else "No"
            books_without_avatars.append({
                "id": b.id,
                "title": b.title,
                "has_edition": has_edition
            })
    
    print(f"Total books without avatars: {len(books_without_avatars)}")
    for item in books_without_avatars:
        print(f"- {item['title']} (ID: {item['id']}, Edition: {item['has_edition']})")

if __name__ == '__main__':
    check_missing()
