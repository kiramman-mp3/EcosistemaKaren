require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');
const PortalRepo = require('../src/adapters/repositories/PostgresPortalReservationRepository');
const { ExtendPortalReservation } = require('../src/use-cases/reservations/PortalReservationUseCases');
const { ProcessStoreCommand } = require('../src/use-cases/reservations/StoreCommandUseCases');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const {
  ValidationException, NotFoundException, ForbiddenException, ConflictException, ServiceUnavailableException
} = require('../src/domain/exceptions/DomainExceptions');

const RID = '00000000-0000-4000-8000-000000000001';
const CLIENT = '00000000-0000-4000-8000-0000000000c1';
const ONLINE = { assertReservationsAvailable: async () => {} };
const sleepNoop = async () => {};
const quick = { sleep: sleepNoop, waitMs: 1000 };

// ─── caso de uso del portal (repositorio simulado) ─────────────────────────────────────────────
function fakeRepo({ outcomes, request = async () => ({ commandId: 'c1', until: new Date() }) }) {
  const state = { polls: 0, abandoned: [] };
  return {
    state,
    requestExtension: request,
    getCommandOutcome: async () => outcomes[Math.min(state.polls++, outcomes.length - 1)],
    abandonCommand: async (id) => { state.abandoned.push(id); return true; },
    findById: async (id) => ({ id, estado: 'PENDIENTE', fechaExpiracion: new Date('2026-10-24T18:00:00Z') })
  };
}

test('extender espera la respuesta de la tienda y devuelve la reserva con su nuevo plazo', async () => {
  const repo = fakeRepo({ outcomes: [{ estado: 'ENTREGADO' }, { estado: 'ENTREGADO' }, { estado: 'RESUELTO', resultado: { status: 'EXTENDED', fechaExpiracion: '2026-10-24T18:00:00.000Z' } }] });
  const uc = new ExtendPortalReservation(repo, ONLINE, quick);
  const result = await uc.execute(RID, { id: CLIENT, rol: 'CLIENTE' }, 30);
  assert.equal(result.id, RID);
  assert.equal(repo.state.polls, 3);
  assert.deepEqual(repo.state.abandoned, []);
});

test('sin latido de la tienda no se acepta la extensión ni se encola nada', async () => {
  let requested = false;
  const repo = fakeRepo({ outcomes: [], request: async () => { requested = true; return { commandId: 'c1' }; } });
  const offline = { assertReservationsAvailable: async () => { throw new ServiceUnavailableException('Tienda sin conexión.'); } };
  await assert.rejects(() => new ExtendPortalReservation(repo, offline, quick).execute(RID, { id: CLIENT }, 30), ServiceUnavailableException);
  assert.equal(requested, false);
});

test('si la tienda no responde a tiempo, el comando se descarta y el cliente recibe 503', async () => {
  let now = 0;
  const repo = fakeRepo({ outcomes: [{ estado: 'PENDIENTE' }] });
  const uc = new ExtendPortalReservation(repo, ONLINE, { waitMs: 1000, clock: () => now, sleep: async (ms) => { now += ms; } });
  await assert.rejects(() => uc.execute(RID, { id: CLIENT }, 30), ServiceUnavailableException);
  assert.deepEqual(repo.state.abandoned, ['c1']);
});

test('el rechazo de la tienda llega al cliente con su mensaje y el error que corresponde', async () => {
  const rejected = (reason) => fakeRepo({ outcomes: [{ estado: 'RESUELTO', resultado: { status: 'REJECTED', reason, message: `motivo ${reason}` } }] });
  const run = (reason) => new ExtendPortalReservation(rejected(reason), ONLINE, quick).execute(RID, { id: CLIENT }, 30);
  await assert.rejects(() => run('VALIDATION'), (e) => e instanceof ValidationException && /motivo VALIDATION/.test(e.message));
  await assert.rejects(() => run('EXPIRED'), ValidationException);
  await assert.rejects(() => run('NOT_FOUND'), NotFoundException);
  await assert.rejects(() => run('STORE_ERROR'), ServiceUnavailableException);
});

// ─── comando en la tienda ──────────────────────────────────────────────────────────────────────
const extendCommand = (payload = {}) => ({
  id: 'cmd-9', tipo: 'RESERVATION_EXTEND', reservaId: RID,
  payload: { clienteId: CLIENT, minutosAdicionales: 30, hasta: '2026-10-24T18:00:00.000Z', maxTotalMinutos: 240, ...payload }
});

