---
description: Proceso para agregar nuevos libros y personajes inteligentes
---

# Proceso de Arquitectura de Novelas en Literatus

Este flujo de trabajo define cómo integrar una nueva obra al catálogo y configurar sus personajes con inteligencia artificial.

## 1. Fase de Catálogo (Backend)
Antes de configurar la IA, la obra debe existir en el sistema base:
- **Autor y Género**: Crear los registros en `Author` y `Genre`.
- **Obra (Book)**: Agregar el título y la sinopsis principal.
- **Edición (Edition)**: Subir el archivo (EPUB/PDF), definir el idioma y el precio.
- **Capítulos (Chapter)**: Procesar el contenido en capítulos individuales para permitir el desbloqueo progresivo de personajes.

## 2. Fase de Diseño de Avatares (IA)
Para cada personaje clave de la obra, crear un `AIAvatar` vinculado a la `Edition`.

### Atributos Críticos:
- **System Prompt**: Define el "quién soy". (Ej: "Eres la Rosa del Principito. Eres hermosa, orgullosa y un poco melodramática...").
- **Behavioral Context**: Define el "cómo me siento ahora". (Ej: "Te sientes abandonada por el Principito y tratas de ocultar tu tristeza con orgullo").
- **Sample Dialogues**: Proporciona ejemplos reales del libro para que el modelo imite el léxico y tono.
- **Unlock At Chapter**: El punto exacto de la trama donde el personaje se vuelve "accesible" para el usuario.

## 3. Automatización mediante Scripts
Para producciones masivas, se recomienda usar un script de `Seed` o un comando de gestión personalizado que automatice la creación de estos registros de forma atómica.

## 4. Validación Visual
Verificar en el frontend:
1. La ficha del libro en el catálogo.
2. La aparición de los personajes (bloqueados/desbloqueados) en el panel lateral del lector.
3. La coherencia de la conversación inicial (`greeting_message`).
