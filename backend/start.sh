#!/usr/bin/env bash
# AI edu · Виртуальные лаборатории — запуск на Linux и macOS: bash backend/start.sh
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q --upgrade pip
  .venv/bin/pip install -r requirements.txt
fi
[ -f .env ] || cp .env.example .env
if [ ! -f ../frontend/dist/index.html ] && command -v npm >/dev/null; then
  (cd ../frontend && npm ci && npm run build)
fi
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py createcachetable
echo "Тренажёр: http://127.0.0.1:8000 (первый зарегистрированный пользователь — администратор)"
exec .venv/bin/python manage.py runserver 127.0.0.1:8000
