const test = require('node:test');
const assert = require('node:assert/strict');
const { documentFor } = require('../src/infrastructure/swagger/swaggerDoc');
const createApiRouter = require('../src/infrastructure/http/routes/router');

const { createStoreRouter, createPortalRouter } = createApiRouter;

const operations = (doc) => Object.entries(doc.paths).flatMap(([path, methods]) =>
  Object.keys(methods).map(method => `${method.toUpperCase()} ${path}`));

test('la documentación de store-api incluye inventario, caja y administración, y no las reservas de clientes', () => {
  const ops = operations(documentFor({ store: true, portal: false }));
  for (const op of ['GET /lots', 'POST /lots', 'POST /reservations/{id}/confirm', 'GET /alerts', 'POST /promotions/generate', 'GET /metrics/ai', 'POST /products', 'POST /categories']) {
    assert.ok(ops.includes(op), `store-api debe documentar ${op}`);
  }
  for (const op of ['POST /reservations', 'GET /reservations/user/{userId}', 'POST /reservations/{id}/cancel', 'GET /catalog/status', 'POST /auth/register']) {
    assert.ok(!ops.includes(op), `store-api no debe documentar ${op}`);
  }
});

test('la documentación de portal-api incluye reservas, estado del catálogo y lectura pública, y no el inventario', () => {
  const ops = operations(documentFor({ store: false, portal: true }));
  for (const op of ['POST /reservations', 'GET /reservations/user/{userId}', 'POST /reservations/{id}/cancel', 'GET /catalog/status', 'GET /products', 'GET /availability', 'GET /promotions', 'POST /auth/login', 'POST /auth/register', 'GET /heartbeat']) {
    assert.ok(ops.includes(op), `portal-api debe documentar ${op}`);
  }
  for (const op of ['GET /lots', 'POST /lots', 'POST /reservations/{id}/confirm', 'GET /alerts', 'POST /promotions/generate', 'POST /products', 'POST /categories', 'GET /metrics/ai']) {
    assert.ok(!ops.includes(op), `portal-api no debe documentar ${op}`);
  }
});

test('el monolito de transición documenta la unión de ambos servicios', () => {
  const both = new Set(operations(documentFor({ store: true, portal: true })));
  const union = new Set([
    ...operations(documentFor({ store: true, portal: false })),
    ...operations(documentFor({ store: false, portal: true }))
  ]);
  assert.deepEqual([...both].sort(), [...union].sort());
});

test('cada servicio muestra su propio título y solo las etiquetas que usa', () => {
  const store = documentFor({ store: true, portal: false });
  const portal = documentFor({ store: false, portal: true });
  assert.match(store.info.title, /store-api/);
  assert.match(portal.info.title, /portal-api/);
  assert.ok(store.tags.some(tag => tag.name === 'Alertas y SSE'));
  assert.ok(!portal.tags.some(tag => tag.name === 'Alertas y SSE'));
  assert.ok(portal.tags.some(tag => tag.name === 'Catálogo'));
  assert.ok(!store.tags.some(tag => tag.name === 'Catálogo'));
});

test('no quedan rutas vacías y el documento original no se modifica', () => {
  const before = JSON.stringify(documentFor());
  const store = documentFor({ store: true, portal: false });
  assert.ok(Object.values(store.paths).every(methods => Object.keys(methods).length > 0));
  assert.equal(JSON.stringify(documentFor()), before);
});

// Evita que la documentación y las rutas reales se separen: toda operación que Express registra en
// un servicio debe estar documentada en ese servicio, salvo las que aún no tienen entrada.
test('las operaciones documentadas de cada servicio existen en su router', () => {
  const security = { authenticate: (req, res, next) => next(), authorize: () => (req, res, next) => next() };
  const controllers = new Proxy({}, { get: () => ({}) });
  const toSwaggerPath = (path) => path
    .replace(/:id/g, '{id}').replace(/:code/g, '{code}').replace(/:userId/g, '{userId}').replace(/:barcode/g, '{barcode}');
  const routesOf = (router) => new Set(router.stack.filter(layer => layer.route).map(layer =>
    `${Object.keys(layer.route.methods)[0].toUpperCase()} ${toSwaggerPath(layer.route.path)}`));

  const store = routesOf(createStoreRouter(controllers, security));
  const portal = routesOf(createPortalRouter(controllers, security));
  const storeDocs = operations(documentFor({ store: true, portal: false }));
  const portalDocs = operations(documentFor({ store: false, portal: true }));

  const missing = [
    ...storeDocs.filter(op => !store.has(op)).map(op => `store-api: ${op}`),
    ...portalDocs.filter(op => !portal.has(op)).map(op => `portal-api: ${op}`)
  ];
  assert.deepEqual(missing, [], 'operaciones documentadas que el servicio no expone');
});
