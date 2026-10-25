-- =============================================================================
-- DATOS DE DEMOSTRACIÓN - SOLO DESARROLLO
--
-- Incluye cuentas con contraseñas conocidas (admin@karen.com, bodega@karen.com y cliente@karen.com,
-- contraseña demo123). NUNCA debe aplicarse en producción: el compose de producción no lo monta, y
-- store-api se niega a arrancar en producción si esas cuentas existen con su contraseña de ejemplo.
-- Es idempotente: se puede aplicar varias veces sobre una base de desarrollo.
-- =============================================================================

-- DATOS INICIALES (SEEDS)
INSERT INTO categorias (id, nombre, descripcion) VALUES
('f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Lácteos y Derivados', 'Productos lácteos frescos y derivados pasteurizados'),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', 'Embutidos y Carnes', 'Carnes frías, embutidos y cortes empacados'),
('b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f', 'Bebidas y Jugos', 'Jugos naturales, refrescos y bebidas embotelladas')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO productos (id, categoria_id, codigo_barras, nombre, descripcion, precio_venta, min_stock_alerta) VALUES
('c8a4d2e1-1111-2222-3333-444455556666', 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '7861000100014', 'Leche Entera Vita 1 Litro', 'Leche pasteurizada UHT alta calidad', 0.95, 20),
('c8a4d2e1-1111-2222-3333-444455556667', 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '786999900018', 'Yogurt Griego Toni 500g', 'Yogurt natural griego descremado', 2.50, 15),
('c8a4d2e1-1111-2222-3333-444455556668', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', '7861234567898', 'Jamon Plumrose 250g', 'Jamón de pierna tajado', 3.20, 10)
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
