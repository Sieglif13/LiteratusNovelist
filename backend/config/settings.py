"""
Configuración principal de Django para el proyecto Literatus Novelist.

Generado con 'django-admin startproject' y adaptado siguiendo
los estándares de Clean Code, PEP 8 y seguridad en entornos de producción.

Para más información sobre este archivo:
    https://docs.djangoproject.com/en/6.0/topics/settings/
"""

import environ
from pathlib import Path

# ---------------------------------------------------------------------------
# Rutas base del proyecto
# ---------------------------------------------------------------------------

# Directorio raíz del backend (donde vive manage.py)
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Configuración de variables de entorno con django-environ
# ---------------------------------------------------------------------------

# Inicializar environ con tipos y valores por defecto
env = environ.Env(
    DEBUG=(bool, False),
)

# Leer el archivo .env ubicado en la raíz del backend
environ.Env.read_env(BASE_DIR / '.env')

# ---------------------------------------------------------------------------
# Ajustes de seguridad (NO usar DEBUG=True ni exponer SECRET_KEY en producción)
# ---------------------------------------------------------------------------

# Clave secreta leída desde .env — nunca exponer en el código fuente
SECRET_KEY = env('SECRET_KEY')

# Modo depuración: True solo en desarrollo local
DEBUG = env('DEBUG')

# Hosts permitidos para acceder al servidor
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# ---------------------------------------------------------------------------
# Aplicaciones instaladas
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    # Aplicaciones nativas de Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Aplicaciones de terceros
    'rest_framework',   # API REST
    'rest_framework_simplejwt', # Autenticación de Standard JWT
    'drf_spectacular',  # Documentación OpenAPI/Swagger (Clean API Docs)
    'corsheaders',      # Manejo de CORS para conectar con el frontend
    'django_filters',   # django-filter app
    # Aplicaciones propias
    'core',
    'users.apps.UsersConfig',
    'catalog.apps.CatalogConfig',
    'finance.apps.FinanceConfig',
    'library.apps.LibraryConfig',
    'ai_engine.apps.AiEngineConfig',
]

# Modelo de usuario personalizado
AUTH_USER_MODEL = 'users.User'

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    # CorsMiddleware debe ir antes de CommonMiddleware
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ---------------------------------------------------------------------------
# URLs y WSGI
# ---------------------------------------------------------------------------

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Base de datos — PostgreSQL vía DATABASE_URL en .env
# ---------------------------------------------------------------------------

DATABASES = {
    # env.db() lee DATABASE_URL del .env y lo convierte automáticamente
    'default': env.db(),
}

# ---------------------------------------------------------------------------
# Validación de contraseñas
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': (
            'django.contrib.auth.password_validation'
            '.UserAttributeSimilarityValidator'
        ),
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation'
            '.MinimumLengthValidator'
        ),
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation'
            '.CommonPasswordValidator'
        ),
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation'
            '.NumericPasswordValidator'
        ),
    },
]

# ---------------------------------------------------------------------------
# Internacionalización
# ---------------------------------------------------------------------------

LANGUAGE_CODE = 'es-pe'   # Español - Perú
TIME_ZONE = 'America/Lima'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Archivos estáticos y media
# ---------------------------------------------------------------------------

STATIC_URL = 'static/'

# MEDIA_ROOT: directorio físico donde Django guarda los archivos subidos.
# Los archivos en MEDIA_ROOT son accesibles vía MEDIA_URL (públicos).
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ---------------------------------------------------------------------------
# PROTECCIÓN DE ARCHIVOS DIGITALES (PDFs, EPUBs, Audiolibros)
# ---------------------------------------------------------------------------
# PRIVATE_MEDIA_ROOT: directorio para assets protegidos.
# CRÍTICO: este directorio NO está bajo MEDIA_URL. Django (ni Nginx en prod.)
# nunca sirve estos archivos directamente desde una URL pública.
#
# Flujo de acceso correcto:
#   1. Cliente hace GET /api/library/editions/{id}/download/
#   2. La view verifica JWT + UserInventory.objects.filter(user, edition).exists()
#   3. Solo si el usuario ES dueño: devuelve FileResponse (dev) o
#      X-Accel-Redirect (Nginx en prod.) para que el servidor sirva eficientemente.
#
# En 'catalog/models.py', Edition.file usa upload_to='protected/book_files/'
# que resuelve a este directorio, no al MEDIA_ROOT público.
PRIVATE_MEDIA_ROOT = BASE_DIR / 'private_media'

# ---------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing) — necesario para el frontend
# ---------------------------------------------------------------------------

# Orígenes permitidos en desarrollo local
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4200',
]

CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Configuración de Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    # Autenticación y permisos por defecto (se expandirán en futuros pasos)
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    # Para documentación Swagger automatizada (OpenAPI 3.0)
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ---------------------------------------------------------------------------
# Configuración de drf-spectacular (Swagger UI)
# ---------------------------------------------------------------------------

SPECTACULAR_SETTINGS = {
    'TITLE': 'Literatus Novelist API',
    'DESCRIPTION': 'Documentación oficial de la API de Literatus Novelist.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    # Añadimos detección explícita para que el candado aparezca en la Interfaz:
    'SECURITY': [{'jwtAuth': []}],
    'COMPONENT_SPLIT_REQUEST': True
}

from datetime import timedelta

# ---------------------------------------------------------------------------
# SimpleJWT Configuración de Caducidad y Manejo
# ---------------------------------------------------------------------------

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1), # Rotaremos Access dinámicamente frente al usuario
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True, # Interesante estadística nativa de autenticación
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ---------------------------------------------------------------------------
# Tipo de campo de clave primaria por defecto para nuevos modelos
# ---------------------------------------------------------------------------
# Nota: nuestros modelos propios heredan TimeStampedModel y usan UUIDField
# como PK explícita. BigAutoField aplica SOLO a modelos de terceros (ej.
# django.contrib.sessions) que NO declaran su propio campo pk.
# ---------------------------------------------------------------------------
# Configuración de Inteligencia Artificial (Gemini)
# ---------------------------------------------------------------------------
GOOGLE_API_KEY = env('GOOGLE_API_KEY', default=None)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
