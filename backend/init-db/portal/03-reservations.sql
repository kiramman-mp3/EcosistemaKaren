-- =============================================================================
-- RESERVAS Y COLA DE COMANDOS EN portal-api (ADR-003)
-- El portal recibe la reserva del cliente, la guarda como PENDIENTE_SYNC y encola un comando
-- para la tienda. La tienda es la única autoridad sobre el stock: asigna los lotes y responde
-- el resultado; el portal solo refleja su estado.
-- Es idempotente: en el monolito de transición estas tablas conviven sin usarse con las de la tienda.
-- =============================================================================

-- PENDIENTE_SYNC (esperando a la tienda) -> PENDIENTE (aceptada) -> CONFIRMADA | EXPIRADA | CANCELADA
-- PENDIENTE_SYNC -> RECHAZADA (la tienda no pudo reservar) | EXPIRADA | CANCELADA
CREATE TABLE IF NOT EXISTS reservas_portal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    estado VARCHAR(20) NOT NULL CHECK (estado IN (
        'PENDIENTE_SYNC', 'PENDIENTE', 'CONFIRMADA', 'EXPIRADA', 'CANCELADA', 'RECHAZADA'
    )),
    codigo_retiro VARCHAR(10) UNIQUE,
    fecha_expiracion TIMESTAMPTZ NOT NULL,
    items JSONB NOT NULL,
    detalles JSONB NOT NULL DEFAULT '[]'::jsonb,
    motivo_rechazo VARCHAR(20),
    mensaje_rechazo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservas_portal_cliente
    ON reservas_portal (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservas_portal_sync_expiracion
    ON reservas_portal (fecha_expiracion) WHERE estado = 'PENDIENTE_SYNC';

-- Cola durable de comandos hacia la tienda. `seq` fija el orden global; un comando solo se
-- entrega si no hay otro anterior sin resolver de la misma reserva (CREATE antes que CANCEL).
CREATE TABLE IF NOT EXISTS comandos_tienda (
    seq BIGSERIAL PRIMARY KEY,
    id UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('RESERVATION_CREATE', 'RESERVATION_CANCEL')),
    reserva_id UUID NOT NULL REFERENCES reservas_portal(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    estado VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ENTREGADO', 'RESUELTO')),
    intentos INTEGER NOT NULL DEFAULT 0,
    entregado_at TIMESTAMPTZ,
    resuelto_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comandos_tienda_cola
    ON comandos_tienda (seq) WHERE estado <> 'RESUELTO';
CREATE INDEX IF NOT EXISTS idx_comandos_tienda_reserva
    ON comandos_tienda (reserva_id, seq);
