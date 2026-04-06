import os
from pathlib import Path
from datetime import timedelta
from urllib.parse import urlparse, unquote

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-mytube-dev-key-change-in-production-use-50-chars'
)

DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1')


def _env_csv(name, default=''):
    value = os.environ.get(name, default)
    return [item.strip() for item in value.split(',') if item.strip()]

ALLOWED_HOSTS = _env_csv(
    'ALLOWED_HOSTS',
    'localhost,127.0.0.1,backend,0.0.0.0,.up.railway.app'
)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'django_celery_beat',
    # Local apps
    'users',
    'videos',
    'recommendations',
    'analytics_app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Railway/Proxy-aware request scheme + host handling for correct absolute media URLs.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

ROOT_URLCONF = 'core.urls'

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

WSGI_APPLICATION = 'core.wsgi.application'

AUTH_USER_MODEL = 'users.User'

# Database — prefer DATABASE_URL (Railway), then explicit env vars, then SQLite fallback
def _database_from_url(raw_url: str):
    parsed = urlparse(raw_url)
    if parsed.scheme not in ('postgres', 'postgresql'):
        return None

    db_name = (parsed.path or '').lstrip('/')
    if not db_name:
        return None

    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': unquote(db_name),
        'USER': unquote(parsed.username or ''),
        'PASSWORD': unquote(parsed.password or ''),
        'HOST': parsed.hostname or '',
        'PORT': str(parsed.port or '5432'),
        'CONN_MAX_AGE': 60,
    }


DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()
database_from_url = _database_from_url(DATABASE_URL) if DATABASE_URL else None

postgres_name = os.environ.get('POSTGRES_DB') or os.environ.get('PGDATABASE') or ''
postgres_user = os.environ.get('POSTGRES_USER') or os.environ.get('PGUSER') or ''
postgres_password = os.environ.get('POSTGRES_PASSWORD') or os.environ.get('PGPASSWORD') or ''
postgres_host = os.environ.get('POSTGRES_HOST') or os.environ.get('PGHOST') or ''
postgres_port = os.environ.get('POSTGRES_PORT') or os.environ.get('PGPORT') or '5432'

if database_from_url:
    DATABASES = {
        'default': database_from_url
    }
elif postgres_name and postgres_user and postgres_password and postgres_host:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': postgres_name,
            'USER': postgres_user,
            'PASSWORD': postgres_password,
            'HOST': postgres_host,
            'PORT': postgres_port,
            'CONN_MAX_AGE': 60,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1')
CORS_ALLOWED_ORIGINS = _env_csv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://frontend:3000'
)
CORS_ALLOWED_ORIGIN_REGEXES = _env_csv(
    'CORS_ALLOWED_ORIGIN_REGEXES',
    r'^https://.*\.vercel\.app$'
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = _env_csv(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173'
)

# Cache (Redis if available, in-memory fallback)
REDIS_URL = os.environ.get('REDIS_URL', '')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
        }
    }
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'
else:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Celery (optional Redis — falls back to eager mode)
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL or '')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL or '')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TASK_ALWAYS_EAGER = not bool(CELERY_BROKER_URL)
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# Celery Beat — scheduled tasks
from celery.schedules import crontab  # noqa: E402
CELERY_BEAT_SCHEDULE = {
    'calculate-trending-every-hour': {
        'task': 'videos.tasks.calculate_trending_task',
        'schedule': crontab(minute=0, hour='*'),
    },
    'retrain-recommendations-nightly': {
        'task': 'recommendations.tasks.train_recommendation_model',
        'schedule': crontab(minute=0, hour=2),
    },
}

# Video upload limits
FIVE_GB = 5 * 1024 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = FIVE_GB
# Keep large files on disk temp storage instead of RAM to avoid worker OOM.
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {'handlers': ['console'], 'level': 'WARNING'},
    'loggers': {
        'django': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
        'videos': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
    },
}
