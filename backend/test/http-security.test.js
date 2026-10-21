const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createSecurityMiddlewares, validateProductionSecurity, cookieCsrfProtection } = require('../src/infrastructure/http/middlewares/security');
const errorHandler = require('../src/infrastructure/http/middlewares/errorHandler');
const { swaggerBasicAuth } = require('../src/infrastructure/swagger/swaggerDoc');

function securityApp(overrides = {}) {
  const app = express();
  const security = createSecurityMiddlewares({
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX: '2',
    ...overrides,
  });
  app.disable('x-powered-by');
  app.use(security.requestId, security.headers);
  app.use('/api', security.general);
  app.use(express.json({ limit: '1kb', strict: true }));
  app.use(security.normalizeJsonBody, security.hpp, security.rejectDangerousKeys);
  app.post('/api/test', (req, res) => res.json({ success: true, body: req.body }));
  app.use(errorHandler);
  return app;
}

test('añade encabezados seguros y conserva un request ID válido', async () => {
  const response = await request(securityApp())
    .post('/api/test')
    .set('X-Request-Id', 'uat-request-1')
    .send({ ok: true });
  assert.equal(response.status, 200);
  assert.equal(response.headers['x-request-id'], 'uat-request-1');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-powered-by'], undefined);
});

test('rechaza JSON excesivo, content-type incorrecto y claves peligrosas', async () => {
  const oversized = await request(securityApp()).post('/api/test').send({ value: 'x'.repeat(2000) });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.body.error, 'PayloadTooLarge');

  const wrongType = await request(securityApp()).post('/api/test').set('Content-Type', 'text/plain').send('dato');
  assert.equal(wrongType.status, 415);

  const dangerous = await request(securityApp()).post('/api/test').set('Content-Type', 'application/json').send('{"constructor":{"prototype":{"admin":true}}}');
  assert.equal(dangerous.status, 400);
});

test('acepta un POST sin cuerpo ni Content-Type (p. ej. cerrar sesión)', async () => {
  const response = await request(securityApp()).post('/api/test').set('Content-Length', '0');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.body, {});
});

test('limita solicitudes y devuelve metadatos RateLimit estándar', async () => {
  const app = securityApp();
  assert.equal((await request(app).post('/api/test').send({ n: 1 })).status, 200);
  assert.equal((await request(app).post('/api/test').send({ n: 2 })).status, 200);
  const blocked = await request(app).post('/api/test').send({ n: 3 });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, 'TooManyRequests');
  assert.ok(blocked.headers['ratelimit']);
});

test('el limitador de auth cuenta solo logins fallidos y no /me', async () => {
  const app = express();
  const security = createSecurityMiddlewares({
    AUTH_RATE_LIMIT_WINDOW_MS: '60000',
    AUTH_RATE_LIMIT_MAX: '2',
  });
  app.use('/api/auth', security.auth);
  app.post('/api/auth/login', (req, res) => res.status(req.query.ok ? 200 : 401).json({}));
  app.get('/api/auth/me', (req, res) => res.status(401).json({}));
  app.use(errorHandler);

  for (let i = 0; i < 5; i += 1) {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).post('/api/auth/login?ok=1')).status, 200);
  }
  assert.equal((await request(app).post('/api/auth/login')).status, 401);
  assert.equal((await request(app).post('/api/auth/login')).status, 401);
  assert.equal((await request(app).post('/api/auth/login')).status, 429);
});

test('Swagger exige Basic Auth con comparación segura', async () => {
  const app = express();
  app.use('/docs', swaggerBasicAuth('admin', 'secret'), (req, res) => res.sendStatus(204));
  assert.equal((await request(app).get('/docs')).status, 401);
  assert.equal((await request(app).get('/docs').auth('admin', 'incorrecta')).status, 401);
  assert.equal((await request(app).get('/docs').auth('admin', 'secret')).status, 204);
});

test('producción rechaza secretos débiles y CORS abierto', () => {
  assert.throws(() => validateProductionSecurity({ NODE_ENV: 'production', JWT_SECRET: 'change_me', CORS_ORIGINS: '*' }), /CORS_ORIGINS/);
  assert.throws(() => validateProductionSecurity({ NODE_ENV: 'production', JWT_SECRET: 'corta', CORS_ORIGINS: 'https://portal.example' }), /JWT_SECRET/);
  assert.doesNotThrow(() => validateProductionSecurity({
    NODE_ENV: 'production',
    JWT_SECRET: 'un-secreto-aleatorio-de-mas-de-32-caracteres',
    CORS_ORIGINS: 'https://portal.example',
    SWAGGER_ENABLED: 'false',
  }));
});

test('operaciones por cookie rechazan CSRF desde otro origen en producción', async () => {
  const app = express();
  app.use((req, res, next) => { req.cookies = { karen_session: 'token' }; next(); });
  app.use(cookieCsrfProtection(['https://portal.example'], true));
  app.post('/action', (req, res) => res.sendStatus(204));
  app.use(errorHandler);
  assert.equal((await request(app).post('/action').set('Origin', 'https://evil.example')).status, 403);
  assert.equal((await request(app).post('/action').set('Origin', 'https://portal.example')).status, 204);
});

test('múltiples limitadores en cascada no arrojan error de conteo doble', async () => {
  const app = express();
  const security = createSecurityMiddlewares({
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX: '10',
    AUTH_RATE_LIMIT_WINDOW_MS: '60000',
    AUTH_RATE_LIMIT_MAX: '5',
  });
  app.use('/api', security.general);
  app.use('/api/auth', security.auth);
  app.post('/api/auth/login', (req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  const res = await request(app).post('/api/auth/login');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});
