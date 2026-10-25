-- Copia en el portal de las unidades vendidas en los últimos 30 días por producto (las calcula la
-- tienda y llegan con la sección `productos` del catálogo). Alimenta el filtro "Más vendidos".
-- La fecha de alta del producto llega en created_at, que la sincronización sobrescribe con la real.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS vendidos_30d INTEGER NOT NULL DEFAULT 0;

ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_vendidos_30d_check;
ALTER TABLE productos ADD CONSTRAINT productos_vendidos_30d_check CHECK (vendidos_30d >= 0);
