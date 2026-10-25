-- =============================================================================
-- ESQUEMA DDL INICIAL - ECOSISTEMA KAREN (FASE 1)
-- Los datos de demostración (cuentas, productos y lotes de ejemplo) NO van aquí: ver init-db/dev/01-demo-data.sql.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('CLIENTE', 'BODEGUERO', 'PERCHERO', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ubicacion_lote AS ENUM ('BODEGA', 'PERCHA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_lote AS ENUM ('ACTIVO', 'VENCIDO', 'AGOTADO', 'MERMA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_reserva AS ENUM ('PENDIENTE', 'CONFIRMADA', 'EXPIRADA', 'CANCELADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE nivel_alerta AS ENUM ('AMARILLO', 'ROJO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TABLAS
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    codigo_barras VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_venta NUMERIC(10,2) NOT NULL CHECK (precio_venta > 0),
    impuesto_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (impuesto_porcentaje >= 0 AND impuesto_porcentaje <= 100),
    min_stock_alerta INTEGER NOT NULL DEFAULT 10 CHECK (min_stock_alerta >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    numero_lote VARCHAR(50) NOT NULL,
    fecha_elaboracion DATE,
    fecha_caducidad DATE NOT NULL,
    costo_unitario NUMERIC(12,4) CHECK (costo_unitario IS NULL OR costo_unitario > 0),
    cantidad_ingresada INTEGER NOT NULL CHECK (cantidad_ingresada >= 0),
    cantidad_disponible INTEGER NOT NULL CHECK (cantidad_disponible >= 0),
    cantidad_reservada INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_reservada >= 0),
    ubicacion ubicacion_lote NOT NULL DEFAULT 'BODEGA',
    estado estado_lote NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (fecha_elaboracion IS NULL OR fecha_elaboracion < fecha_caducidad)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    rol rol_usuario NOT NULL DEFAULT 'CLIENTE',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    codigo_retiro VARCHAR(10) NOT NULL UNIQUE,
    estado estado_reserva NOT NULL DEFAULT 'PENDIENTE',
    fecha_expiracion TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reserva_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario > 0)
);

CREATE TABLE IF NOT EXISTS alertas_caducidad (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    dias_para_vencer INTEGER NOT NULL,
    nivel nivel_alerta NOT NULL,
    atendida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promociones_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    descuento_porcentaje NUMERIC(5,2) NOT NULL CHECK (descuento_porcentaje BETWEEN 1 AND 90),
    frase_promocional TEXT NOT NULL,
    razon_ia TEXT,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_lotes_caducidad_estado ON lotes (fecha_caducidad ASC, estado, cantidad_disponible) WHERE estado = 'ACTIVO';
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos (codigo_barras);
CREATE INDEX IF NOT EXISTS idx_reservas_expiracion ON reservas (estado, fecha_expiracion) WHERE estado = 'PENDIENTE';
CREATE INDEX IF NOT EXISTS idx_lotes_producto_ubicacion ON lotes (producto_id, ubicacion, fecha_caducidad ASC);
