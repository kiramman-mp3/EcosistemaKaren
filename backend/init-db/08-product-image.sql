-- Imagen referencial del producto. Puede ser una ruta servida por el backend
-- (/api/v1/media/...) o una URL absoluta externa.
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);
