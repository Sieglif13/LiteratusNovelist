# 📚 Literatus Novelist

> Plataforma de lectura inteligente con extracción de personajes, análisis narrativo y chat contextual basado en IA.

---

## 🛠 Stack Tecnológico

| Capa       | Tecnología                                      |
|------------|-------------------------------------------------|
| Backend    | Python 3.13, Django 6.x, Django REST Framework  |
| Base de datos | PostgreSQL                                   |
| IA / NLP   | Google Gemini API (google-generativeai)         |
| Frontend   | *(por definir — Paso 2)*                        |
| DevOps     | Git + Monorepo                                  |

---

## 📁 Estructura del Repositorio

```
LiteratusNovelist/
├── backend/                 # Proyecto Django (API REST)
│   ├── config/              # Configuración central del proyecto
│   │   ├── settings.py      # Ajustes con variables de entorno
│   │   ├── urls.py          # Rutas raíz
│   │   └── wsgi.py
│   ├── .env                 # Variables de entorno locales (NO subir)
│   ├── .env.example         # Plantilla de variables de entorno
│   ├── manage.py
│   └── requirements.txt
├── frontend/                # Proyecto web (por implementar)
│   └── .gitkeep
├── .gitignore
└── README.md
```

---

## ⚙️ Guía de Instalación — Backend

### Prerrequisitos
- **Python** 3.10 o superior
- **PostgreSQL** instalado y corriendo
- **Git**

### Pasos

**1. Clona el repositorio**
```bash
git clone https://github.com/tu-usuario/LiteratusNovelist.git
cd LiteratusNovelist
```

**2. Navega al backend y crea el entorno virtual**
```bash
cd backend
python -m venv .venv
```

**3. Activa el entorno virtual**
```bash
# Windows
.\.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

**4. Instala las dependencias**
```bash
pip install -r requirements.txt
```

**5. Configura las variables de entorno**
```bash
# Copia la plantilla y edita con tus credenciales locales
copy .env.example .env   # Windows
cp .env.example .env     # macOS / Linux
```

Edita el archivo `.env`:
```env
DEBUG=True
SECRET_KEY=tu-clave-secreta-aqui
DATABASE_URL=postgres://usuario:contraseña@localhost:5432/literatus_db
ALLOWED_HOSTS=localhost,127.0.0.1
```

**6. Crea la base de datos en PostgreSQL**
```sql
CREATE DATABASE literatus_db;
```

**7. Aplica las migraciones**
```bash
python manage.py migrate
```

**8. Inicia el servidor de desarrollo**
```bash
python manage.py runserver
```

El servidor estará disponible en: `http://127.0.0.1:8000/`

---

## 📋 Dependencias del Backend

| Paquete               | Propósito                                   |
|-----------------------|---------------------------------------------|
| `django`              | Framework web principal                     |
| `djangorestframework` | Construcción de APIs REST                   |
| `django-environ`      | Gestión de variables de entorno             |
| `psycopg2-binary`     | Adaptador PostgreSQL para Python            |
| `django-cors-headers` | Manejo de CORS para conexión con el frontend|

---

## 🏗 Arquitectura de Base de Datos

El diseño de la base de datos está construido pensando en la seguridad, escalabilidad y facilidad de mantenimiento. Para entender cómo funciona, aquí están sus bases explicadas de manera sencilla:

- **Estructura Modular:** En lugar de tener todo mezclado, dividimos el sistema en 5 áreas lógicas: `users` (cuentas y perfiles), `catalog` (autores y libros), `finance` (compras y transacciones), `library` (biblioteca digital del usuario) y `ai_engine` (historial de chats con los personajes).
- **Identificadores Seguros:** En lugar de usar números del 1 en adelante para enumerar los libros o usuarios (ej. el usuario 5, el libro 12), usamos códigos criptográficos únicos llamados **UUID**. Esto significa que nadie puede "adivinar" cuántos elementos existen ni descargar información usando patrones secuenciales.
- **Borrado Seguro (Papelera de Reciclaje oculta):** Si borras un archivo o una cuenta, **nunca se destruye realmente de la base de datos**. El sistema simplemente lo "oculta". A esto se le conoce como *Soft Delete*. Se hace así por seguridad contable: si eliminas un libro del catálogo, tu recibo de compra antiguo no se romperá ni desaparecerá, pues el historial debe ser inmutable.
- **Descargas Protegidas:** ¡Tus libros no son enlaces públicos! Los PDFs y ePUBs se almacenan en una bóveda privada. Para descargar un libro, el sistema revisará antes la base de datos y si corrobora que la compra es legítima, te enviará dinámicamente el archivo.

---

## 📈 Registro de Avance del Proyecto

### Hito 1 — Inicialización del Monorepo *(Paso 1)*
- ✅ Estructura de monorepo creada (`/backend`, `/frontend`)
- ✅ Entorno virtual (`.venv`) configurado en `/backend`
- ✅ Dependencias instaladas vía `requirements.txt`
- ✅ Proyecto Django inicializado bajo el nombre `config`
- ✅ `settings.py` configurado con `django-environ` y PostgreSQL
- ✅ `.gitignore` configurado (excluye `.venv`, `.env`, `*.sqlite3`)
- ✅ Plantilla `.env.example` disponible para colaboradores
- ✅ `python manage.py check` — **0 errores**

---

## 🧑‍💻 Estándares de Desarrollo

- **PEP 8** aplicado estrictamente en todo el código Python
- **Comentarios en español** en clases, funciones y bloques lógicos
- **Clean Code**: funciones cortas, nombres descriptivos, sin duplicación
- **Variables de entorno** para toda configuración sensible (nunca en el código)
- **Commits atómicos** con mensajes descriptivos en español

---

## 📄 Licencia

Proyecto académico — Universidad *(año académico 2025-2026)*