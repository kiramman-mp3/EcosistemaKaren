const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config();

const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const { getPool } = require('../src/infrastructure/db/postgres');
const { PostgresProductRepository } = require('../src/adapters/repositories/PostgresRepositories');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const { UpdateProduct } = require('../src/use-cases/products/ProductUseCases');

const admin = { id: 'a1a1a1a1-1111-2222-3333-444455556666', rol: 'ADMIN' };
const bodeguero = { id: 'd8a7b6c5-1111-2222-3333-444455556667', rol: 'BODEGUERO' };

const editOf = (product, extra = {}) => ({
  categoriaId: product.categoriaId, nombre: product.nombre, descripcion: product.descripcion,
  precioVenta: product.precioVenta, impuestoPorcentaje: product.impuestoPorcentaje, minStockAlerta: product.minStockAlerta,
  ...extra,
});

test('el ADMIN edita los datos del producto sin tocar su código de barras ni su foto', async () => {
  const memory = new InMemoryRepositories();
  const [product, other] = memory.products;
  const category = memory.categories.find(c => c.id !== product.categoriaId);
  const { codigoBarras, imagenUrl } = product;
  const update = new UpdateProduct(memory.productRepository, memory.categoryRepository);

  const result = await update.execute(product.id, editOf(product, {
    nombre: '  Nombre corregido  ', descripcion: null, categoriaId: category.id, impuestoPorcentaje: 0, minStockAlerta: 3,
  }), admin);

  assert.equal(result.cambio, null, 'sin cambio de PVP no se anota nada');
  assert.equal(result.producto.nombre, 'Nombre corregido');
  assert.equal(result.producto.descripcion, null);
  assert.equal(result.producto.categoriaId, category.id);
  assert.equal(result.producto.impuestoPorcentaje, 0);
  assert.equal(result.producto.minStockAlerta, 3);
  assert.equal(result.producto.codigoBarras, codigoBarras);
  assert.equal(result.producto.imagenUrl, imagenUrl);
  assert.notEqual(other.nombre, 'Nombre corregido', 'no toca otros productos');
  assert.deepEqual(await memory.productRepository.findPriceHistory(product.id), []);
});

test('si el PVP cambia al editar, queda en la bitácora', async () => {
  const memory = new InMemoryRepositories();
  const product = memory.products[0];
  const before = Number(product.precioVenta);
  const update = new UpdateProduct(memory.productRepository, memory.categoryRepository);

  const result = await update.execute(product.id, editOf(product, { precioVenta: before + 0.5 }), admin);
  assert.deepEqual(result.cambio, { anterior: before, nuevo: before + 0.5 });
  const [entry] = await memory.productRepository.findPriceHistory(product.id);
  assert.equal(entry.origen, 'MANUAL');
  assert.equal(entry.actorId, admin.id);
});

test('solo el ADMIN edita; el producto y la categoría deben existir y los datos ser válidos', async () => {
  const memory = new InMemoryRepositories();
  const product = memory.products[0];
  const snapshot = { ...product };
  const update = new UpdateProduct(memory.productRepository, memory.categoryRepository);

  await assert.rejects(() => update.execute(product.id, editOf(product), bodeguero), /Solo el ADMIN/);
  await assert.rejects(() => update.execute(product.id, editOf(product), null), /Solo el ADMIN/);
  await assert.rejects(() => update.execute(randomUUID(), editOf(product), admin), /no fue encontrado/);
  await assert.rejects(() => update.execute(product.id, editOf(product, { categoriaId: randomUUID() }), admin), /categoría/);
  await assert.rejects(() => update.execute(product.id, editOf(product, { nombre: 'ab' }), admin), /nombre/i);
  await assert.rejects(() => update.execute(product.id, editOf(product, { precioVenta: 0 }), admin), /precio/i);
  assert.equal(product.nombre, snapshot.nombre);
  assert.equal(product.precioVenta, snapshot.precioVenta);
});

