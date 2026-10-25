const test = require('node:test');
const assert = require('node:assert/strict');
const { ProcessStoreCommand } = require('../src/use-cases/reservations/StoreCommandUseCases');
const { ConfirmReservation, CleanExpiredReservations } = require('../src/use-cases/reservations/ReservationUseCases');
const CommandPollerWorker = require('../src/infrastructure/workers/CommandPollerWorker');
const OutboxFlusherWorker = require('../src/infrastructure/workers/OutboxFlusherWorker');
const HttpPortalChannel = require('../src/infrastructure/outbox/HttpPortalChannel');
const HeartbeatSenderWorker = require('../src/infrastructure/workers/HeartbeatSenderWorker');
const {
  OverbookingException, NotFoundException, ValidationException, ForbiddenException
} = require('../src/domain/exceptions/DomainExceptions');

const RID = '00000000-0000-4000-8000-000000000001';
const CLIENT = '00000000-0000-4000-8000-0000000000c1';
const NOW = new Date('2026-10-24T15:00:00.000Z');
const IN_30_MIN = new Date(NOW.getTime() + 30 * 60000).toISOString();

const stored = (overrides = {}) => ({
  id: RID, estado: 'PENDIENTE', codigoRetiro: 'KR-ABC123', fechaExpiracion: new Date(IN_30_MIN),
  detalles: [{
    id: 'd1', reservaId: RID, loteId: 'L1', cantidad: 2, precioUnitario: '1.25', numeroLote: 'L-001',
    productoId: 'P1', productoNombre: 'Leche 1L', codigoBarras: '786100', imagenUrl: null
  }],
  ...overrides
});

const createCommand = (payload = {}) => ({
  id: 'cmd-1', tipo: 'RESERVATION_CREATE', reservaId: RID,
  payload: { clienteId: CLIENT, clienteNombre: 'Ana', fechaExpiracion: IN_30_MIN, items: [{ productoId: 'P1', cantidad: 2 }], ...payload }
});

function fakeStoreRepo(overrides = {}) {
  const calls = { created: [], cancelled: [] };
  return {
    calls,
    findById: async () => null,
    createWithLockedStock: async (reservation, items, options) => { calls.created.push({ reservation, items, options }); return { id: options.remote.id }; },
    cancelWithLockedStock: async (id, actor) => { calls.cancelled.push({ id, actor }); return { id, estado: 'CANCELADA' }; },
    ...overrides
  };
}

test('CREATE: reserva con el id y el cliente del portal y devuelve solo lo que el cliente puede ver', async () => {
  let reads = 0;
  const repo = fakeStoreRepo({ findById: async () => (reads++ === 0 ? null : stored()) });
  const result = await new ProcessStoreCommand(repo, () => NOW).execute(createCommand());

  assert.equal(repo.calls.created[0].options.remote.id, RID);
  assert.equal(repo.calls.created[0].options.remote.clienteNombre, 'Ana');
  assert.equal(repo.calls.created[0].reservation.usuarioId, CLIENT);
  assert.equal(repo.calls.created[0].reservation.fechaExpiracion.toISOString(), IN_30_MIN, 'conserva el plazo que fijó el portal');
  assert.deepEqual(result, {
    status: 'ACCEPTED',
    reservation: {
      codigoRetiro: 'KR-ABC123',
      fechaExpiracion: IN_30_MIN,
      detalles: [{
        loteId: 'L1', cantidad: 2, precioUnitario: 1.25, numeroLote: 'L-001', productoId: 'P1',
        productoNombre: 'Leche 1L', codigoBarras: '786100', imagenUrl: null
      }]
    }
  });
  assert.ok(!('reservaId' in result.reservation.detalles[0]) && !('id' in result.reservation.detalles[0]));
});

test('CREATE es idempotente: si la reserva ya existe devuelve su resultado sin reservar de nuevo', async () => {
  const repo = fakeStoreRepo({ findById: async () => stored() });
  const result = await new ProcessStoreCommand(repo, () => NOW).execute(createCommand());
  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.reservation.codigoRetiro, 'KR-ABC123');
  assert.equal(repo.calls.created.length, 0);
});

test('CREATE vencido antes de atenderse se rechaza sin tocar el stock', async () => {
  const repo = fakeStoreRepo();
  const late = new ProcessStoreCommand(repo, () => new Date(NOW.getTime() + 31 * 60000));
  const result = await late.execute(createCommand());
  assert.equal(result.status, 'REJECTED');
  assert.equal(result.reason, 'EXPIRED');
  assert.equal(repo.calls.created.length, 0);
});

