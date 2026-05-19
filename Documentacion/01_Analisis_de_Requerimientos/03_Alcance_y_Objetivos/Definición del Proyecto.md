# Definición del Proyecto — Literatus Novelist

---

## Situación Inicial del Cliente

El mercado de la lectura digital en Latinoamérica enfrenta una paradoja: mientras el acceso a internet y los dispositivos móviles crece exponencialmente, los índices de lectura de obras literarias siguen en declive. Las plataformas existentes (Amazon Kindle, Google Books, Project Gutenberg) ofrecen acceso a contenido, pero no resuelven el problema de fondo: la lectura clásica es percibida como una actividad **pasiva, árida y desconectada** de la experiencia digital moderna.

El cliente identifica una oportunidad de negocio concreta en la intersección entre la **Inteligencia Artificial generativa** y la **distribución de literatura de dominio público**, creando una plataforma donde la tecnología actúe como puente entre el lector y la obra, haciendo la experiencia tan atractiva e inmersiva como cualquier otro medio digital de consumo actual.

---

## Objetivo General

Desarrollar una plataforma web inteligente que facilite el acceso, la comprensión e interacción con obras literarias de dominio público mediante tecnologías de Inteligencia Artificial generativa, síntesis de voz y un sistema de economía digital, transformando la lectura pasiva en una **experiencia inmersiva, interactiva y sostenible**.

---

## Objetivos Específicos

1. **Catálogo Digital Inteligente:** Implementar un sistema de gestión de más de 1,800 obras de dominio público con metadatos enriquecidos, sinopsis generadas automáticamente por IA (DeepSeek) y un motor de búsqueda y filtrado avanzado por género, autor, idioma y año.

2. **Motor de IA Conversacional (Art-Engine):** Integrar Google Gemini 2.0 Flash para habilitar conversaciones inmersivas entre el lector y avatares de personajes literarios, con personalidades únicas definidas por IA, estilos de habla y contexto narrativo de cada obra.

3. **Sistema de Narración Sincronizada:** Desarrollar un pipeline de síntesis de voz con Piper TTS y alineación temporal a nivel de palabra mediante OpenAI Whisper, logrando un efecto de narración tipo karaoke en el lector donde el texto se subraya en sincronía con el audio.

4. **Ecosistema Económico y de Pagos:** Integrar Transbank Webpay Plus para transacciones reales y diseñar el sistema de moneda virtual "Tinta" para incentivos de uso, acceso a contenido premium y sostenibilidad del modelo de negocio.

5. **Sistema de Avatares Visuales:** Generar un conjunto de imágenes estilo manga/novela visual para los personajes de las obras seleccionadas, con 5 expresiones faciales cada uno (calma, pensando, hablando ×3), para enriquecer la experiencia del chat conversacional.

6. **Panel Administrativo (Literatus Nexus):** Crear un panel de control exclusivo para la gestión de libros, autores, ediciones, usuarios, personajes y carga masiva de archivos EPUB y multimedia.

---

## Alcance y Límites del Proyecto

### Definición de Alcance

El proyecto contempla el diseño, planificación y desarrollo de un **producto mínimo viable (MVP)** denominado **Literatus Novelist**, integrado por los siguientes módulos:

| # | Módulo | Descripción |
|---|---|---|
| 1 | **Catálogo Digital** | Más de 1,800 obras de dominio público procesadas y enriquecidas con IA. |
| 2 | **Lector EPUB Web** | Lector propio por capítulos con navegación avanzada y modo oscuro. |
| 3 | **Autenticación y Usuarios** | Login/Registro con JWT, perfiles de usuario y biblioteca personal. |
| 4 | **Narración TTS** | Síntesis de voz por personaje con Piper TTS y narración karaoke. |
| 5 | **Chat con Personajes** | Conversación contextual con avatares de IA basados en Gemini 2.0 Flash. |
| 6 | **Llamada de Voz con IA** | Interacción por voz con personajes usando Web Speech API + TTS. |
| 7 | **Sistema de Pagos** | Transbank Webpay Plus con transacciones atómicas seguras. |
| 8 | **La Taberna (Economía)** | Sistema de moneda virtual "Tinta" y tienda de contenido premium. |
| 9 | **Panel Admin (Nexus)** | Gestión completa de contenido, usuarios y operaciones de la plataforma. |
| 10 | **Avatares Manga** | Imágenes tipo novela visual con expresiones múltiples generadas con SDXL. |

