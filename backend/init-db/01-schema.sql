-- =============================================================================
-- ESQUEMA DDL Y DATOS INICIALES - ECOSISTEMA KAREN (FASE 1)
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

-- DATOS INICIALES (SEEDS)
INSERT INTO categorias (id, nombre, descripcion) VALUES
('f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Lácteos y Derivados', 'Productos lácteos frescos y derivados pasteurizados'),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', 'Embutidos y Carnes', 'Carnes frías, embutidos y cortes empacados'),
('b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f', 'Bebidas y Jugos', 'Jugos naturales, refrescos y bebidas embotelladas')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO productos (id, categoria_id, codigo_barras, nombre, descripcion, precio_venta, min_stock_alerta) VALUES
('c8a4d2e1-1111-2222-3333-444455556666', 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '7861000100011', 'Leche Entera Vita 1 Litro', 'Leche pasteurizada UHT alta calidad', 0.95, 20),
('c8a4d2e1-1111-2222-3333-444455556667', 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '786999900011', 'Yogurt Griego Toni 500g', 'Yogurt natural griego descremado', 2.50, 15),
('c8a4d2e1-1111-2222-3333-444455556668', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', '7861234567890', 'Jamon Plumrose 250g', 'Jamón de pierna tajado', 3.20, 10)
ON CONFLICT (codigo_barras) DO NOTHING;

INSERT INTO usuarios (id, nombre, email, rol, password_hash) VALUES
('d8a7b6c5-1111-2222-3333-444455556666', 'Cliente Demo', 'cliente@karen.com', 'CLIENTE', '$2a$10$Ndinx2G0HgZgjtc4N3Q4B.2dHgih47xC7LtiJ.if4rsg3wp/RMtP.'),
('d8a7b6c5-1111-2222-3333-444455556667', 'Nancy Alvares (Bodega)', 'bodega@karen.com', 'BODEGUERO', '$2a$10$Ndinx2G0HgZgjtc4N3Q4B.2dHgih47xC7LtiJ.if4rsg3wp/RMtP.'),
('d8a7b6c5-1111-2222-3333-444455556668', 'Admin Supermercado', 'admin@karen.com', 'ADMIN', '$2a$10$Ndinx2G0HgZgjtc4N3Q4B.2dHgih47xC7LtiJ.if4rsg3wp/RMtP.')
ON CONFLICT (email) DO NOTHING;

-- Lotes demo: ROJO (4 días), AMARILLO (12 días) y NORMAL (30 días).
INSERT INTO lotes
  (id, producto_id, numero_lote, fecha_elaboracion, fecha_caducidad, costo_unitario,
   cantidad_ingresada, cantidad_disponible, cantidad_reservada, ubicacion, estado)
VALUES
('b9a8f7e6-1111-2222-3333-444455556666', 'c8a4d2e1-1111-2222-3333-444455556667', 'LOT-YG-DEMO-01', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', 1.7500, 50, 45, 0, 'PERCHA', 'ACTIVO'),
('b9a8f7e6-1111-2222-3333-444455556667', 'c8a4d2e1-1111-2222-3333-444455556666', 'LOT-VT-DEMO-02', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '12 days', 0.6800, 100, 90, 0, 'BODEGA', 'ACTIVO'),
('b9a8f7e6-1111-2222-3333-444455556668', 'c8a4d2e1-1111-2222-3333-444455556668', 'LOT-PL-DEMO-03', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '30 days', 2.2400, 40, 40, 0, 'BODEGA', 'ACTIVO')
ON CONFLICT (id) DO NOTHING;