test('la tienda extiende con el vencimiento de destino y un tope que el portal no puede aflojar', async () => {
  const calls = [];
  const repo = { extendTimeWithLockedStock: async (...args) => { calls.push(args); return { fechaExpiracion: new Date('2026-10-24T18:00:00Z') }; } };
  const result = await new ProcessStoreCommand(repo).execute(extendCommand({ maxTotalMinutos: 9999 }));
  assert.deepEqual(result, { status: 'EXTENDED', fechaExpiracion: '2026-10-24T18:00:00.000Z' });
  const [id, actor, minutes, options] = calls[0];
  assert.equal(id, RID);
  assert.deepEqual(actor, { id: CLIENT, rol: 'CLIENTE', remote: true });
  assert.equal(minutes, 30);
  assert.equal(options.until, '2026-10-24T18:00:00.000Z');
  assert.equal(options.maxTotalMinutes, 240, 'el tope de la tienda manda');
});

test('la tienda rechaza (no falla) cuando la reserva no existe, venció o excede el tope', async () => {
  const failing = (error) => new ProcessStoreCommand({ extendTimeWithLockedStock: async () => { throw error; } });
  assert.deepEqual(await failing(new NotFoundException('no existe')).execute(extendCommand()), { status: 'REJECTED', reason: 'NOT_FOUND', message: 'no existe' });
  assert.deepEqual(await failing(new ValidationException('tope')).execute(extendCommand()), { status: 'REJECTED', reason: 'VALIDATION', message: 'tope' });
  assert.equal((await failing(new ForbiddenException('ajena')).execute(extendCommand())).reason, 'VALIDATION');
  await assert.rejects(() => failing(new Error('base caída')).execute(extendCommand()), /base caída/);
});

test('el esquema del resultado acepta EXTENDED y rechaza campos de más', () => {
  assert.ok(schemas.storeCommandResultBody.safeParse({ status: 'EXTENDED', fechaExpiracion: '2026-10-24T18:00:00.000Z' }).success);
  assert.equal(schemas.storeCommandResultBody.safeParse({ status: 'EXTENDED', fechaExpiracion: 'mañana' }).success, false);
  assert.equal(schemas.storeCommandResultBody.safeParse({ status: 'EXTENDED', fechaExpiracion: '2026-10-24T18:00:00.000Z', extra: 1 }).success, false);
});

// ─── repositorio del portal con PostgreSQL real (se omite sin base migrada) ────────────────────
const SUFFIX = `${Date.now()}`;
let pool;
let ready = false;
const created = { users: [], reservations: [] };

test.before(async () => {
  if (!(await testConnection())) return;
  pool = getPool();
  const tables = await pool.query(`SELECT to_regclass('public.reservas_portal') AS t,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'comandos_tienda' AND column_name = 'resultado')::int AS resultado`);
  ready = Boolean(tables.rows[0].t) && tables.rows[0].resultado === 1;
});

test.after(async () => {
  if (ready) {
    await pool.query('DELETE FROM reservas_portal WHERE id = ANY($1::uuid[])', [created.reservations]);
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::uuid[])', [created.users]);
  }
  await closePool();
});

async function createUser() {
  const hash = await bcrypt.hash('ClaveSegura123', 4);
  const res = await pool.query(
    'INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    ['Cliente cola', `cola.${SUFFIX}.${created.users.length}@example.test`, 'CLIENTE', hash]
  );
  created.users.push(res.rows[0].id);
  return res.rows[0].id;
}

// Reserva ya aceptada por la tienda (PENDIENTE), con `minutes` de vida.
async function acceptedReservation(repo, owner, minutes = 30) {
  const pending = await repo.createPending({
    clienteId: owner, fechaExpiracion: new Date(Date.now() + minutes * 60000),
    items: [{ productoId: '00000000-0000-4000-8000-000000000002', cantidad: 1 }]
  });
  created.reservations.push(pending.id);
  const [create] = (await repo.claimCommands({ limit: 100 })).filter(c => c.reservaId === pending.id);
  await repo.resolveCommand(create.id, {
    status: 'ACCEPTED',
    reservation: { codigoRetiro: `KR-${SUFFIX.slice(-5)}${String(created.reservations.length).padStart(2, '0')}`, fechaExpiracion: new Date(Date.now() + minutes * 60000).toISOString(), detalles: [{
      loteId: '00000000-0000-4000-8000-000000000003', cantidad: 1, precioUnitario: 1.5, numeroLote: 'L1',
      productoId: '00000000-0000-4000-8000-000000000002', productoNombre: 'Producto', codigoBarras: '786', imagenUrl: null
    }] }
  });
  return pending.id;
}

