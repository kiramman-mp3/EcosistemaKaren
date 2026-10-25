-- =============================================================================
-- COPIA DE LECTURA DEL CATÁLOGO EN portal-api (ADR-003)
-- store-api publica snapshots por sección (POST /internal/v1/store/sync/catalog) y el portal
-- los reemplaza. Las tablas tienen el mismo nombre y forma que las de la tienda para que los
-- repositorios de lectura funcionen sin cambios. Solo se sincronizan los datos públicos:
-- costos, ubicaciones, fechas de elaboración y metadatos de IA quedan vacíos o con valores
-- por defecto.
-- Es idempotente: en el monolito de transición las tablas de la tienda ya existen y se conservan.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY,
    categoria_id UUID NOT NULL,
    codigo_barras VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_venta NUMERIC(10,2) NOT NULL,
    impuesto_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
    min_stock_alerta INTEGER NOT NULL DEFAULT 0,
    imagen_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Solo lotes vigentes con existencias; el resto se elimina de la copia en cada snapshot.
CREATE TABLE IF NOT EXISTS lotes (
    id UUID PRIMARY KEY,
    producto_id UUID NOT NULL,
    numero_lote VARCHAR(50) NOT NULL,
    fecha_elaboracion DATE,
    fecha_caducidad DATE NOT NULL,
    costo_unitario NUMERIC(12,4),
    cantidad_ingresada INTEGER NOT NULL,
    cantidad_disponible INTEGER NOT NULL,
    cantidad_reservada INTEGER NOT NULL DEFAULT 0,
    ubicacion VARCHAR(20) NOT NULL DEFAULT 'BODEGA',
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Solo promociones aprobadas y activas.
CREATE TABLE IF NOT EXISTS promociones_ia (
    id UUID PRIMARY KEY,
    lote_id UUID NOT NULL,
    descuento_porcentaje NUMERIC(5,2) NOT NULL,
    frase_promocional TEXT NOT NULL,
    razon_ia TEXT,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    estado VARCHAR(30) NOT NULL DEFAULT 'APROBADA',
    modelo_ia VARCHAR(80),
    prompt_version VARCHAR(40),
    cache_key VARCHAR(128),
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    aprobada_por UUID,
    aprobada_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Última versión aplicada de cada sección: descarta snapshots viejos que lleguen desordenados
-- y permite saber si la copia está desactualizada.
CREATE TABLE IF NOT EXISTS sync_estado (
    seccion VARCHAR(30) PRIMARY KEY,
    version BIGINT NOT NULL,
    elementos INTEGER NOT NULL,
    sincronizado_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
