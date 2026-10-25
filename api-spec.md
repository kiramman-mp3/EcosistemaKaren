# Especificación de API REST & SSE - Ecosistema Karen (Fase 1)

**Base URL**: `http://localhost:4000/api/v1`  
**Formato de Respuesta**: JSON (UTF-8)

---

## 0. Autenticación y autorización

`POST /auth/register` crea exclusivamente usuarios con rol `CLIENTE`, aunque el cuerpo
incluya otro rol. `POST /auth/login` entrega un JWT HS256 válido durante 24 horas. Los
endpoints protegidos requieren `Authorization: Bearer <token>`.

El portal web usa una sesión por cookie HttpOnly (`X-Session-Mode: cookie`) y es solo para
clientes: ese login responde `403` para `BODEGUERO`, `PERCHERO` y `ADMIN`, que ingresan por
la app de bodega con Bearer.

| Operación | Roles permitidos |
| --- | --- |
| Crear categorías o productos | `ADMIN` |
| Consultar lotes | `BODEGUERO`, `PERCHERO`, `ADMIN` |
| Ingresar lotes | `BODEGUERO`, `ADMIN` |
| Cambiar ubicación o registrar merma | `BODEGUERO`, `PERCHERO`, `ADMIN` |
| Crear reservas | `CLIENTE` |
| Consultar reservas | Propietario, `BODEGUERO`, `PERCHERO` o `ADMIN` |
| Cancelar reservas | Propietario (en el portal) o `ADMIN` (en el portal o en la tienda) |
| Confirmar reservas | `BODEGUERO`, `ADMIN` |
| Alertas y generación de promociones | `BODEGUERO`, `PERCHERO`, `ADMIN` |

El catálogo, las promociones activas, el heartbeat de lectura y `GET /availability`
son públicos. Este último solo expone identificador de lote/producto, fecha, estado y
cantidad disponible; excluye lotes vencidos o sin disponibilidad. Acepta el filtro opcional
`?productoId=<uuid>` (UUID inválido responde `400`; un parámetro desconocido se ignora) y se
puede cachear 5 segundos (`Cache-Control: public, max-age=5` y `ETag`; una solicitud
condicional con `If-None-Match` responde `304`).

El servidor inicia con las reservas bloqueadas. El latido lo envía el backend de la tienda
(store-api) a `POST /internal/v1/store/heartbeat`, un canal interno autenticado con la
cabecera `x-store-key` que no forma parte de la API pública ni acepta tokens de usuario.
Permanece vigente durante 60 segundos por defecto. Si nunca se ha recibido un latido o el
último superó `HEARTBEAT_TIMEOUT_SECONDS`, `POST /reservations` responde
`503 Service Unavailable` sin modificar el inventario. `GET /heartbeat` solo consulta el estado.

### `GET /catalog/status` (portal)
Público. Indica si la copia del catálogo y la disponibilidad que ve el cliente puede estar
desactualizada, para que las apps lo avisen. Respuesta:

```json
{
  "success": true,
  "mode": "mirror",
  "stale": false,
  "lastSyncAt": "2026-10-24T15:00:00.000Z",
  "secondsSinceSync": 42,
  "staleAfterSeconds": 1200,
  "missingSections": [],
  "sections": [{ "seccion": "lotes", "version": 1792854000000, "elementos": 214, "sincronizadoAt": "2026-10-24T15:00:00.000Z" }]
}
```

`stale` es `true` si falta alguna sección (`categorias`, `productos`, `lotes`, `promociones`) o la
más antigua supera `staleAfterSeconds`. En el monolito de transición `mode` es `direct` y
`stale` siempre es `false`. Este endpoint solo lo expone portal-api, no store-api.

### Canal interno de sincronización (store-api → portal-api)
Fotos de productos (misma cabecera `x-store-key`): `POST /internal/v1/store/sync/media/manifest` con
`{ "files": [{ "ruta", "sha256", "size" }], "prune": true }` responde `{ "missing": [rutas], "removed": n }`;
`PUT /internal/v1/store/sync/media?ruta=<ruta>` sube el binario (`Content-Type: application/octet-stream`, cabecera
`x-content-sha256`, máx. 2 MB; 400 si el hash, la firma de imagen o la ruta no son válidos). El portal las sirve
públicamente en `GET /api/v1/media/productos/<archivo>` (`ETag`, `Cache-Control: public, max-age=86400`).

