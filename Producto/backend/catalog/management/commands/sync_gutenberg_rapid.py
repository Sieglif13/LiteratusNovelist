import os
import time
import json
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils.text import slugify
from django.db import transaction
from django.core.files.base import ContentFile
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup

from catalog.models import Author, Book, BookAuthor, Tag, Genre, Chapter
from .gutenberg_rapid_fetcher import GutenbergRapidFetcher

try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

class Command(BaseCommand):
    help = "Importa libros desde Gutenberg usando RAPIDAPI (Más estable)."

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=10, help='Limite de libros')
        parser.add_argument('--lang', type=str, default='es', help='Idioma')
        parser.add_argument('--no-images', action='store_true', help='Saltar imágenes')

    def handle(self, *args, **options):
        self.no_images = options['no_images']
        self.fetcher = GutenbergRapidFetcher()
        
        # --- Configuración IA ---
        self.api_keys = [
            getattr(settings, "GOOGLE_API_KEY", ""),
            getattr(settings, "GOOGLE_API_KEY_2", "")
        ]
        self.api_keys = [k for k in self.api_keys if k]
        self.current_key_index = 0
        self._init_gemini()

        self.stdout.write(self.style.SUCCESS(f"🚀 Iniciando sincronización vía RapidAPI (Límite: {options['limit']})"))

        books_data = self.fetcher.fetch_book_list(lang=options['lang'], limit=options['limit'])
        
        if not books_data:
            self.stdout.write(self.style.ERROR("❌ No se obtuvieron libros de RapidAPI."))
            return

        imported = 0
        for book_item in books_data:
            try:
                self.stdout.write(f"\n📖 Procesando: {book_item['title']}")
                
                # IA Analysis (Gemini with DeepSeek Fallback)
                ai_result = self._analyze_with_ai(book_item)
                
                # Download EPUB
                epub_content = self.fetcher.fetch_epub(book_item['epub_url'])
                if not epub_content:
                    self.stdout.write(self.style.WARNING("  [!] Saltando: No se pudo bajar el EPUB."))
                    continue

                # Save to DB
                self._save_book(book_item, ai_result, epub_content)
                imported += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  [!] Error procesando {book_item['title']}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\n✅ FIN: {imported} libros importados con éxito."))

    def _init_gemini(self):
        if GEMINI_AVAILABLE and self.api_keys:
            self.gemini_client = genai.Client(api_key=self.api_keys[self.current_key_index])

    def _rotate_key(self):
        if len(self.api_keys) > 1:
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            self._init_gemini()
            return True
        return False

    def _analyze_with_ai(self, book):
        prompt = f"""Analiza el libro '{book['title']}' de {book['author']}. 
        Responde SOLO en JSON con este formato:
        {{
            "synopsis": "resumen en español",
            "mood": "Estado de ánimo (Feliz, Triste, Épico, Oscuro, etc)",
            "tags": ["tag1", "tag2"],
            "author_bio": "biografía corta del autor",
            "characters": [
                {{"name": "Nombre", "description": "quien es", "system_prompt": "instrucciones para chat", "greeting": "hola"}}
            ]
        }}"""

        try:
            response = self.gemini_client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
            return json.loads(response.text.replace("```json", "").replace("```", ""))
        except Exception:
            # Fallback a DeepSeek
            ds_key = getattr(settings, "DEEPSEEK_API_KEY", "")
            if ds_key:
                self.stdout.write("  [->] Usando Fallback DeepSeek...")
                resp = requests.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {ds_key}", "Content-Type": "application/json"},
                    json={"model": "deepseek-chat", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}}
                )
                content = resp.json()['choices'][0]['message']['content']
                return json.loads(content)
            return {}

    def _save_book(self, data, ai, epub_bytes):
        with transaction.atomic():
            # Autor
            author, _ = Author.objects.get_or_create(
                full_name=data['author'], 
                defaults={'slug': slugify(data['author']), 'bio': ai.get('author_bio', '')}
            )
            
            # Libro
            book, _ = Book.objects.update_or_create(
                gutenberg_id=data['gutenberg_id'],
                defaults={
                    'title': data['title'],
                    'slug': f"{slugify(data['title'])}-{data['gutenberg_id']}",
                    'synopsis': ai.get('synopsis', 'Sinopsis no disponible'),
                    'mood': ai.get('mood', 'Misterioso')[:20],
                }
            )
            
            # Relación Autor (Ignorar si ya existe)
            try:
                BookAuthor.objects.get_or_create(book=book, author=author)
            except:
                pass

            # Imagen (Si no se salta)
            if not self.no_images:
                # Aquí iría la lógica de Pollinations si quisieras, 
                # por ahora lo dejamos ligero como pediste.
                pass

            # Tags
            for tag_name in ai.get('tags', []):
                t_slug = slugify(tag_name)[:150]
                if not t_slug: continue
                tag, _ = Tag.objects.get_or_create(
                    slug=t_slug, 
                    defaults={'name': tag_name[:150]}
                )
                book.tags.add(tag)

            # Edición y Archivo
            from catalog.models import Edition
            try:
                # Evitar fallo si la lista de lenguajes está vacía
                langs = data.get('languages', [])
                lang_code = langs[0][:10] if langs else 'es'
                
                edition, created = Edition.objects.update_or_create(
                    book=book,
                    format="epub",
                    defaults={
                        'language': lang_code,
                        'price': 100,
                    }
                )
                
                if created or not edition.file:
                    filename = f"{book.slug}.epub"
                    edition.file.save(filename, ContentFile(epub_bytes), save=True)

                # --- EXTRACCIÓN DE CAPÍTULOS ---
                self._extract_chapters(book, epub_bytes)
            
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  [!] Error en edición: {e}"))
                return # Si falla la edición, no podemos crear avatares
            
            # Avatares
            from ai_engine.models import AIAvatar
            for char in ai.get('characters', []):
                try:
                    AIAvatar.objects.get_or_create(
                        edition=edition, 
                        name=char['name'][:100],
                        defaults={
                            'description': char.get('description', ''),
                            'system_prompt': char.get('system_prompt', ''),
                            'greeting_message': char.get('greeting', 'Hola')
                        }
                    )
                except:
                    pass

    def _extract_chapters(self, book, epub_bytes):
        """Extrae capítulos del contenido binario del EPUB."""
        try:
            from io import BytesIO
            book_epub = epub.read_epub(BytesIO(epub_bytes))
            
            # Limpiar capítulos viejos si los hay
            book.chapters.all().delete()
            
            order = 1
            for item in book_epub.get_items_of_type(ebooklib.ITEM_DOCUMENT):
                name = item.get_name().lower()
                if any(x in name for x in ['cover', 'titlepage', 'nav', 'toc']):
                    continue
                
                content = item.get_body_content().decode('utf-8')
                soup = BeautifulSoup(content, 'html.parser')
                text_only = soup.get_text(separator=' ', strip=True)
                
                if len(text_only) > 100 or soup.find('img'):
                    title = f"Capítulo {order}"
                    h1 = soup.find('h1')
                    h2 = soup.find('h2')
                    if h1 and h1.text.strip(): title = h1.text.strip()
                    elif h2 and h2.text.strip(): title = h2.text.strip()
                    
                    Chapter.objects.create(
                        book=book,
                        title=title[:200],
                        order=order,
                        content_html=str(soup)
                    )
                    order += 1
            self.stdout.write(self.style.SUCCESS(f"    [OK] {order-1} capítulos extraídos."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"    [!] Error extrayendo capítulos: {e}"))