test('CREATE traduce los errores de dominio a rechazos y deja pasar los inesperados', async () => {
  const cases = [
    [new OverbookingException('Stock insuficiente'), 'OVERBOOKING'],
    [new NotFoundException('Producto inexistente'), 'NOT_FOUND'],
    [new ValidationException('Oferta no disponible'), 'VALIDATION']
  ];
  for (const [error, reason] of cases) {
    const repo = fakeStoreRepo({ createWithLockedStock: async () => { throw error; } });
    const result = await new ProcessStoreCommand(repo, () => NOW).execute(createCommand());
    assert.deepEqual(result, { status: 'REJECTED', reason, message: error.message });
  }
  const broken = fakeStoreRepo({ createWithLockedStock: async () => { throw new Error('conexión perdida'); } });
  await assert.rejects(() => new ProcessStoreCommand(broken, () => NOW).execute(createCommand()), /conexión perdida/);
});

test('CREATE con líneas inválidas se rechaza como VALIDATION', async () => {
  const result = await new ProcessStoreCommand(fakeStoreRepo(), () => NOW).execute(createCommand({ items: [] }));
  assert.equal(result.reason, 'VALIDATION');
});

test('CANCEL libera la reserva a nombre del cliente remoto', async () => {
  const repo = fakeStoreRepo();
  const result = await new ProcessStoreCommand(repo, () => NOW).execute({
    id: 'cmd-2', tipo: 'RESERVATION_CANCEL', reservaId: RID, payload: { clienteId: CLIENT }
  });
  assert.deepEqual(result, { status: 'APPLIED', estado: 'CANCELADA' });
  assert.deepEqual(repo.calls.cancelled[0], { id: RID, actor: { id: CLIENT, rol: 'CLIENTE', remote: true } });
});

test('CANCEL informa el estado real si la reserva ya no estaba pendiente o no existe', async () => {
  const cancelCommand = { id: 'cmd-2', tipo: 'RESERVATION_CANCEL', reservaId: RID, payload: { clienteId: CLIENT } };
  const confirmed = fakeStoreRepo({
    cancelWithLockedStock: async () => { throw new ValidationException('No se puede cancelar una reserva en estado CONFIRMADA.'); },
    findById: async () => stored({ estado: 'CONFIRMADA' })
  });
  assert.deepEqual(await new ProcessStoreCommand(confirmed).execute(cancelCommand), { status: 'IGNORED', estado: 'CONFIRMADA' });

  const unknown = fakeStoreRepo({ cancelWithLockedStock: async () => { throw new NotFoundException('no existe'); } });
  assert.deepEqual(await new ProcessStoreCommand(unknown).execute(cancelCommand), { status: 'IGNORED', estado: 'DESCONOCIDA' });

  const foreign = fakeStoreRepo({
    cancelWithLockedStock: async () => { throw new ForbiddenException('otro dueño'); },
    findById: async () => null
  });
  assert.deepEqual(await new ProcessStoreCommand(foreign).execute(cancelCommand), { status: 'IGNORED', estado: 'DESCONOCIDA' });
});

test('un tipo de comando desconocido es un error y no un resultado', async () => {
  await assert.rejects(() => new ProcessStoreCommand(fakeStoreRepo()).execute({ tipo: 'OTRO', reservaId: RID, payload: {} }), ValidationException);
});

function fakeOutbox() {
  const rows = [];
  return {
    rows,
    enqueue: async (item) => { if (rows.some(r => r.clave === item.clave)) return false; rows.push({ id: rows.length + 1, intentos: 0, enviado: false, ...item }); return true; },
    claimDue: async () => rows.filter(r => !r.enviado && !r.bloqueada).map(r => ({ ...r })),
    markSent: async (ids) => { rows.filter(r => ids.includes(r.id)).forEach(r => { r.enviado = true; }); },
    markFailed: async (ids, error) => { rows.filter(r => ids.includes(r.id)).forEach(r => { r.intentos += 1; r.error = error; }); },
    pruneSent: async () => 0,
    pendingCount: async () => rows.filter(r => !r.enviado).length
  };
}

