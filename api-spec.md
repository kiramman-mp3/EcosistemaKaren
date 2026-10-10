# Especificación de API REST & SSE - Ecosistema Karen (Fase 1)

**Base URL**: `http://localhost:4000/api/v1`  
**Formato de Respuesta**: JSON (UTF-8)

---

## 0. Autenticación y autorización

`POST /auth/register` crea exclusivamente usuarios con rol `CLIENTE`, aunque el cuerpo
incluya otro rol. `POST /auth/login` entrega un JWT HS256 válido durante 24 horas. Los
endpoints protegidos requieren `Authorization: Bearer <token>`.

| Operación | Roles permitidos |
| --- | --- |
| Crear categorías o productos | `ADMIN` |
| Consultar lotes | `BODEGUERO`, `PERCHERO`, `ADMIN` |
| Ingresar lotes | `BODEGUERO`, `ADMIN` |
| Cambiar ubicación o registrar merma | `BODEGUERO`, `PERCHERO`, `ADMIN` |
| Crear reservas | `CLIENTE` |
| Consultar reservas | Propietario, `BODEGUERO`, `PERCHERO` o `ADMIN` |
| Cancelar reservas | Propietario o `ADMIN` |
| Confirmar reservas | `BODEGUERO`, `ADMIN` |
| Alertas y generación de promociones | `BODEGUERO`, `PERCHERO`, `ADMIN` |
| Registrar heartbeat | `BODEGUERO`, `ADMIN` |

El catálogo, las promociones activas, el heartbeat de lectura y `GET /availability`
son públicos. Este último solo expone identificador de lote/producto, fecha, estado y
cantidad disponible; excluye lotes vencidos o sin disponibilidad.

El servidor inicia con las reservas bloqueadas. `POST /heartbeat` debe ser enviado por
la aplicación operativa y permanece vigente durante 60 segundos por defecto. Si nunca se
ha recibido un latido o el último superó `HEARTBEAT_TIMEOUT_SECONDS`, `POST /reservations`
responde `503 Service Unavailable` sin modificar el inventario.

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
      "minStockAlerta": 20
    }
  ]
}
```

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
  "ubicacion": "BODEGA"
}
```

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

---

## 3. Reservaciones de Stock Anti-Overbooking (`/reservations`)

### `POST /reservations`
Crea una reserva de stock temporal con temporizador TTL (10 minutos) usando asignación FEFO.
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
Esto evita sobreventa, dobles confirmaciones y liberaciones duplicadas bajo concurrencia.

### `POST /reservations/:id/confirm`
Confirma una reserva pendiente y descuenta el stock reservado. Requiere rol `BODEGUERO`
o `ADMIN`.

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
Obtiene las alertas estáticas calculadas con la política aprobada: `VENCIDO` ≤ 0 días,
`ROJO` de 1 a 6 días, `AMARILLO` de 7 a 14 días y `NORMAL` desde 15 días.

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
