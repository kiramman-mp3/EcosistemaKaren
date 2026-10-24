const test = require('node:test');
const assert = require('node:assert/strict');
const CatalogSyncWorker = require('../src/infrastructure/workers/CatalogSyncWorker');
const HttpCatalogSyncTransport = require('../src/infrastructure/sync/HttpCatalogSyncTransport');
const PostgresCatalogSnapshotReader = require('../src/infrastructure/sync/PostgresCatalogSnapshotReader');
const { SECTION_ORDER } = require('../src/infrastructure/sync/catalogSections');

function setup({ data, response = { applied: true } } = {}) {
  const state = {
    data: data || { categorias: [{ id: 'c1' }], productos: [{ id: 'p1' }], lotes: [{ id: 'l1', cantidadDisponible: 5 }], promociones: [] },
    sent: [],
    now: 1_000_000,
    failNext: false,
    response
  };
  const reader = { read: async (section) => structuredClone(state.data[section]) };
  const transport = {
    send: async (payload) => {
      if (state.failNext) throw new Error('sin red');
      state.sent.push(payload);
      return typeof state.response === 'function' ? state.response(payload) : state.response;
    }
  };
  const worker = new CatalogSyncWorker({ reader, transport, intervalMs: 15000, resyncMs: 600000, clock: () => state.now });
  return { state, worker };
}

test('el primer ciclo envía todas las secciones en orden de dependencia', async () => {
  const { state, worker } = setup();
  await worker.tick();
  assert.deepEqual(state.sent.map(s => s.section), SECTION_ORDER);
});

test('si nada cambió no se envía nada', async () => {
  const { state, worker } = setup();
  await worker.tick();
  state.sent.length = 0;
  state.now += 15000;
  await worker.tick();
  assert.equal(state.sent.length, 0);
});

test('solo se reenvía la sección que cambió', async () => {
  const { state, worker } = setup();
  await worker.tick();
  state.sent.length = 0;
  state.data.lotes[0].cantidadDisponible = 4;
  state.now += 15000;
  await worker.tick();
  assert.deepEqual(state.sent.map(s => s.section), ['lotes']);
  assert.equal(state.sent[0].items[0].cantidadDisponible, 4);
});

test('cada envío usa una versión estrictamente creciente', async () => {
  const { state, worker } = setup();
  await worker.tick();
  state.data.productos[0].nombre = 'Nuevo';
  state.data.lotes[0].cantidadDisponible = 1;
  await worker.tick();
  const versions = state.sent.map(s => s.version);
  assert.deepEqual([...versions].sort((a, b) => a - b), versions);
  assert.equal(new Set(versions).size, versions.length);
});

test('pasado el intervalo de reenvío completo se vuelve a publicar todo aunque no haya cambios', async () => {
  const { state, worker } = setup();
  await worker.tick();
  state.sent.length = 0;
  state.now += 600000;
  await worker.tick();
  assert.deepEqual(state.sent.map(s => s.section), SECTION_ORDER);
});

test('una falla no marca la sección como enviada y se reintenta, registrando solo el primer fallo', async () => {
  const { state, worker } = setup();
  const errors = [];
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...args) => errors.push(args.join(' '));
  console.log = () => {};
  try {
    state.failNext = true;
    await worker.tick();
    await worker.tick();
    assert.equal(state.sent.length, 0);
    assert.equal(errors.length, 1);
    assert.equal(worker.consecutiveFailures, 2);

    state.failNext = false;
    await worker.tick();
    assert.deepEqual(state.sent.map(s => s.section), SECTION_ORDER);
    assert.equal(worker.consecutiveFailures, 0);
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
});

test('si el portal ya tiene una versión mayor, la tienda sube la suya y reintenta', async () => {
  const { state, worker } = setup({
    data: { categorias: [{ id: 'c1' }], productos: [], lotes: [], promociones: [] },
    response: (payload) => (payload.version < 5_000_000
      ? { applied: false, currentVersion: 5_000_000 }
      : { applied: true })
  });
  await worker.tick();
  assert.equal(worker.sent.has('categorias'), false, 'el envío rechazado no se da por confirmado');
  await worker.tick();
  assert.ok(state.sent.at(-1).version > 5_000_000);
  assert.equal(worker.sent.has('categorias'), true);
});

test('un ciclo en curso no se solapa con el siguiente', async () => {
  const { state, worker } = setup();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  worker.transport.send = async (payload) => {
    state.sent.push(payload);
    await gate;
    return { applied: true };
  };
  const first = worker.tick();
  await new Promise(resolve => setImmediate(resolve));
  await worker.tick();
  assert.equal(state.sent.length, 1, 'el segundo ciclo se omite mientras el primero espera al portal');
  release();
  await first;
  assert.deepEqual(state.sent.map(s => s.section), SECTION_ORDER, 'el primer ciclo termina todas las secciones');
});

test('HttpCatalogSyncTransport envía la clave, el cuerpo y devuelve la respuesta del portal', async () => {
  const calls = [];
  let status = 200;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: status < 400, status, json: async () => ({ success: true, applied: true }) };
  };
  const transport = new HttpCatalogSyncTransport({ baseUrl: 'https://portal.karen.example', apiKey: 'clave', fetchImpl });
  const result = await transport.send({ section: 'lotes', version: 9, items: [{ id: 'x' }] });

  assert.equal(calls[0].url, 'https://portal.karen.example/internal/v1/store/sync/catalog');
  assert.equal(calls[0].options.headers['x-store-key'], 'clave');
  assert.deepEqual(JSON.parse(calls[0].options.body), { section: 'lotes', version: 9, items: [{ id: 'x' }] });
  assert.equal(result.applied, true);

  status = 503;
  await assert.rejects(() => transport.send({ section: 'lotes', version: 10, items: [] }), /HTTP 503.*'lotes'/);
});

test('el lector solo selecciona campos públicos y filtra lotes y promociones vigentes', async () => {
  const queries = [];
  const pool = { query: async (sql) => { queries.push(sql); return { rows: [] }; } };
  const reader = new PostgresCatalogSnapshotReader(pool);
  for (const section of SECTION_ORDER) await reader.read(section);

  const all = queries.join('\n');
  for (const internal of ['costo_unitario', 'ubicacion', 'fecha_elaboracion', 'cantidad_reservada', 'razon_ia', 'modelo_ia', 'min_stock_alerta', 'aprobada_por', 'password_hash']) {
    assert.ok(!all.includes(internal), `el snapshot no debe leer ${internal}`);
  }
  const lots = queries.find(sql => sql.includes('FROM lotes l'));
  assert.match(lots, /estado = 'ACTIVO'/);
  assert.match(lots, /cantidad_disponible > 0/);
  assert.match(lots, /fecha_caducidad > CURRENT_DATE/);
  const promos = queries.find(sql => sql.includes('FROM promociones_ia'));
  assert.match(promos, /estado = 'APROBADA'/);
  assert.match(promos, /activa = TRUE/);
});

test('el lector convierte marcas de tiempo a ISO 8601', async () => {
  const pool = { query: async () => ({ rows: [{ id: 'p1', loteId: 'l1', descuentoPorcentaje: 10, frasePromocional: 'x', createdAt: new Date('2026-10-24T12:00:00Z') }] }) };
  const rows = await new PostgresCatalogSnapshotReader(pool).read('promociones');
  assert.equal(rows[0].createdAt, '2026-10-24T12:00:00.000Z');
});
