<div align="center">
  <h1>Literatus Novelist</h1>
  <p><b>Plataforma inmersiva de lectura interactiva potenciada por Inteligencia Artificial</b></p>
  
  [![Angular](https://img.shields.io/badge/Angular-17.3-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
  [![Django](https://img.shields.io/badge/Django-6.x-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
</div>

<br>

## ¿Qué es Literatus Novelist y qué problema resuelve?

En la actualidad, los hábitos de lectura tradicionales compiten constantemente contra medios de entretenimiento altamente estimulantes y de recompensa inmediata (redes sociales, videojuegos, plataformas de streaming). Esto ha generado una disminución en el interés por la literatura clásica y la lectura profunda, especialmente en el público joven.

**Literatus Novelist** nace para resolver este problema evolucionando la forma en que consumimos libros. Transforma la lectura pasiva en una **experiencia interactiva y gamificada**. Al integrar Inteligencia Artificial generativa, síntesis de voz y un sistema de recompensas, la plataforma permite a los usuarios no solo leer, sino **escuchar, interactuar y dialogar** con los personajes de las obras, revitalizando el interés por la literatura mediante tecnología inmersiva.

---

## Lo que tenemos hasta el momento (Funcionalidades)

El proyecto cuenta con una arquitectura robusta y características de vanguardia ya implementadas:

- **Lector EPUB Inmersivo (Audio-Sync):** Motor de lectura web propio con sincronización de audio palabra por palabra (estilo karaoke), utilizando metadatos de alineación de tiempo generados por modelos Whisper. Incluye un **Visualizador de Ondas de Audio** interactivo que reacciona en tiempo real a la voz del personaje.
- **Motor de Inteligencia Artificial (Art-Engine):**
  - **Chat Contextual:** Integración con Google Gemini 2.0 para permitir a los usuarios conversar de forma natural con los avatares de los personajes (ej. El Principito), respetando su personalidad e historia.
  - **Reconocimiento de Voz (STT):** Dictado y transcripción por voz (Web Speech API) integrado en el chat para permitir una conversación bidireccional completamente hablada con los personajes.
  - **Generación Automática:** Automatización de perfiles psicológicos, estilos de voz y sinopsis utilizando modelos LLM.
  - **Síntesis de Voz (TTS) Local:** Narraciones generadas dinámicamente con **Kokoro TTS** (ONNX Runtime Web), ejecutándose directamente en el navegador del usuario para dotar a cada personaje de una voz única y expresiva sin costo de servidor.
- **Pasarela de Pago (Transbank):** Pagos reales integrados con Webpay Plus, manejando transacciones atómicas seguras (`select_for_update`) para la adquisición de obras y recargas de billetera.
- **Sistema Económico (La Taberna):** Sistema de moneda virtual ("Tinta") que incentiva el uso de la plataforma, permite adquirir contenido premium y gestionar el inventario del usuario.
- **Dashboard Administrativo (Literatus Nexus):** Panel de control exclusivo para la gestión de relaciones Libro-Autor, carga masiva de archivos EPUB, multimedia, administración del catálogo y un **Editor de Avatares** dedicado para cargar, recortar y asignar dinámicamente imágenes de perfil a personajes y autores.
- **Diseño Premium UI/UX:** Interfaz desarrollada en Angular utilizando la estética *Glassmorphism*, selector de temas dinámicos (Dark Mode, Clásico Esmeralda, Moderno), tipografías modernas y animaciones fluidas para una experiencia de usuario de primera clase.

---

## Registro de Avance (Hitos)

- **Fase 1-5:** Cimientos, API REST y Frontend Base.
- **Fase 6:** Integración con Gemini 2.0 y Chat de Personajes.
- **Fase 7:** Migración a Vista Detalle Full-Page, Rediseño Glassmorphism, Selector de Temas, Integración STT y Kokoro TTS local.

---

## Lo que falta agregar (Próximos Pasos)

Aún existen áreas de crecimiento planeadas para completar el ciclo de vida del producto:

- [x] **Modo Offline PWA:** Service Workers habilitados para cachear el catálogo y los capítulos, permitiendo la lectura ininterrumpida sin conexión a internet.
- [x] **Exportación de Reportes PDF:** Generación de reportes administrativos (usuarios, libros, personajes) directamente desde el Dashboard.

---

## Stack Tecnológico

| Capa | Tecnologías Clave |
| :--- | :--- |
| **Backend** | Python 3.13, Django 6.x, Django REST Framework |
| **Base de Datos** | PostgreSQL (Arquitectura relacional 3NF, uso de UUIDs, Soft Delete) |
| **Inteligencia Artificial** | Google Gemini 2.0 Flash, Kokoro TTS (ONNX Runtime Web), Whisper (OpenAI), Web Speech API (STT) |
| **Frontend** | Angular 17.3, TypeScript, Vanilla CSS (Glassmorphism, variables CSS dinámicas) |
| **Pagos y Seguridad** | SDK Transbank Webpay Plus, JWT (JSON Web Tokens), Transacciones Atómicas Db |

---

## Arquitectura del Proyecto

El proyecto sigue un patrón cliente-servidor desacoplado:
1. **Frontend (SPA):** Construido en Angular, maneja el enrutamiento del lado del cliente, el renderizado de la UI, el estado global (servicios) y la ejecución de modelos locales en el navegador (Kokoro TTS).
2. **Backend (API RESTful):** Desarrollado en Django y Django REST Framework, provee servicios web, persistencia de datos y se comunica con servicios externos (Gemini AI, Transbank).
3. **Almacenamiento (Supabase/PostgreSQL):** La base de datos relacional aloja a usuarios, catálogo de libros, perfiles de IA, registros de tinta y datos de transacciones. Los archivos multimedia (Carátulas, EPUBs, Avatares) se gestionan mediante Storage en la nube.

---

## Endpoints de la API (Principales)

El Backend expone una API REST para el consumo del Frontend. Algunos de los endpoints críticos incluyen:

### Autenticación y Usuarios
- `POST /api/users/register/`: Registro de nuevos usuarios y asignación de tinta inicial.
- `POST /api/users/login/`: Autenticación y generación de JWT.
- `GET /api/users/me/`: Obtiene el perfil del usuario autenticado, incluyendo su balance de Tinta.

### Catálogo y Biblioteca
- `GET /api/catalog/books/`: Lista los libros disponibles en la tienda (soporta filtros y paginación).
- `GET /api/catalog/books/{slug}/`: Detalles de un libro específico (incluye metadatos para el EPUB).
- `GET /api/catalog/books/recommendations/`: Libros recomendados basados en el historial del usuario.
- `GET /api/catalog/characters/`: Lista todos los personajes de IA disponibles para interactuar.

### Integración de IA (Chat)
- `POST /api/ai/chat/`: Recibe un prompt del usuario y retorna una respuesta generada por Gemini respetando el `system_prompt` del personaje seleccionado.

### Economía y Pagos
- `POST /api/economy/ink-packages/`: Lista los paquetes de Tinta disponibles para compra.
- `POST /api/economy/purchase-ink/`: Inicia una transacción con Transbank Webpay para recargar Tinta.
- `POST /api/economy/buy-book/`: Deduce Tinta del balance del usuario y otorga acceso al libro o personaje seleccionado, utilizando `select_for_update` para evitar condiciones de carrera.

---

## Estructura del Repositorio

Cumpliendo con los estándares académicos y organizativos requeridos, el repositorio se divide en tres áreas:

```text
LiteratusNovelist/
├── Documentacion/   # Informes, casos de uso, UML, Wireframes, MER, Gantt y QA.
├── Gestion/         # Documentos de definición del proyecto e integrantes (Integrantes.txt).
├── Producto/        # Entregables técnicos y código fuente de la plataforma.
│   ├── backend/     # API REST (Django) y lógicas de IA.
│   └── frontend/    # Aplicación cliente web (Angular).
├── .gitignore       # Archivos excluidos del control de versiones.
└── README.md        # Este archivo.
```

---

## Guía de Instalación y Uso Local

Para ejecutar el proyecto en tu entorno local, dirígete a la carpeta `Producto/` y sigue estos pasos:

### 1. Levantar el Backend (Django)
```bash
cd Producto/backend
python -m venv .venv
# Activar entorno virtual:
# Windows: .\.venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 2. Levantar el Frontend (Angular)
```bash
cd Producto/frontend
npm install
npm start
```
*La aplicación estará disponible en `http://localhost:4200`.*

---



## Equipo de Desarrollo

Para consultar la nómina completa del equipo de desarrollo, roles y el acta de definición del proyecto, por favor revisa el archivo **`Gestion/Integrantes.txt`** y los recursos en la carpeta **`Gestion/`**.

<p align="center">
  <i>Construido para el futuro de la literatura interactiva.</i>
</p>

---

## Licencia

Proyecto académico — Duoc UC *(Año académico 2025-2026)*
