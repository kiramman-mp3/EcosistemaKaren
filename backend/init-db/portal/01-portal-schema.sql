-- =============================================================================
-- ESQUEMA DE portal-api - ECOSISTEMA KAREN (ADR-003)
-- Base de datos de la nube: clientes, sesiones, límites de tasa y estado de la tienda.
-- Es idempotente: en el monolito de transición comparte base con el esquema de la tienda.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('CLIENTE', 'BODEGUERO', 'PERCHERO', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Clientes del portal. Las cuentas del personal viven en la base de la tienda.
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    rol rol_usuario NOT NULL DEFAULT 'CLIENTE',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Revocación de tokens JWT (cierre de sesión)
CREATE TABLE IF NOT EXISTS tokens_revocados (
    jti VARCHAR(100) PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    expira_en TIMESTAMPTZ NOT NULL,
    revocado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_revocados_expira ON tokens_revocados(expira_en);

-- Último latido recibido de la tienda (POST /internal/v1/store/heartbeat)
CREATE TABLE IF NOT EXISTS tienda_heartbeat (
    id INT PRIMARY KEY DEFAULT 1,
    last_heartbeat_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting distribuido entre réplicas
CREATE TABLE IF NOT EXISTS rate_limit_hits (
    key VARCHAR(255) PRIMARY KEY,
    hits INTEGER NOT NULL DEFAULT 1,
    reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_reset ON rate_limit_hits(reset_at);
