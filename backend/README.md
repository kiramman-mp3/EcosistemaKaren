# Backend Ecosistema Karen

## PostgreSQL local reproducible

1. Copiar `.env.example` a `.env` y cambiar los secretos locales.
2. Ejecutar `docker compose up -d` desde esta carpeta.
3. Esperar a que `docker compose ps` muestre PostgreSQL como `healthy`.
4. Ejecutar `npm start`. La conexión desde el host usa `localhost:5433` por defecto.

Las cuentas iniciales usan la contraseña local `demo123`. Los scripts de `init-db` solo se
ejecutan cuando el volumen de PostgreSQL se crea por primera vez. Para recrear datos desde
cero debe eliminarse deliberadamente el volumen; no se hace automáticamente para evitar
pérdida accidental de información.

Los puertos pueden cambiarse con `DB_EXPOSED_PORT` y `PGADMIN_PORT`. Las credenciales de
PostgreSQL y pgAdmin se leen desde `.env`; los valores incluidos son únicamente para desarrollo.

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
backend mantiene las reservas bloqueadas hasta recibir `POST /api/v1/heartbeat` desde un
usuario `BODEGUERO` o `ADMIN`. El timeout se configura con `HEARTBEAT_TIMEOUT_SECONDS`.

Los lotes con fecha de caducidad igual o anterior al día actual nunca participan en FEFO.
Un worker los marca como `VENCIDO` al arrancar y cada 60 segundos; el filtro SQL de las
consultas de inventario actúa además como protección inmediata entre barridos.

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
