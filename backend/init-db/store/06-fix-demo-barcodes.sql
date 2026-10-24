-- Corrige únicamente los GTIN de los tres productos demo para que sus
-- dígitos verificadores sean válidos y puedan probarse con el escáner.
UPDATE productos AS product
   SET codigo_barras = desired.codigo_barras,
       updated_at = CURRENT_TIMESTAMP
  FROM (VALUES
    ('c8a4d2e1-1111-2222-3333-444455556666'::uuid, '7861000100014'),
    ('c8a4d2e1-1111-2222-3333-444455556667'::uuid, '786999900018'),
    ('c8a4d2e1-1111-2222-3333-444455556668'::uuid, '7861234567898')
  ) AS desired(id, codigo_barras)
 WHERE product.id = desired.id
   AND product.codigo_barras IS DISTINCT FROM desired.codigo_barras;
