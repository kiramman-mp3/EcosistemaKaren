const test = require('node:test');
const assert = require('node:assert/strict');
const createApiRouter = require('../src/infrastructure/http/routes/router');

const { createStoreRouter, createPortalRouter } = createApiRouter;

const passthrough = (req, res, next) => next && next();
const security = { authenticate: passthrough, authorize: () => passthrough };
const controllers = new Proxy({}, { get: () => ({}) });

function routesOf(router) {
  return router.stack
    .filter(layer => layer.route)
    .map(layer => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
}

const store = routesOf(createStoreRouter(controllers, security));
const portal = routesOf(createPortalRouter(controllers, security));
const monolith = routesOf(createApiRouter(controllers, security));

test('store-api expone inventario, caja, alertas y administración de promociones', () => {
  for (const route of ['POST /lots', 'POST /reservations/:id/confirm', 'GET /alerts/stream', 'POST /promotions/generate', 'POST /products']) {
    assert.ok(store.includes(route), `store-api debe exponer ${route}`);
  }
});

test('store-api no recibe reservas de clientes', () => {
  assert.ok(!store.includes('POST /reservations'));
  assert.ok(!store.includes('GET /reservations/user/:userId'));
});

test('portal-api expone reservas de clientes y lectura pública', () => {
  for (const route of ['POST /reservations', 'GET /reservations/user/:userId', 'GET /products', 'GET /availability', 'GET /promotions', 'GET /heartbeat']) {
    assert.ok(portal.includes(route), `portal-api debe exponer ${route}`);
  }
});

test('portal-api no expone inventario, alertas ni administración', () => {
  for (const route of ['GET /lots', 'POST /lots', 'GET /alerts', 'POST /promotions/generate', 'POST /products', 'POST /reservations/:id/confirm']) {
    assert.ok(!portal.includes(route), `portal-api no debe exponer ${route}`);
  }
});

test('ningún servicio acepta latidos de usuarios por la API pública', () => {
  for (const routes of [store, portal, monolith]) {
    assert.ok(!routes.includes('POST /heartbeat'));
  }
});

test('el monolito de transición es la unión de ambos servicios sin rutas duplicadas', () => {
  assert.deepEqual([...new Set(monolith)].sort(), [...new Set([...store, ...portal])].sort());
  assert.equal(monolith.length, new Set(monolith).size);
});
