const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config();

const Lot = require('../src/domain/entities/Lot');
const Reservation = require('../src/domain/entities/Reservation');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const { getPool } = require('../src/infrastructure/db/postgres');
const {
  PostgresLotRepository, PostgresProductRepository, PostgresReservationRepository,
} = require('../src/adapters/repositories/PostgresRepositories');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const { UpdateProductPrice, GetProductPriceHistory } = require('../src/use-cases/products/ProductUseCases');
const { IngresarLote } = require('../src/use-cases/lots/LotUseCases');

const admin = { id: 'a1a1a1a1-1111-2222-3333-444455556666', rol: 'ADMIN' };
const bodeguero = { id: 'd8a7b6c5-1111-2222-3333-444455556667', rol: 'BODEGUERO' };

const lotData = (productoId, extra = {}) => ({
  productoId, numeroLote: `PVP-${Date.now()}`, fechaElaboracion: '2026-10-01', fechaCaducidad: '2027-10-01',
  costoUnitario: 0.8, cantidadIngresada: 10, ubicacion: 'BODEGA', ...extra,
});

test('el ADMIN cambia el PVP y queda en la bitácora; repetir el mismo precio no anota nada', async () => {
  const memory = new InMemoryRepositories();
  const product = memory.products[0];
  const before = Number(product.precioVenta);
  const update = new UpdateProductPrice(memory.productRepository);

  const result = await update.execute(product.id, { precioVenta: before + 0.25 }, admin);
  assert.deepEqual(result.cambio, { anterior: before, nuevo: Math.round((before + 0.25) * 100) / 100 });
  assert.equal(Number(result.producto.precioVenta), result.cambio.nuevo);

  const again = await update.execute(product.id, { precioVenta: result.cambio.nuevo }, admin);
  assert.equal(again.cambio, null);

  const history = await new GetProductPriceHistory(memory.productRepository).execute(product.id, admin);
  assert.equal(history.length, 1);
  assert.equal(history[0].origen, 'MANUAL');
  assert.equal(history[0].actorId, admin.id);
});

test('solo el ADMIN cambia el PVP, y debe ser un monto válido', async () => {
  const memory = new InMemoryRepositories();
  const product = memory.products[0];
  const update = new UpdateProductPrice(memory.productRepository);
  const before = product.precioVenta;

  await assert.rejects(() => update.execute(product.id, { precioVenta: 9.99 }, bodeguero), /Solo el ADMIN/);
  await assert.rejects(() => update.execute(product.id, { precioVenta: 9.99 }, null), /Solo el ADMIN/);
  await assert.rejects(() => update.execute(product.id, { precioVenta: 0 }, admin), /mayor a 0/);
  await assert.rejects(() => update.execute(randomUUID(), { precioVenta: 1 }, admin), /no fue encontrado/);
  await assert.rejects(() => new GetProductPriceHistory(memory.productRepository).execute(product.id, bodeguero), /Solo el ADMIN/);
  assert.equal(product.precioVenta, before);
});

test('la API valida el cuerpo del cambio de PVP y el nuevo PVP del lote', () => {
  assert.equal(schemas.productPriceBody.safeParse({ precioVenta: '2.75' }).data.precioVenta, 2.75);
  assert.equal(schemas.productPriceBody.safeParse({ precioVenta: -1 }).success, false);
  assert.equal(schemas.productPriceBody.safeParse({ precioVenta: 1, nombre: 'x' }).success, false);
  const lot = lotData(randomUUID(), { nuevoPrecioVenta: '3.10' });
  assert.equal(schemas.lotBody.safeParse(lot).data.nuevoPrecioVenta, 3.1);
  assert.equal(schemas.lotBody.safeParse({ ...lot, nuevoPrecioVenta: 0 }).success, false);
});

test('el ADMIN puede fijar un nuevo PVP al ingresar un lote; el bodeguero no', async () => {
  const memory = new InMemoryRepositories();
  const product = memory.products[0];
  const ingreso = new IngresarLote(memory.lotRepository, memory.productRepository, null, null);
  const before = Number(product.precioVenta);
  const lotsBefore = memory.lots.length;

  await assert.rejects(() => ingreso.execute(lotData(product.id, { nuevoPrecioVenta: before + 1 }), bodeguero), /Solo el ADMIN/);
  assert.equal(memory.lots.length, lotsBefore, 'el lote rechazado no se guarda');
  assert.equal(Number(product.precioVenta), before);

  const plain = await ingreso.execute(lotData(product.id), bodeguero);
  assert.equal(plain.cambioPrecio, undefined, 'sin nuevo PVP el lote no toca el precio');

  const lot = await ingreso.execute(lotData(product.id, { nuevoPrecioVenta: before + 1 }), admin);
  assert.deepEqual(lot.cambioPrecio, { anterior: before, nuevo: before + 1 });
  assert.equal(Number(product.precioVenta), before + 1);
  const [entry] = await memory.productRepository.findPriceHistory(product.id);
  assert.equal(entry.origen, 'INGRESO_LOTE');
  assert.equal(entry.loteId, lot.id);
});

