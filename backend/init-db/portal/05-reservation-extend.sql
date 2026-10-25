-- =============================================================================
-- EXTENDER EL PLAZO DE UNA RESERVA (portal-api, ADR-003)
-- El vencimiento de una reserva lo decide la tienda (es quien libera el stock al expirar), así que
-- el portal le encarga la extensión con un comando nuevo, RESERVATION_EXTEND. `resultado` guarda lo
-- que respondió la tienda para que el portal pueda informar al cliente por qué se rechazó.
-- Es idempotente.
-- =============================================================================

ALTER TABLE comandos_tienda DROP CONSTRAINT IF EXISTS comandos_tienda_tipo_check;
ALTER TABLE comandos_tienda ADD CONSTRAINT comandos_tienda_tipo_check
    CHECK (tipo IN ('RESERVATION_CREATE', 'RESERVATION_CANCEL', 'RESERVATION_EXTEND'));

ALTER TABLE comandos_tienda ADD COLUMN IF NOT EXISTS resultado JSONB;
