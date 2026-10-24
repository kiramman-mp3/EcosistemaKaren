# ADR-003: Separar el backend en store-api (tienda) y portal-api (nube)

- Estado: Aceptada
- Fecha: 2026-10-24
- Alcance: Ecosistema Karen (backend, portal web, portal móvil, bodega móvil)

## Contexto

Hoy existe un único backend con una única base de datos. El heartbeat de la tienda es
simulado: `HeartbeatSimulatorWorker` llama a `HeartbeatMonitor.recordHeartbeat()` dentro del
mismo proceso que luego valida `assertReservationsAvailable()`, de modo que la señal no prueba
que la tienda esté realmente viva. Además, los clientes, los trabajadores y el inventario
comparten el mismo servicio, aunque tienen requisitos distintos: los trabajadores deben poder
operar aunque no haya internet y los clientes deben llegar desde internet sin acceder a la red
de la tienda.

## Decisión

Se divide el backend en dos servicios con base de datos propia:

- **store-api**: corre en la red local de la tienda y solo atiende a los trabajadores
  (BODEGUERO, PERCHERO, ADMIN). Es la **única autoridad de inventario y reservas**.
- **portal-api**: corre en la nube y atiende a los clientes (CLIENTE). Recibe el heartbeat y las
  respuestas de la tienda, y mantiene una copia de lectura del catálogo.

La tienda inicia siempre la comunicación (tráfico solo saliente). No se abren puertos ni se
usan túneles hacia la tienda.

### Reparto de responsabilidades

| store-api (LAN) | portal-api (nube) |
|---|---|
| Lotes, mermas, movimientos de inventario, FEFO | Registro, login y revocación de tokens de CLIENTE |
| Alertas de caducidad, SSE y workers de caducidad | Rate limit de clientes |
| Autoridad de reservas: asigna lotes, confirma en caja, expira | Copia de lectura: categorías, productos, disponibilidad, promociones aprobadas |
| Autenticación de BODEGUERO, PERCHERO y ADMIN | Estado del heartbeat y cola de comandos hacia la tienda |
| Generación con Gemini, aprobación y gestión de promociones | Bloqueo de reservas si no hay heartbeat vigente |
| Administración de productos y categorías | Exposición pública de promociones ya aprobadas |

### Contrato interno

Prefijo `/internal/v1` en portal-api, autenticado con una API key de servicio (cabecera
dedicada, comparación con `timingSafeEqual`, secreto distinto de `JWT_SECRET`).

| Método y ruta | Uso |
|---|---|
| `POST /store/heartbeat` | Latido de la tienda: `{ storeId, version, pendingEvents }`. El portal registra la hora con su propio reloj. |
| `GET /store/commands?wait=25` | Long-poll. Entrega comandos `RESERVATION_CREATE` y `RESERVATION_CANCEL`. |
| `POST /store/commands/:id/result` | Resultado `ACCEPTED` o `REJECTED`. Idempotente por `commandId`. |
| `POST /store/sync/catalog` | Snapshot completo de una sección del catálogo (`categorias`, `productos`, `lotes`, `promociones`) con `version` monótona. El portal reemplaza su copia de esa sección e ignora versiones iguales o anteriores. |
| `POST /store/events` | Reserva confirmada, expirada o cancelada, y cambios de disponibilidad. |

### Sincronización del catálogo (implementada)

La tienda lee cada ciclo (15 s por defecto) las cuatro secciones y envía solo las que cambiaron
desde el último envío confirmado, y todas cada 10 minutos para que el portal se recupere si perdió
datos. Se eligieron snapshots por sección y no deltas porque el catálogo es pequeño, no hay
orden de eventos que preservar y un envío fallido se corrige solo con el siguiente.

- **Qué viaja:** categorías, productos (sin stock mínimo), lotes vigentes con existencias
  (`estado = ACTIVO`, no vencidos, `cantidad_disponible > 0`) y promociones aprobadas y activas
  sobre esos lotes. Nunca costos, ubicación, fechas de elaboración, cantidades reservadas,
  razones ni metadatos de IA, ni quién aprobó una promoción. El esquema rechaza cualquier campo
  fuera del contrato.
- **Copia en el portal:** tablas con el mismo nombre y forma que las de la tienda, de modo que los
  repositorios de lectura funcionan sin cambios. Los campos internos quedan vacíos o con su valor
  por defecto. `sync_estado` guarda la última versión y la hora de cada sección.
