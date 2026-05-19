# Matriz RACI — Literatus Novelist

## Leyenda

| Símbolo | Rol | Descripción |
|---|---|---|
| **R** | Responsible | Quien ejecuta la tarea directamente |
| **A** | Accountable | Quien tiene la responsabilidad final y aprueba |
| **C** | Consulted | Quien aporta información o feedback |
| **I** | Informed | Quien debe ser notificado del resultado |

**Integrantes del equipo:**
- **JT** = Josué Ticona (Arquitectura, Backend e IA)
- **BN** = Benjamin Norambuena (Frontend y Calidad)

---

## Módulo 1 — Gestión y Arquitectura Base

| Actividad | JT | BN |
|---|---|---|
| Diseño del modelo de base de datos (PostgreSQL, UUIDs, Soft Delete) | R/A | C |
| Configuración del entorno de desarrollo (Django, venv, PostgreSQL) | R/A | I |
| Configuración del entorno Frontend (Angular 18+, npm) | C | R/A |
| Definición de la arquitectura API REST (endpoints, serializers) | R/A | C |
| Gestión del repositorio Git y control de versiones | R/A | R |
| Comunicación y presentaciones al cliente | A | R |
| Elaboración de documentación técnica | C | R/A |

---

## Módulo 2 — Catálogo y Panel Administrativo

| Actividad | JT | BN |
|---|---|---|
| Modelos Django: Book, Author, Edition, Genre, BookFile | R/A | I |
| API REST del catálogo (listar, filtrar, buscar, detalle) | R/A | C |
| Panel Administrativo "Literatus Nexus" (backend) | R/A | I |
| UI del catálogo de libros (cards, filtros, búsqueda) | C | R/A |
| Vista de detalle del libro (sinopsis, personajes, comprar) | I | R/A |
| Carga masiva de EPUBs y archivos multimedia | R/A | C |

---

## Módulo 3 — Sistema de Autenticación y Usuarios

| Actividad | JT | BN |
|---|---|---|
| Autenticación JWT (login, registro, refresh token) | R/A | I |
| Modelos de usuario y perfil (CustomUser, UserProfile) | R/A | I |
| Guards de rutas y manejo de sesión en Angular | C | R/A |
| UI de login, registro y perfil de usuario | I | R/A |
| Biblioteca personal del usuario (mis libros) | C | R/A |

---

## Módulo 4 — Lector EPUB y Audio-Sincronización

| Actividad | JT | BN |
|---|---|---|
| Parser de EPUB y conversión a HTML por capítulos | R/A | I |
| API de servicio de capítulos y progreso de lectura | R/A | C |
| Pipeline de narración con Whisper (word-level alignment) | R/A | I |
| Componente de lector interactivo en Angular | C | R/A |
| Sincronización audio-palabra (karaoke) en el lector | C | R/A |
| Control de reproducción de audio (play/pause/seek) | I | R/A |

---

## Módulo 5 — Sistema de Pagos (Transbank Webpay)

| Actividad | JT | BN |
|---|---|---|
| Integración SDK Transbank Webpay Plus | R/A | I |
| Transacciones atómicas (select_for_update) | R/A | I |
| Modelos de Order, Transaction y Wallet | R/A | I |
| UI del flujo de compra y confirmación de pago | C | R/A |
| Historial de transacciones del usuario | C | R/A |

---

## Módulo 6 — Sistema Económico "La Taberna" (Tinta)

| Actividad | JT | BN |
|---|---|---|
| Modelo de moneda virtual "Tinta" y wallet del usuario | R/A | I |
| API de recargas y compra de contenido con Tinta | R/A | C |
| UI de La Taberna (tienda de contenido premium) | C | R/A |
| Indicador de saldo de Tinta en la navegación | I | R/A |

---

## Módulo 7 — Motor de IA y Chat de Personajes (Art-Engine)

| Actividad | JT | BN |
|---|---|---|
| Generación automática de sinopsis con DeepSeek | R/A | I |
| Creación de perfiles de AIAvatar (personalidad, voz, contexto) | R/A | I |
| Integración Google Gemini 2.0 Flash para chat contextual | R/A | C |
| Síntesis de voz con Piper TTS (voz por personaje) | R/A | I |
| Generación de avatares manga (Stable Diffusion XL en Colab) | R/A | I |
| UI de chat de personaje (burbujas, avatar, audio) | C | R/A |
| Interfaz de llamada de voz con personaje | C | R/A |
| Renderizado de Markdown en respuestas de IA | I | R/A |

---

## Módulo 8 — QA y Pruebas

| Actividad | JT | BN |
|---|---|---|
| Diseño del Plan de Pruebas | C | R/A |
| Ejecución de casos de prueba funcionales | C | R/A |
| Pruebas de integración de API (Postman / automated) | R/A | C |
| Pruebas de experiencia de usuario (UX testing) | I | R/A |
| Reporte de bugs y gestión de defectos | C | R/A |
| Corrección de errores detectados en QA | R | R |

---

## Resumen de Distribución de Carga

| Integrante | Módulos Principales | % Carga Estimada |
|---|---|---|
| **Josué Ticona** | Arquitectura, BD, API REST, IA, TTS, Whisper, Transbank (backend) | 50% |
| **Benjamin Norambuena** | UI Angular, Lector, Chat UI, La Taberna, QA, Documentación | 50% |
