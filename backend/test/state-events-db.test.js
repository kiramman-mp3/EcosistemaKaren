require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');
const { PostgresReservationRepository } = require('../src/adapters/repositories/PostgresRepositories');
const Reservation = require('../src/domain/entities/Reservation');

// Los avisos de cambio de estado al portal se guardan en la bandeja de salida dentro de la misma
// transacción que el cambio (PostgreSQL real; se omiten sin base migrada).
const SUFFIX = `${Date.now()}`;
let pool;
let ready = false;
const created = { users: [], products: [], categories: [], lots: [], reservations: [] };

test.before(async () => {
  if (!(await testConnection())) return;
  pool = getPool();
  const tables = await pool.query("SELECT to_regclass('public.outbox_portal') AS outbox");
  ready = Boolean(tables.rows[0].outbox);
});

test.after(async () => {
  if (ready) {
    await pool.query("DELETE FROM outbox_portal WHERE tipo = 'RESERVATION_STATE' AND payload->>'reservaId' = ANY($1::text[])", [created.reservations]);
    await pool.query('DELETE FROM inventario_movimientos WHERE lote_id = ANY($1::uuid[]) OR reserva_id = ANY($2::uuid[])', [created.lots, created.reservations]);
    await pool.query('DELETE FROM reserva_detalles WHERE reserva_id = ANY($1::uuid[])', [created.reservations]);
    await pool.query('DELETE FROM reservas WHERE id = ANY($1::uuid[])', [created.reservations]);
    await pool.query('DELETE FROM lotes WHERE id = ANY($1::uuid[])', [created.lots]);
    await pool.query('DELETE FROM productos WHERE id = ANY($1::uuid[])', [created.products]);
    await pool.query('DELETE FROM categorias WHERE id = ANY($1::uuid[])', [created.categories]);
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::uuid[])', [created.users]);
  }
  await closePool();
});

async function createUser(rol) {
  const hash = await bcrypt.hash('ClaveSegura123', 4);
  const res = await pool.query(
    'INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    [`Eventos ${rol}`, `eventos.${rol.toLowerCase()}.${SUFFIX}.${created.users.length}@example.test`, rol, hash]
  );
  created.users.push(res.rows[0].id);
  return res.rows[0].id;
}

async function createProductWithLot(stock = 10) {
  const category = await pool.query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id', [`Cat eventos ${SUFFIX} ${created.categories.length}`]);
  created.categories.push(category.rows[0].id);
  const product = await pool.query(
    'INSERT INTO productos (categoria_id, codigo_barras, nombre, precio_venta) VALUES ($1, $2, $3, 1.50) RETURNING id',
    [category.rows[0].id, `8${SUFFIX}${created.products.length}`.slice(0, 20), 'Producto eventos']
  );
  created.products.push(product.rows[0].id);
  const lot = await pool.query(
    `INSERT INTO lotes (producto_id, numero_lote, fecha_elaboracion, fecha_caducidad, costo_unitario, cantidad_ingresada, cantidad_disponible)
     VALUES ($1, $2, CURRENT_DATE - 10, CURRENT_DATE + 30, 1, $3, $3) RETURNING id`,
    [product.rows[0].id, `LE-${SUFFIX}-${created.lots.length}`, stock]
  );
  created.lots.push(lot.rows[0].id);
  return { productId: product.rows[0].id, lotId: lot.rows[0].id };
}

async function reserve(repo, { remote = true } = {}) {
  const { productId, lotId } = await createProductWithLot();
  // Sin portal (monolito) el cliente es un usuario local; con portal, un cliente remoto sin fila local.
  const clientId = remote ? randomUUID() : await createUser('CLIENTE');
  const reservation = await repo.createWithLockedStock(
    new Reservation({ usuarioId: clientId }), [{ productoId: productId, cantidad: 1 }],
    remote ? { remote: { id: clientId, clienteNombre: 'Cliente eventos' } } : {}
  );
  created.reservations.push(reservation.id);
  return { reservation, lotId };
}

const eventsOf = async (reservaId) => (await pool.query(
  "SELECT clave, payload FROM outbox_portal WHERE tipo = 'RESERVATION_STATE' AND payload->>'reservaId' = $1 ORDER BY id", [reservaId]
)).rows;
const stockOf = async (lotId) => (await pool.query('SELECT cantidad_disponible d, cantidad_reservada r FROM lotes WHERE id = $1', [lotId])).rows[0];

