# Встраивание модуля «Виртуальные лаборатории» в AI edu

Модуль написан на том же стеке, что и AI edu: **Django 5.2 + DRF** на сервере и **React 19 + TypeScript + Vite + Tailwind 4** в интерфейсе.
Он использует сессию и CSRF платформы, её пользователей, словари языков, стили и Practice Engine. Встраивание сводится к копированию двух папок и добавлению нескольких строк.

| Репозиторий | Что скопировать | Что добавить |
|---|---|---|
| `AI-edu-backend` | `backend/apps/virtual_labs` → `apps/virtual_labs` | 1 строка в `INSTALLED_APPS`, 1 строка в `config/urls.py`, 3 библиотеки в `requirements.txt` |
| `AI-edu-frontend` | `frontend/src/virtual-labs` → `src/virtual-labs` | маршрут в `App.tsx`, пункт меню в двух макетах, 1 вызов в `src/practice/registry.ts`, 1 ключ в словарях |

Новых npm-пакетов нет: модуль использует только `react`, `react-router-dom` и `lucide-react` из зависимостей AI edu.

---

## 1. Сервер (AI-edu-backend)

### 1.1. Скопировать модуль

```
backend/apps/virtual_labs  →  AI-edu-backend/apps/virtual_labs
```

Модуль не импортирует ничего из `apps.accounts` автономной версии и работает с `AUTH_USER_MODEL` платформы.

### 1.2. Зависимости

Добавить в `requirements.txt` строки из `apps/virtual_labs/requirements.txt`. В AI edu уже есть `python-docx` и `reportlab` (версии совпадают), `python-pptx` есть в `requirements-import-core.txt`. Новые для платформы библиотеки:

```
python-pptx==1.0.2     # если его нет в основном requirements.txt
pypdf==5.9.0           # текст из PDF; без него модуль возьмёт pypdfium2 из зависимостей импорта AI edu
PyJWT==2.10.1          # LTI 1.3
cryptography==45.0.7   # LTI 1.3
```

### 1.3. `config/settings.py`

```python
INSTALLED_APPS = [
    ...
    'apps.tutor',
    'apps.virtual_labs',          # ← добавить
]

# Необязательно: всё ниже имеет значения по умолчанию (apps/virtual_labs/lab_settings.py)
VIRTUAL_LABS = {
    'MANAGE_ACCOUNTS': False,     # учётными записями управляет AI edu, модуль их не блокирует
    'BACKUP_DIR': '/var/backups/aiedu',
}
```

Ограничение частоты запросов и LTI используют кэш Django по умолчанию. В AI edu это Redis (`django-redis`), поэтому ничего настраивать не нужно.

### 1.4. `config/urls.py`

```python
from django.urls import include, path
...
urlpatterns = [
    ...
    path('api/v1/virtual-labs/', include('apps.virtual_labs.urls')),   # ← добавить
]
```

### 1.5. Таблицы и каталог

```bash
python manage.py migrate virtual_labs
```

Создаются 26 таблиц с префиксом `vl_` (роли, дисциплины, курсы, работы, промпты, генерации, оценки, рекомендации, портфолио, группы, задания, отзывы, загруженные файлы, журнал ИИ, LTI, резервные копии). Таблицы платформы не меняются.
После миграции модуль сам заполняет каталог: 14 работ, 5 курсов, 10 критериев экспертизы. Повторный `migrate` не затирает изменения администратора.

### 1.6. Роли

| Кто | Роль в модуле |
|---|---|
| Администратор AI edu (`user.role == 'ADMIN'`) или суперпользователь | администратор модуля, автоматически |
| Остальные пользователи | слушатель (преподаватель, проходящий работы) |
| Тьютор | назначается в модуле: «Администрирование → Пользователи и роли», командой `python manage.py vl_set_role <логин> tutor` или переменной `VIRTUAL_LABS_TUTOR_LOGINS=login1,login2` |

### 1.7. Practice Engine

При запуске модуль регистрирует работы № 4–14 как практики AI edu с типами `virtual_lab_vw04` … `virtual_lab_vw14` (`apps/virtual_labs/practice.py`, через `apps.activities.registry`).
Работы № 1–3 не регистрируются, потому что похожие практики в AI edu уже есть; список меняется настройкой `VIRTUAL_LABS['PRACTICE_WORKS']`.
Настройки такой практики (инструкция, критерии самопроверки, файлы) редактируются обычным редактором заданий AI edu. При сдаче сервер заново проводит AI-экспертизу итогового материала и сохраняет балл как `AUTO_GRADING`.

Если работы № 4–14 добавлены в AI edu ещё и как конструкторы мастерских (`*_workshop` в `apps/activities/workspace/constructors.py`, черновик `integration-draft`), отключите регистрацию практик, иначе каждая работа появится дважды: на сервере `VIRTUAL_LABS = {'PRACTICE_WORKS': ()}`, в интерфейсе не вызывайте `registerVirtualLabPractices` (или передайте `works: []`).

### 1.8. Резервное копирование

`python manage.py vl_backup` создаёт одну копию (cron или планировщик), `python manage.py vl_backup --every-hours 24` работает как отдельный сервис.
В PostgreSQL используется `pg_dump`, если он есть в образе. Если его нет, выгружаются таблицы модуля в JSON. Копию можно создать и вручную: «Администрирование → Резервные копии».

### 1.9. Проверка

```bash
python manage.py test apps.virtual_labs      # 51 тест, используют только пользователей платформы
curl -b cookies.txt http://localhost:8000/api/v1/virtual-labs/config/
```

