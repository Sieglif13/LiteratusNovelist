<div align="center">
  <h1>📚 Literatus Novelist</h1>
  <p><b>Plataforma inmersiva de lectura interactiva potenciada por Inteligencia Artificial</b></p>
  
  [![Angular](https://img.shields.io/badge/Angular-18+-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
  [![Django](https://img.shields.io/badge/Django-6.x-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
</div>

<br>

## 📝 ¿Qué es Literatus Novelist y qué problema resuelve?

En la actualidad, los hábitos de lectura tradicionales compiten constantemente contra medios de entretenimiento altamente estimulantes y de recompensa inmediata (redes sociales, videojuegos, plataformas de streaming). Esto ha generado una disminución en el interés por la literatura clásica y la lectura profunda, especialmente en el público joven.

**Literatus Novelist** nace para resolver este problema evolucionando la forma en que consumimos libros. Transforma la lectura pasiva en una **experiencia interactiva y gamificada**. Al integrar Inteligencia Artificial generativa, síntesis de voz y un sistema de recompensas, la plataforma permite a los usuarios no solo leer, sino **escuchar, interactuar y dialogar** con los personajes de las obras, revitalizando el interés por la literatura mediante tecnología inmersiva.

---

## 🚀 Lo que tenemos hasta el momento (Funcionalidades)

El proyecto cuenta con una arquitectura robusta y características de vanguardia ya implementadas:

- 📖 **Lector EPUB Inmersivo (Audio-Sync):** Motor de lectura web propio con sincronización de audio palabra por palabra (estilo karaoke), utilizando metadatos de alineación de tiempo generados por modelos Whisper.
- 🤖 **Motor de Inteligencia Artificial (Art-Engine):**
  - **Chat Contextual:** Integración con Google Gemini 2.0 para permitir a los usuarios conversar de forma natural con los avatares de los personajes (ej. El Principito), respetando su personalidad e historia.
  - **Generación Automática:** Automatización de perfiles psicológicos, estilos de voz y sinopsis utilizando DeepSeek.
  - **Síntesis de Voz (TTS):** Narraciones generadas dinámicamente con Piper TTS para dotar a cada personaje de una voz única y expresiva.
- 💳 **Pasarela de Pago (Transbank):** Pagos reales integrados con Webpay Plus, manejando transacciones atómicas seguras (`select_for_update`) para la adquisición de obras y recargas de billetera.
- 🪙 **Sistema Económico (La Taberna):** Sistema de moneda virtual ("Tinta") que incentiva el uso de la plataforma, permite adquirir contenido premium y gestionar el inventario del usuario.
- 🎛️ **Dashboard Administrativo (Literatus Nexus):** Panel de control exclusivo para la gestión de relaciones Libro-Autor, carga masiva de archivos EPUB, multimedia y administración general del catálogo.
- ✨ **Diseño Premium UI/UX:** Interfaz desarrollada en Angular utilizando la estética *Glassmorphism*, modo oscuro (Dark Mode), tipografías modernas y animaciones fluidas para una experiencia de usuario de primera clase.

---

## 🚧 Lo que falta agregar (Próximos Pasos)

Aún existen áreas de crecimiento planeadas para completar el ciclo de vida del producto:

- [ ] **Modo Offline PWA:** Habilitar Service Workers para descargar en caché los EPUBs y audios, permitiendo la lectura sin conexión a internet.
- [ ] **Clubes de Lectura Sociales:** Espacios de debate o foros en tiempo real integrados en la plataforma para discutir sobre obras y capítulos específicos.
- [ ] **Sistema de Logros y Misiones:** Profundizar la gamificación otorgando medallas por rachas diarias de lectura, páginas leídas y géneros explorados.
- [ ] **Dashboard Analítico para Docentes/Editores:** Gráficos de retención de lectura, progreso de usuarios y métricas de interacción con la IA.
- [ ] **Exportación de Reportes PDF/Excel:** Generación automática de reportes de ventas de tinta, usuarios activos y libros más leídos en el panel de administrador.

---

## 🛠 Stack Tecnológico

| Capa | Tecnologías Clave |
| :--- | :--- |
| **Backend** | Python 3.13, Django 6.x, Django REST Framework |
| **Base de Datos** | PostgreSQL (Arquitectura relacional 3NF, uso de UUIDs, Soft Delete) |
| **Inteligencia Artificial** | Google Gemini 2.0 Flash, DeepSeek API, Whisper (OpenAI), Piper TTS |
| **Frontend** | Angular 18+, TypeScript, Vanilla CSS (Glassmorphism, variables CSS) |
| **Pagos y Seguridad** | SDK Transbank Webpay Plus, JWT (JSON Web Tokens), Transacciones Atómicas Db |

---

## 📁 Estructura del Repositorio

Cumpliendo con los estándares académicos y organizativos requeridos, el repositorio se divide en tres áreas:

```text
LiteratusNovelist/
├── Documentación/   # Informes, casos de uso, UML, Wireframes, MER, Gantt y QA.
├── Gestión/         # Documentos de definición del proyecto e integrantes (Integrantes.txt).
├── Producto/        # Entregables técnicos y código fuente de la plataforma.
│   ├── backend/     # API REST (Django) y lógicas de IA.
│   ├── frontend/    # Aplicación cliente web (Angular).
│   └── *.ps1        # Scripts PowerShell de utilidades y portabilidad.
├── .gitignore       # Archivos excluidos del control de versiones.
└── README.md        # Este archivo.
```

---

## ⚙️ Guía de Instalación y Uso Local

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

## 🤝 Guía para Colaboradores y Pruebas (ZIP)

Si has recibido este proyecto mediante un archivo ZIP para colaborar o realizar pruebas, sigue estos pasos para configurar el entorno rápidamente:

1. **Descomprimir:** Extrae el contenido del ZIP en una carpeta local de fácil acceso.
2. **Configurar Entorno:** Solicita y coloca los archivos de secretos (`.env` en `Producto/backend/` y `environment.ts` en `Producto/frontend/src/environments/`). Sin estos archivos, las funciones de IA y Pagos no estarán activas.
3. **Importación Rápida con PowerShell:** 
   El proyecto incluye un script de portabilidad para restaurar la base de datos y archivos multimedia (`media`) de forma automática.
   - Abre una terminal de PowerShell dentro de la carpeta `Producto/`.
   - Ejecuta el siguiente comando (asegúrate de tener PostgreSQL instalado y configurado):
     ```powershell
     .\import_portable.ps1 -BackupPath "ruta/a/la/carpeta/de/backup"
     ```
4. **Instalación de Dependencias:** Una vez restaurados los datos, sigue los pasos de la **Guía de Instalación Local** detallada anteriormente para instalar los paquetes de Python (pip) y Angular (npm).

---

## 👥 Equipo de Desarrollo

Para consultar la nómina completa del equipo de desarrollo, roles y el acta de definición del proyecto, por favor revisa el archivo **`Gestión/Integrantes.txt`** y los recursos en la carpeta **`Gestión/`**.

<p align="center">
  <i>Construido para el futuro de la literatura interactiva.</i>
</p>