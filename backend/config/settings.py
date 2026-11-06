"""Настройки автономного запуска тренажёра.

Сервер устроен так же, как backend AI edu: Django + Django REST Framework, сессионная
авторизация с CSRF, API под /api/v1/, PostgreSQL (локально можно SQLite).
Модуль apps.virtual_labs переносится в AI edu без изменений (см. INTEGRATION.md).
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BASE_DIR.parent


def _load_env(path):
    """Строки КЛЮЧ=значение из backend/.env. Уже заданные переменные окружения не перезаписываются."""
    if not path.exists():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env(BASE_DIR / '.env')
env = os.environ.get


def _secret():
    if env('SECRET_KEY'):
        return env('SECRET_KEY')
    path = BASE_DIR / '.secret_key'
    if not path.exists():
        import secrets
        path.write_text(secrets.token_urlsafe(50), encoding='utf-8')
    return path.read_text(encoding='utf-8').strip()


SECRET_KEY = _secret()
DEBUG = env('DEBUG', '0') == '1'
ALLOWED_HOSTS = [h.strip() for h in env('ALLOWED_HOSTS', 'localhost,127.0.0.1,[::1],testserver').split(',') if h.strip()]
CSRF_TRUSTED_ORIGINS = [o.strip() for o in env('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()]

INSTALLED_APPS = [
    'django.contrib.admin', 'django.contrib.auth', 'django.contrib.contenttypes',
    'django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles',
    'rest_framework',
    'apps.accounts',
    'apps.virtual_labs',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'config.urls'
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [], 'APP_DIRS': True,
              'OPTIONS': {'context_processors': ['django.template.context_processors.request',
                                                 'django.contrib.auth.context_processors.auth',
                                                 'django.contrib.messages.context_processors.messages']}}]
WSGI_APPLICATION = 'config.wsgi.application'

if env('DATABASE_NAME'):
    DATABASES = {'default': {
        'ENGINE': 'django.db.backends.postgresql', 'NAME': env('DATABASE_NAME'), 'USER': env('DATABASE_USER', ''),
        'PASSWORD': env('DATABASE_PASSWORD', ''), 'HOST': env('DATABASE_HOST', 'localhost'),
        'PORT': env('DATABASE_PORT', '5432'), 'CONN_MAX_AGE': 60,
    }}
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'aiedu.sqlite3'}}

CACHES = {'default': {'BACKEND': 'django.core.cache.backends.db.DatabaseCache', 'LOCATION': 'vl_cache'}}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.SessionAuthentication',
                                       'apps.accounts.jwt_auth.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'EXCEPTION_HANDLER': 'apps.accounts.exceptions.handler',
    'UNAUTHENTICATED_USER': 'django.contrib.auth.models.AnonymousUser',
}

VIRTUAL_LABS = {
    'FIRST_USER_ADMIN': env('FIRST_USER_ADMIN', '1') == '1',
    'MANAGE_ACCOUNTS': True,
    'BACKUP_DIR': env('VIRTUAL_LABS_BACKUP_DIR', str(BASE_DIR / 'backups')),
}

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = env('TIME_ZONE', 'Asia/Almaty')
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_ROOT = Path(env('MEDIA_ROOT', str(BASE_DIR / 'media')))
MEDIA_URL = '/media/'
FRONTEND_DIST = PROJECT_DIR / 'frontend' / 'dist'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
DATA_UPLOAD_MAX_MEMORY_SIZE = 4 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 4 * 1024 * 1024

# Безопасность (ТЗ, п. 38)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'same-origin'
if env('HTTPS', '0') == '1':
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_SSL_REDIRECT = env('SECURE_SSL_REDIRECT', '1') == '1'
    # LTI: LMS открывает тренажёр с другого сайта, поэтому cookie сессии должна быть SameSite=None
    if env('LTI_IN_IFRAME', '0') == '1':
        SESSION_COOKIE_SAMESITE = CSRF_COOKIE_SAMESITE = 'None'
        X_FRAME_OPTIONS = 'SAMEORIGIN'

LOGGING = {
    'version': 1, 'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'loggers': {'django.request': {'handlers': ['console'], 'level': 'WARNING'},
                'apps': {'handlers': ['console'], 'level': 'INFO'}},
}
