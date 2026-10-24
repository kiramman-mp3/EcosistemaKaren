# Backend Ecosistema Karen

## PostgreSQL local reproducible

1. Copiar `.env.example` a `.env` y cambiar los secretos locales.
2. Ejecutar `docker compose up -d` desde esta carpeta.
3. Esperar a que `docker compose ps` muestre PostgreSQL como `healthy`.
4. Ejecutar `npm start`. La conexión desde el host usa `localhost:5433` por defecto.

Las cuentas iniciales usan la contraseña local `demo123`. Los scripts de `init-db/store` solo se
ejecutan cuando el volumen de PostgreSQL se crea por primera vez. Para recrear datos desde
cero debe eliminarse deliberadamente el volumen; no se hace automáticamente para evitar
pérdida accidental de información.

Los puertos pueden cambiarse con `DB_EXPOSED_PORT` y `PGADMIN_PORT`. Las credenciales de
PostgreSQL y pgAdmin se leen desde `.env`; los valores incluidos son únicamente para desarrollo.

## Servicios: store-api y portal-api

El backend se está separando en dos servicios con base de datos propia (ver
[ADR-003](../docs/decisions/ADR-003-split-store-portal.md)). Conviven tres puntos de entrada:

| Comando | Servicio | Puerto por defecto |
|---|---|---|
| `npm start` | Monolito de transición (store + portal) | `PORT` o 4000 |
| `npm run start:store` | store-api (inventario, caja, alertas, Gemini) | `STORE_PORT`, `PORT` o 4000 |
| `npm run start:portal` | portal-api (clientes, reservas, lectura de catálogo) | `PORTAL_PORT` o 4001 |

Cada servicio solo registra las rutas que le corresponden. Los workers (expiración de
reservas y de lotes, envío del heartbeat) corren únicamente en store-api.

### Bases de datos

| Servicio | Variables | Migraciones | Contenido |
|---|---|---|---|
| store-api | `DB_*` | `init-db/store` | Catálogo, lotes, reservas, alertas, promociones, personal |
| portal-api | `PORTAL_DB_*` (cada valor que falte cae en `DB_*`) | `init-db/portal` | Clientes, tokens revocados, rate limit, estado del heartbeat |
| monolito | `DB_*` | ambos conjuntos | Una sola base con todo |

Cada servicio aplica sus migraciones al arrancar. Para probar los dos servicios con bases
separadas:

1. Descomentar `PORTAL_DB_*` en `.env`.
2. `docker compose --profile split up -d` (levanta además `postgres_portal` en el puerto 5434).
3. `npm run start:store` y `npm run start:portal` en terminales distintas.

Desde la raíz del repositorio, `node start.js --split` hace todo lo anterior con un solo
comando: levanta ambas bases, genera `STORE_SERVICE_KEY` si falta, siembra los datos de
demostración (los clientes demo también en la base del portal), arranca portal-api (4001) y
store-api (4000) y apunta cada app a su backend:

| App | Backend | Cómo se configura |
|---|---|---|
| Portal web | portal-api | proxy de vite (`VITE_PROXY_TARGET`) |
| Portal móvil | portal-api | `EXPO_PUBLIC_API_URL`; `--api-url=URL` para cambiarla |
| Bodega móvil | store-api | `EXPO_PUBLIC_API_URL`; `--store-api-url=URL` para cambiarla |

`node start.js --down` detiene también la base del portal.

Un despliegue solo del portal en la nube puede usar `DB_*` para su propia base. Con base
separada, el portal sirve auth, heartbeat, rate limit, la lectura del catálogo (categorías,
productos, disponibilidad y promociones) desde la copia que le publica la tienda, y las
reservas, que encarga a la tienda.

### Sincronización del catálogo

