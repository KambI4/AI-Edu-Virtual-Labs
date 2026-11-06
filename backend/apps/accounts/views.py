"""Учётные записи автономного запуска. Адреса и поведение повторяют AI edu (/api/v1/csrf/, /api/v1/auth/...):
сессия Django, CSRF-cookie, пароли хранятся в виде хеша PBKDF2-SHA256 (стандарт Django)."""
import re

from django.contrib.auth import authenticate, get_user_model, login, logout, password_validation, update_session_auth_hash
from django.core.exceptions import ValidationError as DjangoValidationError
from django.middleware.csrf import get_token
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.virtual_labs.permissions import ensure_first_admin, role_of
from apps.virtual_labs.throttling import LabThrottle

from .jwt_auth import issue

LOGIN_RE = re.compile(r'^[a-z0-9а-яёәғқңөұүһі._@-]{3,64}$', re.IGNORECASE)


def enforce_csrf(request):
    check = CSRFCheck(lambda req: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise PermissionDenied(f'CSRF Failed: {reason}')


def user_payload(user):
    return {'id': user.pk, 'login': user.get_username(), 'first_name': user.first_name, 'last_name': user.last_name,
            'email': user.email, 'role': 'ADMIN' if role_of(user) == 'admin' else 'STUDENT', 'lab_role': role_of(user)}


class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        get_token(request)
        return Response({'detail': 'ok'})


class AuthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LabThrottle]
    lab_throttle = 'auth'


class RegisterView(AuthView):
    def post(self, request):
        enforce_csrf(request)
        data = request.data if isinstance(request.data, dict) else {}
        login_name = str(data.get('login') or '').strip().lower()
        password = str(data.get('password') or '')
        if not LOGIN_RE.match(login_name):
            raise ValidationError({'login': 'Логин: от 3 до 64 символов — буквы, цифры, точка, дефис, подчёркивание или @.'})
        User = get_user_model()
        if User.objects.filter(username__iexact=login_name).exists():
            raise ValidationError({'login': 'Пользователь с таким логином уже зарегистрирован.'})
        user = User(username=login_name, first_name=str(data.get('first_name') or '')[:150], last_name=str(data.get('last_name') or '')[:150],
                    email=str(data.get('email') or '')[:254])
        try:
            password_validation.validate_password(password, user)
        except DjangoValidationError as exc:
            raise ValidationError({'password': list(exc.messages)}) from None
        user.set_password(password)
        user.save()
        ensure_first_admin(user)
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        return Response(user_payload(user), status=201)


class LoginView(AuthView):
    def post(self, request):
        enforce_csrf(request)
        data = request.data if isinstance(request.data, dict) else {}
        user = authenticate(request, username=str(data.get('login') or '').strip().lower(), password=str(data.get('password') or ''))
        if not user:
            raise ValidationError({'detail': 'Неверный логин или пароль.'})
        login(request, user)
        return Response(user_payload(user))


class TokenView(AuthView):
    """JWT для внешних клиентов API."""
    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        user = authenticate(request, username=str(data.get('login') or '').strip().lower(), password=str(data.get('password') or ''))
        if not user:
            raise ValidationError({'detail': 'Неверный логин или пароль.'})
        return Response({'access': issue(user), 'token_type': 'Bearer', 'expires_in': 12 * 3600})


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=204)


class MeView(APIView):
    def get(self, request):
        return Response(user_payload(request.user))

    def patch(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        for key in ('first_name', 'last_name'):
            if key in data:
                setattr(request.user, key, str(data[key] or '')[:150])
        request.user.save()
        return Response(user_payload(request.user))


class PasswordView(APIView):
    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        if not request.user.check_password(str(data.get('old_password') or '')):
            raise ValidationError({'old_password': 'Текущий пароль указан неверно.'})
        new = str(data.get('new_password') or '')
        try:
            password_validation.validate_password(new, request.user)
        except DjangoValidationError as exc:
            raise ValidationError({'new_password': list(exc.messages)}) from None
        request.user.set_password(new)
        request.user.save()
        update_session_auth_hash(request, request.user)
        return Response(status=204)