test('PostgreSQL: el PVP del lote se guarda junto con el lote, y una reserva previa conserva su precio', async t => {
  const pool = getPool();
  try {
    await pool.query('SELECT 1');
  } catch {
    t.skip('PostgreSQL no disponible para prueba de integración');
    return;
  }
  const actor = await pool.query("SELECT id FROM usuarios WHERE email = 'admin@karen.com'");
  const customer = await pool.query("SELECT id FROM usuarios WHERE email = 'cliente@karen.com'");
  if (!actor.rowCount || !customer.rowCount) {
    t.skip('Faltan las semillas del administrador o del cliente');
    await pool.end();
    return;
  }

  // Categoría propia: las pruebas corren en paralelo y otra podría estar creando y borrando la suya.
  const categoryId = randomUUID();
  const productId = randomUUID();
  await pool.query('INSERT INTO categorias (id, nombre) VALUES ($1, $2)', [categoryId, `PVP ${categoryId}`]);
  await pool.query(`
    INSERT INTO productos (id, categoria_id, codigo_barras, nombre, precio_venta, min_stock_alerta)
    VALUES ($1, $2, $3, 'Producto cambio de PVP', 2.00, 1)
  `, [productId, categoryId, `PVP-${Date.now()}`]);
  const reservationIds = [];
  t.after(async () => {
    const lots = await pool.query('SELECT id FROM lotes WHERE producto_id = $1', [productId]);
    for (const { id } of lots.rows) {
      await pool.query('DELETE FROM inventario_movimientos WHERE lote_id = $1', [id]);
      await pool.query('DELETE FROM alertas_caducidad WHERE lote_id = $1', [id]);
    }
    for (const id of reservationIds) await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
    await pool.query('DELETE FROM lotes WHERE producto_id = $1', [productId]);
    await pool.query('DELETE FROM productos WHERE id = $1', [productId]);
    await pool.query('DELETE FROM categorias WHERE id = $1', [categoryId]);
    await pool.end();
  });

  const lotRepo = new PostgresLotRepository(pool);
  const productRepo = new PostgresProductRepository(pool);
  const newLot = () => new Lot(lotData(productId, { numeroLote: `PG-PVP-${randomUUID().slice(0, 8)}` }));

  // Si algo falla después de cambiar el precio, no queda ni el lote ni el precio nuevo ni su registro.
  const failing = () => { throw new Error('falla simulada al final de la transacción'); };
  await assert.rejects(() => lotRepo.save(newLot(), actor.rows[0].id, failing, { nuevoPrecioVenta: 9.5 }), /falla simulada/);
  assert.equal(Number((await productRepo.findById(productId)).precioVenta), 2);
  assert.equal((await pool.query('SELECT 1 FROM lotes WHERE producto_id = $1', [productId])).rowCount, 0);
  assert.deepEqual(await productRepo.findPriceHistory(productId), []);

  // Lote con stock a $2.00 y una reserva hecha a ese precio.
  await lotRepo.save(newLot(), actor.rows[0].id);
  const reservationRepo = new PostgresReservationRepository(pool);
  const reservation = await reservationRepo.createWithLockedStock(new Reservation({
    usuarioId: customer.rows[0].id, fechaExpiracion: new Date(Date.now() + 30 * 60 * 1000),
  }), [{ productoId: productId, cantidad: 2 }]);
  reservationIds.push(reservation.id);

  // El ADMIN sube el PVP al ingresar otro lote: se guardan juntos y queda en la bitácora.
  const saved = await lotRepo.save(newLot(), actor.rows[0].id, null, { nuevoPrecioVenta: 2.4 });
  assert.deepEqual(saved.cambioPrecio, { anterior: 2, nuevo: 2.4 });
  assert.equal(Number((await productRepo.findById(productId)).precioVenta), 2.4);
  const [entry] = await productRepo.findPriceHistory(productId);
  assert.equal(entry.origen, 'INGRESO_LOTE');
  assert.equal(entry.loteId, saved.id);
  assert.equal(entry.actorId, actor.rows[0].id);

  // La reserva previa conserva su precio; una nueva usa el PVP nuevo.
  const details = await pool.query('SELECT precio_unitario::float8 AS precio FROM reserva_detalles WHERE reserva_id = $1', [reservation.id]);
  assert.deepEqual(details.rows.map(row => row.precio), [2]);
  const later = await reservationRepo.createWithLockedStock(new Reservation({
    usuarioId: customer.rows[0].id, fechaExpiracion: new Date(Date.now() + 30 * 60 * 1000),
  }), [{ productoId: productId, cantidad: 1 }]);
  reservationIds.push(later.id);
  const laterDetails = await pool.query('SELECT precio_unitario::float8 AS precio FROM reserva_detalles WHERE reserva_id = $1', [later.id]);
  assert.deepEqual(laterDetails.rows.map(row => row.precio), [2.4]);

  // Cambio manual desde el catálogo.
  const manual = await productRepo.updatePriceWithAudit(productId, 2.6, { actorId: actor.rows[0].id });
  assert.deepEqual(manual.cambio, { anterior: 2.4, nuevo: 2.6 });
  assert.deepEqual((await productRepo.findPriceHistory(productId)).map(item => item.origen), ['MANUAL', 'INGRESO_LOTE']);
});