`POST /internal/v1/store/sync/catalog`, autenticado con la cabecera `x-store-key` y fuera de la
API pública. Cuerpo: `{ "section": "categorias|productos|lotes|promociones", "version": <entero creciente>, "items": [...] }`.
Es un snapshot completo de la sección: el portal reemplaza su copia. Los productos incluyen `createdAt` y
`vendidos30d`, opcionales para que una tienda con una versión anterior siga sincronizando: si faltan, el
portal conserva lo que tenía (o usa la fecha actual y 0 en un producto nuevo). Responde
`{ "success": true, "section", "version", "applied", "count" }`; si ya tiene una versión igual o
mayor, `applied` es `false` y devuelve `currentVersion`. Campos no incluidos en el contrato
(costos, ubicación, razones de IA, etc.) se rechazan con `400`. Solo está disponible cuando
portal-api tiene base de datos propia.

---

## 1. Productos (`/products`)

### `GET /products`
Consulta el catálogo con búsqueda y paginación. Admite `q`, `categoriaId`, `limit` (máximo 100) y `offset`.
* **Respuesta (200 OK)**:
```json
{
  "success": true,
  "count": 2,
  "total": 1200,
  "limit": 30,
  "offset": 0,
  "data": [
    {
      "id": "c8a4d2e1-...",
      "categoriaId": "f1b2c3...",
      "codigoBarras": "7861000100014",
      "nombre": "Leche Entera Vita 1 Litro",
      "descripcion": "Leche pasteurizada UHT",
      "precioVenta": 0.95,
      "impuestoPorcentaje": 15,
      "minStockAlerta": 20,
      "vendidos30d": 118,
      "created_at": "2026-03-14T15:20:00.000Z"
    }
  ]
}
```
* `created_at` es el alta real del producto en la tienda y `vendidos30d` las unidades vendidas (movimientos
  `VENTA`) en los últimos 30 días. Con ellos los portales marcan **Nuevo** (alta de hace 14 días o menos) y
  **Más vendido** (el 10 % superior del catálogo, solo productos con ventas). En portal-api llegan con la
  sincronización del catálogo; en store-api y el monolito se calculan al consultar.

### `GET /products/barcode/:barcode`
Busca un producto por lectura de código de barras.
* **Respuesta (200 OK / 404 Not Found)**.

### `POST /products`
Crea un nuevo producto en catálogo.
* **Body Payload**:
```json
{
  "categoriaId": "f1b2c3...",
  "codigoBarras": "786999900018",
  "nombre": "Queso Crema Toni 200g",
  "descripcion": "Queso untable",
  "precioVenta": 1.95,
  "impuestoPorcentaje": 15,
  "minStockAlerta": 10
}
```

### `PATCH /products/:id`
Cambia el PVP de un producto. Solo `ADMIN` y solo store-api; el portal lo recibe en la siguiente
sincronización del catálogo (unos 15 s).
* **Body Payload**: `{ "precioVenta": 2.75 }` (mayor a 0 y hasta 1.000.000; no admite otros campos).
* **Respuesta (200)**: `{ "success": true, "data": <producto>, "cambioPrecio": { "anterior": 2.5, "nuevo": 2.75 } }`.
  Si el precio es el mismo, `cambioPrecio` es `null` y no se anota nada.
* Cada cambio queda en `productos_precio_historial` con el precio anterior, el nuevo, el origen (`MANUAL`), el
  ADMIN que lo hizo y la fecha.
* Las reservas ya hechas conservan el precio con el que se apartaron (`reserva_detalles.precio_unitario`).
* Errores: `400` precio no válido, `401`/`403` sin sesión o sin rol ADMIN, `404` producto inexistente.

### `GET /products/:id/price-history`
Últimos 20 cambios de PVP del producto, del más reciente al más antiguo (`ADMIN`). Cada uno trae
`precioAnterior`, `precioNuevo`, `origen` (`MANUAL` o `INGRESO_LOTE`), `loteId`, `actorNombre` y `created_at`.

