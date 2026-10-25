require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');
const PortalRepo = require('../src/adapters/repositories/PostgresPortalReservationRepository');
const { PostgresLotRepository, PostgresReservationRepository, PostgresAlertRepository } = require('../src/adapters/repositories/PostgresRepositories');
const { IngresarLote } = require('../src/use-cases/lots/LotUseCases');
const { ProcessStoreCommand } = require('../src/use-cases/reservations/StoreCommandUseCases');
const Reservation = require('../src/domain/entities/Reservation');

// Pruebas de consistencia con PostgreSQL real (se omiten si no hay base migrada). Cada una limpia lo
// que crea; conviene ejecutarlas en una base de pruebas.
const SUFFIX = `${Date.now()}`;
let pool;
let ready = false;
const created = { users: [], products: [], categories: [], lots: [], reservations: [] };

test.before(async () => {
  if (!(await testConnection())) return;
  pool = getPool();
  const tables = await pool.query("SELECT to_regclass('public.reservas_portal') AS portal, to_regclass('public.outbox_portal') AS store");
  ready = Boolean(tables.rows[0].portal && tables.rows[0].store);
});

test.after(async () => {
  if (ready) {
    await pool.query('DELETE FROM comandos_tienda WHERE reserva_id IN (SELECT id FROM reservas_portal WHERE cliente_id = ANY($1::uuid[]))', [created.users]);
    await pool.query('DELETE FROM reservas_portal WHERE cliente_id = ANY($1::uuid[])', [created.users]);
    await pool.query('DELETE FROM inventario_movimientos WHERE lote_id = ANY($1::uuid[]) OR reserva_id = ANY($2::uuid[])', [created.lots, created.reservations]);
    await pool.query('DELETE FROM alertas_caducidad WHERE lote_id = ANY($1::uuid[])', [created.lots]);
    await pool.query('DELETE FROM reserva_detalles WHERE reserva_id = ANY($1::uuid[])', [created.reservations]);
    await pool.query('DELETE FROM reservas WHERE id = ANY($1::uuid[])', [created.reservations]);
    await pool.query('DELETE FROM lotes WHERE id = ANY($1::uuid[])', [created.lots]);
    await pool.query('DELETE FROM productos WHERE id = ANY($1::uuid[])', [created.products]);
    await pool.query('DELETE FROM categorias WHERE id = ANY($1::uuid[])', [created.categories]);
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::uuid[])', [created.users]);
  }
  await closePool();
});

async function createUser(label) {
  const hash = await bcrypt.hash('ClaveSegura123', 4);
  const res = await pool.query(
    'INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    [`Prueba ${label}`, `consistencia.${label}.${SUFFIX}@example.test`, 'CLIENTE', hash]
  );
  created.users.push(res.rows[0].id);
  return res.rows[0].id;
}

async function createProductWithLot({ stock = 10, daysToExpire = 30 } = {}) {
  const category = await pool.query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id', [`Cat consistencia ${SUFFIX} ${created.categories.length}`]);
  created.categories.push(category.rows[0].id);
  const product = await pool.query(
    'INSERT INTO productos (categoria_id, codigo_barras, nombre, precio_venta) VALUES ($1, $2, $3, 1.50) RETURNING id',
    [category.rows[0].id, `9${SUFFIX}${created.products.length}`.slice(0, 20), 'Producto consistencia']
  );
  created.products.push(product.rows[0].id);
  const lot = await pool.query(
    `INSERT INTO lotes (producto_id, numero_lote, fecha_elaboracion, fecha_caducidad, costo_unitario, cantidad_ingresada, cantidad_disponible)
     VALUES ($1, $2, CURRENT_DATE - 10, CURRENT_DATE + $3::int, 1, $4, $4) RETURNING id`,
    [product.rows[0].id, `LC-${SUFFIX}-${created.lots.length}`, daysToExpire, stock]
  );
  created.lots.push(lot.rows[0].id);
  return { productId: product.rows[0].id, lotId: lot.rows[0].id };
}

const items = (productId) => [{ productoId: productId, cantidad: 1 }];
const expiry = () => new Date(Date.now() + 30 * 60000);

