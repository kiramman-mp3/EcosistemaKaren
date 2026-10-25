require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');
const { PostgresReservationRepository, PostgresPromotionRepository } = require('../src/adapters/repositories/PostgresRepositories');
const PostgresCatalogSnapshotReader = require('../src/infrastructure/sync/PostgresCatalogSnapshotReader');
const Reservation = require('../src/domain/entities/Reservation');
const { OfferLimitException } = require('../src/domain/exceptions/DomainExceptions');

// Límites de oferta con PostgreSQL real (se omite sin base migrada). Cada prueba crea su propia
// categoría, producto, lote y oferta: los archivos de pruebas corren en paralelo.
const SUFFIX = `${Date.now()}`;
let pool;
let ready = false;
let clientId;
const created = { categories: [], products: [], lots: [], promotions: [], reservations: [] };

test.before(async () => {
  if (!(await testConnection())) return;
  pool = getPool();
  const columns = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'reserva_detalles' AND column_name = 'promocion_id'"
  );
  ready = columns.rowCount > 0;
  if (!ready) return;
  const hash = await bcrypt.hash('ClaveSegura123', 4);
  clientId = (await pool.query(
    'INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    ['Cliente ofertas', `ofertas.${SUFFIX}@example.test`, 'CLIENTE', hash]
  )).rows[0].id;
});

test.after(async () => {
  if (ready) {
    await pool.query('DELETE FROM inventario_movimientos WHERE lote_id = ANY($1::uuid[])', [created.lots]);
    await pool.query('DELETE FROM reservas WHERE id = ANY($1::uuid[])', [created.reservations]);
    await pool.query('DELETE FROM promociones_ia WHERE id = ANY($1::uuid[])', [created.promotions]);
    await pool.query('DELETE FROM lotes WHERE id = ANY($1::uuid[])', [created.lots]);
    await pool.query('DELETE FROM productos WHERE id = ANY($1::uuid[])', [created.products]);
    await pool.query('DELETE FROM categorias WHERE id = ANY($1::uuid[])', [created.categories]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [clientId]);
  }
  await closePool();
});

async function offer({ limite = null, stock = null, hasta = null, unidades = 20 } = {}) {
  const n = created.products.length;
  const categoryId = randomUUID();
  const productId = randomUUID();
  const lotId = randomUUID();
  const promotionId = randomUUID();
  await pool.query('INSERT INTO categorias (id, nombre) VALUES ($1, $2)', [categoryId, `Ofertas ${SUFFIX} ${n}`]);
  created.categories.push(categoryId);
  await pool.query(
    'INSERT INTO productos (id, categoria_id, codigo_barras, nombre, precio_venta) VALUES ($1, $2, $3, $4, 2.00)',
    [productId, categoryId, `OF${SUFFIX}${n}`.slice(0, 20), `Producto oferta ${n}`]
  );
  created.products.push(productId);
  await pool.query(
    `INSERT INTO lotes (id, producto_id, numero_lote, fecha_elaboracion, fecha_caducidad, costo_unitario, cantidad_ingresada, cantidad_disponible)
     VALUES ($1, $2, $3, CURRENT_DATE - 10, CURRENT_DATE + 3, 1, $4, $4)`,
    [lotId, productId, `OF-${SUFFIX}-${n}`, unidades]
  );
  created.lots.push(lotId);
  await pool.query(
    `INSERT INTO promociones_ia (id, lote_id, descuento_porcentaje, frase_promocional, razon_ia, estado, activa,
                                 aprobada_at, limite_por_pedido, stock_oferta, vigente_hasta)
     VALUES ($1, $2, 25, 'Oferta de prueba', 'Lote por vencer', 'APROBADA', TRUE, CURRENT_TIMESTAMP, $3, $4, $5)`,
    [promotionId, lotId, limite, stock, hasta]
  );
  created.promotions.push(promotionId);
  return { productId, lotId, promotionId };
}

async function reserve(repo, { productId, promotionId }, cantidad) {
  const reservation = await repo.createWithLockedStock(
    new Reservation({ usuarioId: clientId, fechaExpiracion: Reservation.calcularFechaExpiracionDefault(30) }),
    [{ productoId: productId, promocionId: promotionId, cantidad }]
  );
  created.reservations.push(reservation.id);
  return reservation;
}

const offerUnits = async (promotionId) => Number((await pool.query(`
  SELECT COALESCE(SUM(rd.cantidad), 0)::int AS total FROM reserva_detalles rd JOIN reservas r ON r.id = rd.reserva_id
  WHERE rd.promocion_id = $1 AND r.estado IN ('PENDIENTE', 'CONFIRMADA')`, [promotionId])).rows[0].total);

