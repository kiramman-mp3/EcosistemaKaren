// Unidades de una oferta ya comprometidas: las de reservas pendientes o confirmadas cuyas líneas se
// tomaron con ese descuento (reserva_detalles.promocion_id). Las vencidas o canceladas devuelven sus
// unidades a la oferta. Lo usan la reserva (para no pasar stock_oferta), el catálogo de la tienda y
// el snapshot que se envía al portal, para que todos cuenten igual.

/** LEFT JOIN que expone `comprometidas.total` para la tabla `promociones_ia pi`. */
const OFFER_COMMITTED_JOIN = `
  LEFT JOIN (
    SELECT rd.promocion_id, SUM(rd.cantidad)::int AS total
    FROM reserva_detalles rd
    JOIN reservas r ON r.id = rd.reserva_id
    WHERE rd.promocion_id IS NOT NULL AND r.estado IN ('PENDIENTE', 'CONFIRMADA')
    GROUP BY rd.promocion_id
  ) comprometidas ON comprometidas.promocion_id = pi.id`;

/**
 * Unidades con descuento que quedan; NULL si la oferta no tiene stock propio (vale todo el lote).
 * El CASE hace falta: GREATEST ignora los NULL y daría 0 (agotada) a una oferta sin tope.
 */
const OFFER_REMAINING_COLUMN = `(CASE WHEN pi.stock_oferta IS NULL THEN NULL
  ELSE GREATEST(pi.stock_oferta - COALESCE(comprometidas.total, 0), 0) END)`;

/** Condición de una oferta vigente: sin fecha de fin o con la fecha de fin en el futuro. */
const OFFER_IN_FORCE = '(pi.vigente_hasta IS NULL OR pi.vigente_hasta > CURRENT_TIMESTAMP)';

module.exports = { OFFER_COMMITTED_JOIN, OFFER_REMAINING_COLUMN, OFFER_IN_FORCE };