// ─── cola de comandos del portal ───────────────────────────────────────────────────────────────
test('al agotar las entregas de un CREATE, el portal rechaza la reserva y le pide a la tienda cancelarla', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const portal = new PortalRepo(pool);
  const clientId = await createUser('agotar');
  const reservation = await portal.createPending({ clienteId: clientId, fechaExpiracion: expiry(), items: items('00000000-0000-4000-8000-000000000001') });
  created.reservations.push(reservation.id);

  for (let i = 0; i < 5; i++) {
    const delivered = await portal.claimCommands({ limit: 50, visibilityMs: 0, maxAttempts: 5 });
    assert.ok(delivered.some(command => command.reservaId === reservation.id), `entrega ${i + 1}`);
  }
  // Sexta consulta: el CREATE agotó sus intentos sin resultado.
  const afterExhaustion = await portal.claimCommands({ limit: 50, visibilityMs: 0, maxAttempts: 5 });

  const rejected = await portal.findById(reservation.id);
  assert.equal(rejected.estado, 'RECHAZADA');
  assert.equal(rejected.motivoRechazo, 'STORE_ERROR');

  const cancel = afterExhaustion.find(command => command.reservaId === reservation.id);
  assert.ok(cancel, 'se encoló un comando para la tienda');
  assert.equal(cancel.tipo, 'RESERVATION_CANCEL');
  assert.equal(cancel.payload.clienteId, clientId);
});

test('el CANCEL que sigue a un CREATE agotado libera el stock que la tienda sí había reservado', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const portal = new PortalRepo(pool);
  const store = new PostgresReservationRepository(pool);
  const processor = new ProcessStoreCommand(store);
  const clientId = await createUser('liberar');
  const { productId, lotId } = await createProductWithLot({ stock: 5 });

  const reservation = await portal.createPending({ clienteId: clientId, fechaExpiracion: expiry(), items: items(productId) });
  created.reservations.push(reservation.id);

  // La tienda recibe el CREATE y reserva, pero su resultado nunca llega al portal.
  const [create] = (await portal.claimCommands({ limit: 50 })).filter(command => command.reservaId === reservation.id);
  const accepted = await processor.execute(create);
  assert.equal(accepted.status, 'ACCEPTED');
  let lot = (await pool.query('SELECT cantidad_disponible d, cantidad_reservada r FROM lotes WHERE id = $1', [lotId])).rows[0];
  assert.deepEqual([lot.d, lot.r], [4, 1], 'la tienda retiene una unidad');

  for (let i = 0; i < 4; i++) await portal.claimCommands({ limit: 50, visibilityMs: 0, maxAttempts: 5 });
  const [cancel] = (await portal.claimCommands({ limit: 50, visibilityMs: 0, maxAttempts: 5 })).filter(command => command.reservaId === reservation.id);
  assert.equal(cancel.tipo, 'RESERVATION_CANCEL');

  const result = await processor.execute(cancel);
  assert.deepEqual(result, { status: 'APPLIED', estado: 'CANCELADA' });
  lot = (await pool.query('SELECT cantidad_disponible d, cantidad_reservada r FROM lotes WHERE id = $1', [lotId])).rows[0];
  assert.deepEqual([lot.d, lot.r], [5, 0], 'el stock volvió a estar disponible');

  await portal.resolveCommand(cancel.id, result);
  assert.equal((await portal.findById(reservation.id)).estado, 'RECHAZADA', 'la reserva rechazada no cambia de estado');
});

test('una reserva aceptada cuyo plazo pasó sin aviso de la tienda se marca como vencida sin confirmar', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const portal = new PortalRepo(pool);
  const clientId = await createUser('vencida');
  const reservation = await portal.createPending({ clienteId: clientId, fechaExpiracion: expiry(), items: items('00000000-0000-4000-8000-000000000001') });
  created.reservations.push(reservation.id);
  const [command] = (await portal.claimCommands({ limit: 50 })).filter(item => item.reservaId === reservation.id);
  await portal.resolveCommand(command.id, {
    status: 'ACCEPTED',
    reservation: { codigoRetiro: `KR-${SUFFIX.slice(-6)}`, fechaExpiracion: new Date(Date.now() - 60000).toISOString(), detalles: [] }
  });

  const view = await portal.findById(reservation.id);
  assert.equal(view.estado, 'PENDIENTE', 'el estado guardado no cambia: manda la tienda');
  assert.equal(view.vencidaSinConfirmar, true);

  const active = await portal.createPending({ clienteId: clientId, fechaExpiracion: expiry(), items: items('00000000-0000-4000-8000-000000000001') });
  created.reservations.push(active.id);
  assert.equal(active.vencidaSinConfirmar, undefined);
});