test('el poller ejecuta los comandos en orden, encola cada resultado y los envía sin esperar al siguiente ciclo', async () => {
  const outbox = fakeOutbox();
  const order = [];
  let flushes = 0;
  const poller = new CommandPollerWorker({
    channel: { fetchCommands: async () => [{ id: 'a', tipo: 'X' }, { id: 'b', tipo: 'X' }] },
    processor: { execute: async (command) => { order.push(command.id); return { status: 'ACCEPTED', de: command.id }; } },
    outbox,
    onResultsQueued: async () => { flushes += 1; }
  });
  assert.equal(await poller.pollOnce(), 2);
  assert.deepEqual(order, ['a', 'b']);
  assert.deepEqual(outbox.rows.map(r => [r.tipo, r.clave, r.payload.commandId]), [
    ['COMMAND_RESULT', 'result:a', 'a'], ['COMMAND_RESULT', 'result:b', 'b']
  ]);
  assert.equal(flushes, 1);
});

test('si un comando falla de forma inesperada no se informa nada de él y los demás siguen', async () => {
  const outbox = fakeOutbox();
  const originalError = console.error;
  console.error = () => {};
  try {
    const poller = new CommandPollerWorker({
      channel: { fetchCommands: async () => [{ id: 'a', tipo: 'X' }, { id: 'b', tipo: 'X' }] },
      processor: { execute: async (command) => { if (command.id === 'a') throw new Error('base caída'); return { status: 'ACCEPTED' }; } },
      outbox
    });
    await poller.pollOnce();
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(outbox.rows.map(r => r.clave), ['result:b']);
});

test('el mismo resultado no se encola dos veces si el comando se procesa otra vez', async () => {
  const outbox = fakeOutbox();
  const poller = new CommandPollerWorker({
    channel: { fetchCommands: async () => [{ id: 'a', tipo: 'X' }] },
    processor: { execute: async () => ({ status: 'ACCEPTED' }) },
    outbox
  });
  await poller.pollOnce();
  await poller.pollOnce();
  assert.equal(outbox.rows.length, 1);
});

test('el poller se recupera de errores de red con espera creciente y se detiene al pedírselo', async () => {
  const sleeps = [];
  let calls = 0;
  const originalError = console.error;
  const originalLog = console.log;
  console.error = () => {};
  console.log = () => {};
  const poller = new CommandPollerWorker({
    channel: {
      fetchCommands: async () => {
        calls += 1;
        if (calls <= 2) throw new Error('sin red');
        if (calls === 3) poller.stopped = true;
        return [];
      }
    },
    processor: { execute: async () => ({}) },
    outbox: fakeOutbox(),
    sleep: async (ms) => { sleeps.push(ms); }
  });
  try {
    poller.start();
    await poller.loop;
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
  assert.deepEqual(sleeps, [2000, 4000]);
  assert.equal(calls, 3);
});

test('el flusher envía resultados y agrupa los avisos de estado en un solo lote', async () => {
  const outbox = fakeOutbox();
  await outbox.enqueue({ tipo: 'COMMAND_RESULT', clave: 'result:a', payload: { commandId: 'a', body: { status: 'ACCEPTED' } } });
  await outbox.enqueue({ tipo: 'RESERVATION_STATE', clave: 'state:r1:CONFIRMADA', payload: { reservaId: 'r1', estado: 'CONFIRMADA', at: 'x' } });
  await outbox.enqueue({ tipo: 'RESERVATION_STATE', clave: 'state:r2:EXPIRADA', payload: { reservaId: 'r2', estado: 'EXPIRADA', at: 'x' } });
  const sent = { results: [], events: [] };
  const flusher = new OutboxFlusherWorker({
    outbox,
    channel: {
      sendResult: async (id, body) => { sent.results.push([id, body]); },
      sendEvents: async (events) => { sent.events.push(events); }
    }
  });
  const { sent: count } = await flusher.flush();
  assert.equal(count, 3);
  assert.deepEqual(sent.results, [['a', { status: 'ACCEPTED' }]]);
  assert.equal(sent.events.length, 1);
  assert.deepEqual(sent.events[0].map(e => e.reservaId), ['r1', 'r2']);
  assert.ok(outbox.rows.every(r => r.enviado));
});

test('ante una caída del portal el flusher conserva todo y deja de insistir en ese ciclo', async () => {
  const outbox = fakeOutbox();
  for (const id of ['a', 'b']) await outbox.enqueue({ tipo: 'COMMAND_RESULT', clave: `result:${id}`, payload: { commandId: id, body: {} } });
  const attempted = [];
  const originalError = console.error;
  console.error = () => {};
  try {
    const flusher = new OutboxFlusherWorker({
      outbox,
      channel: { sendResult: async (id) => { attempted.push(id); throw Object.assign(new Error('HTTP 503'), { status: 503 }); } }
    });
    const { sent } = await flusher.flush();
    assert.equal(sent, 0);
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(attempted, ['a'], 'no se sigue con las demás para no perder el orden ni saturar al portal');
  assert.ok(outbox.rows.every(r => !r.enviado));
  assert.equal(outbox.rows[0].intentos, 1);
  assert.equal(await outbox.pendingCount(), 2);
});

test('un rechazo permanente de una fila no bloquea las demás; un 404 la descarta', async () => {
  const outbox = fakeOutbox();
  for (const id of ['a', 'b', 'c']) await outbox.enqueue({ tipo: 'COMMAND_RESULT', clave: `result:${id}`, payload: { commandId: id, body: {} } });
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};
  try {
    const flusher = new OutboxFlusherWorker({
      outbox,
      channel: {
        sendResult: async (id) => {
          if (id === 'a') throw Object.assign(new Error('HTTP 400'), { status: 400 });
          if (id === 'b') throw Object.assign(new Error('HTTP 404'), { status: 404 });
        }
      }
    });
    await flusher.flush();
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
  assert.deepEqual(outbox.rows.map(r => r.enviado), [false, true, true], 'a queda para reintentar; b se descarta; c se envía');
});

test('HttpPortalChannel usa la clave de servicio, el long-poll y expone el código HTTP de los fallos', async () => {
  const calls = [];
  let status = 200;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: status < 400, status, json: async () => ({ success: true, commands: [{ id: 'c1' }] }) };
  };
  const channel = new HttpPortalChannel({ baseUrl: 'https://portal.karen.example', apiKey: 'clave', fetchImpl });

  assert.deepEqual(await channel.fetchCommands({ waitSeconds: 25, limit: 10 }), [{ id: 'c1' }]);
  assert.equal(calls[0].url, 'https://portal.karen.example/internal/v1/store/commands?wait=25&limit=10');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.headers['x-store-key'], 'clave');

  await channel.sendResult('c 1', { status: 'APPLIED', estado: 'CANCELADA' });
  assert.equal(calls[1].url, 'https://portal.karen.example/internal/v1/store/commands/c%201/result');
  assert.deepEqual(JSON.parse(calls[1].options.body), { status: 'APPLIED', estado: 'CANCELADA' });

  await channel.sendEvents([{ reservaId: 'r1', estado: 'CONFIRMADA', at: 'x' }]);
  assert.equal(calls[2].url, 'https://portal.karen.example/internal/v1/store/events');
  assert.deepEqual(JSON.parse(calls[2].options.body), { events: [{ reservaId: 'r1', estado: 'CONFIRMADA', at: 'x' }] });

  status = 503;
  await assert.rejects(() => channel.sendEvents([]), (error) => error.status === 503);
});

