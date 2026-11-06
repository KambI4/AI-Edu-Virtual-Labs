"""Сообщения сервера, которые видит пользователь (ошибки API, названия курсов и критериев, причины рекомендаций).
Интерфейс переводит их по словарям locales/kz.json и locales/en.json (tr() в api.ts, localize.ts).
Запуск из папки frontend:  python tools/server-strings.py > tools/server-strings.json
Django не нужен: файлы сервера разбираются модулем ast."""
import ast
import json
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2] / 'backend' / 'apps'
CYR = re.compile('[А-Яа-яЁё]')
TECH = re.compile(r'\\[sdwb]|\(\?|\[[^\]]*-[^\]]*\]|^\^|\$$')
# Файлы целиком: каталог курсов и критериев, рекомендации
WHOLE = {'virtual_labs/catalog.py', 'virtual_labs/services/recommendations.py'}
# Остальные файлы: только сообщения исключений и значения ключей detail/reason/title/name/description
SCAN = ['accounts/views.py', 'accounts/jwt_auth.py', 'virtual_labs/permissions.py', 'virtual_labs/throttling.py',
        'virtual_labs/services/uploads.py', 'virtual_labs/services/literature.py', 'virtual_labs/services/ai.py',
        'virtual_labs/services/lti.py', 'virtual_labs/services/backup.py', 'virtual_labs/services/state.py',
        'virtual_labs/views']
KEYS = {'detail', 'reason', 'title', 'name', 'description', 'label', 'error', 'message'}
CALL = re.compile(r'(Error|Denied|NotFound|Failed|Throttled|Exception|Unavailable|Unsupported|Response|Problem)$')


def docstrings(tree):
    out = set()
    for node in ast.walk(tree):
        body = getattr(node, 'body', None)
        if isinstance(body, list) and body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
            out.add(id(body[0].value))
    return out


def good(value):
    """Целая фраза интерфейса, а не регулярное выражение и не обрывок строки, склеиваемой из частей."""
    if not (isinstance(value, str) and CYR.search(value) and not TECH.search(value)):
        return False
    text = value.strip()
    return len(text) > 2 and text[0] not in '.,;:%)—–-' and text[-1] not in ':—–-('


def strings(path, whole):
    tree = ast.parse(path.read_text(encoding='utf-8'))
    skip = docstrings(tree)
    found = []
    for node in ast.walk(tree):
        if whole:
            if isinstance(node, ast.Constant) and id(node) not in skip and good(node.value):
                found.append(node.value)
            continue
        if isinstance(node, ast.Raise) and node.exc is not None:
            found += [c.value for c in ast.walk(node.exc) if isinstance(c, ast.Constant) and good(c.value)]
        if isinstance(node, ast.Call):
            name = getattr(node.func, 'id', None) or getattr(node.func, 'attr', '')
            if CALL.search(name or ''):
                found += [c.value for a in node.args for c in ast.walk(a) if isinstance(c, ast.Constant) and good(c.value)]
        if isinstance(node, ast.Dict):
            for k, v in zip(node.keys, node.values):
                if isinstance(k, ast.Constant) and k.value in KEYS and isinstance(v, ast.Constant) and good(v.value):
                    found.append(v.value)
    return found


def main():
    result = []
    targets = [(BACKEND / p, p in WHOLE) for p in WHOLE] + [(BACKEND / p, False) for p in SCAN]
    for target, whole in targets:
        for path in sorted([target] if target.is_file() else target.rglob('*.py')):
            result += strings(path, whole)
    json.dump(sorted(set(s.strip() for s in result)), sys.stdout, ensure_ascii=False, indent=0)
    sys.stdout.write('\n')


if __name__ == '__main__':
    main()