// ─── lote y alerta en una sola transacción ─────────────────────────────────────────────────────
test('el lote y su alerta de caducidad se guardan juntos o no se guarda ninguno', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const { productId } = await createProductWithLot();
  const lots = new PostgresLotRepository(pool);
  const products = { findById: async () => ({ id: productId, nombre: 'Producto consistencia', codigoBarras: '7861234567890' }) };
  const events = [];
  const useCase = new IngresarLote(lots, products, new PostgresAlertRepository(pool), { broadcastAlert: (event) => events.push(event) });
  const staff = { id: null, rol: 'ADMIN' };
  const data = (name, daysToExpire) => ({
    productoId: productId, numeroLote: `AT-${SUFFIX}-${name}`,
    fechaElaboracion: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    fechaCaducidad: new Date(Date.now() + daysToExpire * 86400000).toISOString().slice(0, 10),
    costoUnitario: 1, cantidadIngresada: 10
  });

  const near = await useCase.execute(data('cerca', 3), staff);
  created.lots.push(near.id);
  const alerts = await pool.query('SELECT nivel FROM alertas_caducidad WHERE lote_id = $1', [near.id]);
  assert.equal(alerts.rows.length, 1, 'el lote próximo a vencer tiene su alerta');
  assert.equal(events.length, 1);
  assert.equal(events[0].loteId, near.id);
  assert.equal(JSON.stringify(near).includes('alertaGenerada'), false, 'la alerta no se filtra en la respuesta de la API');

  const far = await useCase.execute(data('lejos', 90), staff);
  created.lots.push(far.id);
  assert.equal((await pool.query('SELECT 1 FROM alertas_caducidad WHERE lote_id = $1', [far.id])).rows.length, 0);
  assert.equal(events.length, 1, 'un lote lejano no genera aviso');

  // Si la alerta no se puede guardar, el lote tampoco: reintentar no duplica nada.
  const countBefore = (await pool.query('SELECT count(*)::int n FROM lotes WHERE producto_id = $1', [productId])).rows[0].n;
  const failing = { save: (lot, actorId, build) => lots.save(lot, actorId, (saved) => { const alert = build(saved); alert.nivel = 'INVALIDO'; return alert; }) };
  const brokenUseCase = new IngresarLote(failing, products, null, null);
  await assert.rejects(() => brokenUseCase.execute(data('falla', 3), staff));
  const countAfter = (await pool.query('SELECT count(*)::int n FROM lotes WHERE producto_id = $1', [productId])).rows[0].n;
  assert.equal(countAfter, countBefore, 'el lote no quedó guardado sin su alerta');
});

// ─── estado del lote al vender ─────────────────────────────────────────────────────────────────
test('vender el último stock reservado de un lote vencido no lo cambia a AGOTADO', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const store = new PostgresReservationRepository(pool);
  const clientId = await createUser('vencido');
  const { productId, lotId } = await createProductWithLot({ stock: 1 });
  const reservation = await store.createWithLockedStock(
    new Reservation({ usuarioId: clientId }), items(productId), { remote: { id: randomUUID(), clienteNombre: 'Prueba' } }
  );
  created.reservations.push(reservation.id);

  // El lote vence entre la reserva y el cobro en caja.
  await pool.query("UPDATE lotes SET estado = 'VENCIDO' WHERE id = $1", [lotId]);
  const staff = (await pool.query("SELECT id FROM usuarios WHERE rol IN ('BODEGUERO', 'ADMIN') LIMIT 1")).rows[0];
  if (!staff) return t.skip('No hay un usuario de personal para confirmar');
  await store.confirmWithLockedStock(reservation.id, { id: staff.id, rol: 'BODEGUERO' });

  const lot = (await pool.query('SELECT estado, cantidad_disponible d, cantidad_reservada r FROM lotes WHERE id = $1', [lotId])).rows[0];
  assert.equal(lot.estado, 'VENCIDO');
  assert.deepEqual([lot.d, lot.r], [0, 0]);

  // Un lote activo sí pasa a AGOTADO.
  const active = await createProductWithLot({ stock: 1 });
  const second = await store.createWithLockedStock(new Reservation({ usuarioId: clientId }), items(active.productId));
  created.reservations.push(second.id);
  await store.confirmWithLockedStock(second.id, { id: staff.id, rol: 'BODEGUERO' });
  assert.equal((await pool.query('SELECT estado FROM lotes WHERE id = $1', [active.lotId])).rows[0].estado, 'AGOTADO');
});
