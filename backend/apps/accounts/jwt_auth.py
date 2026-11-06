"""JWT для внешних клиентов API (ТЗ, п. 38). Браузерный интерфейс использует сессию и CSRF, как AI edu;
сценарии и мобильные клиенты могут получить токен на /api/v1/auth/token/ и передавать
заголовок Authorization: Bearer <токен>. Токен подписан SECRET_KEY (HS256), срок — 12 часов."""
import time

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

TTL = 12 * 3600


def issue(user):
    import jwt
    now = int(time.time())
    return jwt.encode({'sub': str(user.pk), 'iat': now, 'exp': now + TTL, 'typ': 'access'}, settings.SECRET_KEY, algorithm='HS256')


class JWTAuthentication(BaseAuthentication):
    keyword = b'bearer'

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts or parts[0].lower() != self.keyword:
            return None
        if len(parts) != 2:
            raise AuthenticationFailed('Неверный заголовок Authorization')
        try:
            import jwt
            payload = jwt.decode(parts[1].decode(), settings.SECRET_KEY, algorithms=['HS256'], options={'require': ['exp', 'sub']})
        except Exception:
            raise AuthenticationFailed('Токен недействителен или истёк') from None
        user = get_user_model().objects.filter(pk=payload['sub'], is_active=True).first()
        if not user:
            raise AuthenticationFailed('Пользователь не найден')
        return user, payload

    def authenticate_header(self, request):
        return 'Bearer'
