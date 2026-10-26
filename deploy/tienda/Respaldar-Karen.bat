@echo off
rem Respaldo de la base de la tienda en la carpeta respaldos\ (formato pg_dump comprimido).
cd /d "%~dp0\..\.."
if not exist respaldos mkdir respaldos
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set FECHA=%%d
docker compose -f docker-compose.prod.example.yml --env-file .env.store --profile store exec -T store_db sh -c "pg_dump -U \"$POSTGRES_USER\" -Fc \"$POSTGRES_DB\"" > respaldos\tienda-%FECHA%.dump
if errorlevel 1 (
  echo El respaldo fallo.
  del respaldos\tienda-%FECHA%.dump 2>nul
  pause
  exit /b 1
)
echo Respaldo creado: respaldos\tienda-%FECHA%.dump
pause
