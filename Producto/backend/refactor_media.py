import os
import re
import shutil
import unicodedata
from pathlib import Path

# --- CONFIGURATION ---
BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR / "media"
BOOKS_DIR = MEDIA_DIR / "books"
ELEJANDRIA_DIR = BASE_DIR / "epubs_elejandria"

# The 3 specific books to protect and consolidate
PROTECTED_PATTERNS = [
    "jekyll",
    "principe feliz",
    "principito"
]

# Specific folders that contain premium assets (images, characters, etc.)
PREMIUM_OLD_FOLDERS = [
    BOOKS_DIR / "principito",
    BOOKS_DIR / "c776d72a-923a-4597-95c5-ddba161b967c",
    MEDIA_DIR / "book_images" / "el-principito",
    MEDIA_DIR / "book_images" / "el-principe-feliz",
    MEDIA_DIR / "book_images" / "el-extrano-caso-del-dr-jekyll-y-mr-hyde"
]

def slugify(text):
    """
    Standard slugifier: lowercase, no accents, spaces to hyphens, remove non-alphanumeric.
    """
    if not text:
        return ""
    # Normalize unicode characters to decompose combined characters (like accents)
    text = unicodedata.normalize('NFKD', str(text)).encode('ascii', 'ignore').decode('ascii')
    # Convert to lowercase and remove non-word characters
    text = re.sub(r'[^\w\s-]', '', text.lower())
    # Replace whitespace and underscores with hyphens
    text = re.sub(r'[-\s_]+', '-', text).strip('-')
    return text

def get_slug(filename):
    """
    Creates a slug from the filename stem.
    """
    stem = Path(filename).stem
    return slugify(stem)

def is_protected(name):
    for p in PROTECTED_PATTERNS:
        if p.lower() in name.lower():
            return True
    return False

def main():
    print("="*65)
    print("  Literatus Novelist - Surgical Media Reorganization & Migration")
    print("="*65)

    # Phase 1: Cleanup old EPUBs in media/
    print("\n[Phase 1] Cleaning up old .epub files in media/ ...")
    deleted_epubs = 0
    if MEDIA_DIR.exists():
        for epub in list(MEDIA_DIR.rglob("*.epub")):
            # Skip files in the source directory
            if ELEJANDRIA_DIR in epub.parents:
                continue
                
            if is_protected(epub.name):
                print(f"  [KEEP] Protected EPUB: {epub.name}")
                continue
                
            try:
                print(f"  [DEL] Removing: {epub.relative_to(BASE_DIR)}")
                epub.unlink()
                deleted_epubs += 1
            except Exception as e:
                print(f"  [ERR] Could not delete {epub}: {e}")

    # Phase 2: Purge non-premium book folders in media/books/
    print("\n[Phase 2] Cleaning up non-premium book directories...")
    deleted_dirs = 0
    if BOOKS_DIR.exists():
        for item in list(BOOKS_DIR.iterdir()):
            if item.is_dir():
                # Check if it's explicitly in our premium list
                if any(p.name == item.name for p in PREMIUM_OLD_FOLDERS):
                    print(f"  [KEEP] Premium directory (by path): {item.name}")
                    continue
                
                # Check if it matches a protected name pattern
                if is_protected(item.name):
                     print(f"  [KEEP] Protected directory (by name): {item.name}")
                     continue

                try:
                    print(f"  [DEL] Removing directory: {item.name}")
                    shutil.rmtree(item)
                    deleted_dirs += 1
                except Exception as e:
                    print(f"  [ERR] Could not remove {item}: {e}")

    # Phase 3: Migrate EPUBs from epubs_elejandria
    print("\n[Phase 3] Migrating and organizing files from epubs_elejandria...")
    migrated_count = 0
    created_folders = 0
    special_mappings = {} # pattern -> target_folder_path

    if not ELEJANDRIA_DIR.exists():
        print(f"  ERROR: Source folder '{ELEJANDRIA_DIR}' not found!")
    else:
        # Sort to ensure consistent processing
        epubs = sorted(list(ELEJANDRIA_DIR.glob("*.epub")))
        for epub_path in epubs:
            slug = get_slug(epub_path.name)
            if not slug:
                print(f"  [SKIP] Could not generate slug for: {epub_path.name}")
                continue
                
            target_folder = BOOKS_DIR / slug
            if not target_folder.exists():
                target_folder.mkdir(parents=True, exist_ok=True)
                created_folders += 1
            
            target_file = target_folder / f"{slug}.epub"
            
            # Avoid overwriting if possible or just proceed
            try:
                print(f"  [MOVE] {epub_path.name} -> {slug}/{slug}.epub")
                shutil.move(str(epub_path), str(target_file))
                migrated_count += 1
            except Exception as e:
                print(f"  [ERR] Failed to move {epub_path.name}: {e}")
            
            # Record mapping for special books consolidation
            for p in PROTECTED_PATTERNS:
                if p.lower() in epub_path.name.lower():
                    special_mappings[p] = target_folder

    # Phase 4: Consolidate Premium Assets (Images, Characters, Chapters)
    print("\n[Phase 4] Consolidating premium assets into new slug-folders...")
    for pattern, target_dir in special_mappings.items():
        print(f"  Consolidating assets for book matching: '{pattern}' -> {target_dir.name}")
        for old_path in PREMIUM_OLD_FOLDERS:
            # Logic to match old_path to the current special book pattern
            is_match = False
            if pattern == "principito" and "principito" in old_path.name.lower(): is_match = True
            if pattern == "principe feliz" and ("principe" in old_path.name.lower() or "c776" in old_path.name): is_match = True
            if pattern == "jekyll" and "jekyll" in old_path.name.lower(): is_match = True
            
            if is_match and old_path.exists() and old_path != target_dir:
                print(f"    Merging contents of {old_path.name}...")
                for subitem in old_path.iterdir():
                    dest = target_dir / subitem.name
                    try:
                        if subitem.is_file():
                            shutil.copy2(subitem, dest)
                        elif subitem.is_dir():
                            if dest.exists(): shutil.rmtree(dest)
                            shutil.copytree(subitem, dest)
                    except Exception as e:
                        print(f"    [ERR] Failed to copy {subitem.name}: {e}")
                
                # Optional: Delete old folder after migration to keep it clean
                # shutil.rmtree(old_path)

    # Summary
    print("\n" + "="*65)
    print("  FINAL SUMMARY")
    print("="*65)
    print(f"  Old EPUBs deleted from media: {deleted_epubs}")
    print(f"  Old book folders purged:     {deleted_dirs}")
    print(f"  Books migrated/renamed:      {migrated_count}")
    print(f"  New slug-folders created:    {created_folders}")
    print("\n  Cleanup and organization finished! Your library is now slug-based.")
    print("="*65)

if __name__ == "__main__":
    main()
