# ADR-003: Separar el backend en store-api (tienda) y portal-api (nube)

- Estado: Aceptada e implementada
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
| `GET /store/commands?wait=25&limit=20` | Long-poll. Entrega comandos `RESERVATION_CREATE`, `RESERVATION_CANCEL` y `RESERVATION_EXTEND`. |
| `POST /store/commands/:id/result` | Resultado del comando: `ACCEPTED` o `REJECTED` (con motivo) para `CREATE`; `APPLIED` o `IGNORED` (con el estado real) para `CANCEL`. Idempotente por id de comando. |
| `POST /store/sync/catalog` | Snapshot completo de una sección del catálogo (`categorias`, `productos`, `lotes`, `promociones`) con `version` monótona. El portal reemplaza su copia de esa sección e ignora versiones iguales o anteriores. |
| `POST /store/sync/media/manifest`, `PUT /store/sync/media` | Fotos locales de productos: la tienda informa ruta y hash de las que usa, el portal indica cuáles le faltan y la tienda las sube (binario, máx. 2 MB). El portal las guarda en su base y las sirve en `/api/v1/media/productos/*`. |
| `POST /store/events` | Lote de cambios de estado de reservas hechos en la tienda (`CONFIRMADA`, `EXPIRADA`, `CANCELADA`). La disponibilidad viaja por la sincronización de catálogo. |

### Sincronización del catálogo (implementada)

La tienda lee cada ciclo (15 s por defecto) las cuatro secciones y envía solo las que cambiaron
desde el último envío confirmado, y todas cada 10 minutos para que el portal se recupere si perdió
datos. Se eligieron snapshots por sección y no deltas porque el catálogo es pequeño, no hay
orden de eventos que preservar y un envío fallido se corrige solo con el siguiente.

- **Qué viaja:** categorías, productos (sin stock mínimo, con su fecha de alta y las unidades
  vendidas en los últimos 30 días, que alimentan los filtros "Nuevos" y "Más vendidos"; esa cifra
  cambia con cada venta, así que la sección de productos se reenvía más a menudo), lotes vigentes con existencias
  (`estado = ACTIVO`, no vencidos, `cantidad_disponible > 0`) y promociones aprobadas, activas
  y vigentes sobre esos lotes, con sus límites (por pedido, stock de oferta y hora de fin) y las
  unidades de oferta que quedan, calculadas en la tienda. Una oferta agotada o terminada deja de
  enviarse. Nunca costos, ubicación, fechas de elaboración, cantidades reservadas,
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

### Flujo de reserva

1. El cliente llama `POST /reservations` en el portal.
2. El portal verifica que haya heartbeat vigente, guarda la reserva en `PENDIENTE_SYNC` con el
   TTL de 30 minutos de [ADR-002](ADR-002-ttl-reservas-30-minutos.md) y encola
   `RESERVATION_CREATE`.
3. La tienda toma el comando y ejecuta la asignación FEFO actual
   (`createWithLockedStock`). Esa validación es la única que decide sobre el stock y sobre los
   límites de cada oferta (bloquea la promoción mientras cuenta sus unidades). Responde
   `ACCEPTED` con código de retiro y lotes, o `REJECTED` con el motivo (`OVERBOOKING`,
   `OFFER_LIMIT`, `VALIDATION`, `NOT_FOUND`, `EXPIRED` o `STORE_ERROR`).
4. El portal pasa la reserva a `PENDIENTE` o `RECHAZADA`.
5. La confirmación en caja, la cancelación y la expiración ocurren en la tienda y se reportan
   por `events`.
6. Si el TTL vence sin respuesta de la tienda, el portal marca la reserva como `EXPIRADA` y
   descarta cualquier aceptación tardía.

### Cola de reservas (implementada)

**Estados del portal:** `PENDIENTE_SYNC` (esperando a la tienda) → `PENDIENTE` (aceptada) →
`CONFIRMADA` | `EXPIRADA` | `CANCELADA`; o `PENDIENTE_SYNC` → `RECHAZADA`.

