require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');
const { PostgresReservationRepository } = require('../src/adapters/repositories/PostgresRepositories');
const Reservation = require('../src/domain/entities/Reservation');
const { ValidationException, ForbiddenException, NotFoundException } = require('../src/domain/exceptions/DomainExceptions');

// Extensión del plazo de una reserva con PostgreSQL real (se omite sin base migrada).
const SUFFIX = `${Date.now()}`;
let pool;
let ready = false;
const created = { users: [], products: [], categories: [], lots: [], reservations: [] };

test.before(async () => {
  if (!(await testConnection())) return;
  pool = getPool();
  const tables = await pool.query("SELECT to_regclass('public.reservas') AS reservas");
  ready = Boolean(tables.rows[0].reservas);
});

test.after(async () => {
  if (ready) {
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

async function createClient() {
  const hash = await bcrypt.hash('ClaveSegura123', 4);
  const res = await pool.query(
    'INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    ['Cliente extensión', `extension.${SUFFIX}.${created.users.length}@example.test`, 'CLIENTE', hash]
  );
  created.users.push(res.rows[0].id);
  return res.rows[0].id;
}

async function reserve(repo, ownerId, ttlMinutes = 30) {
  const category = await pool.query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id', [`Cat extensión ${SUFFIX} ${created.categories.length}`]);
  created.categories.push(category.rows[0].id);
  const product = await pool.query(
    'INSERT INTO productos (categoria_id, codigo_barras, nombre, precio_venta) VALUES ($1, $2, $3, 1.50) RETURNING id',
    [category.rows[0].id, `6${SUFFIX}${created.products.length}`.slice(0, 20), 'Producto extensión']
  );
  created.products.push(product.rows[0].id);
  const lot = await pool.query(
    `INSERT INTO lotes (producto_id, numero_lote, fecha_elaboracion, fecha_caducidad, costo_unitario, cantidad_ingresada, cantidad_disponible)
     VALUES ($1, $2, CURRENT_DATE - 10, CURRENT_DATE + 30, 1, 10, 10) RETURNING id`,
    [product.rows[0].id, `LX-${SUFFIX}-${created.lots.length}`]
  );
  created.lots.push(lot.rows[0].id);
  const reservation = await repo.createWithLockedStock(
    new Reservation({ usuarioId: ownerId, fechaExpiracion: Reservation.calcularFechaExpiracionDefault(ttlMinutes) }),
    [{ productoId: product.rows[0].id, cantidad: 1 }]
  );
  created.reservations.push(reservation.id);
  return reservation;
}

const expiryOf = async (id) => new Date((await pool.query('SELECT fecha_expiracion FROM reservas WHERE id = $1', [id])).rows[0].fecha_expiracion);
const minutesFromCreation = async (id) => {
  const row = (await pool.query('SELECT fecha_expiracion, created_at FROM reservas WHERE id = $1', [id])).rows[0];
  return (new Date(row.fecha_expiracion) - new Date(row.created_at)) / 60000;
};

test('el dueño extiende su reserva 30 minutos y el stock sigue reservado', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const owner = await createClient();
  const reservation = await reserve(repo, owner);
  const before = await expiryOf(reservation.id);

  const extended = await repo.extendTimeWithLockedStock(reservation.id, { id: owner, rol: 'CLIENTE' }, 30);
  assert.equal(new Date(extended.fechaExpiracion).getTime() - before.getTime(), 30 * 60000);
  assert.equal(extended.estado, 'PENDIENTE');
  const lot = (await pool.query('SELECT cantidad_disponible d, cantidad_reservada r FROM lotes WHERE id = ANY($1::uuid[])', [created.lots.slice(-1)])).rows[0];
  assert.deepEqual([lot.d, lot.r], [9, 1]);
});

test('una reserva nunca pasa de 4 horas en total, aunque se extienda varias veces', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const owner = await createClient();
  const reservation = await reserve(repo, owner, 180);
  const actor = { id: owner, rol: 'CLIENTE' };

  await repo.extendTimeWithLockedStock(reservation.id, actor, 30);
  assert.ok(Math.abs(await minutesFromCreation(reservation.id) - 210) < 1);
  await repo.extendTimeWithLockedStock(reservation.id, actor, 30);
  assert.ok(Math.abs(await minutesFromCreation(reservation.id) - 240) < 1);
  await assert.rejects(() => repo.extendTimeWithLockedStock(reservation.id, actor, 5), (error) => error instanceof ValidationException && /4 horas/.test(error.message));
  assert.ok(Math.abs(await minutesFromCreation(reservation.id) - 240) < 1, 'no cambió');
});

test('el mismo objetivo absoluto aplicado dos veces extiende una sola vez (reentrega del comando)', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const owner = await createClient();
  const reservation = await reserve(repo, owner);
  const target = new Date(new Date(reservation.fechaExpiracion).getTime() + 30 * 60000);

  await repo.extendTimeWithLockedStock(reservation.id, { id: owner, rol: 'CLIENTE', remote: true }, 30, { until: target });
  const afterFirst = await expiryOf(reservation.id);
  await repo.extendTimeWithLockedStock(reservation.id, { id: owner, rol: 'CLIENTE', remote: true }, 30, { until: target });
  assert.equal((await expiryOf(reservation.id)).getTime(), afterFirst.getTime());
  assert.ok(Math.abs(afterFirst.getTime() - target.getTime()) < 1000);
});

test('solo el dueño (o un ADMIN) extiende, y no se extiende una reserva vencida, cancelada o inexistente', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const owner = await createClient();
  const stranger = await createClient();
  const reservation = await reserve(repo, owner);

  await assert.rejects(() => repo.extendTimeWithLockedStock(reservation.id, { id: stranger, rol: 'CLIENTE' }, 30), ForbiddenException);
  await assert.rejects(() => repo.extendTimeWithLockedStock('00000000-0000-4000-8000-0000000000ff', { id: owner, rol: 'CLIENTE' }, 30), NotFoundException);

  await pool.query("UPDATE reservas SET fecha_expiracion = CURRENT_TIMESTAMP - interval '1 minute' WHERE id = $1", [reservation.id]);
  await assert.rejects(() => repo.extendTimeWithLockedStock(reservation.id, { id: owner, rol: 'CLIENTE' }, 30), /expirado/);

  const second = await reserve(repo, owner);
  await repo.cancelWithLockedStock(second.id, { id: owner, rol: 'CLIENTE' });
  await assert.rejects(() => repo.extendTimeWithLockedStock(second.id, { id: owner, rol: 'CLIENTE' }, 30), /estado CANCELADA/);
});

test('el código de retiro se busca sin importar mayúsculas ni espacios', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PostgresReservationRepository(pool);
  const reservation = await reserve(repo, await createClient());
  const found = await repo.findByCode(`  ${reservation.codigoRetiro.toLowerCase()}  `);
  assert.equal(found?.id, reservation.id);
  assert.equal(await repo.findByCode('KR-NOEXISTE'), null);
});