store-api publica al portal `POST /internal/v1/store/sync/catalog` (ver
[ADR-003](../docs/decisions/ADR-003-split-store-portal.md)). Cada ciclo envía solo las
secciones que cambiaron (categorías, productos, lotes vigentes con existencias y promociones
aprobadas) y todas cada `CATALOG_RESYNC_SECONDS`. Los costos, ubicaciones, reservas y datos de IA
no salen de la tienda. `GET /api/v1/catalog/status` del portal indica si la copia está
desactualizada.

Las imágenes locales de productos (`/api/v1/media/...`) no se sincronizan: la carpeta
`public/media` debe existir también en el portal.

### Reservas entre portal y tienda

Con base separada, `POST /reservations` en portal-api guarda la reserva como `PENDIENTE_SYNC` y
encola un comando; store-api lo toma por long-poll (`GET /internal/v1/store/commands`), reserva
el stock con FEFO en su propia transacción e informa el resultado
(`POST /internal/v1/store/commands/:id/result`). Las confirmaciones en caja y expiraciones se
avisan por `POST /internal/v1/store/events`. Todo lo que la tienda debe comunicar pasa por la
tabla `outbox_portal` y se reintenta con espera creciente si el portal no responde; el heartbeat
informa cuántos avisos esperan (`pendingEvents`). El detalle de estados, idempotencia y
cancelación está en el [ADR-003](../docs/decisions/ADR-003-split-store-portal.md).

## Verificación

```powershell
npm test
docker compose config
```

## Autenticación y roles

`JWT_SECRET` es obligatorio. El registro público siempre crea un usuario `CLIENTE` y
exige contraseñas de al menos 8 caracteres. Los roles operativos (`BODEGUERO`, `PERCHERO`
y `ADMIN`) se provisionan desde las semillas o mediante administración controlada de la
base de datos; nunca se aceptan desde el registro público.

Los endpoints protegidos reciben el token como `Authorization: Bearer <token>`. Las
reservas toman el identificador de cliente desde ese token y las operaciones de crear,
confirmar, cancelar y expirar se ejecutan como transacciones con bloqueos de fila.

La creación de reservas también exige un heartbeat operativo vigente. Al arrancar, el
portal mantiene las reservas bloqueadas hasta que store-api le envíe un latido a
`POST /internal/v1/store/heartbeat`, autenticado con la cabecera `x-store-key`. Ningún
usuario puede registrar latidos por la API pública; `GET /api/v1/heartbeat` solo lo consulta.
El timeout se configura con `HEARTBEAT_TIMEOUT_SECONDS`.

Configuración del canal tienda → portal:

| Variable | Dónde | Descripción |
|---|---|---|
| `STORE_SERVICE_KEY` | store-api y portal-api | Secreto compartido de al menos 32 caracteres (obligatorio en producción al separar los servicios). |
| `PORTAL_URL` | store-api | URL del portal (`https` en producción) a la que se envía el latido. |
| `STORE_ID` | store-api | Identificador informativo de la tienda (por defecto `tienda-principal`). |
| `HEARTBEAT_ENABLED` | store-api | `false` desactiva el envío del latido. |
| `CATALOG_SYNC_ENABLED` | store-api | `false` desactiva la sincronización del catálogo. |
| `CATALOG_SYNC_INTERVAL_SECONDS` | store-api | Cada cuánto revisa cambios (15 por defecto, mínimo 5). |
| `CATALOG_RESYNC_SECONDS` | store-api | Cada cuánto reenvía todo aunque no haya cambios (600, mínimo 30). |
| `CATALOG_STALE_SECONDS` | portal-api | Antigüedad a partir de la cual la copia se marca como vieja (1200, mínimo 60; mayor que el reenvío completo). |
| `INTERNAL_BODY_LIMIT` | portal-api | Tamaño máximo de un snapshot (`10mb`). |

| `RESERVATION_QUEUE_ENABLED` | store-api | `false` desactiva la atención de reservas del portal. |
| `RESERVATION_POLL_WAIT_SECONDS` | store-api | Espera del long-poll con el que pide comandos al portal (25, entre 5 y 30). |
| `RESERVATION_SYNC_WAIT_SECONDS` | portal-api | Cuánto espera la respuesta de la tienda antes de responder `202` (8, entre 0 y 25). |

