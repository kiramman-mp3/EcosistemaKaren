-- =============================================================================
-- MIGRACIÓN 02: Flujo de Aprobación de Promociones IA
-- Ecosistema Karen - Fase 1
-- =============================================================================

-- Nuevo ENUM para el estado de la promoción
DO $$ BEGIN
    CREATE TYPE estado_promocion AS ENUM (
        'PENDIENTE_APROBACION',
        'APROBADA',
        'RECHAZADA'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Añadir nuevas columnas a promociones_ia
ALTER TABLE promociones_ia
    ADD COLUMN IF NOT EXISTS estado estado_promocion NOT NULL DEFAULT 'PENDIENTE_APROBACION',
    ADD COLUMN IF NOT EXISTS aprobada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS aprobada_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rechazada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rechazada_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
    ADD COLUMN IF NOT EXISTS modelo_ia VARCHAR(100),
    ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cache_key VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN NOT NULL DEFAULT FALSE;

-- Ajustar descuento a los límites correctos: 5–50%
ALTER TABLE promociones_ia
    DROP CONSTRAINT IF EXISTS promociones_ia_descuento_porcentaje_check;

ALTER TABLE promociones_ia
    ADD CONSTRAINT promociones_ia_descuento_porcentaje_check
    CHECK (descuento_porcentaje BETWEEN 5 AND 50);

ALTER TABLE promociones_ia
    DROP CONSTRAINT IF EXISTS promociones_ia_motivo_rechazo_length_check;

ALTER TABLE promociones_ia
    ADD CONSTRAINT promociones_ia_motivo_rechazo_length_check
    CHECK (motivo_rechazo IS NULL OR char_length(motivo_rechazo) <= 500);

-- Restricción de unicidad para evitar duplicados concurrentes
-- Un mismo lote no puede tener dos borradores pendientes con la misma clave de caché
CREATE UNIQUE INDEX IF NOT EXISTS uidx_promo_lote_cache_pendiente
    ON promociones_ia (lote_id, cache_key)
    WHERE estado = 'PENDIENTE_APROBACION';

-- Índices de consulta frecuente
CREATE INDEX IF NOT EXISTS idx_promo_estado
    ON promociones_ia (estado, activa, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_lote_estado
    ON promociones_ia (lote_id, estado);

-- Las promociones previamente activas pasan a APROBADA antes de imponer la
-- unicidad de publicación por lote.
UPDATE promociones_ia
SET estado = 'APROBADA',
    activa = TRUE
WHERE estado = 'PENDIENTE_APROBACION'
  AND activa = TRUE;

-- Mantener una sola promoción publicada por lote. Si existieran datos previos
-- duplicados, se conserva activa únicamente la aprobación más reciente.
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

COMMENT ON TABLE promociones_ia IS
'Promociones generadas por Gemini AI. Requieren aprobación de ADMIN antes de publicarse.';

COMMENT ON COLUMN promociones_ia.estado IS
'PENDIENTE_APROBACION: borrador generado por IA. APROBADA: visible al cliente. RECHAZADA: descartada.';

COMMENT ON COLUMN promociones_ia.cache_key IS
'Clave de caché: hash basado en loteId+fechaCaducidad+cantidadDisponible+precioVenta+promptVersion+modeloIa.';
