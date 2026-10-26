const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config();

const Product = require('../src/domain/entities/Product');
const { getPool } = require('../src/infrastructure/db/postgres');
const { PostgresProductRepository } = require('../src/adapters/repositories/PostgresRepositories');
const PostgresCatalogSnapshotReader = require('../src/infrastructure/sync/PostgresCatalogSnapshotReader');

test('el producto expone sus ventas de 30 días como un entero no negativo', () => {
  const base = { codigoBarras: '7861000000001', nombre: 'Arroz', precioVenta: 1.1 };
  assert.equal(new Product(base).vendidos30d, 0);
  assert.equal(new Product({ ...base, vendidos30d: '17' }).vendidos30d, 17);
  assert.equal(new Product({ ...base, vendidos30d: -3 }).vendidos30d, 0);
});

test('PostgreSQL: solo cuentan las ventas de los últimos 30 días, en el catálogo y en el snapshot', async t => {
  const pool = getPool();
  try {
    await pool.query('SELECT 1');
  } catch {
    t.skip('PostgreSQL no disponible para prueba de integración');
    return;
  }

  // Categoría y producto propios: las pruebas corren en paralelo.
  const categoryId = randomUUID();
  const productId = randomUUID();
  const lotId = randomUUID();
  const createdAt = new Date('2026-09-01T14:30:00.000Z');
  await pool.query('INSERT INTO categorias (id, nombre) VALUES ($1, $2)', [categoryId, `Ventas ${categoryId}`]);
  await pool.query(`
    INSERT INTO productos (id, categoria_id, codigo_barras, nombre, precio_venta, created_at)
    VALUES ($1, $2, $3, 'Producto ventas 30 días', 1.5, $4)
  `, [productId, categoryId, `SAL-${Date.now()}`, createdAt]);
  await pool.query(`
    INSERT INTO lotes (id, producto_id, numero_lote, fecha_elaboracion, fecha_caducidad, costo_unitario, cantidad_ingresada, cantidad_disponible)
    VALUES ($1, $2, $3, CURRENT_DATE - 50, CURRENT_DATE + 60, 0.9, 100, 80)
  `, [lotId, productId, `SAL-${Date.now()}`]);
  t.after(async () => {
    await pool.query('DELETE FROM inventario_movimientos WHERE lote_id = $1', [lotId]);
    await pool.query('DELETE FROM lotes WHERE id = $1', [lotId]);
    await pool.query('DELETE FROM productos WHERE id = $1', [productId]);
    await pool.query('DELETE FROM categorias WHERE id = $1', [categoryId]);
    await pool.end();
  });

  const movement = (tipo, cantidad, daysAgo) => pool.query(`
    INSERT INTO inventario_movimientos (lote_id, tipo, cantidad, disponible_antes, disponible_despues, reservada_antes, reservada_despues, created_at)
    VALUES ($1, $2, $3, 0, 0, 0, 0, CURRENT_TIMESTAMP - make_interval(days => $4))
  `, [lotId, tipo, cantidad, daysAgo]);
  await movement('VENTA', 5, 2);
  await movement('VENTA', 7, 29);
  await movement('VENTA', 11, 40); // fuera de la ventana
  await movement('RESERVA', 3, 1); // no es una venta
  await movement('MERMA', 2, 1); // tampoco

  const repo = new PostgresProductRepository(pool);
  const product = await repo.findById(productId);
  assert.equal(product.vendidos30d, 12);
  assert.equal(new Date(product.created_at).toISOString(), createdAt.toISOString());

  const { items } = await repo.findAll({ q: 'Producto ventas 30 días', limit: 100 });
  assert.equal(items.find(item => item.id === productId)?.vendidos30d, 12);

  const snapshot = await new PostgresCatalogSnapshotReader(pool).read('productos');
  const row = snapshot.find(item => item.id === productId);
  assert.equal(row.vendidos30d, 12);
  assert.equal(row.createdAt, createdAt.toISOString());
});
