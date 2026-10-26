@echo off
rem Detiene el backend de la tienda. Los datos se conservan en los volumenes de Docker.
cd /d "%~dp0\..\.."
docker compose -f docker-compose.prod.example.yml --env-file .env.store --profile store stop
pause
