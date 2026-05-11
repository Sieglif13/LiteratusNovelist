import requests
from django.conf import settings
import os

class GutenbergRapidFetcher:
    def __init__(self):
        self.api_key = getattr(settings, "RAPIDAPI_KEY", os.environ.get("RAPIDAPI_KEY"))
        self.host = getattr(settings, "RAPIDAPI_HOST", os.environ.get("RAPIDAPI_HOST"))
        self.base_url = f"https://{self.host}"
        self.headers = {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": self.host
        }

    def fetch_book_list(self, lang="es", limit=50, page=1):
        """Obtiene libros desde RapidAPI."""
        url = f"{self.base_url}/books"
        # Nota: La API de RapidAPI suele usar filtros similares a Gutendex
        # pero a veces cambian los nombres de los parámetros.
        params = {
            "languages": lang,
            "page": page
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            books = []
            for item in data.get("results", []):
                if len(books) >= limit: break
                books.append(self._normalize(item))
            return books
        except Exception as e:
            print(f"  [RapidFetcher] Error: {e}")
            return []

    def _normalize(self, raw):
        """Normaliza el formato de RapidAPI al nuestro."""
        authors = raw.get("authors", [])
        author_name = authors[0].get("name", "Anónimo") if authors else "Anónimo"
        
        # Gutenberg format "Last, First" -> "First Last"
        if "," in author_name:
            parts = author_name.split(",", 1)
            author_name = f"{parts[1].strip()} {parts[0].strip()}"

        formats = raw.get("formats", {})
        epub_url = formats.get("application/epub+zip", "")
        
        return {
            "gutenberg_id": raw.get("id"),
            "title": raw.get("title", "Sin Título"),
            "author": author_name,
            "download_count": raw.get("download_count", 0),
            "epub_url": epub_url,
            "subjects": raw.get("subjects", []),
            "bookshelves": raw.get("bookshelves", []),
            "languages": raw.get("languages", [])
        }

    def fetch_epub(self, url):
        """Descarga el binario del EPUB."""
        try:
            # 120 segundos de paciencia para servidores saturados
            response = requests.get(url, timeout=120)
            response.raise_for_status()
            return response.content
        except Exception as e:
            print(f"  [RapidFetcher] Error EPUB: {e}")
            return None