En el monolito de transición el latido se emite en proceso, el catálogo y las reservas se
comparten y no hace falta ninguna de estas variables.

Los lotes con fecha de caducidad igual o anterior al día actual nunca participan en FEFO.
Un worker los marca como `VENCIDO` al arrancar y cada 60 segundos; el filtro SQL de las
consultas de inventario actúa además como protección inmediata entre barridos.

## Seguridad HTTP en producción

El backend incorpora Helmet, identificadores `X-Request-Id`, protección contra parameter
pollution y prototype pollution, límite configurable para JSON y rate limiting por IP.
Autenticación, reservas y generación con IA tienen límites adicionales independientes.
Las respuestas `400`, `413` y `429` incluyen el `requestId` para correlacionarlas con logs.

En producción son obligatorios un `JWT_SECRET` aleatorio de al menos 32 caracteres y una
lista explícita `CORS_ORIGINS`; el servidor rechaza el arranque ante `*` o configuración
insegura. Si existe un reverse proxy, `TRUST_PROXY_HOPS` debe ser el número exacto de
saltos confiables para que los límites por IP no puedan falsificarse.

El portal web usa una cookie `HttpOnly`, `Secure` y `SameSite=Strict`. Las operaciones
mutables autenticadas por cookie validan además el encabezado `Origin` como protección
CSRF. Los clientes móviles continúan usando `Authorization: Bearer` y no reciben cookies.

Swagger está deshabilitado por defecto en producción. Para habilitarlo se requieren
`SWAGGER_ENABLED=true`, `SWAGGER_USERNAME` y una `SWAGGER_PASSWORD` de al menos 16
caracteres. Todos los parámetros disponibles están documentados en `.env.example`.

## Migraciones

Al conectarse a PostgreSQL, el backend ejecuta las migraciones incrementales pendientes
bajo un bloqueo consultivo global y registra cada versión en `schema_migrations`. Esto
permite actualizar también volúmenes Docker existentes. Un fallo de migración detiene el
arranque; en `NODE_ENV=production` tampoco se permite continuar con el repositorio en
memoria si PostgreSQL no está disponible.

La migración `004_inventory_traceability` incorpora costo y fecha de elaboración por
lote, el libro de movimientos y las mermas auditables. Los lotes históricos cuyo dato
real se desconoce conservan `NULL`; todo ingreso nuevo exige ambos valores.

---

## Integración con Google Gemini AI para Recomendaciones de Descuento

El sistema integra Google Gemini mediante el SDK oficial mantenido `@google/genai` para sugerir descuentos y frases comerciales automáticas sobre lotes en riesgo de caducidad.

### Variables de Entorno

| Variable | Descripción | Valor Predeterminado |
|---|---|---|
| `GEMINI_API_KEY` | Clave API oficial de Google AI Studio. Si no está configurada, el sistema rechaza la petición con HTTP 503 (`GeminiNotConfigured`); no genera datos falsos. | *(Requerido para IA)* |
| `GEMINI_MODEL` | Identificador estable del modelo Gemini a utilizar. | `gemini-3.8-flash` |
| `GEMINI_TIMEOUT_MS` | Tiempo límite en milisegundos para la llamada HTTP a Gemini. Si expira, se cancela vía `AbortController` y responde HTTP 504 (`GeminiTimeout`). | `10000` (10 segundos) |
| `GEMINI_CACHE_TTL_SECONDS` | Tiempo de vida de la caché anti-stampede por lote y versión de prompt. | `900` (15 minutos) |
| `GEMINI_CACHE_MAX_ENTRIES` | Máximo de resultados conservados en la caché local; al alcanzar el límite se elimina el más antiguo. | `1000` |

### Flujo de Aprobación Humana (Human-in-the-Loop)

