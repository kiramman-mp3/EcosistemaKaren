ALTER TABLE productos
ADD COLUMN IF NOT EXISTS impuesto_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_impuesto_porcentaje_check;
ALTER TABLE productos
ADD CONSTRAINT productos_impuesto_porcentaje_check
CHECK (impuesto_porcentaje >= 0 AND impuesto_porcentaje <= 100);