### `PUT /products/:id/image`
Sube o reemplaza la foto del producto (`ADMIN` o `BODEGUERO`; solo store-api). El cuerpo es la **foto en
binario**, tal como sale de la cámara, con `Content-Type` `image/jpeg`, `image/png`, `image/webp`,
`image/heic` o `image/heif` (hasta 15 MB y 120 megapíxeles). El servidor la endereza según su orientación EXIF,
la reduce a un máximo de 1024 px por lado, la convierte a JPEG progresivo y le quita los metadatos (ubicación,
modelo de cámara). Una foto de cámara de 12 MP (~10 MB) queda en 100-250 KB.
* **Respuesta (200)**: `{ "success": true, "data": <producto con el nuevo imagenUrl>, "image": { "width", "height", "bytes", "originalBytes" } }`.
* `imagenUrl` incluye el hash del contenido (`/api/v1/media/productos/<código>-<hash>.jpg`): cada foto nueva tiene
  URL nueva, así las cachés no muestran la anterior. La foto previa se borra si ningún otro producto la usa.
* Errores: `400` imagen ilegible o con demasiados píxeles, `401`/`403` sin permiso, `404` producto inexistente,
  `413` más de 15 MB, `415` tipo no admitido.

---

## 2. Lotes e Inventarios (`/lots`)

### `GET /lots`
Lista los lotes activos y vigentes con información de producto y ubicación. Los lotes
cuya fecha sea hoy o anterior se excluyen incluso antes de que termine el barrido automático.

Un worker se ejecuta al arrancar el backend y después cada 60 segundos. Cambia de forma
persistente `ACTIVO` a `VENCIDO` cuando `fecha_caducidad <= CURRENT_DATE`. La operación
es idempotente y los lotes vencidos se conservan en las alertas operativas.

### `POST /lots`
Registra un nuevo lote de producto recibido en bodega.
* **Body Payload**:
```json
{
  "productoId": "c8a4d2e1-...",
  "numeroLote": "LOT-QC-2026-99",
  "fechaElaboracion": "2026-08-20",
  "fechaCaducidad": "2026-09-05",
  "costoUnitario": 1.25,
  "cantidadIngresada": 50,
  "ubicacion": "BODEGA",
  "nuevoPrecioVenta": 2.75
}
```
* `nuevoPrecioVenta` es opcional y solo lo puede enviar el `ADMIN` (un `BODEGUERO` recibe `403` y el lote no se
  guarda). Se aplica en la misma transacción que el lote: si el lote falla, el precio no cambia. La respuesta
  incluye `cambioPrecio: { anterior, nuevo }` y el cambio queda en la bitácora con origen `INGRESO_LOTE`.

### `PATCH /lots/:id/location`
Actualiza la ubicación física del lote (`BODEGA` -> `PERCHA`).
* **Body Payload**:
```json
{
  "ubicacion": "PERCHA"
}
```

### `POST /lots/:id/merma`
Registra baja de unidades por caducidad o daño físico.
* **Body Payload**:
```json
{
  "cantidad": 5,
  "razon": "Producto caducado en percha"
}
```

La baja bloquea la fila del lote y crea, dentro de la misma transacción, un registro
en `mermas` y otro en `inventario_movimientos`. Ambos conservan el responsable tomado
del JWT, la razón, el costo y los saldos antes/después.

### `GET /inventory/movements`
Consulta el libro inmutable de movimientos. Permite filtrar por `loteId`, `tipo` y
limitar entre 1 y 500 resultados. Incluye ingresos, traslados, reservas, liberaciones,
ventas, mermas y vencimientos. Requiere rol operativo o ADMIN.

### `GET /inventory/wastes`
Consulta las mermas auditables con cantidad, razón, responsable, costo unitario,
costo total y vínculo al movimiento que modificó el inventario.

### `GET /inventory/summary?periodo=hoy|7d|30d`
Totales de un mismo período para los indicadores del reporte de bodega: unidades
recibidas (`INGRESO`) y vendidas (`VENTA`) según `inventario_movimientos`, y unidades
y costo de merma según `mermas`. El período son días completos en la zona horaria del
negocio e incluye el día en curso (`7d` empieza a la medianoche de hace seis días).
Sin `periodo` se usa `7d`. Requiere rol operativo o ADMIN.

