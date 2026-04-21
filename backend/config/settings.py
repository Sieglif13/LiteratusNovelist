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
    'corsheaders',      # Manejo de CORS para conectar con el frontend
]

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
# Archivos estáticos
# ---------------------------------------------------------------------------

STATIC_URL = 'static/'

# ---------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing) — necesario para el frontend
# ---------------------------------------------------------------------------

# Orígenes permitidos en desarrollo local
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
]

# ---------------------------------------------------------------------------
# Configuración de Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    # Autenticación y permisos por defecto (se expandirán en futuros pasos)
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
}

# ---------------------------------------------------------------------------
# Tipo de campo de clave primaria por defecto para nuevos modelos
# ---------------------------------------------------------------------------

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