test('confirmar en caja exige BODEGUERO o ADMIN y delega en el repositorio, que deja el aviso al portal', async () => {
  const calls = [];
  const uc = new ConfirmReservation({ confirmWithLockedStock: async (id, actor) => { calls.push([id, actor.rol]); return { id, estado: 'CONFIRMADA' }; } });
  assert.equal((await uc.execute(RID, { id: 'u1', rol: 'BODEGUERO' })).estado, 'CONFIRMADA');
  assert.deepEqual(calls, [[RID, 'BODEGUERO']]);
  await assert.rejects(() => uc.execute(RID, { id: 'c1', rol: 'CLIENTE' }), ForbiddenException);
});

test('el barrido de expiración devuelve lo que liberó el repositorio', async () => {
  const uc = new CleanExpiredReservations({ expirePendingWithLockedStock: async () => ({ countLiberadas: 2, reservaIds: ['r1', 'r2'] }) });
  assert.deepEqual(await uc.execute(), { countLiberadas: 2, reservaIds: ['r1', 'r2'] });
});

test('el heartbeat informa cuántos avisos esperan en la bandeja de salida', async () => {
  const payloads = [];
  const worker = new HeartbeatSenderWorker({ send: async (payload) => { payloads.push(payload); } }, 1000, {
    storeId: 'tienda-1', version: '1.0.0', getPendingEvents: async () => 7
  });
  await worker.ping();
  assert.equal(payloads[0].pendingEvents, 7);

  const broken = new HeartbeatSenderWorker({ send: async (payload) => { payloads.push(payload); } }, 1000, {
    getPendingEvents: async () => { throw new Error('base caída'); }
  });
  await broken.ping();
  assert.equal(payloads[1].pendingEvents, 0, 'si no puede contarlos, el latido sale igual');
});
