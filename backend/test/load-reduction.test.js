const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const validate = require('../src/infrastructure/http/middlewares/validateRequest');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const errorHandler = require('../src/infrastructure/http/middlewares/errorHandler');
const { createSecurityMiddlewares } = require('../src/infrastructure/http/middlewares/security');
const LotController = require('../src/adapters/controllers/LotController');
const { GetPublicLotAvailability } = require('../src/use-cases/lots/LotUseCases');
const { RequestReservation } = require('../src/use-cases/reservations/PortalReservationUseCases');
const CatalogSyncWorker = require('../src/infrastructure/workers/CatalogSyncWorker');

const P1 = '00000000-0000-4000-8000-000000000001';
const P2 = '00000000-0000-4000-8000-000000000002';

// ─── espera de la reserva con retroceso ────────────────────────────────────────────────────────
test('la espera por la tienda empieza corta y crece hasta un tope, en vez de consultar cada 200 ms', async () => {
  let now = 0;
  const sleeps = [];
  const repo = {
    createPending: async () => ({ id: 'r1', estado: 'PENDIENTE_SYNC', detalles: [] }),
    findById: async () => ({ id: 'r1', estado: 'PENDIENTE_SYNC', detalles: [] })
  };
  const useCase = new RequestReservation(repo, { assertReservationsAvailable: async () => {} }, {
    waitMs: 8000, clock: () => now, sleep: async (ms) => { sleeps.push(ms); now += ms; }
  });
  const reservation = await useCase.execute({ usuarioId: 'c1', items: [{ productoId: P1, cantidad: 1 }] });

  assert.equal(reservation.estado, 'PENDIENTE_SYNC');
  assert.deepEqual(sleeps.slice(0, 6), [100, 150, 225, 338, 500, 500]);
  assert.ok(sleeps.every(ms => ms <= 500));
  // Con 200 ms fijos serían 40 consultas en 8 s; con retroceso son bastantes menos.
  assert.ok(sleeps.length < 20, `${sleeps.length} consultas en 8 s`);
});

test('una reserva que la tienda acepta de inmediato se entrega tras una sola espera de 100 ms', async () => {
  const sleeps = [];
  let reads = 0;
  const repo = {
    createPending: async () => ({ id: 'r1', estado: 'PENDIENTE_SYNC', detalles: [] }),
    findById: async () => { reads += 1; return { id: 'r1', estado: 'PENDIENTE', codigoRetiro: 'KR-ABC123', detalles: [] }; }
  };
  const useCase = new RequestReservation(repo, { assertReservationsAvailable: async () => {} }, { sleep: async (ms) => { sleeps.push(ms); } });
  assert.equal((await useCase.execute({ usuarioId: 'c1', items: [{ productoId: P1, cantidad: 1 }] })).estado, 'PENDIENTE');
  assert.deepEqual(sleeps, [100]);
  assert.equal(reads, 1);
});

// ─── límites de tasa ───────────────────────────────────────────────────────────────────────────
function fakePool() {
  const queries = [];
  return {
    queries,
    query: async (sql, params) => {
      queries.push({ sql, params });
      return { rows: [{ hits: 1, resetAt: new Date(Date.now() + 60000) }], rowCount: 1 };
    }
  };
}

test('el límite general no escribe en la base de datos en cada petición', async () => {
  const pool = fakePool();
  const { general } = createSecurityMiddlewares({ RATE_LIMIT_MAX: '100' }, { pool });
  const app = express();
  app.use(general);
  app.get('/catalogo', (req, res) => res.json({ ok: true }));

  for (let i = 0; i < 25; i++) assert.equal((await request(app).get('/catalogo')).status, 200);
  assert.equal(pool.queries.length, 0, 'ninguna escritura en rate_limit_hits por peticiones de lectura');
});

test('el límite general sigue limitando por instancia', async () => {
  const { general } = createSecurityMiddlewares({ RATE_LIMIT_MAX: '3' }, { pool: fakePool() });
  const app = express();
  app.use(general);
  app.get('/catalogo', (req, res) => res.json({ ok: true }));
  const statuses = [];
  for (let i = 0; i < 5; i++) statuses.push((await request(app).get('/catalogo')).status);
  assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
});

