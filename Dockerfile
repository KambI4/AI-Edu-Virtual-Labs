# AI edu · Виртуальные лаборатории: интерфейс React собирается на первом этапе, сервер Django — на втором.
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-trixie
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# pg_dump для резервных копий (Debian 13: клиент PostgreSQL 17, как сервер в docker-compose)
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/requirements.txt ./
COPY backend/apps/virtual_labs/requirements.txt ./apps/virtual_labs/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
RUN useradd --create-home app && mkdir -p media backups && chown -R app /app
USER app
EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py createcachetable && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 180"]
