#!/usr/bin/env bash
# AI edu · Виртуальные лаборатории — запуск на Linux и macOS: bash backend/start.sh
# Python окружения вызывается напрямую, поэтому запуск работает и после переименования папки.
set -e
cd "$(dirname "$0")"
PY=.venv/bin/python
if ! "$PY" -c "import django" >/dev/null 2>&1; then
  if ! "$PY" -c "import sys" >/dev/null 2>&1; then
    rm -rf .venv
    python3 -m venv .venv
  fi
  "$PY" -m pip install -q --upgrade pip
  "$PY" -m pip install -r requirements.txt
fi
[ -f .env ] || cp .env.example .env
if [ ! -f ../frontend/dist/index.html ] && command -v npm >/dev/null; then
  (cd ../frontend && npm ci && npm run build)
fi
"$PY" manage.py migrate --noinput
"$PY" manage.py createcachetable
echo "Тренажёр: http://127.0.0.1:8000 (первый зарегистрированный пользователь — администратор)"
exec "$PY" manage.py runserver 127.0.0.1:8000
