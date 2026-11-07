@echo off
chcp 65001 >nul
rem AI edu · Виртуальные лаборатории — запуск на Windows двойным щелчком.
rem Нужен Python 3.11+ (python.org, галочка "Add python.exe to PATH"). Интерфейс уже собран в frontend\dist.
rem Python окружения вызывается напрямую, без activate.bat: так запуск работает и после переименования или переноса папки.
cd /d "%~dp0"
set "VPY=.venv\Scripts\python.exe"
if exist "%VPY%" (
  "%VPY%" -c "import django" >nul 2>nul && goto ready
  "%VPY%" -c "import sys" >nul 2>nul && goto install
  echo Окружение Python повреждено, создаю его заново...
  rmdir /s /q .venv
)
echo Создаю виртуальное окружение Python...
python -m venv .venv || (echo Не найден Python. Установите Python 3.11+ с python.org и отметьте "Add python.exe to PATH". & pause & exit /b 1)
:install
echo Устанавливаю библиотеки...
"%VPY%" -m pip install --upgrade pip >nul
"%VPY%" -m pip install -r requirements.txt || (pause & exit /b 1)
:ready
if not exist .env copy .env.example .env >nul
if not exist ..\frontend\dist\index.html (
  where npm >nul 2>nul && (
    echo Собираю интерфейс React...
    pushd ..\frontend & call npm ci & call npm run build & popd
  ) || echo Интерфейс не собран: установите Node.js 20+ или возьмите архив с папкой frontend\dist.
)
"%VPY%" manage.py migrate --noinput || (pause & exit /b 1)
"%VPY%" manage.py createcachetable >nul
echo.
echo Тренажёр запущен: http://127.0.0.1:8000
echo Первый зарегистрированный пользователь станет администратором.
echo Чтобы остановить сервер, закройте окно или нажмите Ctrl+C.
start "" http://127.0.0.1:8000
"%VPY%" manage.py runserver 127.0.0.1:8000
pause