test('el portal encola la extensión, la tienda la entrega y el resultado actualiza el plazo', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PortalRepo(pool);
  const owner = await createUser();
  const id = await acceptedReservation(repo, owner);
  const before = new Date((await repo.findById(id)).fechaExpiracion);

  const { commandId, until } = await repo.requestExtension(id, { id: owner }, 30);
  assert.equal(until.getTime() - before.getTime(), 30 * 60000);

  const delivered = (await repo.claimCommands({ limit: 100 })).find(c => c.id === commandId);
  assert.equal(delivered.tipo, 'RESERVATION_EXTEND');
  assert.equal(delivered.payload.hasta, until.toISOString());
  assert.equal(delivered.payload.maxTotalMinutos, 240);

  const outcomeBefore = await repo.getCommandOutcome(commandId);
  assert.notEqual(outcomeBefore.estado, 'RESUELTO');

  await repo.resolveCommand(commandId, { status: 'EXTENDED', fechaExpiracion: until.toISOString() });
  assert.equal(new Date((await repo.findById(id)).fechaExpiracion).getTime(), until.getTime());
  const outcome = await repo.getCommandOutcome(commandId);
  assert.equal(outcome.estado, 'RESUELTO');
  assert.equal(outcome.resultado.status, 'EXTENDED');

  // Un resultado atrasado o repetido no acorta el plazo.
  await pool.query("UPDATE reservas_portal SET fecha_expiracion = fecha_expiracion + interval '10 minutes' WHERE id = $1", [id]);
  const later = new Date((await repo.findById(id)).fechaExpiracion);
  const second = await repo.requestExtension(id, { id: owner }, 5);
  await repo.claimCommands({ limit: 100 });
  await repo.resolveCommand(second.commandId, { status: 'EXTENDED', fechaExpiracion: until.toISOString() });
  assert.equal(new Date((await repo.findById(id)).fechaExpiracion).getTime(), later.getTime());
});

test('el portal no encola extensiones ajenas, duplicadas, pasadas del tope ni de reservas no aceptadas', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PortalRepo(pool);
  const owner = await createUser();
  const stranger = await createUser();
  const id = await acceptedReservation(repo, owner);

  await assert.rejects(() => repo.requestExtension(id, { id: stranger }, 30), ForbiddenException);
  await assert.rejects(() => repo.requestExtension('00000000-0000-4000-8000-0000000000ff', { id: owner }, 30), NotFoundException);

  const first = await repo.requestExtension(id, { id: owner }, 30);
  await assert.rejects(() => repo.requestExtension(id, { id: owner }, 30), ConflictException);
  assert.equal(await repo.abandonCommand(first.commandId), true);
  assert.equal(await repo.abandonCommand(first.commandId), false, 'ya estaba descartado');
  // Con el comando descartado ya se puede pedir otro.
  await repo.requestExtension(id, { id: owner }, 30);

  const nearCap = await acceptedReservation(repo, owner, 230);
  await assert.rejects(() => repo.requestExtension(nearCap, { id: owner }, 30), (e) => e instanceof ValidationException && /4 horas/.test(e.message));

  const awaiting = await repo.createPending({
    clienteId: owner, fechaExpiracion: new Date(Date.now() + 1800000),
    items: [{ productoId: '00000000-0000-4000-8000-000000000002', cantidad: 1 }]
  });
  created.reservations.push(awaiting.id);
  await assert.rejects(() => repo.requestExtension(awaiting.id, { id: owner }, 30), /confirmando/);
});

test('un rechazo de la tienda se guarda y no cambia el plazo', async (t) => {
  if (!ready) return t.skip('PostgreSQL migrado no disponible');
  const repo = new PortalRepo(pool);
  const owner = await createUser();
  const id = await acceptedReservation(repo, owner);
  const before = new Date((await repo.findById(id)).fechaExpiracion);
  const { commandId } = await repo.requestExtension(id, { id: owner }, 30);
  await repo.claimCommands({ limit: 100 });

  await repo.resolveCommand(commandId, { status: 'REJECTED', reason: 'VALIDATION', message: 'Una reserva puede durar como máximo 4 horas en total.' });
  assert.equal(new Date((await repo.findById(id)).fechaExpiracion).getTime(), before.getTime());
  assert.equal((await repo.getCommandOutcome(commandId)).resultado.reason, 'VALIDATION');
});
