"""Ошибки API в том же виде, что и в AI edu: {"error": {"code", "detail"}, "detail"}."""
from rest_framework.views import exception_handler


def handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None
    code = getattr(exc, 'default_code', 'error')
    detail = response.data
    if isinstance(detail, dict) and set(detail) == {'detail'}:
        detail = detail['detail']
    response.data = {'error': {'code': code, 'detail': detail}, 'detail': detail}
    return response
