-- Bitácora de cambios del PVP (precio_venta). Solo el ADMIN lo cambia, de forma explícita: desde el
-- catálogo (MANUAL) o al ingresar un lote (INGRESO_LOTE, en la misma transacción que el lote).
-- Las reservas no se ven afectadas: cada detalle guarda su propio precio_unitario.
CREATE TABLE IF NOT EXISTS productos_precio_historial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    precio_anterior NUMERIC(10,2) NOT NULL CHECK (precio_anterior > 0),
    precio_nuevo NUMERIC(10,2) NOT NULL CHECK (precio_nuevo > 0),
    origen VARCHAR(20) NOT NULL CHECK (origen IN ('MANUAL', 'INGRESO_LOTE')),
    lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (precio_anterior <> precio_nuevo)
);

CREATE INDEX IF NOT EXISTS idx_precio_historial_producto
    ON productos_precio_historial (producto_id, created_at DESC);
