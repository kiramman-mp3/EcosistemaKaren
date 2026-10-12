-- Modelo de costos, elaboración y trazabilidad de inventario.
-- Los campos permanecen NULL únicamente para lotes históricos cuyo dato real
-- no puede inferirse de manera segura. Todo lote nuevo los exige en la API.
ALTER TABLE lotes
    ADD COLUMN IF NOT EXISTS fecha_elaboracion DATE,
    ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(12,4);

ALTER TABLE lotes
    DROP CONSTRAINT IF EXISTS lotes_fechas_validas_check;
ALTER TABLE lotes
    ADD CONSTRAINT lotes_fechas_validas_check
    CHECK (fecha_elaboracion IS NULL OR fecha_elaboracion < fecha_caducidad);

ALTER TABLE lotes
    DROP CONSTRAINT IF EXISTS lotes_costo_unitario_check;
ALTER TABLE lotes
    ADD CONSTRAINT lotes_costo_unitario_check
    CHECK (costo_unitario IS NULL OR costo_unitario > 0);

CREATE TABLE IF NOT EXISTS inventario_movimientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE RESTRICT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
        'INGRESO', 'TRASLADO', 'MERMA', 'RESERVA',
        'LIBERACION', 'VENTA', 'VENCIMIENTO', 'AJUSTE'
    )),
    cantidad INTEGER NOT NULL CHECK (cantidad >= 0),
    disponible_antes INTEGER NOT NULL CHECK (disponible_antes >= 0),
    disponible_despues INTEGER NOT NULL CHECK (disponible_despues >= 0),
    reservada_antes INTEGER NOT NULL CHECK (reservada_antes >= 0),
    reservada_despues INTEGER NOT NULL CHECK (reservada_despues >= 0),
    ubicacion_origen ubicacion_lote,
    ubicacion_destino ubicacion_lote,
    motivo VARCHAR(500),
    actor_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    reserva_id UUID REFERENCES reservas(id) ON DELETE RESTRICT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mermas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE RESTRICT,
    movimiento_id UUID NOT NULL UNIQUE REFERENCES inventario_movimientos(id) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    razon VARCHAR(500) NOT NULL CHECK (length(trim(razon)) BETWEEN 3 AND 500),
    costo_unitario NUMERIC(12,4),
    costo_total NUMERIC(14,4),
    registrada_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (costo_unitario IS NULL OR costo_unitario > 0),
    CHECK (costo_total IS NULL OR costo_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_movimientos_lote_fecha
    ON inventario_movimientos (lote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_actor_fecha
    ON inventario_movimientos (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo_fecha
    ON inventario_movimientos (tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mermas_lote_fecha
    ON mermas (lote_id, created_at DESC);

COMMENT ON TABLE inventario_movimientos IS
'Libro inmutable de cambios de inventario y ubicación. Cada fila representa el saldo antes y después de una operación autorizada.';
COMMENT ON TABLE mermas IS
'Detalle auditable de bajas de inventario, vinculado al movimiento atómico que afectó el lote.';
