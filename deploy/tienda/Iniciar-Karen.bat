@echo off
rem Arranca el backend y la base de datos de la tienda (requiere Docker Desktop en ejecucion).
cd /d "%~dp0\..\.."
if not exist .env.store (
  echo Falta .env.store en %CD%. Copia deploy\tienda\.env.store.example y completalo.
  pause
  exit /b 1
)
docker compose -f docker-compose.prod.example.yml --env-file .env.store --profile store up -d --build
if errorlevel 1 (
  echo No se pudo iniciar. Revisa que Docker Desktop este abierto.
  pause
  exit /b 1
)
echo.
echo Tienda iniciada. Estado:
docker compose -f docker-compose.prod.example.yml --env-file .env.store --profile store ps
pause
