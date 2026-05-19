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

from catalog.models import Author

def normalize_name(name):
    # Quita puntuación y espacios, todo a minúsculas
    s = name.lower()
    for c in string.punctuation + " ":
        s = s.replace(c, '')
    return s

def get_last_name(name):
    # Extrae lo que parece ser el apellido (última palabra)
    clean_name = name.replace(',', ' ').replace('.', ' ')
    parts = clean_name.split()
    if parts:
        return parts[-1].lower()
    return ""

def find_duplicates():
    authors = Author.objects.all()
    
    # 1. Agrupar por nombre normalizado (ej: "H.P. Lovecraft" y "H. P. Lovecraft" -> "hplovecraft")
    exact_normalized = defaultdict(list)
    # 2. Agrupar por apellido para detectar cosas como "Howard Phillips Lovecraft" y "Lovecraft"
    by_last_name = defaultdict(list)
    
    for author in authors:
        exact_normalized[normalize_name(author.full_name)].append(author.full_name)
        by_last_name[get_last_name(author.full_name)].append(author.full_name)
        
    print("==================================================")
    print("REPORTE DE AUTORES DUPLICADOS")
    print("==================================================\n")
    
    print("--- 1. DUPLICADOS EVIDENTES (Mismas letras, distinta puntuación/espacios) ---")
    found_exact = False
    for norm, group in exact_normalized.items():
        if len(group) > 1:
            found_exact = True
            print(f"Grupo detectado:")
            for name in group:
                print(f"  - {name}")
            print("")
            
    if not found_exact:
        print("¡Ninguno encontrado!\n")

    print("--- 2. POSIBLES DUPLICADOS (Comparten apellido) ---")
    print("Revisa esta lista con cuidado, pueden ser familiares (ej: Alexandre Dumas padre/hijo) o el mismo autor.\n")
    found_last_name = False
    
    # Ignoramos apellidos muy comunes que darían falsos positivos
    common_last_names = ['de', 'la', 'el', 'los', 'las', 'y', 'unknown', 'autores', 'san', 'santa']
    
    for last_name, group in by_last_name.items():
        if len(group) > 1 and last_name not in common_last_names:
            # Si todas las variaciones ya se mostraron en el paso 1, no las repetimos aquí
            norm_set = set([normalize_name(n) for n in group])
            if len(norm_set) > 1:  # Hay diferencias reales en los nombres, no solo puntuación
                found_last_name = True
                print(f"Coincidencia en apellido '{last_name.capitalize()}':")
                for name in group:
                    print(f"  - {name}")
                print("")

    if not found_last_name:
        print("¡Ninguno encontrado!")

if __name__ == "__main__":
    find_duplicates()
