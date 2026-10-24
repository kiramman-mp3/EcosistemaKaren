const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RequestReservation,
  CancelPortalReservation,
  DeliverStoreCommands,
  GetPortalReservationByCode
} = require('../src/use-cases/reservations/PortalReservationUseCases');
const {
  OverbookingException,
  ValidationException,
  NotFoundException,
  ServiceUnavailableException
} = require('../src/domain/exceptions/DomainExceptions');

const ITEMS = [{ productoId: 'p1', cantidad: 2 }];
const available = { assertReservationsAvailable: async () => {} };

function fakeRepo({ afterPolls = null, final = null } = {}) {
  const calls = { created: [], found: 0 };
  return {
    calls,
    async createPending(data) {
      calls.created.push(data);
      return { id: 'r1', estado: 'PENDIENTE_SYNC', usuarioId: data.clienteId, detalles: [] };
    },
    async findById() {
      calls.found += 1;
      if (afterPolls !== null && calls.found >= afterPolls) return final;
      return { id: 'r1', estado: 'PENDIENTE_SYNC', detalles: [] };
    }
  };
}

test('RequestReservation exige usuario y normaliza las líneas repetidas antes de encolar', async () => {
  const repo = fakeRepo();
  const uc = new RequestReservation(repo, available, { waitMs: 0 });
  await assert.rejects(() => uc.execute({ usuarioId: null, items: ITEMS }), ValidationException);

  await uc.execute({ usuarioId: 'c1', items: [{ productoId: 'p1', cantidad: 1 }, { productoId: 'p1', cantidad: 2 }] });
  assert.deepEqual(repo.calls.created[0].items, [{ productoId: 'p1', promocionId: undefined, cantidad: 3 }]);
  assert.equal(repo.calls.created[0].clienteId, 'c1');
  assert.ok(repo.calls.created[0].fechaExpiracion > new Date(Date.now() + 29 * 60000), 'el plazo es de 30 minutos');
});

test('sin heartbeat vigente no se guarda ni se encola nada', async () => {
  const repo = fakeRepo();
  const blocked = { assertReservationsAvailable: async () => { throw new ServiceUnavailableException('Reservas bloqueadas'); } };
  await assert.rejects(() => new RequestReservation(repo, blocked).execute({ usuarioId: 'c1', items: ITEMS }), ServiceUnavailableException);
  assert.equal(repo.calls.created.length, 0);
});

test('devuelve la reserva aceptada en la misma llamada si la tienda responde durante la espera', async () => {
  const accepted = { id: 'r1', estado: 'PENDIENTE', codigoRetiro: 'KR-ABC123', detalles: [{ cantidad: 2 }] };
  const repo = fakeRepo({ afterPolls: 3, final: accepted });
  const uc = new RequestReservation(repo, available, { waitMs: 8000, pollMs: 1, sleep: async () => {} });
  assert.deepEqual(await uc.execute({ usuarioId: 'c1', items: ITEMS }), accepted);
  assert.equal(repo.calls.found, 3);
});

test('si la tienda tarda más que la espera, devuelve PENDIENTE_SYNC sin fallar', async () => {
  let now = 0;
  const repo = fakeRepo();
  const uc = new RequestReservation(repo, available, { waitMs: 8000, pollMs: 1, sleep: async () => {}, clock: () => (now += 3000) });
  assert.equal((await uc.execute({ usuarioId: 'c1', items: ITEMS })).estado, 'PENDIENTE_SYNC');
});

test('traduce los rechazos de la tienda a los errores que ya entienden los clientes', async () => {
  const cases = [
    ['OVERBOOKING', OverbookingException, 409],
    ['VALIDATION', ValidationException, 400],
    ['EXPIRED', ValidationException, 400],
    ['NOT_FOUND', NotFoundException, 404],
    ['STORE_ERROR', ServiceUnavailableException, 503]
  ];
  for (const [motivo, ErrorClass, status] of cases) {
    const repo = fakeRepo({
      afterPolls: 1,
      final: { id: 'r1', estado: 'RECHAZADA', motivoRechazo: motivo, mensajeRechazo: `rechazo ${motivo}` }
    });
    const uc = new RequestReservation(repo, available, { waitMs: 1000, pollMs: 1, sleep: async () => {} });
    await assert.rejects(() => uc.execute({ usuarioId: 'c1', items: ITEMS }), (error) => {
      assert.ok(error instanceof ErrorClass, `${motivo} debe ser ${ErrorClass.name}`);
      assert.equal(error.statusCode, status);
      assert.equal(error.message, `rechazo ${motivo}`);
      return true;
    });
  }
});

test('GetPortalReservationByCode responde 404 si el código no existe', async () => {
  const uc = new GetPortalReservationByCode({ findByCode: async () => null });
  await assert.rejects(() => uc.execute('KR-NOEXISTE'), NotFoundException);
});

test('CancelPortalReservation exige una identidad y delega en el repositorio', async () => {
  const seen = [];
  const uc = new CancelPortalReservation({ cancelByClient: async (id, actor) => { seen.push([id, actor]); return { id, estado: 'CANCELADA' }; } });
  await assert.rejects(() => uc.execute('r1', null), ValidationException);
  await assert.rejects(() => uc.execute('r1', { id: 'c1' }), ValidationException);
  assert.equal((await uc.execute('r1', { id: 'c1', rol: 'CLIENTE' })).estado, 'CANCELADA');
  assert.deepEqual(seen, [['r1', { id: 'c1', rol: 'CLIENTE' }]]);
});

test('DeliverStoreCommands espera comandos con long-poll y vuelve al instante si ya hay', async () => {
  let now = 0;
  const sleeps = [];
  let available_ = 0;
  const repo = { claimCommands: async () => (available_++ >= 2 ? [{ id: 'c1' }] : []) };
  const uc = new DeliverStoreCommands(repo, { pollMs: 500, clock: () => now, sleep: async (ms) => { sleeps.push(ms); now += ms; } });
  const commands = await uc.execute({ waitSeconds: 25, limit: 20 });
  assert.deepEqual(commands, [{ id: 'c1' }]);
  assert.deepEqual(sleeps, [500, 500]);

  const immediate = new DeliverStoreCommands({ claimCommands: async () => [{ id: 'x' }] }, { clock: () => now, sleep: async () => assert.fail('no debe esperar') });
  assert.equal((await immediate.execute({ waitSeconds: 25 })).length, 1);
});

test('DeliverStoreCommands devuelve vacío al agotar la espera o si el cliente se desconecta', async () => {
  let now = 0;
  const repo = { claimCommands: async () => [] };
  const timed = new DeliverStoreCommands(repo, { pollMs: 500, clock: () => now, sleep: async (ms) => { now += ms; } });
  assert.deepEqual(await timed.execute({ waitSeconds: 2 }), []);
  assert.equal(now, 2000, 'consulta cada 500 ms hasta cumplir la espera');

  const controller = new AbortController();
  now = 0;
  const aborted = new DeliverStoreCommands(repo, { pollMs: 500, clock: () => now, sleep: async (ms) => { now += ms; controller.abort(); } });
  assert.deepEqual(await aborted.execute({ waitSeconds: 25, signal: controller.signal }), []);
  assert.equal(now, 500, 'deja de esperar apenas se aborta la solicitud');
});
