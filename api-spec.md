# Especificación de API REST & SSE - Ecosistema Karen (Fase 1)

**Base URL**: `http://localhost:4000/api/v1`  
**Formato de Respuesta**: JSON (UTF-8)

---

## 1. Productos (`/products`)

### `GET /products`
Obtiene el catálogo completo de productos con datos de categoría.
* **Respuesta (200 OK)**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "c8a4d2e1-...",
      "categoriaId": "f1b2c3...",
      "codigoBarras": "7861000100011",
      "nombre": "Leche Entera Vita 1 Litro",
      "descripcion": "Leche pasteurizada UHT",
      "precioVenta": 0.95,
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
  "codigoBarras": "786999900011",
  "nombre": "Queso Crema Toni 200g",
  "descripcion": "Queso untable",
  "precioVenta": 1.95,
  "minStockAlerta": 10
}
```

---

## 2. Lotes e Inventarios (`/lots`)

### `GET /lots`
Lista todos los lotes de producción activos con información de producto y ubicación.

### `POST /lots`
Registra un nuevo lote de producto recibido en bodega.
* **Body Payload**:
```json
{
  "productoId": "c8a4d2e1-...",
  "numeroLote": "LOT-QC-2026-99",
  "fechaCaducidad": "2026-09-05",
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

---

## 3. Reservaciones de Stock Anti-Overbooking (`/reservations`)

### `POST /reservations`
Crea una reserva de stock temporal con temporizador TTL (10 minutos) usando asignación FEFO.
* **Body Payload**:
```json
{
  "usuarioId": "u8a7b6c5-...",
  "items": [
    {
      "productoId": "c8a4d2e1-...",
      "cantidad": 2
    }
  ]
}
```
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
Obtiene las alertas estáticas calculadas (< 15 días AMARILLO, < 7 días ROJO).

### `GET /alerts/stream` (Server-Sent Events)
Conexión de stream en tiempo real `text/event-stream` para empujar alertas a bodegueros y percheros.
* **Evento SSE**:
```text
data: {"tipo":"NUEVO_LOTE_CADUCIDAD_CERCANA","loteId":"...","numeroLote":"LOT-YG-2026-01","productoNombre":"Yogurt Griego","diasParaVencer":4,"nivel":"ROJO","ubicacion":"PERCHA"}
```

---

## 5. Promociones e IA Gemini (`/promotions`)

### `POST /promotions/generate`
Invoca la API de Gemini para analizar un lote cercano a vencer y generar una oferta comercial.
* **Body Payload**:
```json
{
  "loteId": "l9k8j7..."
}
```
* **Respuesta (200 OK)**:
```json
{
  "success": true,
  "message": "Promoción comercial generada exitosamente con Gemini AI.",
  "data": {
    "loteId": "l9k8j7...",
    "descuentoPorcentaje": 35,
    "frasePromocional": "¡Oferta Relámpago! 35% de descuento en Yogurt Griego 500g.",
    "razonIa": "Lote con 4 días para caducar con 45 unidades disponible."
  }
}
```

### `GET /promotions`
Retorna las promociones activas para el catálogo de clientes.