**Respuesta al cliente.** `POST /reservations` espera hasta 8 s (`RESERVATION_SYNC_WAIT_SECONDS`)
la respuesta de la tienda y responde con el mismo formato de siempre: `201` con código de retiro
y lotes si fue aceptada, o el error habitual (`409` sin stock, `400`, `404`, `503`) si fue
rechazada. Si la tienda tarda más, responde `202` con la reserva en `PENDIENTE_SYNC` y el cliente
la consulta con `GET /reservations/user/:userId`. Sin heartbeat vigente no se guarda ni se encola
nada (`503`).

**Cola durable.** Los comandos viven en `comandos_tienda` (base del portal) y la tienda los pide
con long-poll. Un comando entregado y sin resultado se vuelve a ofrecer a los 60 s; tras 5
entregas se da por fallido y la reserva pasa a `RECHAZADA` (`STORE_ERROR`). Nunca se entrega un
comando si hay otro anterior sin resolver de la misma reserva, así `CREATE` siempre se resuelve
antes que un `CANCEL`.

**Idempotencia.** La reserva usa el mismo `id` en ambos servicios. Si la tienda recibe otra vez
un `CREATE` cuya reserva ya existe, devuelve el resultado existente sin reservar de nuevo; los
resultados y eventos repetidos no cambian nada en el portal.

**La tienda manda.** El stock lo decide solo la tienda (`createWithLockedStock`, FEFO). Un
`CREATE` que llega después del plazo se rechaza (`EXPIRED`). La confirmación en caja es
definitiva y prevalece sobre lo que el portal haya inferido. El portal solo expira por su cuenta
las reservas que la tienda nunca aceptó; las aceptadas las expira la tienda y se lo avisa.

**Reserva sin respuesta de la tienda.** Si un comando agota sus entregas, el portal rechaza la reserva
(`STORE_ERROR`) y encola un `CANCEL` para ella: si la tienda había reservado el stock sin que su
resultado llegara, lo libera en vez de retenerlo hasta que venza la reserva; si no la conoce, lo ignora.

**Cancelación.** El portal cancela de inmediato para el cliente. Si la tienda aún no recibió el
`CREATE`, ambos se anulan en el portal y la tienda nunca se entera; si ya lo recibió, se encola
un `CANCEL` que libera el stock. Si en la tienda ya estaba confirmada, se informa el estado
real y el portal lo corrige.

**Bandeja de salida (`outbox_portal`, base de la tienda).** Los resultados de los comandos y los
cambios de estado (confirmada, expirada) se guardan antes de enviarse y se reintentan en orden
con espera creciente (2 s hasta 5 min). Un fallo de red o 5xx detiene el ciclo para no perder el
orden; un 4xx permanente en una fila no bloquea las demás y un 404 la descarta. Los resultados
salen de inmediato tras procesarse, porque el cliente espera la respuesta. El heartbeat informa
cuántos avisos esperan (`pendingEvents`).

**Clientes remotos en la tienda.** `reservas.usuario_id` deja de ser clave foránea hacia
`usuarios` y se guarda `cliente_nombre`; los movimientos de inventario de esas reservas no llevan
actor local y registran el `clienteId` y el origen en su metadata.

### Apps cliente (implementado)

- **Cada app apunta a su backend.** El portal web y el portal móvil hablan con portal-api; la app
  de bodega habla con store-api. Ninguna app de cliente conoce la red de la tienda. En desarrollo,
  `node start.js --split` levanta los dos servicios con sus bases y configura las URLs.
- **Reservas en proceso.** Las apps de los clientes entienden `PENDIENTE_SYNC` (la tienda aún
  confirma) y `RECHAZADA` (con el motivo). Al apartar, si la respuesta es `202` esperan hasta 45 s
  consultando el estado cada 2 s; si la tienda sigue sin responder, la reserva queda en "Mis
  reservas", que se actualiza sola cada 4 s mientras haya reservas por confirmar, y se puede cancelar.