test('8 reservas simultáneas sobre una oferta con stock 3 nunca pasan del tope', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const target = await offer({ limite: 2, stock: 3 });

  const results = await Promise.allSettled(Array.from({ length: 8 }, () => reserve(repo, target, 1)));
  const accepted = results.filter(result => result.status === 'fulfilled');
  const rejected = results.filter(result => result.status === 'rejected');
  assert.equal(accepted.length, 3);
  assert.equal(rejected.length, 5);
  assert.ok(rejected.every(result => result.reason instanceof OfferLimitException), 'todas rechazadas por la oferta');
  assert.equal(await offerUnits(target.promotionId), 3);

  const lot = (await pool.query('SELECT cantidad_disponible d, cantidad_reservada r FROM lotes WHERE id = $1', [target.lotId])).rows[0];
  assert.deepEqual([lot.d, lot.r], [17, 3], 'el lote solo descontó lo aceptado');
  for (const result of accepted) {
    assert.equal(Number(result.value.detalles[0].precioUnitario), 1.5, 'precio con el 25 % de descuento');
  }
});

test('el límite por pedido rechaza la línea completa y no toca el stock', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const target = await offer({ limite: 2, stock: 3 });

  await assert.rejects(() => reserve(repo, target, 3), (error) => error instanceof OfferLimitException && /hasta 2/.test(error.message));
  const first = await reserve(repo, target, 2);
  assert.equal(first.detalles[0].promocionId, target.promotionId);
  await assert.rejects(() => reserve(repo, target, 2), /Solo quedan 1/);
  const lot = (await pool.query('SELECT cantidad_disponible d FROM lotes WHERE id = $1', [target.lotId])).rows[0];
  assert.equal(lot.d, 18);

  // Sin la oferta, el mismo producto se reserva a precio normal y no cuenta contra el stock de oferta.
  const normal = await repo.createWithLockedStock(
    new Reservation({ usuarioId: clientId, fechaExpiracion: Reservation.calcularFechaExpiracionDefault(30) }),
    [{ productoId: target.productId, cantidad: 5 }]
  );
  created.reservations.push(normal.id);
  assert.equal(Number(normal.detalles[0].precioUnitario), 2);
  assert.equal(await offerUnits(target.promotionId), 2);
});

test('las unidades restantes se publican, una cancelación las devuelve y la oferta agotada se retira', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const promotions = new PostgresPromotionRepository(pool);
  const reader = new PostgresCatalogSnapshotReader(pool);
  const target = await offer({ limite: 2, stock: 3 });
  const published = async () => (await promotions.findAllApproved()).find(item => item.id === target.promotionId);
  const inSnapshot = async () => (await reader.read('promociones')).find(item => item.id === target.promotionId);

  const first = await reserve(repo, target, 2);
  assert.equal((await published()).unidadesRestantes, 1);
  const row = await inSnapshot();
  assert.deepEqual([row.limitePorPedido, row.stockOferta, row.unidadesRestantes, row.vigenteHasta], [2, 3, 1, null]);

  await reserve(repo, target, 1);
  assert.equal(await published(), undefined, 'agotada: no se ofrece');
  assert.equal(await inSnapshot(), undefined, 'agotada: el portal la retira');

  await repo.cancelWithLockedStock(first.id, { id: clientId, rol: 'CLIENTE' });
  assert.equal((await published()).unidadesRestantes, 2);
});

test('una oferta cuya hora de fin pasó ya no se reserva ni se publica', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const promotions = new PostgresPromotionRepository(pool);
  const hasta = new Date(Date.now() + 60 * 60 * 1000);
  const target = await offer({ hasta });

  const row = (await new PostgresCatalogSnapshotReader(pool).read('promociones')).find(item => item.id === target.promotionId);
  assert.equal(row.vigenteHasta, hasta.toISOString());
  assert.equal(row.unidadesRestantes, null, 'sin stock de oferta: vale todo el lote');

  await pool.query("UPDATE promociones_ia SET vigente_hasta = CURRENT_TIMESTAMP - interval '1 minute' WHERE id = $1", [target.promotionId]);
  await assert.rejects(() => reserve(repo, target, 1), (error) => error instanceof OfferLimitException && /terminó/.test(error.message));
  assert.equal((await promotions.findAllApproved()).some(item => item.id === target.promotionId), false);
  assert.equal((await new PostgresCatalogSnapshotReader(pool).read('promociones')).some(item => item.id === target.promotionId), false);
});
