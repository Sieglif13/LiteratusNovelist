import os
import sys
import os
# Add parent directory to path to allow importing django config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
import string
from collections import defaultdict

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Author, BookAuthor

def normalize_name(name):
    # Quita puntuación y espacios, todo a minúsculas
    s = name.lower()
    for c in string.punctuation + " ":
        s = s.replace(c, '')
    return s

def auto_merge():
    authors = Author.objects.all()
    exact_normalized = defaultdict(list)
    
    for author in authors:
        exact_normalized[normalize_name(author.full_name)].append(author)
        
    merged_groups = 0
    total_deleted = 0
    
    print("INICIANDO AUTO-FUSION DE AUTORES...\n")
    
    for norm, group in exact_normalized.items():
        if len(group) > 1:
            # Ordenamos por longitud descendente para elegir el nombre con mejor formato (espacios correctos)
            group.sort(key=lambda x: len(x.full_name), reverse=True)
            primary = group[0]
            duplicates = group[1:]
            
            # Usamos encode/decode con ignore para evitar que Windows crashee al imprimir nombres raros
            safe_primary = primary.full_name.encode('cp1252', 'ignore').decode('cp1252')
            print(f"Conservando: {safe_primary}")
            
            for dup in duplicates:
                safe_dup = dup.full_name.encode('cp1252', 'ignore').decode('cp1252')
                print(f"  Fusionando y eliminando: {safe_dup}")
                
                # Mover libros
                links = BookAuthor.objects.filter(author=dup)
                for link in links:
                    if not BookAuthor.objects.filter(book=link.book, author=primary).exists():
                        link.author = primary
                        link.save()
                    else:
                        link.delete()
                
                # Eliminar clon
                dup.delete()
                total_deleted += 1
                
            merged_groups += 1
            print("-" * 30)

    print(f"\nAUTO-FUSION COMPLETADA!")
    print(f"Grupos de autores arreglados: {merged_groups}")
    print(f"Clones eliminados para siempre: {total_deleted}")

if __name__ == "__main__":
    auto_merge()
