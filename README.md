#  Literatus Novelist

> Plataforma de lectura inteligente con extracción de personajes, análisis narrativo y chat contextual basado en IA. Una experiencia inmersiva que fusiona la literatura clásica con la tecnología generativa.

---

## 🛠 Stack Tecnológico

| Capa       | Tecnología                                      |
|------------|-------------------------------------------------|
| **Backend** | Python 3.13, Django 6.x, Django REST Framework  |
| **Base de datos** | PostgreSQL (Arquitectura 3NF con UUIDs)      |
| **IA / NLP** | Google Gemini 2.0 Flash (`google-genai`)        |
| **Frontend** | Angular 18+, TypeScript, Vanilla CSS (Glassmorphism) |
| **Diseño**  | Estética Premium Dark Mode & Bento Grid         |

---

##  Estructura del Repositorio

```
LiteratusNovelist/
├── backend/                 # API REST (Django)
│   ├── catalog/             # Gestión de libros, autores y reseñas
│   ├── users/               # Perfiles y Economía de Tinta
│   ├── library/             # Inventario del usuario y progreso
│   ├── ai_engine/           # Lógica de Chat e IA (Gemini 2.0)
│   └── config/              # Configuración central
├── frontend/                # Aplicación Web (Angular)
│   ├── src/app/catalog/     # Vistas de catálogo y detalle
│   ├── src/app/library/     # Lector EPUB y Taberna de Tinta
│   ├── src/app/auth/        # Autenticación reactiva
│   └── src/app/core/        # Servicios y Guardias
└── README.md
```

---

## ✨ Características Principales
##  Guía de Instalación — Backend

- **Catálogo Inmersivo:** Navegación fluida por obras clásicas con filtros por dificultad y género.
- **Detalle de Obra Full-Page:** Vista completa con sinopsis, reseñas de la comunidad y avatares interactivos.
- **Chat Contextual con IA:** Charla con personajes de los libros (ej. El Principito, El Zorro) con una IA que conoce su historia y personalidad.
- **Economía de Tinta:** 
  - Bono de bienvenida de **150 de Tinta**.
  - **La Taberna:** Sistema de recarga mediante visualización de anuncios y compra de cofres.
  - Mercado interno para adquirir nuevas obras.
- **Lector Integrado:** Experiencia de lectura fluida con soporte para archivos EPUB y guardado de progreso automático.

---

## ⚙️ Guía de Inicio Rápido

### Backend
1. `cd backend`
2. `python -m venv .venv`
3. `.\.venv\Scripts\activate` (Windows)
4. `pip install -r requirements.txt`
5. `python manage.py migrate`
6. `python manage.py runserver`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm start`
4. Acceder a `http://localhost:4200`
---

##  Arquitectura de Base de Datos

---

## 🏗 Arquitectura de Datos
El sistema utiliza una arquitectura modular y segura:
- **UUIDs:** Identificadores únicos para prevenir scraping y ataques secuenciales.
- **Soft Delete:** Integridad de datos contables y de biblioteca.
- **DBML:** Esquema visualizable en `dbdiagram.io` (ver archivo `backend/literatus_schema.dbml`).

---

## 📈 Registro de Avance (Hitos)
##  Registro de Avance del Proyecto

- **Fase 1-5:** Cimientos, API REST y Frontend Base.
- **Fase 6:** Integración con Gemini 2.0 y Chat de Personajes.
- **Fase 7:** Migración a Vista Detalle Full-Page y Rediseño Glassmorphism.
- **Fase 8:** Implementación de Economía de Tinta, La Taberna y Estabilización de Sesión. ✅

---

##  Estándares de Desarrollo

- **Clean Code & PEP 8:** Código legible y documentado en español.
- **Reactividad Angular:** Uso de `BehaviorSubject` para estados globales (Auth, Tinta).
- **Seguridad:** JWT para autenticación y transacciones atómicas para la economía.

---

##  Licencia

Proyecto académico — Universidad *(Año académico 2025-2026)*
