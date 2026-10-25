-- =============================================================================
-- COPIA DE LAS FOTOS DE PRODUCTOS EN portal-api (ADR-003)
-- La tienda sube cada foto a POST/PUT /internal/v1/store/sync/media y el portal la sirve en
-- /api/v1/media/productos/<nombre>, de modo que los clientes ven las imágenes sin llegar a la red local
-- de la tienda. Guardarlas en la base evita depender de un disco compartido o persistente en el portal.
-- Es idempotente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS media_archivos (
    ruta VARCHAR(200) PRIMARY KEY,
    tipo_contenido VARCHAR(50) NOT NULL,
    tamano_bytes INTEGER NOT NULL CHECK (tamano_bytes > 0),
    sha256 CHAR(64) NOT NULL,
    datos BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
