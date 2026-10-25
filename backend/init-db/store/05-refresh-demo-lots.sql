-- Repara exclusivamente los tres lotes seed en instalaciones existentes.
-- No modifica lotes creados por usuarios ni reinicia sus cantidades.
WITH desired (id, numero_lote, elaboracion, caducidad, costo) AS (
    VALUES
      ('b9a8f7e6-1111-2222-3333-444455556666'::uuid, 'LOT-YG-DEMO-01', CURRENT_DATE - 3, CURRENT_DATE + 4, 1.7500::numeric),
      ('b9a8f7e6-1111-2222-3333-444455556667'::uuid, 'LOT-VT-DEMO-02', CURRENT_DATE - 5, CURRENT_DATE + 12, 0.6800::numeric),
      ('b9a8f7e6-1111-2222-3333-444455556668'::uuid, 'LOT-PL-DEMO-03', CURRENT_DATE - 7, CURRENT_DATE + 30, 2.2400::numeric)
), changed AS (
    UPDATE lotes l
       SET numero_lote = d.numero_lote,
           fecha_elaboracion = d.elaboracion,
           fecha_caducidad = d.caducidad,
           costo_unitario = d.costo,
           estado = CASE
             WHEN l.cantidad_disponible > 0 OR l.cantidad_reservada > 0 THEN 'ACTIVO'::estado_lote
             ELSE 'AGOTADO'::estado_lote
           END,
           updated_at = CURRENT_TIMESTAMP
      FROM desired d
     WHERE l.id = d.id
       AND (
         l.numero_lote IS DISTINCT FROM d.numero_lote OR
         l.fecha_elaboracion IS DISTINCT FROM d.elaboracion OR
         l.fecha_caducidad IS DISTINCT FROM d.caducidad OR
         l.costo_unitario IS DISTINCT FROM d.costo OR
         l.estado = 'VENCIDO'
       )
    RETURNING l.id, l.cantidad_disponible, l.cantidad_reservada, l.ubicacion
)
INSERT INTO inventario_movimientos
  (lote_id, tipo, cantidad, disponible_antes, disponible_despues,
   reservada_antes, reservada_despues, ubicacion_origen, ubicacion_destino,
   motivo, metadata)
SELECT id, 'AJUSTE', 0, cantidad_disponible, cantidad_disponible,
       cantidad_reservada, cantidad_reservada, ubicacion, ubicacion,
       'Actualización controlada de fechas relativas de lotes demo',
       '{"origen":"migracion_005","solo_datos_demo":true}'::jsonb
  FROM changed;
