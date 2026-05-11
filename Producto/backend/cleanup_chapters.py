import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Book, Chapter

def cleanup():
    try:
        book = Book.objects.get(title='El Príncipe Feliz')
        chapters = list(book.chapters.order_by('order'))
        
        if len(chapters) >= 2:
            # Eliminar los dos primeros (0 y 1)
            c0 = chapters[0]
            c1 = chapters[1]
            print(f"Eliminando {c0.title} (0) y {c1.title} (1)...")
            c0.delete()
            c1.delete()
            
            # Reordenar los restantes
            remaining = book.chapters.order_by('order')
            for i, c in enumerate(remaining):
                c.order = i
                c.save()
                print(f"Reordenado: {c.title} -> {i}")
        else:
            print("No hay suficientes capítulos para eliminar.")
            
    except Book.DoesNotExist:
        print("Libro no encontrado.")

if __name__ == "__main__":
    cleanup()
