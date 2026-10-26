-- Copia en el portal de los límites de cada oferta (los define el ADMIN en la tienda y llegan con la
-- sección `promociones` del catálogo). unidades_restantes la calcula la tienda: stock de oferta menos
-- las unidades ya reservadas o vendidas con descuento. NULL = sin tope.
-- La tienda decide siempre al reservar; estos datos solo guían al cliente.
ALTER TABLE promociones_ia
    ADD COLUMN IF NOT EXISTS limite_por_pedido INTEGER,
    ADD COLUMN IF NOT EXISTS stock_oferta INTEGER,
    ADD COLUMN IF NOT EXISTS vigente_hasta TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS unidades_restantes INTEGER;

ALTER TABLE promociones_ia DROP CONSTRAINT IF EXISTS promociones_ia_unidades_restantes_check;
ALTER TABLE promociones_ia ADD CONSTRAINT promociones_ia_unidades_restantes_check
    CHECK (unidades_restantes IS NULL OR unidades_restantes >= 0);