### Entregables del Proyecto

- Código fuente completo del backend (Django) y frontend (Angular) en repositorio Git.
- Base de datos PostgreSQL con catálogo de más de 1,800 obras enriquecidas.
- Archivos multimedia de narración (audio + metadatos de alineación Whisper).
- JSON de configuración de avatares manga y scripts de generación para Colab.
- Documentación técnica completa (arquitectura, API, QA, diagramas).
- Manual de instalación y despliegue local.

### Supuestos

- Las obras literarias utilizadas son de dominio público y su uso no infringe derechos de autor.
- Se cuenta con acceso estable a internet para el consumo de APIs externas (Gemini, DeepSeek, Transbank).
- La base de datos PostgreSQL permanece operativa en el entorno local durante el desarrollo.
- El hardware disponible en Google Colab es suficiente para la generación de imágenes con Stable Diffusion XL.

### Restricciones y Límites

| Restricción | Descripción |
|---|---|
| **Plataforma** | Solo web responsive; no se desarrolla aplicación móvil nativa. |
| **Despliegue** | No se contempla despliegue en producción cloud en esta iteración académica. |
| **Generación de Imágenes** | La generación con Stable Diffusion XL se realiza en Google Colab, no localmente. |
| **APIs Externas** | Las cuotas de Gemini y DeepSeek están sujetas a límites de planes gratuitos. |
| **Alcance del Catálogo** | Solo obras de dominio público; no se negocian derechos editoriales en esta fase. |

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| **Backend** | Python + Django + Django REST Framework | 3.13 / 6.x |
| **Base de Datos** | PostgreSQL | 16+ |
| **Frontend** | Angular + TypeScript | 18+ |
| **IA Conversacional** | Google Gemini 2.0 Flash | API v1 |
| **IA Generativa Batch** | DeepSeek API | deepseek-chat |
| **Síntesis de Voz** | Piper TTS | Local |
| **Alineación de Audio** | OpenAI Whisper | Large-v3 |
| **Generación de Imágenes** | Stable Diffusion XL (Animagine XL 3.1) | Colab |
| **Pagos** | Transbank SDK Webpay Plus | Python SDK |
| **Autenticación** | JSON Web Tokens (JWT) | djangorestframework-simplejwt |

---

## Equipo de Desarrollo

| Nombre | Rol Principal | Responsabilidades |
|---|---|---|
| **Josué Ticona** | Arquitecto de Software / Backend e IA | API REST, modelos BD, motor IA, pipelines de audio, Transbank, automatización, Git. |
| **Benjamin Norambuena** | Desarrollador Frontend / QA | UI Angular, lector EPUB, chat UI, La Taberna, pruebas funcionales, documentación. |

---

## Indicadores de Éxito

| Indicador | Meta | Estado |
|---|---|---|
| Catálogo de obras disponibles | ≥ 1,000 obras | ✅ 1,800+ obras |
| Chat de personajes funcional | ≥ 3 obras piloto | ✅ Funcional en todo el catálogo |
| Narración karaoke operativa | ≥ 3 libros con audio-sync | ✅ Pipeline implementado |
| Integración de pagos activa | Transbank Webpay funcional | ✅ Completado |
| Sistema económico "Tinta" | La Taberna operativa | ✅ Completado |
| Avatares manga generados | 19 personajes (3 obras) | 🔄 En progreso |
| QA superado | ≥ 80% casos de prueba OK | 🔄 En progreso |