function enabledRepo() {
  const repo = new PostgresReservationRepository(pool);
  repo.enableStateEvents();
  return repo;
}

test('confirmar en caja deja el aviso CONFIRMADA en la bandeja en la misma transacción', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = enabledRepo();
  const staff = await createUser('BODEGUERO');
  const { reservation } = await reserve(repo);

  await repo.confirmWithLockedStock(reservation.id, { id: staff, rol: 'BODEGUERO' });
  const events = await eventsOf(reservation.id);
  assert.deepEqual(events.map(e => e.clave), [`state:${reservation.id}:CONFIRMADA`]);
  assert.equal(events[0].payload.estado, 'CONFIRMADA');
  assert.ok(!Number.isNaN(Date.parse(events[0].payload.at)));
});

test('si el aviso no se puede guardar, el cambio de estado y el stock quedan como estaban', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = enabledRepo();
  const staff = await createUser('BODEGUERO');
  const { reservation, lotId } = await reserve(repo);
  const before = await stockOf(lotId);

  repo._enqueueStateEvent = async () => { throw new Error('bandeja no disponible'); };
  await assert.rejects(() => repo.confirmWithLockedStock(reservation.id, { id: staff, rol: 'BODEGUERO' }), /bandeja no disponible/);

  const row = (await pool.query('SELECT estado FROM reservas WHERE id = $1', [reservation.id])).rows[0];
  assert.equal(row.estado, 'PENDIENTE', 'la confirmación se revirtió');
  assert.deepEqual(await stockOf(lotId), before);
  assert.deepEqual(await eventsOf(reservation.id), []);
});

test('confirmar una reserva vencida la deja EXPIRADA con su aviso', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = enabledRepo();
  const staff = await createUser('BODEGUERO');
  const { reservation, lotId } = await reserve(repo);
  await pool.query("UPDATE reservas SET fecha_expiracion = CURRENT_TIMESTAMP - interval '1 minute' WHERE id = $1", [reservation.id]);

  await assert.rejects(() => repo.confirmWithLockedStock(reservation.id, { id: staff, rol: 'BODEGUERO' }), /expiró/);
  assert.deepEqual((await eventsOf(reservation.id)).map(e => e.payload.estado), ['EXPIRADA']);
  const lot = await stockOf(lotId);
  assert.deepEqual([lot.d, lot.r], [10, 0], 'el stock se liberó');
});

test('el barrido de expiración avisa EXPIRADA por cada reserva liberada', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = enabledRepo();
  const first = await reserve(repo);
  const second = await reserve(repo);
  await pool.query("UPDATE reservas SET fecha_expiracion = CURRENT_TIMESTAMP - interval '1 minute' WHERE id = ANY($1::uuid[])", [[first.reservation.id, second.reservation.id]]);

  const result = await repo.expirePendingWithLockedStock();
  assert.ok(result.reservaIds.includes(first.reservation.id) && result.reservaIds.includes(second.reservation.id));
  for (const { reservation } of [first, second]) {
    assert.deepEqual((await eventsOf(reservation.id)).map(e => e.payload.estado), ['EXPIRADA']);
  }
});

test('el ADMIN cancela desde la tienda y el portal recibe CANCELADA; una cancelación del propio portal no genera aviso', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = enabledRepo();
  const admin = await createUser('ADMIN');

  const byAdmin = await reserve(repo);
  const cancelled = await repo.cancelWithLockedStock(byAdmin.reservation.id, { id: admin, rol: 'ADMIN' });
  assert.equal(cancelled.estado, 'CANCELADA');
  assert.deepEqual((await eventsOf(byAdmin.reservation.id)).map(e => e.payload.estado), ['CANCELADA']);
  const lot = await stockOf(byAdmin.lotId);
  assert.deepEqual([lot.d, lot.r], [10, 0], 'el stock se liberó');

  const byPortal = await reserve(repo);
  await repo.cancelWithLockedStock(byPortal.reservation.id, { id: byPortal.reservation.usuarioId, rol: 'CLIENTE', remote: true });
  assert.deepEqual(await eventsOf(byPortal.reservation.id), [], 'el portal ya sabe que canceló');
});

test('sin activar los avisos (monolito) no se escribe nada en la bandeja', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const staff = await createUser('BODEGUERO');
  const { reservation } = await reserve(repo, { remote: false });
  await repo.confirmWithLockedStock(reservation.id, { id: staff, rol: 'BODEGUERO' });
  assert.deepEqual(await eventsOf(reservation.id), []);
});