```json
{ "success": true, "data": { "periodo": "7d", "desde": "2026-10-19T05:00:00.000Z",
  "hasta": "2026-10-25T18:30:00.000Z", "ingresos": 1240, "ventas": 860,
  "mermas": 95, "costoMerma": 152.4 } }
```

---

## 3. Reservaciones de Stock Anti-Overbooking (`/reservations`)

### `POST /reservations`
Crea una reserva de stock temporal con temporizador TTL (30 minutos) usando asignación FEFO.
La identidad se obtiene del JWT: el cliente no puede indicar `usuarioId` ni reservar a
nombre de otra persona.
* **Body Payload**:
```json
{
  "items": [
    {
      "productoId": "c8a4d2e1-...",
      "cantidad": 2
    }
  ]
}
```

La creación bloquea las filas de lotes candidatas con `SELECT ... FOR UPDATE`, siempre
en un orden determinista por producto/lote. La confirmación, cancelación y expiración
también bloquean la reserva y sus lotes dentro de una única transacción PostgreSQL.

#### Con portal y tienda separados
portal-api no descuenta stock: guarda la reserva y se la encarga a la tienda, que es la única
autoridad sobre el inventario (ver [ADR-003](docs/decisions/ADR-003-split-store-portal.md)).
Espera hasta `RESERVATION_SYNC_WAIT_SECONDS` (8 s por defecto) la respuesta y responde igual
que siempre:

* `201` con `codigoRetiro`, `fechaExpiracion` y `detalles` (lote, cantidad, precio y datos del
  producto) si la tienda aceptó la reserva.
* El error habitual si la rechazó: `409` sin stock suficiente, `400` (oferta no disponible o
  reserva vencida), `404` (producto inexistente) o `503` (la tienda no pudo procesarla).
* `202` con `"estado": "PENDIENTE_SYNC"` y sin `codigoRetiro` si la tienda tarda más. El
  cliente consulta `GET /reservations/user/:userId` hasta que pase a `PENDIENTE` (aceptada con
  su código) o `RECHAZADA` (con `motivoRechazo` y `mensajeRechazo`).
* `503` sin guardar nada si no hay un heartbeat vigente de la tienda.

Una reserva `PENDIENTE` cuyo plazo ya pasó, pero que la tienda todavía no marcó como vencida (por ejemplo,
porque está sin conexión), se devuelve con `"vencidaSinConfirmar": true`; su estado no cambia hasta que
la tienda lo informe.

Estados que puede ver el cliente: `PENDIENTE_SYNC`, `PENDIENTE`, `CONFIRMADA`, `EXPIRADA`,
`CANCELADA` y `RECHAZADA`. `POST /reservations/:id/cancel` cancela de inmediato; el stock se
libera cuando la tienda procesa el aviso. Si la reserva ya estaba confirmada en caja, el estado
real de la tienda prevalece. La consulta por código (`GET /reservations/code/:code`) solo
encuentra reservas aceptadas.
Esto evita sobreventa, dobles confirmaciones y liberaciones duplicadas bajo concurrencia.

### `POST /reservations/:id/confirm`
Confirma una reserva pendiente y descuenta el stock reservado. Requiere rol `BODEGUERO`
o `ADMIN`.

### `POST /reservations/:id/extend`
Extiende el plazo de una reserva pendiente. Solo el cliente propietario (`CLIENTE`). Cuerpo opcional:
`{ "minutosAdicionales": 30 }` (5 a 180). **Una reserva no puede durar más de 4 horas en total** desde que se creó; pasarse
responde `400`. Con portal y tienda separados el vencimiento lo fija la tienda: el portal le encarga un comando
`RESERVATION_EXTEND` y espera su respuesta unos segundos (`503` si no hay latido o la tienda no responde; no queda nada
pendiente). Pedir otra extensión mientras hay una en curso responde `409`. Al crear la reserva, `ttlMinutos` (15 a 240,
30 por defecto) permite elegir cuánto se guardan los productos.

### `POST /reservations/:id/cancel`
Libera el stock de una reserva pendiente. Solo puede ejecutarlo el cliente propietario o
un `ADMIN`.

