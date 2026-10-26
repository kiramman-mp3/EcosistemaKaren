const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createHealthRouter } = require('../src/infrastructure/http/health');
const { createAccessLog, isEnabled } = require('../src/infrastructure/http/middlewares/accessLog');
const { MIGRATION_SETS } = require('../src/infrastructure/db/migrations');

const allVersions = (target) => MIGRATION_SETS[target].map(migration => ({ version: migration.version }));
const appWith = (router) => express().use(router);

test('/healthz responde sin tocar la base de datos', async () => {
  let queries = 0;
  const pool = { query: async () => { queries += 1; throw new Error('base caída'); } };
  const response = await request(appWith(createHealthRouter({ pool, service: 'store' }))).get('/healthz');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok', service: 'store' });
  assert.equal(queries, 0);
});

test('/readyz está listo cuando la base responde y todas las migraciones del servicio están aplicadas', async () => {
  const pool = { query: async () => ({ rows: allVersions('portal') }) };
  const response = await request(appWith(createHealthRouter({ pool, service: 'portal', migrations: ['portal'] }))).get('/readyz');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ready');
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('/readyz no está listo si falta una migración y nombra cuáles', async () => {
  const rows = allVersions('store').slice(0, -1);
  const pool = { query: async () => ({ rows }) };
  const response = await request(appWith(createHealthRouter({ pool, service: 'store' }))).get('/readyz');
  assert.equal(response.status, 503);
  assert.match(response.body.checks.database, /migraciones pendientes: 014_promotion_limits/);
});

test('/readyz no está listo sin base de datos y no filtra el mensaje del driver', async () => {
  const failing = { query: async () => { throw new Error('password authentication failed for user "karen_user"'); } };
  const failed = await request(appWith(createHealthRouter({ pool: failing, service: 'store' }))).get('/readyz');
  assert.equal(failed.status, 503);
  assert.doesNotMatch(JSON.stringify(failed.body), /password|karen_user/);

  const missing = await request(appWith(createHealthRouter({ pool: null, service: 'store' }))).get('/readyz');
  assert.equal(missing.status, 503);
});

test('el registro de accesos escribe una línea JSON con requestId y sin cabeceras, cuerpo ni query string', async () => {
  const lines = [];
  const app = express();
  app.use((req, res, next) => { req.id = 'req-123'; next(); });
  app.use(createAccessLog({ service: 'store', write: line => lines.push(line) }));
  app.post('/api/v1/auth/login', (req, res) => res.status(401).json({ message: 'no' }));
  app.get('/healthz', (req, res) => res.sendStatus(200));

  await request(app).post('/api/v1/auth/login?token=secreto').set('Authorization', 'Bearer abc').send({ password: 'clave' });
  await request(app).get('/healthz');

  assert.equal(lines.length, 1, 'las sondas no se registran');
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.requestId, 'req-123');
  assert.equal(entry.service, 'store');
  assert.equal(entry.method, 'POST');
  assert.equal(entry.path, '/api/v1/auth/login');
  assert.equal(entry.status, 401);
  assert.equal(typeof entry.durationMs, 'number');
  assert.doesNotMatch(lines[0], /secreto|Bearer|abc|clave/);
});

test('el registro de accesos se activa por defecto solo en producción y se puede forzar', () => {
  assert.equal(isEnabled({ NODE_ENV: 'production' }), true);
  assert.equal(isEnabled({ NODE_ENV: 'test' }), false);
  assert.equal(isEnabled({}), false);
  assert.equal(isEnabled({ NODE_ENV: 'production', ACCESS_LOG: 'false' }), false);
  assert.equal(isEnabled({ NODE_ENV: 'development', ACCESS_LOG: 'true' }), true);
});