test('la API valida el cuerpo de la edición', () => {
  const body = { categoriaId: randomUUID(), nombre: 'Leche Vita 1 L', precioVenta: '1.25', impuestoPorcentaje: '15', minStockAlerta: '10' };
  const parsed = schemas.productUpdateBody.safeParse(body);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.precioVenta, 1.25);
  assert.equal(schemas.productUpdateBody.safeParse({ ...body, descripcion: null }).success, true);
  assert.equal(schemas.productUpdateBody.safeParse({ ...body, nombre: 'N'.repeat(151) }).success, false);
  assert.equal(schemas.productUpdateBody.safeParse({ ...body, precioVenta: -1 }).success, false);
  assert.equal(schemas.productUpdateBody.safeParse({ ...body, impuestoPorcentaje: 101 }).success, false);
  assert.equal(schemas.productUpdateBody.safeParse({ ...body, minStockAlerta: 1.5 }).success, false);
  assert.equal(schemas.productUpdateBody.safeParse({ ...body, categoriaId: 'x' }).success, false);
  assert.equal(schemas.productUpdateBody.safeParse({ ...body, codigoBarras: '7861234567890' }).success, false);
  const { nombre, ...withoutName } = body;
  assert.equal(schemas.productUpdateBody.safeParse(withoutName).success, false);
  assert.ok(nombre);
});

test('PostgreSQL: la edición guarda datos y PVP juntos, o ninguno', async t => {
  const pool = getPool();
  try {
    await pool.query('SELECT 1');
  } catch {
    t.skip('PostgreSQL no disponible para prueba de integración');
    return;
  }
  const actor = await pool.query("SELECT id FROM usuarios WHERE email = 'admin@karen.com'");
  if (!actor.rowCount) {
    t.skip('Falta la semilla del administrador');
    await pool.end();
    return;
  }

  const categoryId = randomUUID();
  const otherCategoryId = randomUUID();
  const productId = randomUUID();
  await pool.query('INSERT INTO categorias (id, nombre) VALUES ($1, $2), ($3, $4)',
    [categoryId, `Edit A ${categoryId}`, otherCategoryId, `Edit B ${otherCategoryId}`]);
  await pool.query(`
    INSERT INTO productos (id, categoria_id, codigo_barras, nombre, precio_venta, min_stock_alerta)
    VALUES ($1, $2, $3, 'Producto por editar', 2.00, 1)
  `, [productId, categoryId, `EDIT-${Date.now()}`]);
  t.after(async () => {
    await pool.query('DELETE FROM productos_precio_historial WHERE producto_id = $1', [productId]);
    await pool.query('DELETE FROM productos WHERE id = $1', [productId]);
    await pool.query('DELETE FROM categorias WHERE id = ANY($1::uuid[])', [[categoryId, otherCategoryId]]);
    await pool.end();
  });

  const repo = new PostgresProductRepository(pool);
  const saved = await repo.updateDetails(productId, {
    categoriaId: otherCategoryId, nombre: 'Producto editado', descripcion: 'Con marca', precioVenta: 2.3,
    impuestoPorcentaje: 15, minStockAlerta: 4,
  }, { actorId: actor.rows[0].id });

  assert.deepEqual(saved.cambio, { anterior: 2, nuevo: 2.3 });
  assert.equal(saved.producto.nombre, 'Producto editado');
  assert.equal(saved.producto.categoriaId, otherCategoryId);
  assert.equal(saved.producto.descripcion, 'Con marca');
  assert.equal(saved.producto.impuestoPorcentaje, 15);
  assert.equal(saved.producto.minStockAlerta, 4);
  assert.equal((await repo.findPriceHistory(productId)).length, 1);

  // Una categoría inexistente falla (clave foránea) y no deja el nombre ni el precio a medias.
  await assert.rejects(() => repo.updateDetails(productId, {
    categoriaId: randomUUID(), nombre: 'No debe quedar', descripcion: null, precioVenta: 9,
    impuestoPorcentaje: 15, minStockAlerta: 4,
  }, { actorId: actor.rows[0].id }));
  const after = await repo.findById(productId);
  assert.equal(after.nombre, 'Producto editado');
  assert.equal(Number(after.precioVenta), 2.3);
  assert.equal((await repo.findPriceHistory(productId)).length, 1);

  await assert.rejects(() => repo.updateDetails(randomUUID(), {
    categoriaId: categoryId, nombre: 'Fantasma', descripcion: null, precioVenta: 1, impuestoPorcentaje: 0, minStockAlerta: 0,
  }, { actorId: actor.rows[0].id }), /no fue encontrado/);
});
