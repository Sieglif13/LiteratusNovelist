# Planificación y Cronograma — Literatus Novelist

## 1. Metodología de Trabajo

El desarrollo del proyecto Literatus Novelist se rige bajo un marco de trabajo ágil, específicamente la metodología **Scrum**. Esta elección responde a la necesidad de realizar entregas parciales y funcionales del software, permitiendo ajustes continuos basados en la retroalimentación del cliente y las iteraciones de diseño.

- **Sprints:** El trabajo se organiza en ciclos iterativos (Sprints) de 1 a 2 semanas enfocados en la implementación de módulos específicos del sistema.
- **Gestión de Tareas:** Se utiliza un tablero Kanban para la visualización y control del flujo de trabajo, asegurando la trazabilidad de los requerimientos desde su definición hasta su despliegue.
- **Validación:** Se establecen reuniones de seguimiento con el cliente para garantizar la alineación con los objetivos del negocio y las necesidades pedagógicas de la plataforma.

---

## 2. Ciclo de Vida del Software

Se adopta un modelo de **Ciclo de Vida Iterativo e Incremental**. Este enfoque permite que la plataforma evolucione desde un núcleo funcional básico (catálogo, lector) hasta la integración total de los componentes de Inteligencia Artificial, voz y sistema económico.

| Fase | Semanas | Descripción |
|---|---|---|
| **Inicio** | 1-2 | Diagnóstico, definición de objetivos, levantamiento de requerimientos técnicos. Configuración del entorno de desarrollo (Django, Angular, PostgreSQL). |
| **Elaboración** | 3-4 | Diseño de la arquitectura técnica, modelos de base de datos (UUIDs, Soft Delete), API REST base y scaffolding del frontend en Angular. |
| **Construcción I** | 5-7 | Desarrollo del catálogo, lector EPUB, sistema de autenticación (JWT), panel administrativo (Literatus Nexus) y módulo de pagos (Transbank Webpay). |
| **Construcción II** | 8-10 | Integración del motor de IA (Google Gemini, DeepSeek), sintetizador de voz (Piper TTS), Art-Engine y sistema económico "La Taberna" (Tinta). |
| **Transición** | 11-12 | Pruebas de calidad (QA), corrección de errores, narración audio-sincronizada (Whisper), generación de avatares manga y entrega final documentada. |

---

## 3. Roles y Responsabilidades

La estructura operativa del equipo de dos integrantes garantiza una participación equitativa mediante la siguiente asignación de responsabilidades:

### Responsable de Arquitectura, Backend e IA — Josué Ticona
- **Implementación Técnica:** Configuración y desarrollo de la API REST con Django, modelos de base de datos PostgreSQL y lógica de negocio del backend.
- **Motor de IA (Art-Engine):** Integración con Google Gemini 2.0 Flash y DeepSeek para generación de sinopsis, perfiles de personaje, chat conversacional y síntesis de voz (Piper TTS).
- **Infraestructura:** Configuración del servidor local de desarrollo, gestión de archivos multimedia (EPUBs, audio, imágenes), scripts de portabilidad y automatización.
- **Liderazgo:** Gestión del cronograma, comunicación técnica con el cliente y control de versiones (Git).

### Responsable de Frontend y Calidad — Benjamin Norambuena
- **Desarrollo de Interfaz:** Creación de la UI web en Angular 18+ con diseño Glassmorphism, modo oscuro, animaciones y sistema de tipografías premium.
- **Componentes Clave:** Lector EPUB interactivo, sincronización audio-palabra (karaoke), chat de personajes, La Taberna y flujo de pagos.
- **QA y Documentación:** Ejecución de casos de prueba, reporte de errores y aseguramiento de la calidad visual y funcional de la plataforma.
- **Diseño UX/UI:** Definición de paletas de colores, sistemas de diseño y flujos de usuario.

---

## 4. Cronograma de Actividades (Carta Gantt)

| Semana | Sprint | Actividades Principales | Responsable | Estado |
|---|---|---|---|---|
| 1-2 | Sprint 0 | Definición del proyecto, diseño de BD, arquitectura, setup entornos | Ambos | ✅ Completado |
| 3-4 | Sprint 1 | API REST base, modelos Django (Book, Author, Edition, User), autenticación JWT | Josué | ✅ Completado |
| 4-5 | Sprint 1 | Scaffolding Angular, rutas, componentes base, sistema de estilos globales | Benjamin | ✅ Completado |
| 5-6 | Sprint 2 | Catálogo de libros, vistas de detalle, panel admin (Literatus Nexus), carga EPUB | Josué | ✅ Completado |
| 6-7 | Sprint 2 | UI catálogo, vista detalle, diseño glassmorphism, homepage, lector EPUB básico | Benjamin | ✅ Completado |
| 7-8 | Sprint 3 | Sistema de pagos Transbank Webpay Plus, transacciones atómicas, wallet de Tinta | Josué | ✅ Completado |
| 8 | Sprint 3 | La Taberna UI, flujo de compra, carrito, economía de Tinta | Benjamin | ✅ Completado |
| 9 | Sprint 4 | Motor IA: integración Gemini 2.0, sistema de chat, perfiles de AIAvatar | Josué | ✅ Completado |
| 9-10 | Sprint 4 | Chat UI, interfaz de conversación de personajes, burbujas de diálogo | Benjamin | ✅ Completado |
| 10 | Sprint 5 | Piper TTS, narración de texto, Art-Engine (DeepSeek), generación de avatares | Josué | ✅ Completado |
| 10-11 | Sprint 5 | Lector audio-sincronizado (karaoke word-by-word), Whisper alignment | Ambos | ✅ Completado |
| 11 | Sprint 6 | Sistema de avatares manga tipo visual novel (expresiones), pipeline Stable Diffusion | Josué | 🔄 En Progreso |
| 11-12 | Sprint 6 | QA completo, pruebas de usuario, corrección de bugs, ajustes de UX finales | Benjamin | 🔄 En Progreso |
| 12 | Sprint 7 | Documentación técnica final, entrega, demo al cliente | Ambos | ⏳ Pendiente |

---

## 5. Hitos Críticos del Proyecto

| Hito | Entregable | Fecha Estimada | Estado |
|---|---|---|---|
| H1 | Backend funcional con API REST y autenticación | Semana 4 | ✅ |
| H2 | Catálogo y lector EPUB operativo | Semana 6 | ✅ |
| H3 | Pasarela de pago Transbank integrada | Semana 8 | ✅ |
| H4 | Chat con personajes de IA (Gemini) funcional | Semana 9 | ✅ |
| H5 | Sistema de narración TTS y audio-sync | Semana 10 | ✅ |
| H6 | Avatares manga tipo visual novel generados | Semana 11 | 🔄 |
| H7 | QA completo y entrega final | Semana 12 | ⏳ |

---

## 6. Restricciones y Supuestos

### Restricciones
- El proyecto debe ser funcional desde un entorno de desarrollo local (sin despliegue en la nube durante el período académico).
- El uso de APIs externas (Google Gemini, DeepSeek, Transbank) depende de la disponibilidad de claves y cuotas gratuitas.
- La generación de imágenes con Stable Diffusion se realiza en Google Colab por limitaciones de hardware local.

### Supuestos
- Se cuenta con acceso estable a internet para el consumo de APIs externas.
- La base de datos PostgreSQL permanece operativa en el entorno local durante el desarrollo.
- Las obras literarias utilizadas son de dominio público y su uso no infringe derechos de autor.
