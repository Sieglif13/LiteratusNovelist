import os
import sys
import zipfile
from datetime import datetime

# Configuración de carpetas a comprimir y archivo de salida
FOLDERS_TO_ZIP = ["Documentacion", "Gestion"]
OUTPUT_ZIP_NAME = "Documentacion_LiteratusNovelist.zip"

def compress_folders():
    # Asegurar codificación utf-8 si la consola de Windows lo soporta, o usar ASCII para prevenir caídas
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

    print("=" * 60)
    print("COMPRESOR DE DOCUMENTACION - LITERATUS NOVELIST")
    print("=" * 60)
    
    # Comprobar la existencia de las carpetas
    valid_folders = []
    for folder in FOLDERS_TO_ZIP:
        if os.path.exists(folder):
            valid_folders.append(folder)
        else:
            print(f"[WARN] La carpeta '{folder}' no existe, se omitira.")
            
    if not valid_folders:
        print("[ERROR] No se encontraron carpetas validas para comprimir.")
        return
        
    print(f"[INFO] Carpetas a incluir: {', '.join(valid_folders)}")
    print(f"[INFO] Creando archivo comprimido: {OUTPUT_ZIP_NAME}...")
    
    total_files = 0
    total_size = 0
    
    # Crear el archivo ZIP
    with zipfile.ZipFile(OUTPUT_ZIP_NAME, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for folder in valid_folders:
            print(f"\n[DIR] Procesando carpeta: {folder}")
            # Recorrer todos los directorios y archivos
            for root, dirs, files in os.walk(folder):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Calcular nombre relativo dentro del zip
                    relative_path = os.path.relpath(file_path, os.path.dirname(folder))
                    
                    # Agregar al ZIP
                    zip_file.write(file_path, relative_path)
                    
                    # Estadísticas
                    file_size = os.path.getsize(file_path)
                    total_size += file_size
                    total_files += 1
                    print(f"  [+] {relative_path} ({file_size / 1024:.1f} KB)")
                    
    print("\n" + "=" * 60)
    print("COMPRESION COMPLETADA CON EXITO")
    print("=" * 60)
    print(f"Archivo de salida: {os.path.abspath(OUTPUT_ZIP_NAME)}")
    print(f"Total de archivos comprimidos: {total_files}")
    print(f"Tamano total original: {total_size / (1024*1024):.2f} MB")
    print(f"Fecha de creacion: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

if __name__ == "__main__":
    compress_folders()
