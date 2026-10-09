-- Endurecimiento idempotente para instalaciones que ya aplicaron la migración 02.
ALTER TABLE promociones_ia
    DROP CONSTRAINT IF EXISTS promociones_ia_motivo_rechazo_length_check;

ALTER TABLE promociones_ia
    ADD CONSTRAINT promociones_ia_motivo_rechazo_length_check
    CHECK (motivo_rechazo IS NULL OR char_length(motivo_rechazo) <= 500);

WITH ranked AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY lote_id
               ORDER BY aprobada_at DESC NULLS LAST, created_at DESC, id DESC
           ) AS position
    FROM promociones_ia
    WHERE estado = 'APROBADA' AND activa = TRUE
)
UPDATE promociones_ia pi
SET activa = FALSE
FROM ranked r
WHERE pi.id = r.id AND r.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_promo_lote_aprobada_activa
    ON promociones_ia (lote_id)
    WHERE estado = 'APROBADA' AND activa = TRUE;