### Expiración automática
El proceso periódico selecciona reservas vencidas mediante `FOR UPDATE SKIP LOCKED`,
libera el stock una sola vez y cambia su estado a `EXPIRADA` de forma atómica.
* **Respuesta (201 Created)**:
```json
{
  "success": true,
  "message": "Reserva de stock realizada con éxito. Presenta este código en caja SIACI para retirar tu compra.",
  "data": {
    "id": "r1a2b3c4-...",
    "codigoRetiro": "KR-X7Y9Z2",
    "estado": "PENDIENTE",
    "fechaExpiracion": "2026-08-24T02:22:00.000Z",
    "detalles": [
      {
        "loteId": "l9k8j7...",
        "cantidad": 2,
        "precioUnitario": 0.95
      }
    ]
  }
}
```

---

## 4. Alertas y SSE Stream en Tiempo Real (`/alerts`)

### `GET /alerts`
Obtiene las alertas de caducidad persistidas en la tabla `alertas_caducidad` (o calculadas dinámicamente según la política aprobada: `VENCIDO` ≤ 0 días, `ROJO` 1–6 días, `AMARILLO` 7–14 días).
* **Roles Autorizados**: `BODEGUERO`, `PERCHERO`, `ADMIN`
* **Query Params opcionales**:
  * `atendida`: `true` | `false`
  * `nivel`: `AMARILLO` | `ROJO` | `VENCIDO`
  * `limit`: número entero (por defecto 100)
  * `offset`: número entero (por defecto 0)

### `PATCH /alerts/:id/atender`
Marca una alerta de caducidad como atendida (`atendida = true`).
* **Roles Autorizados**: `BODEGUERO`, `PERCHERO`, `ADMIN`
* **Parámetros**: `id` (UUID de la alerta)
* **Respuesta**:
```json
{
  "success": true,
  "message": "Alerta marcada como atendida exitosamente.",
  "data": { "id": "...", "atendida": true, ... }
}
```

### `GET /alerts/stream` (Server-Sent Events)
Conexión de stream en tiempo real `text/event-stream` para empujar alertas a bodegueros y percheros.
* **Evento SSE**:
```text
data: {"tipo":"NUEVO_LOTE_CADUCIDAD_CERCANA","loteId":"...","numeroLote":"LOT-YG-2026-01","productoNombre":"Yogurt Griego","diasParaVencer":4,"nivel":"ROJO","ubicacion":"PERCHA"}
```

---

## 5. Promociones e IA Gemini (`/promotions` y `/metrics/ai`)

### Flujo de Aprobación Humana (Human-in-the-Loop)
1. **Generación**: Un usuario con rol `BODEGUERO`, `PERCHERO` o `ADMIN` solicita una promoción para un lote en alerta `ROJO` (1–6 días) o `AMARILLO` (7–14 días).
2. **Borrador PENDIENTE_APROBACION**: Gemini genera un descuento dentro de los límites estrictos (`ROJO`: 20–50%, `AMARILLO`: 5–30%). El registro se guarda con `estado = 'PENDIENTE_APROBACION'` y `activa = false`.
3. **Revisión y Aprobación**: Exclusivamente un `ADMIN` puede aprobar (`POST /promotions/:id/approve`) o rechazar (`POST /promotions/:id/reject`).
4. **Publicación**: El catálogo público (`GET /promotions`) únicamente muestra promociones con `estado = 'APROBADA'` y `activa = true`.

---