1. **Generación (`POST /api/v1/promotions/generate`)**:
   - Roles permitidos: `BODEGUERO`, `PERCHERO`, `ADMIN`.
   - Se valida el lote en base de datos. Se rechazan lotes `VENCIDO`, `AGOTADO`, `MERMA`, sin stock o en caducidad normal (`>= 15` días).
   - Solo se permiten lotes con alertas de caducidad:
     - `ROJO` (1–6 días): Descuento entre **20% y 50%**.
     - `AMARILLO` (7–14 días): Descuento entre **5% y 30%**.
   - Gemini responde exclusivamente con JSON estructurado (`responseSchema` estricto). Se rechaza Markdown, bloques ``` o texto adicional.
   - **Persistencia**: La promoción se crea inicialmente como **`PENDIENTE_APROBACION`** y `activa = false`. **Nunca se publica directamente**.
   - **Concurrencia**: Se previene duplicación mediante restricción única en PostgreSQL (`uidx_promo_lote_cache_pendiente`), transacción y bloqueo consultivo.

2. **Revisión y Aprobación (`POST /api/v1/promotions/:id/approve`)**:
   - Rol permitido: Exclusivamente `ADMIN`.
   - Cambia atómicamente a `estado = 'APROBADA'` y `activa = true`.
   - Registra auditoría con `aprobada_por` y `aprobada_at`. No permite aprobar dos veces.

3. **Rechazo (`POST /api/v1/promotions/:id/reject`)**:
   - Rol permitido: Exclusivamente `ADMIN`. Requiere `motivoRechazo`.
   - Cambia atómicamente a `estado = 'RECHAZADA'` y `activa = false`.
   - Registra auditoría con `rechazada_por`, `rechazada_at` y `motivo_rechazo`.

4. **Consulta Pública (`GET /api/v1/promotions`)**:
   - Público (sin autenticación).
   - Retorna **únicamente** promociones `APROBADA` y activas. Los borradores pendientes o rechazados no se exhiben a clientes.

5. **Consulta de Borradores (`GET /api/v1/promotions/pending`)**:
   - Rol permitido: Exclusivamente `ADMIN`.

### Formato de Errores Controlados

Las fallas de Gemini se mapean a códigos HTTP limpios sin exponer API keys ni prompts sensibles:

- **HTTP 400 (`ValidationError`)**: Lote vencido, sin stock, o parámetros inválidos.
- **HTTP 429 (`GeminiRateLimit`)**: Límite de cuota excedido de la API de Gemini.
- **HTTP 502 (`GeminiInvalidResponse` / `GeminiExternalError`)**: Salida de Gemini que incumple el esquema o error de comunicación externa.
- **HTTP 503 (`GeminiNotConfigured`)**: `GEMINI_API_KEY` ausente o no configurada.
- **HTTP 504 (`GeminiTimeout`)**: La llamada a Gemini superó los `GEMINI_TIMEOUT_MS`.

### Métricas de Observabilidad (`GET /api/v1/metrics/ai`)

Endpoint protegido para rol `ADMIN`. Retorna métricas en memoria sobre el servicio de IA:

- `gemini_requests_total`: Total de peticiones entrantes de generación de IA.
- `gemini_success_total`: Total de generaciones exitosas de Gemini.
- `gemini_timeouts_total`: Total de peticiones abortadas por timeout.
- `gemini_cache_hits_total`: Total de consultas servidas desde caché sin llamar a Gemini.
- `gemini_cache_misses_total`: Total de consultas que requirieron invocar a Gemini.
- `gemini_errors_total_<TIPO>`: Conteo de errores clasificados (`CONFIG`, `TIMEOUT`, `RATE_LIMIT`, `INVALID_RESPONSE`, `EXTERNAL`).
- `gemini_latency`: Estadísticas (`avg_ms`, `max_ms`, `count`) del tiempo de respuesta del SDK Gemini.
- `uc_latency`: Estadísticas de latencia global del caso de uso.
- `promotions_pending_total`, `promotions_approved_total`, `promotions_rejected_total`: Contadores de ciclo de vida de promociones.
