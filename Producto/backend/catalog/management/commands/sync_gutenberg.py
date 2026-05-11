"""
sync_gutenberg.py - Comando Django para importacion masiva desde Project Gutenberg.

MEJORAS:
1. Rotacion de API Keys (soporta multiples llaves para evitar 429 Rate Limit).
2. Reprocesamiento de IA: Si un libro existe pero no tiene sinopsis, intenta enriquecerlo.
3. Salida limpia para terminales Windows.
"""

import os
import time
import json
import logging
import requests
import io
from django.core.files.base import ContentFile

from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils.text import slugify
from django.db import transaction
import requests

from catalog.models import Author, Book, BookAuthor, Edition, Tag, Genre
from .gutenberg_fetcher import fetch_book_list, fetch_book_epub

try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

logger = logging.getLogger(__name__)

GUTENBERG_MEDIA_DIR = "gutenberg_texts"
BOOK_PRICE = "5.00"
DEFAULT_GENRE_NAMES = ["Clasico", "Dominio Publico", "Literatura Universal"]


class Command(BaseCommand):
    help = "Importa libros desde Project Gutenberg con procesamiento IA y rotacion de llaves."

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=5, help='Limite de libros a procesar')
        parser.add_argument('--lang', type=str, default='es', help='Idioma (en, es, fr, etc.)')
        parser.add_argument('--no-images', action='store_true', help='Saltar generación de imágenes por IA')
        parser.add_argument("--dry-run", action="store_true", default=False)
        parser.add_argument("--resume", action="store_true", default=False, help="Salta si ya tiene sinopsis.")
        parser.add_argument("--offset", type=int, default=0)

    def handle(self, *args, **options):
        lang = options["lang"]
        limit = options["limit"]
        dry_run = options["dry_run"]
        resume = options["resume"]
        offset = options["offset"]
        self.no_images = options["no_images"]

        # --- Sistema de Rotacion de Llaves ---
        self.api_keys = []
        # Intentar obtener hasta 5 llaves del .env
        for i in range(1, 6):
            key_name = "GOOGLE_API_KEY" if i == 1 else f"GOOGLE_API_KEY_{i}"
            key = getattr(settings, key_name, os.environ.get(key_name))
            if key:
                self.api_keys.append(key)
        
        self.current_key_index = 0
        self.gemini_client = None
        
        if GEMINI_AVAILABLE and self.api_keys:
            self.gemini_client = genai.Client(api_key=self.api_keys[0])
            self.stdout.write(self.style.SUCCESS(f"  [OK] Gemini listo con {len(self.api_keys)} llaves para rotacion."))
        else:
            self.stdout.write(self.style.WARNING("  [!] Sin Gemini (faltan llaves o libreria)."))

        mode_label = "[DRY-RUN]" if dry_run else "[REAL]"
        self.stdout.write(self.style.MIGRATE_HEADING(
            "\n" + "=" * 60 + "\n"
            "  SYNC GUTENBERG " + mode_label + "\n"
            "  Idioma: " + lang + " | Libros: " + str(limit) + "\n"
            + "=" * 60 + "\n"
        ))

        self.stdout.write("[->] Consultando gutendex.com...")
        book_list = fetch_book_list(lang=lang, limit=limit, offset=offset)

        if not book_list:
            self.stdout.write(self.style.ERROR("No se obtuvieron libros."))
            return

        # --- Preparar generos ---
        default_genres = []
        if not dry_run:
            for genre_name in DEFAULT_GENRE_NAMES:
                genre, _ = Genre.objects.get_or_create(name=genre_name, defaults={"slug": slugify(genre_name)})
                default_genres.append(genre)

        stats = {"imported": 0, "skipped": 0, "errors": 0, "ai_enriched": 0}

        for idx, book_data in enumerate(book_list, 1):
            gutenberg_id = book_data["gutenberg_id"]
            title = book_data["title"]

            self.stdout.write(f"\n[{idx}/{len(book_list)}] [LIBRO] {title}")

            # --- Lógica de Sincronización Inteligente ---
            existing_book = Book.objects.filter(gutenberg_id=gutenberg_id).first()
            
            if existing_book:
                if existing_book.text_file_path:
                    self.stdout.write("  [i] El libro ya existe. Actualizando capitulos...")
                    self._enrich_existing_book(existing_book, stats, resume)
                else:
                    self.stdout.write(self.style.WARNING("  -> Libro sin archivo local. Saltando."))
                    stats["skipped"] += 1
                continue

            # --- Proceso de Descarga de EPUB ---
            epub_url = book_data.get("epub_url", "")
            if not epub_url:
                stats["skipped"] += 1
                continue

            self.stdout.write(f"  [v] Bajando EPUB...")
            epub_bytes = fetch_book_epub(epub_url, gutenberg_id)
            if not epub_bytes:
                stats["errors"] += 1
                continue

            if dry_run:
                stats["imported"] += 1
                continue

            # Extraer capítulos con EbookLib
            import ebooklib
            from ebooklib import epub
            from bs4 import BeautifulSoup
            import io

            media_root = getattr(settings, "MEDIA_ROOT", os.path.join(settings.BASE_DIR, "media"))
            book_rel_dir = os.path.join(GUTENBERG_MEDIA_DIR, str(gutenberg_id))
            book_dir = os.path.join(media_root, book_rel_dir)
            os.makedirs(book_dir, exist_ok=True)
            
            epub_rel_path = os.path.join(book_rel_dir, "book.epub").replace("\\", "/")
            epub_full_path = os.path.join(book_dir, "book.epub")
            
            with open(epub_full_path, 'wb') as f:
                f.write(epub_bytes)

            self.stdout.write("  [parse] Extrayendo capítulos e imágenes del EPUB...")
            chapters = []
            try:
                book_epub = epub.read_epub(epub_full_path)
                
                # 1. Extraer imágenes
                images_dir = os.path.join(book_dir, "images")
                os.makedirs(images_dir, exist_ok=True)
                
                image_map = {}
                for item in book_epub.get_items_of_type(ebooklib.ITEM_IMAGE):
                    file_name = item.file_name
                    base_name = os.path.basename(file_name)
                    
                    dest_path = os.path.join(images_dir, base_name)
                    with open(dest_path, "wb") as f:
                        f.write(item.get_content())
                        
                    public_url = f"{settings.MEDIA_URL}{book_rel_dir.replace(os.sep, '/')}/images/{base_name}"
                    image_map[file_name] = public_url
                    image_map[f"../{file_name}"] = public_url
                    image_map[base_name] = public_url
                
                # 2. Extraer capítulos
                order = 1
                for item in book_epub.get_items_of_type(ebooklib.ITEM_DOCUMENT):
                    # Ignorar archivos que claramente no son capítulos
                    name = item.get_name().lower()
                    if 'cover' in name or 'titlepage' in name or 'nav' in name or 'toc' in name:
                        continue
                        
                    content = item.get_body_content().decode('utf-8')
                    soup = BeautifulSoup(content, 'html.parser')
                    text_only = soup.get_text(separator=' ', strip=True)
                    
                    if len(text_only) > 100 or soup.find('img'):  # Ignorar secciones minúsculas
                        title = f"Capítulo {order}"
                        h1 = soup.find('h1')
                        h2 = soup.find('h2')
                        if h1 and h1.text.strip():
                            title = h1.text.strip()
                        elif h2 and h2.text.strip():
                            title = h2.text.strip()
                            
                        # Reescribir las rutas de las imágenes
                        for img in soup.find_all('img'):
                            src = img.get('src')
                            if src:
                                clean_src = src.split('#')[0]
                                base_src = os.path.basename(clean_src)
                                if clean_src in image_map:
                                    img['src'] = image_map[clean_src]
                                elif base_src in image_map:
                                    img['src'] = image_map[base_src]
                            
                        chapters.append({
                            "order": order,
                            "title": title[:200],
                            "content": str(soup)
                        })
                        order += 1
                
                self.stdout.write(f"  -> {len(chapters)} capítulos extraídos nativamente.")
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  [!] Error parseando EPUB: {e}"))
                stats["errors"] += 1
                continue

            # --- IA Metadata ---
            if self.gemini_client:
                self.stdout.write("  [zZz] Pausa anti-rate-limit de 15s...")
                time.sleep(15)
                
            ai_result = self._get_ai_data_with_rotation(title, book_data["author"], book_data.get("subjects", []))
            
            try:
                with transaction.atomic():
                    book = self._save_book(book_data, ai_result, default_genres, chapters, epub_rel_path)
                
                if ai_result.get("synopsis"): stats["ai_enriched"] += 1
                stats["imported"] += 1
                self.stdout.write(self.style.SUCCESS(f"  [SAVED] ID: {book.pk}"))
                
                # Pausa final tras procesar un libro completo
                time.sleep(5)
            except Exception as e:
                stats["errors"] += 1
                self.stdout.write(self.style.ERROR(f"  [X] Error: {e}"))
                continue

        self.stdout.write(self.style.MIGRATE_HEADING(f"\nFIN: {stats['imported']} importados, {stats['ai_enriched']} con IA."))

    def _rotate_key(self):
        """Cambia a la siguiente API key si hay mas disponibles."""
        if len(self.api_keys) > 1:
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            new_key = self.api_keys[self.current_key_index]
            self.gemini_client = genai.Client(api_key=new_key)
            self.stdout.write(self.style.WARNING(f"  [!] Rotando a API Key #{self.current_key_index + 1}"))
            return True
        return False

    def _get_ai_data_with_rotation(self, title, author, subjects):
        """Intenta obtener datos de IA rotando llaves si falla por limite."""
        if not self.gemini_client: return {}
        
        attempts = 0
        while attempts < len(self.api_keys):
            try:
                return self._call_gemini(title, author, subjects)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  [!] Error llamando a Gemini: {e}"))
                
                # Intentar DeepSeek como alternativa si está configurada
                ds_key = getattr(settings, "DEEPSEEK_API_KEY", os.environ.get("DEEPSEEK_API_KEY"))
                if ds_key:
                    self.stdout.write(self.style.NOTICE("  [->] Intentando fallback con DeepSeek..."))
                    return self._call_deepseek(title, author, subjects, ds_key)

                if "429" in str(e) or "quota" in str(e).lower():
                    if self._rotate_key():
                        attempts += 1
                        time.sleep(5)
                        continue
                self.stdout.write(self.style.WARNING(f"  [!] Error API Gemini: {e}"))
                break
        return {}

    def _generate_hf_image(self, prompt, sub_folder, filename_base):
        """Genera una imagen usando Pollinations.ai (Gratis) y retorna un ContentFile."""
        import urllib.parse
        from django.core.files.base import ContentFile
        
        encoded_prompt = urllib.parse.quote(prompt + ", digital art, high quality, cinematic, detailed")
        pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&model=flux&seed={int(time.time())}"
        
        self.stdout.write(f"  [IMG] Generando via Pollinations: {prompt[:50]}...")
        
        try:
            response = requests.get(pollinations_url, timeout=45)
            if response.status_code == 200:
                return ContentFile(response.content, name=f"{filename_base}.jpg")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  [!] Pollinations falló ({e}), intentando Hugging Face..."))

        # Fallback a Hugging Face
        hf_token = getattr(settings, "HUGGINGFACE_API_KEY", os.environ.get("HUGGINGFACE_API_KEY"))
        if hf_token:
            API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
            headers = {"Authorization": f"Bearer {hf_token}"}
            try:
                response = requests.post(API_URL, headers=headers, json={"inputs": prompt}, timeout=60)
                if response.status_code == 200:
                    return ContentFile(response.content, name=f"{filename_base}.jpg")
            except Exception:
                pass
        
        return None

    def _call_gemini(self, title, author, subjects):
        import json
        mood_choices = [c[0] for c in Book.MoodChoices.choices]
        subjects_str = ", ".join(subjects) if subjects else "Clasico"
        
        prompt = (
            f"Analiza este libro clásico:\nTítulo: {title}\nAutor: {author}\nTemas: {subjects_str}\n\n"
            "Responde EXACTAMENTE en este formato JSON, sin bloques markdown como ```json:\n"
            "{\n"
            '  "synopsis": "Resumen literario de 3 líneas",\n'
            f'  "mood": "UNO DE: {", ".join(mood_choices)}",\n'
            '  "tags": ["Tag 1", "Tag 2", "Tag 3", "Tag 4", "Tag 5"],\n'
            '  "author_bio": "Breve biografía del autor",\n'
            '  "characters": [\n'
            '    {"name": "Nombre", "description": "Desc corta", "system_prompt": "Instrucciones base para un LLM que tomará el rol de este personaje", "greeting": "Saludo inicial en primera persona"}\n'
            '  ]\n'
            "}"
        )
        
        response = self.gemini_client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        text = response.text.replace('```json', '').replace('```', '').strip()
        self.stdout.write(f"  [DEBUG] Gemini Response: {text[:200]}...")
        try:
            res = json.loads(text)
            # Normalizar mood
            m = res.get("mood", "")
            res["mood"] = next((opt for opt in mood_choices if opt.lower() == m.lower()), "")
            return res
        except json.JSONDecodeError:
            self.stdout.write(self.style.ERROR(f"  [!] JSON Decode Error de Gemini: {text[:100]}"))
            return {}

    def _call_deepseek(self, title, author, subjects, api_key):
        """Llamada de respaldo a DeepSeek API."""
        url = "https://api.deepseek.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        prompt = (
            f"Analiza el libro '{title}' de {author}. Temas: {subjects}. "
            "Responde únicamente en formato JSON con: "
            "{'synopsis': '...', 'mood': 'Alegre/Triste/etc', 'tags': ['tag1',...], "
            "'author_bio': '...', 'characters': [{'name': '...', 'description': '...', "
            "'system_prompt': 'Actúa como...', 'greeting': '...'}]}"
        )

        payload = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=60)
            if response.status_code == 200:
                text = response.json()["choices"][0]["message"]["content"]
                return json.loads(text)
            else:
                self.stdout.write(self.style.WARNING(f"  [!] DeepSeek API Error: {response.status_code}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  [!] Error en fallback DeepSeek: {e}"))
        return {}

    def _validate_chapters_with_ai(self, chapter_markers):
        if not self.gemini_client or not chapter_markers: return []
        
        self.stdout.write("  [zZz] Pausa anti-rate-limit de 15s...")
        time.sleep(15)

        import json
        snippets_json = json.dumps([{"id": m["id"], "titulo": m["title"], "texto": m["snippet"]} for m in chapter_markers], ensure_ascii=False)
        
        prompt = (
            "Eres un experto literario. Analiza estos fragmentos extraídos de un libro.\n"
            "Algunos son índices (Table of Contents) y otros son falsos positivos.\n"
            "Devuélveme ESTRICTAMENTE los IDs de los que son verdaderos inicios de capítulo de la historia real.\n"
            "Responde SOLO con una lista de números separados por comas. Ejemplo: 5,12,45,67\n\n"
            f"Candidatos:\n{snippets_json[:60000]}" # Límite de seguridad
        )
        
        attempts = 0
        while attempts < len(self.api_keys):
            try:
                response = self.gemini_client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
                text = response.text.strip()
                import re
                ids = [int(i.strip()) for i in re.findall(r'\d+', text)]
                return ids
            except Exception as e:
                if "429" in str(e) or "quota" in str(e).lower():
                    if self._rotate_key():
                        attempts += 1
                        time.sleep(5)
                        continue
                self.stdout.write(self.style.WARNING(f"  [!] Error en validación IA: {e}"))
                break
        return []

    def _enrich_existing_book(self, book, stats, resume):
        """No necesario para la refactorización de EPUBs."""
        self.stdout.write(self.style.WARNING("  [!] Enrich existing book desactivado en refactor EPUB."))


    def _save_book(self, book_data, ai_result, default_genres, chapters, epub_rel_path):
        gutenberg_id = book_data["gutenberg_id"]
        # 1. Autor (Deduplicación)
        author_name = book_data["author"]
        author = Author.objects.filter(full_name=author_name).first()
        
        is_new_author = False
        if not author:
            author = Author.objects.create(full_name=author_name, slug=slugify(author_name))
            is_new_author = True
            if ai_result.get("author_bio"):
                author.bio = ai_result["author_bio"]
                author.save()

        # 2. Libro y Portada
        cover_image = None
        if not self.no_images and not Book.objects.filter(gutenberg_id=gutenberg_id).exists():
            # Generar portada solo si el libro es nuevo
            prompt_cover = f"Classic book cover for '{book_data['title']}' by {author_name}, artistic, vintage style"
            cover_image = self._generate_hf_image(prompt_cover, "book_covers", f"cover_{gutenberg_id}")

        book, _ = Book.objects.update_or_create(
            gutenberg_id=gutenberg_id,
            defaults={
                "title": book_data["title"],
                "slug": slugify(book_data["title"])[:200] + f"-{gutenberg_id}",
                "synopsis": ai_result.get("synopsis") or f"Obra de {author_name}.",
                "mood": (ai_result.get("mood") or "Misterioso")[:20],
                "text_file_path": epub_rel_path,
                "is_published": True,
                "download_count": book_data.get("download_count", 0),
                "cover_image": cover_image if cover_image else None
            }
        )
        
        # 3. Relaciones y Capítulos
        BookAuthor.objects.get_or_create(book=book, author=author, role=BookAuthor.RoleChoices.PRIMARY)
        if default_genres: book.genres.set(default_genres)
        
        tag_names = ai_result.get("tags", [])
        for tag_name in tag_names:
            t_slug = slugify(tag_name)[:150]
            if not t_slug: continue
            tag, _ = Tag.objects.get_or_create(slug=t_slug, defaults={'name': tag_name[:150]})
            book.tags.add(tag)

        from catalog.models import Chapter
        book.chapters.all().delete()
        for chap in chapters:
            Chapter.objects.create(book=book, title=chap["title"], order=chap["order"], content_html=chap["content"])

        # Manejo seguro de idioma
        langs = book_data.get("languages", ["es"])
        lang_code = langs[0][:10] if langs else "es"

        edition, _ = Edition.objects.get_or_create(
            book=book, format=Edition.FormatChoices.EPUB,
            defaults={"language": lang_code, "price": BOOK_PRICE, "file": epub_rel_path, "publisher": "Gutenberg"}
        )
        
        # 4. Avatares (IA)
        from ai_engine.models import AIAvatar
        AIAvatar.objects.filter(edition=edition).delete()
        
        # Avatar del Autor (Solo si es nuevo autor o no tiene uno ya)
        if ai_result.get("author_bio"):
            # Generar imagen para el autor
            author_img = self._generate_hf_image(f"Portrait of author {author_name}, classical style", "ai_avatars", f"author_{author.slug}")
            
            AIAvatar.objects.create(
                edition=edition,
                name=author.full_name,
                description=f"Autor de la obra. {author.bio[:100]}...",
                system_prompt=f"Eres {author.full_name}, el autor de {book.title}. Tu biografía: {author.bio}",
                is_author=True,
                avatar_image=author_img,
                greeting_message=f"Hola, soy {author.full_name}, el autor de esta obra. ¿Qué deseas saber sobre mi libro?"
            )
            
        # Avatares de Personajes
        for idx, char in enumerate(ai_result.get("characters", [])):
            char_name = char.get("name", "Personaje")
            # Generar imagen para el personaje
            char_img = None
            if not self.no_images:
                char_img = self._generate_hf_image(f"Character portrait: {char_name} from {book.title}, {char.get('description')}", "ai_avatars", f"char_{book.pk}_{idx}")
            
            AIAvatar.objects.create(
                edition=edition,
                name=char_name[:100],
                description=char.get("description", ""),
                system_prompt=char.get("system_prompt", ""),
                greeting_message=char.get("greeting", "Hola."),
                avatar_image=char_img,
                is_major_character=True
            )
            
        return book