- **Aviso de datos desactualizados.** El portal web muestra una franja si `GET /catalog/status`
  informa `stale`.
- **Administración fuera del portal (D1).** Se eliminaron del cliente del portal web las llamadas
  de administración de promociones y métricas de IA, que no tenían pantalla, y el envío de
  heartbeat desde las apps.

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

## Plan de implementación (completado)

1. `refactor/split-composition-roots`: dos puntos de entrada y dos routers sobre el mismo
   `domain` y `use-cases`, sin cambio de comportamiento.
2. `feature/real-heartbeat`: la tienda envía el latido al portal y se elimina el simulador.
3. `feature/separate-databases`: dos instancias de PostgreSQL y esquemas divididos.
4. `feature/catalog-sync`: sincronización del catálogo y la disponibilidad hacia el portal.
5. `feature/reservation-command-queue`: reservas como comandos con `outbox` y long-poll.
6. `feature/clients-per-backend`: cada app apunta al backend que le corresponde.
7. `chore/ci-and-docs`: CI por servicio, Swagger por servicio y documentación actualizada.

## Cuentas y datos de demostración

El esquema inicial de la tienda ya no crea cuentas. Los datos de demostración (con contraseñas
conocidas) viven en `init-db/dev` y solo se montan en el compose de desarrollo; en producción
store-api y portal-api no arrancan si quedan cuentas de demostración con su contraseña conocida.
store-api tampoco expone el registro público: el personal se da de alta con `npm run user:create`
y los clientes se registran únicamente en portal-api.

## Avisos de estado y cancelación por el ADMIN

Cada cambio de estado que ocurre en la tienda (confirmada en caja, expirada, o cancelada por un ADMIN) escribe su
aviso en `outbox_portal` **dentro de la misma transacción** que el cambio y el movimiento de stock
(`PostgresReservationRepository.enableStateEvents`): o quedan los dos o ninguno, y el portal siempre llega a
enterarse aunque la tienda caiga justo después. Las cancelaciones que pide el propio portal (comando
`RESERVATION_CANCEL`) no generan aviso, porque el portal ya conoce ese estado.

El ADMIN opera desde la tienda, así que `POST /reservations/:id/cancel` existe también en store-api, solo para
`ADMIN` (el cliente cancela en el portal). La tienda libera el stock y el portal pasa la reserva a `CANCELADA`
cuando recibe el aviso.

## Extender el plazo de una reserva

El vencimiento lo decide la tienda (es quien libera el stock al expirar), así que `POST /reservations/:id/extend` en portal-api
valida lo que ya sabe (dueño, estado, que no haya vencido, tope de 4 h desde la creación y que no haya otra extensión en curso) y
encola `RESERVATION_EXTEND` con el vencimiento de **destino absoluto** (`hasta`), no con minutos: si el comando se reentrega, no
extiende dos veces. La tienda lo vuelve a validar con su tope, responde `EXTENDED { fechaExpiracion }` o `REJECTED`, y el portal
guarda el resultado (`comandos_tienda.resultado`) y toma `GREATEST` de los vencimientos. Si la tienda no responde en el plazo de
espera, el comando que aún no se entregó se descarta para que no extienda la reserva más tarde sin que el cliente lo sepa. El ADMIN no
extiende reservas de clientes.

## Pendiente conocido

- Una reserva aceptada cuyo plazo pasó y de la que el portal aún no recibe aviso (tienda sin conexión) se
  publica con `vencidaSinConfirmar: true`, sin cambiar su estado, hasta que la tienda informe.
- El portal móvil no muestra el aviso de catálogo desactualizado que sí muestra el portal web.
- La verificación de punta a punta con dos instancias reales de PostgreSQL y HTTP entre los servicios
  la hace el CI (`backend-services`); localmente se validó con una base embebida.