test('los límites de autenticación, reservas e IA siguen compartidos en PostgreSQL', async () => {
  const pool = fakePool();
  const { auth, reservations, ai } = createSecurityMiddlewares({}, { pool });
  const app = express();
  app.post('/auth', auth, (req, res) => res.sendStatus(401));
  app.post('/reservations', reservations, (req, res) => res.sendStatus(201));
  app.post('/ai', ai, (req, res) => res.sendStatus(202));

  await request(app).post('/auth');
  await request(app).post('/reservations');
  await request(app).post('/ai');
  const keys = pool.queries.filter(query => /INSERT INTO rate_limit_hits/.test(query.sql)).map(query => query.params[0]);
  assert.ok(keys.some(key => key.startsWith('auth:')), 'auth');
  assert.ok(keys.some(key => key.startsWith('res:')), 'reservas');
  assert.ok(keys.some(key => key.startsWith('ai:')), 'IA');
  assert.ok(!keys.some(key => key.startsWith('gen:')));
});

// ─── disponibilidad ────────────────────────────────────────────────────────────────────────────
function availabilityApp(lots) {
  const lot = (id, productoId, disponible = 5) => ({
    id, productoId, cantidadDisponible: disponible, cantidadIngresada: 10, estado: 'ACTIVO',
    fechaCaducidad: new Date(Date.now() + 10 * 86400000), calcularDiasParaVencer: () => 10
  });
  const repo = { findAllActive: async () => lots.map(([id, productoId, disponible]) => lot(id, productoId, disponible)) };
  const controller = new LotController(null, new GetPublicLotAvailability(repo));
  const app = express();
  app.get('/availability', validate({ query: schemas.availabilityQuery }), (req, res, next) => controller.getPublicAvailability(req, res, next));
  app.use(errorHandler);
  return app;
}

test('la disponibilidad se puede filtrar por producto y devuelve solo sus lotes', async () => {
  const app = availabilityApp([['l1', P1], ['l2', P2], ['l3', P1], ['l4', P2, 0]]);
  const all = await request(app).get('/availability');
  assert.deepEqual(all.body.data.map(item => item.id), ['l1', 'l2', 'l3'], 'sin filtro se mantiene el comportamiento anterior (sin lotes agotados)');

  const filtered = await request(app).get(`/availability?productoId=${P1}`);
  assert.deepEqual(filtered.body.data.map(item => item.id), ['l1', 'l3']);
  assert.equal(filtered.body.count, 2);
});

test('la disponibilidad rechaza un productoId inválido e ignora parámetros desconocidos', async () => {
  const app = availabilityApp([['l1', P1]]);
  assert.equal((await request(app).get('/availability?productoId=abc')).status, 400);
  assert.equal((await request(app).get('/availability?_=1730000000000')).status, 200, 'un parámetro para saltar la caché no rompe al cliente');
  assert.equal((await request(app).get('/availability?productoId=')).status, 200, 'un filtro vacío equivale a no filtrar');
});

test('la disponibilidad se puede cachear unos segundos y admite solicitudes condicionales', async () => {
  const app = availabilityApp([['l1', P1]]);
  const first = await request(app).get('/availability');
  assert.equal(first.headers['cache-control'], 'public, max-age=5');
  assert.ok(first.headers.etag, 'tiene ETag');
  const second = await request(app).get('/availability').set('If-None-Match', first.headers.etag);
  assert.equal(second.status, 304);
});

// ─── tamaño de los snapshots del catálogo ──────────────────────────────────────────────────────
test('el worker de catálogo avisa una vez por hora si un snapshot se acerca al límite y registra su tamaño', async () => {
  let now = 0;
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  const big = Array.from({ length: 50 }, (_, i) => ({ id: `lote-${i}`, nota: 'x'.repeat(100) }));
  const worker = new CatalogSyncWorker({
    reader: { read: async (section) => (section === 'lotes' ? big : []) },
    transport: { send: async () => ({ applied: true }) },
    warnBytes: 1000, resyncMs: 1, clock: () => now
  });
  try {
    await worker.tick();
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /'lotes'/);
    assert.ok(worker.stats.get('lotes') > 5000);
    assert.ok(worker.stats.get('categorias') < 100);

    now += 10 * 60 * 1000;
    await worker.tick();
    assert.equal(warnings.length, 1, 'no repite el aviso dentro de la hora');
    now += 61 * 60 * 1000;
    await worker.tick();
    assert.equal(warnings.length, 2, 'avisa de nuevo pasada la hora');
  } finally {
    console.warn = originalWarn;
  }
});
