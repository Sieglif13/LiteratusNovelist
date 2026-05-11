import os
import django

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Author, Book

def update_oscar_wilde():
    # Buscar el autor "Oscar Wilde"
    wilde = Author.objects.filter(slug='oscar-wilde').first()
    if not wilde:
        print("Oscar Wilde no encontrado en la base de datos.")
        return

    # Buscar "El Príncipe Feliz"
    principe_feliz = Book.objects.filter(slug='el-principe-feliz').first()

    # Actualizar biografía
    wilde.bio = (
        "Oscar Fingal O'Flahertie Wills Wilde fue un escritor, poeta y dramaturgo de origen irlandés. "
        "Considerado uno de los dramaturgos más destacados del Londres victoriano tardío; además, "
        "fue una celebridad de la época debido a su gran y aguzado ingenio. Hoy en día es recordado "
        "por sus epigramas, sus cuentos, sus obras de teatro y su única novela, El retrato de Dorian Gray."
    )
    
    # Actualizar temas
    wilde.themes = "Crítica social, esteticismo, compasión, belleza, moralidad, ironía y redención."
    
    # Actualizar libro recomendado
    if principe_feliz:
        wilde.recommended_book = principe_feliz
        print(f"Libro recomendado establecido a: {principe_feliz.title}")
    
    wilde.save()
    print("Datos de Oscar Wilde actualizados correctamente.")

if __name__ == '__main__':
    update_oscar_wilde()
