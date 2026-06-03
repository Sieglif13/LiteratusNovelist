import os
import sys
import django
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from catalog.models import Genre

def main():
    assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/src/assets/categories'))
    default_img_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/src/assets/default_cover.jpg'))
    
    genres = Genre.objects.all()
    print(f"Total genres to process: {genres.count()}")

    for genre in genres:
        img_path = os.path.join(assets_dir, f"{genre.slug}.png")
        
        if os.path.exists(img_path):
            print(f"[{genre.slug}] Found specific image. Compressing...")
            source_path = img_path
        else:
            print(f"[{genre.slug}] Using default cover...")
            source_path = default_img_path
            
        try:
            with Image.open(source_path) as img:
                # Convert to RGB if RGBA (WebP supports RGBA but let's optimize)
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Resize if it's too large to save space (e.g. max 800x800)
                img.thumbnail((800, 800), Image.Resampling.LANCZOS)
                
                # Save to BytesIO as WebP
                output_io = BytesIO()
                img.save(output_io, format='WEBP', quality=80)
                output_io.seek(0)
                
                filename = f"{genre.slug}.webp"
                
                # Save to model
                # This will automatically upload it to Supabase via django-storages
                genre.cover_image.save(filename, ContentFile(output_io.read()), save=True)
                print(f"[{genre.slug}] Successfully uploaded {filename} to Supabase!")
        except Exception as e:
            print(f"[{genre.slug}] ERROR: {e}")

if __name__ == "__main__":
    main()
