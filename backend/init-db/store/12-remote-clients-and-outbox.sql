-- Reservas que llegan desde portal-api (ADR-003).
-- Los clientes viven en la base del portal, así que reservas.usuario_id deja de ser una clave
-- foránea hacia usuarios (el identificador del cliente es el mismo en ambos servicios) y se
-- guarda su nombre para mostrarlo en caja. Las reservas creadas por el personal local siguen
-- funcionando igual.
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_usuario_id_fkey;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(120);

-- Bandeja de salida hacia el portal: resultados de comandos y cambios de estado de reservas.
-- Se vacía en orden de id con reintentos y espera creciente, de modo que ningún evento se
-- pierde si el portal o la conexión caen. `clave` evita encolar dos veces el mismo hecho.
CREATE TABLE IF NOT EXISTS outbox_portal (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(40) NOT NULL,
    clave VARCHAR(120) NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enviado_at TIMESTAMPTZ,
    intentos INTEGER NOT NULL DEFAULT 0,
    proximo_intento_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_portal_pendiente
    ON outbox_portal (proximo_intento_at, id) WHERE enviado_at IS NULL;
