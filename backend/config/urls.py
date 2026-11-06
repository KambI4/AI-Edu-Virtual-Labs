"""Маршруты автономного запуска. Модуль подключается так же, как в AI edu:
path('api/v1/virtual-labs/', include('apps.virtual_labs.urls'))."""
from pathlib import Path

from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404, JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve


def health(_request):
    from apps.virtual_labs.services import ai
    from django.db import connection
    return JsonResponse({'status': 'ok', 'database': connection.vendor, **ai.status()})


def frontend(request, path=''):
    """Собранный интерфейс React (frontend/dist). Файлы сервера наружу не раздаются."""
    dist = Path(settings.FRONTEND_DIST)
    if path and (dist / path).is_file() and '..' not in Path(path).parts:
        return serve(request, path, document_root=str(dist))
    index = dist / 'index.html'
    if not index.exists():
        raise Http404('Интерфейс не собран: выполните npm run build в папке frontend')
    return FileResponse(index.open('rb'), content_type='text/html; charset=utf-8')


urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/health/', health),
    path('api/v1/', include('apps.accounts.urls')),
    path('api/v1/virtual-labs/', include('apps.virtual_labs.urls')),
    re_path(r'^(?!api/|django-admin/|static/|media/)(?P<path>.*)$', frontend),
]
