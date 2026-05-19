import os
import sys
import os
# Add parent directory to path to allow importing django config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Author, BookAuthor

def merge_authors(primary_name, duplicate_names):
    """
    Fusiona autores duplicados en uno principal.
    Mueve todos los libros de los duplicados al principal y luego borra los duplicados.
    """
    try:
        # 1. Encontrar al autor principal
        primary_author = Author.objects.filter(full_name__icontains=primary_name).first()
        if not primary_author:
            print(f"Error: No se encontro el autor principal '{primary_name}'")
            return

        print(f"Autor Principal Seleccionado: {primary_author.full_name} (ID: {primary_author.id})")

        books_moved = 0
        authors_deleted = 0

        # 2. Iterar sobre cada variante de nombre duplicada
        for dup_name in duplicate_names:
            duplicates = Author.objects.filter(full_name__icontains=dup_name).exclude(id=primary_author.id)
            
            for dup_author in duplicates:
                print(f"  Fusionando clon: '{dup_author.full_name}'...")
                
                # Encontrar todos los enlaces BookAuthor de este duplicado
                links = BookAuthor.objects.filter(author=dup_author)
                
                for link in links:
                    # Comprobar si el autor principal ya está en este libro para no crear un duplicado de enlace
                    if not BookAuthor.objects.filter(book=link.book, author=primary_author).exists():
                        link.author = primary_author
                        link.save()
                        books_moved += 1
                        print(f"    Libro reasignado: '{link.book.title}'")
                    else:
                        # Si ya existe, simplemente borramos este enlace redundante
                        link.delete()
                
                # Borrar el autor duplicado
                dup_author.delete()
                authors_deleted += 1

        print(f"\nFusion Completada para {primary_name}")
        print(f"  - Libros reasignados: {books_moved}")
        print(f"  - Autores duplicados eliminados: {authors_deleted}")

    except Exception as e:
        print(f"Ocurrio un error inesperado: {e}")

if __name__ == "__main__":
    print("--- HERRAMIENTA DE FUSIÓN DE AUTORES ---")
    
    print("Fusionando a Friedrich Nietzsche...")
    merge_authors(
        primary_name="Friedrich Nietzsche",
        duplicate_names=[
            "Friedich Nietzsche", # El error tipográfico real encontrado en BD
        ]
    )

    print("Fusionando a William Shakespeare...")
    merge_authors(
        primary_name="William Shakespeare",
        duplicate_names=[
            "William Shakesperare", # El error tipográfico de la importación
        ]
    )
    
    # Si quieres fusionar a otros (por ejemplo Edgar Allan Poe), puedes agregar más llamadas aquí:
    # merge_authors("Edgar Allan Poe", ["Edgar Alan Poe", "E.A. Poe"])
