"""Вход, регистрация и JWT автономной версии. В AI edu этими адресами управляет платформа,
поэтому тесты лежат здесь, а не в модуле apps.virtual_labs."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.virtual_labs.tests.helpers import make_user

API = '/api/v1/virtual-labs/'


class StandaloneAuthTests(TestCase):
    def test_register_login_csrf_and_first_admin(self):
        c = APIClient(enforce_csrf_checks=True)
        c.get('/api/v1/csrf/')
        token = c.cookies['csrftoken'].value
        self.assertEqual(c.post('/api/v1/auth/register/', {'login': 'first', 'password': 'Very-strong-1'}, format='json').status_code, 403)
        r = c.post('/api/v1/auth/register/', {'login': 'first', 'password': 'Very-strong-1'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['lab_role'], 'admin')
        from django.contrib.auth import get_user_model
        self.assertTrue(get_user_model().objects.get(username='first').password.startswith('pbkdf2_sha256$'))
        c2 = APIClient(enforce_csrf_checks=True)
        c2.get('/api/v1/csrf/')
        r = c2.post('/api/v1/auth/register/', {'login': 'second', 'password': 'Very-strong-2'}, format='json',
                    HTTP_X_CSRFTOKEN=c2.cookies['csrftoken'].value)
        self.assertEqual(r.json()['lab_role'], 'teacher')
        self.assertEqual(c2.get('/api/v1/virtual-labs/admin/users/').status_code, 403)

    def test_weak_password_and_bad_login(self):
        c = APIClient()
        self.assertEqual(c.post('/api/v1/auth/register/', {'login': 'u1', 'password': 'Very-strong-1'}, format='json').status_code, 400)
        self.assertEqual(c.post('/api/v1/auth/register/', {'login': 'user1', 'password': '123'}, format='json').status_code, 400)
        self.assertEqual(c.post('/api/v1/auth/login/', {'login': 'nobody', 'password': 'x'}, format='json').status_code, 400)

    def test_jwt(self):
        make_user('apiuser', password='Very-strong-3')
        c = APIClient()
        token = c.post('/api/v1/auth/token/', {'login': 'apiuser', 'password': 'Very-strong-3'}, format='json').json()['access']
        c.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        self.assertEqual(c.get(API + 'config/').json()['user']['login'], 'apiuser')
        c.credentials(HTTP_AUTHORIZATION='Bearer broken')
        self.assertIn(c.get(API + 'config/').status_code, (401, 403))

    def test_health_and_frontend_fallback(self):
        self.assertEqual(APIClient().get('/api/health/').json()['status'], 'ok')