- **Versiones:** la tienda usa una versión creciente; si el portal ya tiene una igual o mayor
  (por ejemplo, por un reloj atrasado) responde `applied: false` con su `currentVersion` y la
  tienda sube la suya y reenvía.
- **Desactualización:** `GET /catalog/status` del portal informa `stale` si falta alguna sección
  o la más antigua supera `CATALOG_STALE_SECONDS` (20 minutos por defecto, mayor que el reenvío
  completo).
- **Imágenes:** `imagen_url` se copia tal cual. Las imágenes locales (`/api/v1/media/...`) deben
  estar también en la carpeta `public/media` del portal; sincronizar los archivos queda fuera de
  esta fase.

La tienda mantiene una tabla `outbox` con reintentos y backoff para que ningún evento se
pierda si el portal no responde.

### Flujo de reserva

1. El cliente llama `POST /reservations` en el portal.
2. El portal verifica que haya heartbeat vigente, guarda la reserva en `PENDIENTE_SYNC` con el
   TTL de 30 minutos de [ADR-002](ADR-002-ttl-reservas-30-minutos.md) y encola
   `RESERVATION_CREATE`.
3. La tienda toma el comando y ejecuta la asignación FEFO actual
   (`createWithLockedStock`). Esa validación es la única que decide sobre el stock. Responde
   `ACCEPTED` con código de retiro y lotes, o `REJECTED` con el motivo.
4. El portal pasa la reserva a `PENDIENTE` o `RECHAZADA`.
5. La confirmación en caja, la cancelación y la expiración ocurren en la tienda y se reportan
   por `events`.
6. Si el TTL vence sin respuesta de la tienda, el portal marca la reserva como `EXPIRADA` y
   descarta cualquier aceptación tardía.

### Decisiones tomadas

- **D1. ADMIN opera desde la tienda.** La administración de productos, categorías y
  promociones (incluida la aprobación) se hace con la app de bodega contra store-api. Las
  pantallas de ADMIN de `portal-web` se retiran o se reubican.
- **D2. Gemini corre en la tienda.** La tienda tiene los lotes, solo necesita salida a
  internet y el portal no recibe datos de inventario sensibles. Solo las promociones ya
  aprobadas se publican al portal por la sincronización de catálogo.
- **D3. Los IDs de producto y categoría son los de la tienda.** El portal usa los UUID tal
  como llegan en la sincronización, de modo que el `productoId` de una reserva sea válido en
  ambos servicios sin tabla de equivalencias. Los clientes se identifican en la tienda por un
  `cliente_id` sin clave foránea, más un nombre copiado para mostrar en caja.

## Consecuencias

- El heartbeat pasa a ser una señal real: si la tienda o su conexión caen, el portal bloquea
  nuevas reservas.
- La tienda sigue operando sin internet. Solo se detienen la sincronización y la recepción de
  reservas, y se reanudan al volver la conexión.
- La disponibilidad que ve el cliente puede estar desactualizada. La tienda rechaza la
  reserva si ya no hay stock, y el portal marca la copia como obsoleta (`STALE`) si la
  sincronización se retrasa.
- Son dos despliegues, dos bases de datos y un contrato interno que hay que versionar.
- Una reserva requiere ida y vuelta entre servicios, por lo que su confirmación inicial no es
  inmediata. Las apps de cliente consultan el estado por polling.
- El portal móvil pasa a hablar con portal-api por HTTPS. El permiso de HTTP en claro para la
  LAN en las builds de release deja de ser necesario.
- `reservas.usuario_id` y `reserva_detalles.lote_id` dejan de ser claves foráneas entre
  servicios: el portal no conoce lotes y la tienda no conoce la tabla de usuarios del portal.

## Plan de implementación

1. `refactor/split-composition-roots`: dos puntos de entrada y dos routers sobre el mismo
   `domain` y `use-cases`, sin cambio de comportamiento.
2. `feature/real-heartbeat`: la tienda envía el latido al portal y se elimina el simulador.
3. `feature/separate-databases`: dos instancias de PostgreSQL y esquemas divididos.
4. `feature/catalog-sync`: sincronización del catálogo y la disponibilidad hacia el portal.
5. `feature/reservation-command-queue`: reservas como comandos con `outbox` y long-poll.
6. `feature/clients-per-backend`: cada app apunta al backend que le corresponde.
7. `chore/ci-and-docs`: CI por servicio y documentación actualizada.
