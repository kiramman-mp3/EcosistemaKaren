# ADR-004: store-api accesible desde internet

- Estado: Aceptada
- Fecha: 2026-11-11
- Modifica: [ADR-003](ADR-003-split-store-portal.md) (store-api en la red local, sin puertos abiertos)
- Alcance: Ecosistema Karen (backend, bodega móvil, documentación de despliegue)

## Contexto

ADR-003 dejaba store-api solo en la red local de la tienda. Las dos APIs se van a alojar en un
mismo servidor (homelab) y las apps de bodega deben funcionar también fuera de la LAN.

## Decisión

store-api se publica por HTTPS detrás de un proxy o túnel con TLS, igual que portal-api. No cambia
su papel: sigue siendo la única autoridad de inventario y reservas, y sigue iniciando toda la
comunicación hacia el portal (heartbeat, catálogo, eventos, long-poll de comandos). Cada servicio
mantiene su propia base de datos, sin puertos publicados.

## Consecuencias

- `STORE_TRUST_PROXY_HOPS` pasa a ser obligatorio en el compose de producción (antes valía `0`).
- `STORE_BIND` es `127.0.0.1` detrás del proxy; la IP de la LAN solo si las apps también entran por ahí.
- `STORE_CORS_ORIGINS` lleva la URL pública de la tienda; Swagger sigue desactivado en producción.
- Crece la superficie de ataque: login, administración de inventario y generación con Gemini son
  alcanzables desde internet. Se mitigan con límites de tasa, JWT, sin registro público y
  contraseñas fuertes (ver [operación](../operacion.md)).
- Una caída de internet o del túnel deja sin acceso remoto a la tienda, pero el servicio local sigue.

## Fuera de alcance

El despliegue concreto, el túnel y el dominio se deciden aparte.