### `POST /promotions/generate`
Genera un borrador de promoción comercial mediante Google Gemini AI con salida estructurada, timeout de 10s y caché anti-stampede (15 min).
* **Roles Autorizados**: `BODEGUERO`, `PERCHERO`, `ADMIN`
* **Body**:
```json
{
  "loteId": "b9a8f7e6-1111-2222-3333-444455556666"
}
```
* **Respuesta (202 Accepted)**:
```json
{
  "success": true,
  "message": "Borrador de promoción generado. Pendiente de aprobación por ADMIN.",
  "data": {
    "id": "f8a9e7d6-c5b4-4321-8765-abcdef123456",
    "loteId": "b9a8f7e6-1111-2222-3333-444455556666",
    "descuentoPorcentaje": 30,
    "frasePromocional": "¡Oferta Relámpago! 30% de descuento en Leche Entera Vita.",
    "razonIa": "Lote con 4 días hasta caducidad, requiere rotación acelerada.",
    "activa": false,
    "estado": "PENDIENTE_APROBACION",
    "cacheHit": false,
    "created_at": "2026-10-09T15:30:00.000Z"
  }
}
```
* **Códigos de Error Controlados**:
  - `400`: Lote vencido, sin stock o fuera de alerta ROJO/AMARILLO.
  - `429`: Límite de cuota Gemini alcanzado (`GeminiRateLimit`).
  - `502`: Salida de IA fuera de esquema o error externo (`GeminiInvalidResponse`).
  - `503`: Gemini no configurado (`GeminiNotConfigured`).
  - `504`: Tiempo de espera excedido (`GeminiTimeout`, por defecto 10s).

---

### `GET /promotions`
Retorna el catálogo público de promociones comerciales.
* **Acceso**: Público (sin autenticación).
* **Filtro**: Solo promociones con `estado = 'APROBADA'` y `activa = true`.

---

### `GET /promotions/pending`
Lista todos los borradores de promociones generados por IA que están esperando decisión.
* **Roles Autorizados**: `ADMIN`
* **Respuesta (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "f8a9e7d6-c5b4-4321-8765-abcdef123456",
      "loteId": "b9a8f7e6-1111-2222-3333-444455556666",
      "descuentoPorcentaje": 30,
      "frasePromocional": "¡Oferta Relámpago! 30% de descuento en Leche Entera Vita.",
      "razonIa": "Lote en estado ROJO con 4 días restantes.",
      "estado": "PENDIENTE_APROBACION",
      "activa": false,
      "created_at": "2026-10-09T15:30:00.000Z"
    }
  ]
}
```

---

### `POST /promotions/:id/approve`
Aprueba un borrador y lo publica inmediatamente en el portal comercial.
* **Roles Autorizados**: `ADMIN`
* **Respuesta (200 OK)**:
```json
{
  "success": true,
  "message": "Promoción aprobada y publicada correctamente.",
  "data": {
    "id": "f8a9e7d6-c5b4-4321-8765-abcdef123456",
    "estado": "APROBADA",
    "activa": true,
    "aprobadaPor": "d8a7b6c5-1111-2222-3333-444455556668"
  }
}
```

---

### `POST /promotions/:id/reject`
Rechaza un borrador pendiente y registra el motivo.
* **Roles Autorizados**: `ADMIN`
* **Body**:
```json
{
  "motivoRechazo": "Descuento excesivo considerando el margen del producto."
}
```
* **Respuesta (200 OK)**:
```json
{
  "success": true,
  "message": "Promoción rechazada.",
  "data": {
    "id": "f8a9e7d6-c5b4-4321-8765-abcdef123456",
    "estado": "RECHAZADA",
    "activa": false,
    "rechazadaPor": "d8a7b6c5-1111-2222-3333-444455556668",
    "motivoRechazo": "Descuento excesivo considerando el margen del producto."
  }
}
```

---

### `GET /metrics/ai`
Obtiene métricas de observabilidad en memoria sobre la operación de Gemini y las promociones.
* **Roles Autorizados**: `ADMIN`
* **Respuesta (200 OK)**:
```json
{
  "success": true,
  "data": {
    "counters": {
      "gemini_requests_total": 12,
      "gemini_success_total": 8,
      "gemini_timeouts_total": 0,
      "gemini_cache_hits_total": 4,
      "gemini_cache_misses_total": 8,
      "promotions_pending_total": 8,
      "promotions_approved_total": 5,
      "promotions_rejected_total": 1
    },
    "errors": {
      "gemini_errors_total_RATE_LIMIT": 0
    },
    "gemini_latency": {
      "avg_ms": 1250,
      "max_ms": 2100,
      "count": 8
    },
    "uc_latency": {
      "avg_ms": 85,
      "max_ms": 2150,
      "count": 12
    },
    "collected_at": "2026-10-09T15:35:00.000Z"
  }
}
```
