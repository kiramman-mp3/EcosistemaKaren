// Unidades vendidas por producto en los últimos 30 días, según el libro de movimientos de la tienda
// (VENTA = reserva retirada y pagada en caja). Lo usan el snapshot del catálogo que se envía al
// portal y el catálogo que la tienda (o el monolito) sirve directamente, para que ambos cuenten igual.
const SALES_WINDOW_DAYS = 30;

/** LEFT JOIN que expone `ventas.total` para la tabla `productos p`. */
const RECENT_SALES_JOIN = `
  LEFT JOIN (
    SELECT l.producto_id, SUM(m.cantidad)::int AS total
    FROM inventario_movimientos m
    JOIN lotes l ON l.id = m.lote_id
    WHERE m.tipo = 'VENTA' AND m.created_at >= CURRENT_TIMESTAMP - INTERVAL '${SALES_WINDOW_DAYS} days'
    GROUP BY l.producto_id
  ) ventas ON ventas.producto_id = p.id`;

const RECENT_SALES_COLUMN = 'COALESCE(ventas.total, 0)::int';

module.exports = { SALES_WINDOW_DAYS, RECENT_SALES_JOIN, RECENT_SALES_COLUMN };
