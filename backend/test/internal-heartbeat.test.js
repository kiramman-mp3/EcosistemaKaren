const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createInternalRouter = require('../src/infrastructure/http/routes/internalRouter');
const errorHandler = require('../src/infrastructure/http/middlewares/errorHandler');
const { createServiceAuth, SERVICE_KEY_HEADER } = require('../src/infrastructure/http/middlewares/serviceAuth');
const HeartbeatController = require('../src/adapters/controllers/HeartbeatController');
const HeartbeatMonitor = require('../src/infrastructure/heartbeat/HeartbeatMonitor');

const KEY = 'k'.repeat(40);

async function withInternalApi(run, { key = KEY } = {}) {
  const monitor = new HeartbeatMonitor(30);
  const app = express();
  app.use(express.json());
  app.use('/internal/v1', createInternalRouter({ heartbeatController: new HeartbeatController(monitor) }, createServiceAuth(key)));
  app.use(errorHandler);
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  try {
    await run({ monitor, url: `http://127.0.0.1:${server.address().port}/internal/v1/store/heartbeat` });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

const post = (url, headers, body = {}) => fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body)
});

test('POST /internal/v1/store/heartbeat con clave válida deja la tienda ONLINE', () => withInternalApi(async ({ monitor, url }) => {
  assert.equal(monitor.getStatus().reservationsBlocked, true);

  const res = await post(url, { [SERVICE_KEY_HEADER]: KEY }, { storeId: 'tienda-principal', version: '1.0.0', pendingEvents: 0 });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ONLINE');
  assert.equal(body.reservationsBlocked, false);
  assert.equal(monitor.getStatus().status, 'ONLINE');
}));

test('el latido interno sin clave o con clave incorrecta se rechaza sin registrar nada', () => withInternalApi(async ({ monitor, url }) => {
  assert.equal((await post(url, {})).status, 401);
  assert.equal((await post(url, { [SERVICE_KEY_HEADER]: 'incorrecta' })).status, 401);
  assert.equal(monitor.getStatus().status, 'OFFLINE');
}));

test('el latido interno rechaza campos desconocidos', () => withInternalApi(async ({ monitor, url }) => {
  const res = await post(url, { [SERVICE_KEY_HEADER]: KEY }, { admin: true });
  assert.equal(res.status, 400);
  assert.equal(monitor.getStatus().status, 'OFFLINE');
}));

test('sin STORE_SERVICE_KEY configurada el canal interno responde 503', () => withInternalApi(async ({ url }) => {
  assert.equal((await post(url, { [SERVICE_KEY_HEADER]: KEY })).status, 503);
}, { key: '' }));
