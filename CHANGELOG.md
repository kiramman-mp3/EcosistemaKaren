# Historial de cambios

Todos los cambios relevantes de Ecosistema Karen. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones, [SemVer](https://semver.org/lang/es/). Los instaladores de cada versión están en [Releases](https://github.com/kiramman-mp3/EcosistemaKaren/releases).

## [1.0.0] - 2026-11-11

Primera versión estable. El sistema queda desplegado: el portal web en Vercel y `store-api`, `portal-api` y sus bases de datos PostgreSQL en un servidor propio (homelab), expuestos a internet con Tailscale Funnel y sin dominio propio.

### Añadido

- **Despliegue en homelab**: `docker-compose.homelab.yml` (se combina con `docker-compose.prod.example.yml` mediante `COMPOSE_FILE`) fija los DNS públicos de `store_api`, porque el nombre de Funnel resuelve a una IP de Tailscale que un contenedor no alcanza. El CI valida el compose combinado.
- **`store-api` pública** por HTTPS ([ADR-004](docs/decisions/ADR-004-store-api-publica.md)), con `STORE_TRUST_PROXY_HOPS` obligatorio en el compose de producción.
- **Portal web en Vercel**: `frontend/portal-web-react/vercel.json` reenvía `/api/*` a `portal-api` para que la cookie de sesión siga siendo del mismo origen (`SameSite=Strict`).
- **Seed en producción**: `npm run db:seed` se puede ejecutar con `NODE_ENV=production` si se define `KAREN_DEMO_PASSWORD`; copia los clientes al portal y la imagen de Docker incluye `backend/seed/`.
- **Animación de carga de fotos**: las tarjetas de producto muestran un efecto de carga mientras la imagen se descarga (portal web y app del portal).
- **Instaladores 1.0.0** compilados con EAS: APK del portal, APK de bodega e IPA sin firmar del portal.

### Cambiado

- **Dirección del servidor fija en las apps**: el portal usa `https://servidor-homelab.tail13541c.ts.net:8443/api/v1` y la bodega, `...:10000/api/v1`. Se eliminaron la franja «Servidor», la ventana para cambiarlo y la dirección guardada en el teléfono. `EXPO_PUBLIC_API_URL` solo se lee en desarrollo (`__DEV__`).
- La validación de producción de `portal-api` exige `PORTAL_DB_PASSWORD` (o `DB_PASSWORD`) en lugar de `DB_PASSWORD` a secas.
- `PUT /products/:id/image` ya no depende del `Content-Type` declarado: cualquier cuerpo que no sea una imagen responde `400`.

### Corregido

- `portal-api` entraba en bucle de reinicios en producción con `DB_PASSWORD es obligatoria` aunque estuviera `PORTAL_DB_PASSWORD`.
- La app de bodega no guardaba la foto de un producto: el servidor respondía `415` («El cuerpo de la solicitud debe usar Content-Type application/json») porque React Native declara tipos distintos de `image/jpeg` para un archivo local. La app envía siempre `image/jpeg` y el servidor acepta cualquier tipo.
- La sincronización de la tienda con el portal fallaba con `ECONNREFUSED` dentro del contenedor (ver el DNS de `docker-compose.homelab.yml`).

## [1.0.0-beta.1] - 2026-10-28

Versión de prueba (pre-release): inventario por lotes con FEFO, semáforo de caducidad, reservas con código de retiro, promociones con IA y aprobación humana, backend dividido en `store-api` y `portal-api`, portal web instalable (PWA), app móvil de clientes y app móvil de bodega. Esta versión permitía HTTP en la red local y elegir el servidor desde la app.
