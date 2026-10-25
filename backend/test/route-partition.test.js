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

test('el ADMIN cancela desde la tienda y el cliente desde el portal, con la ruta registrada una sola vez en el monolito', () => {
  assert.ok(store.includes('POST /reservations/:id/cancel'), 'store-api debe permitir al ADMIN cancelar');
  assert.ok(portal.includes('POST /reservations/:id/cancel'));
  assert.equal(monolith.filter(route => route === 'POST /reservations/:id/cancel').length, 1);
});

test('store-api no recibe reservas de clientes', () => {
  assert.ok(!store.includes('POST /reservations'));
  assert.ok(!store.includes('GET /reservations/user/:userId'));
});

test('portal-api expone reservas de clientes y lectura pública', () => {
  for (const route of ['POST /reservations', 'GET /reservations/user/:userId', 'GET /products', 'GET /availability', 'GET /promotions', 'GET /heartbeat', 'GET /catalog/status']) {
    assert.ok(portal.includes(route), `portal-api debe exponer ${route}`);
  }
});

test('el estado de la copia del catálogo es del portal, no de la tienda', () => {
  assert.ok(portal.includes('GET /catalog/status'));
  assert.ok(!store.includes('GET /catalog/status'));
});

test('el registro público de clientes existe en el portal y no en la tienda', () => {
  assert.ok(portal.includes('POST /auth/register'));
  assert.ok(monolith.includes('POST /auth/register'));
  assert.ok(!store.includes('POST /auth/register'), 'store-api no debe crear cuentas desde la red local');
  for (const route of ['POST /auth/login', 'GET /auth/me', 'POST /auth/logout']) {
    assert.ok(store.includes(route) && portal.includes(route), `${route} debe existir en ambos servicios`);
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