Тесты модуля не зависят от автономной версии: пользователей они создают через `USERNAME_FIELD` модели платформы.
Все 51 тест модуля прошли с моделью пользователя как в AI edu (вход по email, поле `role`), с настройками DRF AI edu (обработчик ошибок `{"error": {...}}`, пагинация по умолчанию), `MANAGE_ACCOUNTS: False` и кэшем в памяти.

---

## 2. Интерфейс (AI-edu-frontend)

### 2.1. Скопировать модуль

```
frontend/src/virtual-labs  →  AI-edu-frontend/src/virtual-labs
```

Модуль берёт у платформы `src/i18n.tsx` (`useI18n`), CSS-классы и переменные из `style.css`, `redesign.css`, `atlas-theme.css`, `notifications.css`. Свои стили (`virtual-labs.css`, классы с префиксом `vl-`) подключаются сами.

### 2.2. Маршрут: `src/App.tsx`

```tsx
import { VirtualLabsApp } from './virtual-labs'
...
<Route path="/virtual-labs/*" element={<ProtectedPage user={user}><VirtualLabsApp/></ProtectedPage>}/>
```

### 2.3. Пункт меню

`src/layouts/MainLayout.tsx`, массив пунктов навигации:

```tsx
import { FlaskConical } from 'lucide-react'
...
{ to: '/virtual-labs', label: t('Виртуальные лаборатории'), icon: FlaskConical },
```

`src/layouts/AdminLayout.tsx`, рядом с «Аналитикой»:

```tsx
<NavLink to="/virtual-labs" className={({ isActive }) => `main-nav-link ${isActive ? 'active' : ''}`}><FlaskConical size={17}/>{t('Виртуальные лаборатории')}</NavLink>
```

### 2.4. Practice Engine: `src/practice/registry.ts`

После регистрации встроенных практик:

```ts
import { registerVirtualLabPractices } from '../virtual-labs'

registerVirtualLabPractices({ registerPractice, ConfigEditor: AssignmentConfigEditor,
  initialConfig: defaultTaskConfig, validateConfig: validateTaskConfig })
```

### 2.5. Словари платформы

Модуль переводит свои строки сам (`src/virtual-labs/locales/kz.json`, `en.json`, 1189 строк). В словари AI edu нужно добавить только подпись пункта меню:

```jsonc
// src/locales/kz.json
"Виртуальные лаборатории": "Виртуалды зертханалар",
// src/locales/en.json
"Виртуальные лаборатории": "Virtual labs",
```

Переключатель языка в шапке AI edu меняет язык и модуля, потому что модуль читает `locale` из `useI18n()`.

### 2.6. Проверка

```bash
npm run lint     # tsc --noEmit
npm run build
```

Модуль проходит `tsc --noEmit` с `tsconfig.json` AI edu. Проверка выполнялась на копии `src/i18n.tsx`, `src/practice/types.ts`, `src/practice/commonTask.ts` из AI edu с теми же строками встраивания, что выше.

---

## 3. Что модуль ожидает от платформы

| Что | Где в AI edu |
|---|---|
| Сессия Django и CSRF: `/api/v1/csrf/`, cookie `csrftoken`, заголовок `X-CSRFToken` | `apps.accounts` |
| Пользователь и роль администратора: `request.user`, `user.role == 'ADMIN'` | `apps.accounts` |
| Язык интерфейса: `useI18n()` → `{ locale: 'ru' \| 'kz' \| 'en', t }` | `src/i18n.tsx` |
| Practice Engine: `registerPractice`, `PracticePlugin`, `apps.activities.registry` | `src/practice`, `apps/activities` |
| Хранилище файлов: `default_storage` (локально или S3 через `django-storages`) | `config/settings.py` |
| Кэш для ограничения частоты запросов и LTI | Redis (`django-redis`) |

Ключи языковых моделей хранятся только на сервере (таблица `vl_ai_provider`, раздел «Администрирование → Модели ИИ») или в переменных окружения `VIRTUAL_LABS_AI_*`. Если модель не подключена, работы выполняются в демо-режиме.

## 4. API модуля (`/api/v1/virtual-labs/`)

| Группа | Адреса |
|---|---|
| Слушатель | `config/`, `state/`, `profile/`, `settings/`, `sessions/<code>/`, `sessions/<code>/recommendations/`, `portfolio/`, `events/`, `evaluate/`, `prompt/analyze/`, `next/`, `analytics/`, `groups/`, `groups/join/`, `assignments/`, `reviews/` |
| Сервисы | `ai/generate/`, `ai/tts/`, `literature/` (OpenAlex, Crossref, Semantic Scholar), `files/`, `files/<id>/`, `files/<id>/download/` (DOCX/PDF/PPTX/TXT/MD), `export/` (DOCX, PDF, PPTX, MD, TXT) |
| Тьютор | `tutor/groups/`, `tutor/groups/<id>/members/`, `tutor/assignments/`, `tutor/sessions/`, `tutor/sessions/<id>/reviews/`, `tutor/overview/`, `tutor/users/` |
| Администратор | `admin/users/`, `admin/courses/`, `admin/works/`, `admin/criteria/`, `admin/prompt-templates/`, `admin/ai-providers/` (+ `test/`), `admin/ai-log/`, `admin/backups/`, `admin/lti/platforms/` |
| LTI 1.3 | `lti/login/`, `lti/launch/`, `lti/jwks/` |
