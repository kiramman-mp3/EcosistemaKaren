-- Límites reales de una oferta, que define el ADMIN al revisar el borrador. Los tres son opcionales:
-- sin valor, la oferta cubre todo el lote y dura hasta que el lote caduque (como antes).
--   limite_por_pedido: unidades de la oferta que admite una sola reserva.
--   stock_oferta:      unidades del lote que se venden con descuento, sumando todas las reservas.
--   vigente_hasta:     fecha y hora en que la oferta deja de aplicarse.
ALTER TABLE promociones_ia
    ADD COLUMN IF NOT EXISTS limite_por_pedido INTEGER,
    ADD COLUMN IF NOT EXISTS stock_oferta INTEGER,
    ADD COLUMN IF NOT EXISTS vigente_hasta TIMESTAMPTZ;

ALTER TABLE promociones_ia DROP CONSTRAINT IF EXISTS promociones_ia_limite_por_pedido_check;
ALTER TABLE promociones_ia ADD CONSTRAINT promociones_ia_limite_por_pedido_check
    CHECK (limite_por_pedido IS NULL OR limite_por_pedido BETWEEN 1 AND 100000);

ALTER TABLE promociones_ia DROP CONSTRAINT IF EXISTS promociones_ia_stock_oferta_check;
ALTER TABLE promociones_ia ADD CONSTRAINT promociones_ia_stock_oferta_check
    CHECK (stock_oferta IS NULL OR stock_oferta BETWEEN 1 AND 100000);

ALTER TABLE promociones_ia DROP CONSTRAINT IF EXISTS promociones_ia_limite_stock_check;
ALTER TABLE promociones_ia ADD CONSTRAINT promociones_ia_limite_stock_check
    CHECK (limite_por_pedido IS NULL OR stock_oferta IS NULL OR limite_por_pedido <= stock_oferta);

-- Cada línea reservada con descuento recuerda su oferta: así se cuentan las unidades de oferta ya
-- comprometidas (reservas pendientes o confirmadas) contra stock_oferta.
ALTER TABLE reserva_detalles
    ADD COLUMN IF NOT EXISTS promocion_id UUID REFERENCES promociones_ia(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reserva_detalles_promocion
    ON reserva_detalles (promocion_id) WHERE promocion_id IS NOT NULL;
