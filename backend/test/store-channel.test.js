const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createInternalRouter = require('../src/infrastructure/http/routes/internalRouter');
const errorHandler = require('../src/infrastructure/http/middlewares/errorHandler');
const { createServiceAuth, SERVICE_KEY_HEADER } = require('../src/infrastructure/http/middlewares/serviceAuth');
const StoreChannelController = require('../src/adapters/controllers/StoreChannelController');
const {
  DeliverStoreCommands,
  ApplyStoreCommandResult,
  ApplyReservationEvents
} = require('../src/use-cases/reservations/PortalReservationUseCases');

const KEY = 'k'.repeat(40);
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const accepted = {
  status: 'ACCEPTED',
  reservation: {
    codigoRetiro: 'KR-ABC123',
    fechaExpiracion: '2026-10-24T16:00:00.000Z',
    detalles: [{
      loteId: uuid(1), cantidad: 2, precioUnitario: 1.25, numeroLote: 'L-001', productoId: uuid(2),
      productoNombre: 'Leche entera 1L', codigoBarras: '7861001234567', imagenUrl: null
    }]
  }
};

async function withChannel(run, repositoryOverrides = {}) {
  const calls = { claim: [], resolve: [], events: [] };
  const repository = {
    claimCommands: async (options) => { calls.claim.push(options); return [{ id: uuid(9), tipo: 'RESERVATION_CREATE', reservaId: uuid(8), payload: { clienteId: uuid(7), items: [] }, intentos: 1 }]; },
    resolveCommand: async (id, result) => { calls.resolve.push({ id, result }); return { applied: true }; },
    applyStoreStates: async (events) => { calls.events.push(events); return { applied: events.length, ignored: 0 }; },
    ...repositoryOverrides
  };
  const app = express();
  app.use('/internal/v1', createInternalRouter(
    {
      heartbeatController: {},
      storeChannelController: new StoreChannelController(
        new DeliverStoreCommands(repository, { sleep: async () => {} }),
        new ApplyStoreCommandResult(repository),
        new ApplyReservationEvents(repository)
      )
    },
    createServiceAuth(KEY),
    [express.json()]
  ));
  app.use(errorHandler);
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  try {
    await run({ calls, base: `http://127.0.0.1:${server.address().port}/internal/v1/store` });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

const headers = { 'content-type': 'application/json', [SERVICE_KEY_HEADER]: KEY };
const post = (url, body, extra = headers) => fetch(url, { method: 'POST', headers: extra, body: JSON.stringify(body) });

test('GET /store/commands entrega los comandos pendientes de la tienda', () => withChannel(async ({ base, calls }) => {
  const res = await fetch(`${base}/commands?wait=0&limit=5`, { headers });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.commands.length, 1);
  assert.equal(body.commands[0].tipo, 'RESERVATION_CREATE');
  assert.equal(calls.claim[0].limit, 5);
}));

test('el canal de comandos exige la clave de servicio', () => withChannel(async ({ base, calls }) => {
  assert.equal((await fetch(`${base}/commands`)).status, 401);
  assert.equal((await post(`${base}/commands/${uuid(9)}/result`, accepted, { 'content-type': 'application/json' })).status, 401);
  assert.equal((await post(`${base}/events`, { events: [] }, { 'content-type': 'application/json' })).status, 401);
  assert.equal(calls.claim.length, 0);
  assert.equal(calls.resolve.length, 0);
}));

test('rechaza parámetros de long-poll fuera de rango', () => withChannel(async ({ base }) => {
  assert.equal((await fetch(`${base}/commands?wait=99`, { headers })).status, 400);
  assert.equal((await fetch(`${base}/commands?limit=0`, { headers })).status, 400);
  assert.equal((await fetch(`${base}/commands?otro=1`, { headers })).status, 400);
}));

test('POST /store/commands/:id/result acepta un resultado válido de cada tipo', () => withChannel(async ({ base, calls }) => {
  for (const body of [
    accepted,
    { status: 'REJECTED', reason: 'OVERBOOKING', message: 'Stock insuficiente' },
    { status: 'APPLIED', estado: 'CANCELADA' },
    { status: 'IGNORED', estado: 'CONFIRMADA' }
  ]) {
    const res = await post(`${base}/commands/${uuid(9)}/result`, body);
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal((await res.json()).applied, true);
  }
  assert.equal(calls.resolve.length, 4);
  assert.equal(calls.resolve[0].id, uuid(9));
}));

test('rechaza resultados con campos extra, códigos inválidos o razones desconocidas', () => withChannel(async ({ base, calls }) => {
  const bad = [
    { ...accepted, reservation: { ...accepted.reservation, codigoRetiro: 'XX-1' } },
    { ...accepted, reservation: { ...accepted.reservation, detalles: [] } },
    { ...accepted, reservation: { ...accepted.reservation, detalles: [{ ...accepted.reservation.detalles[0], costoUnitario: 0.5 }] } },
    { status: 'REJECTED', reason: 'PORQUE_SI' },
    { status: 'APPLIED', estado: 'PENDIENTE' },
    { status: 'OTRO' }
  ];
  for (const body of bad) {
    assert.equal((await post(`${base}/commands/${uuid(9)}/result`, body)).status, 400, JSON.stringify(body).slice(0, 80));
  }
  assert.equal((await post(`${base}/commands/no-es-uuid/result`, accepted)).status, 400);
  assert.equal(calls.resolve.length, 0);
}));

test('un comando desconocido responde 404', () => withChannel(async ({ base }) => {
  const { NotFoundException } = require('../src/domain/exceptions/DomainExceptions');
  await withChannel(async ({ base: other }) => {
    assert.equal((await post(`${other}/commands/${uuid(5)}/result`, { status: 'APPLIED', estado: 'CANCELADA' })).status, 404);
  }, { resolveCommand: async () => { throw new NotFoundException('Comando no encontrado'); } });
  assert.ok(base);
}));

test('POST /store/events aplica cambios de estado en lote', () => withChannel(async ({ base, calls }) => {
  const events = [
    { reservaId: uuid(1), estado: 'CONFIRMADA', at: '2026-10-24T15:00:00.000Z' },
    { reservaId: uuid(2), estado: 'EXPIRADA', at: '2026-10-24T15:01:00.000Z' }
  ];
  const res = await post(`${base}/events`, { events });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true, applied: 2, ignored: 0 });
  assert.deepEqual(calls.events[0], events);
}));

test('POST /store/events rechaza lotes vacíos, estados no permitidos y exceso de eventos', () => withChannel(async ({ base, calls }) => {
  assert.equal((await post(`${base}/events`, { events: [] })).status, 400);
  assert.equal((await post(`${base}/events`, { events: [{ reservaId: uuid(1), estado: 'PENDIENTE', at: '2026-10-24T15:00:00.000Z' }] })).status, 400);
  const many = Array.from({ length: 201 }, (_, i) => ({ reservaId: uuid(i + 1), estado: 'EXPIRADA', at: '2026-10-24T15:00:00.000Z' }));
  assert.equal((await post(`${base}/events`, { events: many })).status, 400);
  assert.equal(calls.events.length, 0);
}));
