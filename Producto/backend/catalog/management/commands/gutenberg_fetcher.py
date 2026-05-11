"""
gutenberg_fetcher.py
Módulo para consumir la API pública de Gutendex (Project Gutenberg).

API base: https://gutendex.com
- No requiere key de autenticación.
- Soporta filtros por idioma, popularidad, autor.
"""

import time
import requests
from typing import Optional

GUTENDEX_BASE = "https://gutendex.com"

HEADERS = {
    "User-Agent": "LiteratusNovelist/1.0 (educational platform; contact admin@literatus.app)"
}


def fetch_book_list(lang: str = "es", limit: int = 30, offset: int = 0) -> list[dict]:
    """
    Obtiene los libros más populares de Gutendex filtrados por idioma.
    
    Args:
        lang: Código ISO 639-1 del idioma (ej. 'es', 'en').
        limit: Cuántos libros retornar en total.
        offset: Desde qué posición comenzar (para paginación/reanudación).
    
    Returns:
        Lista de dicts con metadatos de Gutenberg.
    """
    books = []
    url = f"{GUTENDEX_BASE}/books"
    params = {
        "languages": lang,
        "ordering": "-download_count",
        "page": 1,
    }

    collected = 0
    skipped = 0

    while url and collected < limit:
        retries = 0
        data = None
        while retries < 3:
            try:
                resp = requests.get(url, params=params if "?" not in url else None, headers=HEADERS, timeout=60)
                resp.raise_for_status()
                data = resp.json()
                break
            except requests.RequestException as e:
                retries += 1
                print(f"  [Fetcher] Intento {retries}/3 fallido (posible saturación de Gutenberg): {e}")
                if retries < 3:
                    time.sleep(5)  # Esperar un poco más entre reintentos
        if data is None:
            print("  [Fetcher] No se pudo conectar a Gutendex tras 3 intentos.")
            break

        for result in data.get("results", []):
            if skipped < offset:
                skipped += 1
                continue
            if collected >= limit:
                break

            # Filtrar solo los que tienen epub disponible
            text_formats = result.get("formats", {})
            has_epub = any(
                k.startswith("application/epub+zip")
                for k in text_formats.keys()
            )
            if not has_epub:
                continue

            books.append(_normalize_book(result))
            collected += 1

        # Paginación
        next_url = data.get("next")
        if next_url and collected < limit:
            url = next_url
            params = None  # La URL ya incluye los params
            time.sleep(0.5)  # Respetar rate limit
        else:
            break

    return books


def _normalize_book(raw: dict) -> dict:
    """Normaliza un resultado de Gutendex al formato que necesitamos."""
    # Obtener el autor principal
    authors = raw.get("authors", [])
    author_name = authors[0]["name"] if authors else "Anónimo"
    # Gutenberg pone "Apellido, Nombre" → normalizamos
    if "," in author_name:
        parts = author_name.split(",", 1)
        author_name = f"{parts[1].strip()} {parts[0].strip()}"

    # Obtener URL del EPUB
    formats = raw.get("formats", {})
    epub_url = formats.get("application/epub+zip", "")

    # Géneros/Bookshelf
    subjects = raw.get("subjects", [])[:5]
    bookshelves = raw.get("bookshelves", [])[:3]

    return {
        "gutenberg_id": raw["id"],
        "title": raw.get("title", "Sin título"),
        "author": author_name,
        "download_count": raw.get("download_count", 0),
        "epub_url": epub_url,
        "subjects": subjects,
        "bookshelves": bookshelves,
        "languages": raw.get("languages", []),
    }


def fetch_book_epub(epub_url: str, timeout: int = 60) -> Optional[bytes]:
    """
    Descarga el EPUB binario desde Gutenberg.
    
    Returns:
        Bytes del archivo EPUB, o None si falló.
    """
    if not epub_url:
        return None
        
    try:
        resp = requests.get(epub_url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp.content
    except requests.RequestException as e:
        print(f"  [Fetcher] Error descargando EPUB: {e}")
        return None
