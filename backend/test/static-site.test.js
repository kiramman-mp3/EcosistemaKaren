const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');
const { createStaticSite, isBackendPath } = require('../src/infrastructure/http/staticSite');

function buildSite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'karen-site-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Karen</title>');
  fs.writeFileSync(path.join(dir, 'sw.js'), '// sw');
  fs.writeFileSync(path.join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
  const app = express();
  app.use(createStaticSite(dir));
  app.get('/api/v1/ping', (req, res) => res.json({ ok: true }));
  return { dir, app };
}

test('rechaza un directorio sin index.html', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'karen-empty-'));
  assert.throws(() => createStaticSite(empty), /index\.html/);
});

test('las rutas de navegación devuelven index.html sin caché', async () => {
  const { app } = buildSite();
  for (const route of ['/', '/catalogo/42']) {
    const res = await request(app).get(route);
    assert.equal(res.status, 200);
    assert.match(res.text, /<title>Karen<\/title>/);
    assert.equal(res.headers['cache-control'], 'no-cache');
  }
});

test('los archivos con hash son inmutables y sw.js se revalida', async () => {
  const { app } = buildSite();
  const asset = await request(app).get('/assets/app-abc123.js');
  assert.equal(asset.status, 200);
  assert.match(asset.headers['cache-control'], /immutable/);
  const sw = await request(app).get('/sw.js');
  assert.equal(sw.status, 200);
  assert.equal(sw.headers['cache-control'], 'no-cache');
});

test('las rutas del backend no se contestan con la SPA', async () => {
  const { app } = buildSite();
  assert.equal((await request(app).get('/api/v1/ping')).body.ok, true);
  assert.notEqual((await request(app).get('/api/v1/inexistente')).text, '<!doctype html><title>Karen</title>');
  assert.equal((await request(app).get('/internal/v1/x')).status, 404);
  assert.equal((await request(app).post('/catalogo')).status, 404);
});

test('isBackendPath distingue prefijos completos', () => {
  assert.equal(isBackendPath('/api/v1/auth'), true);
  assert.equal(isBackendPath('/readyz'), true);
  assert.equal(isBackendPath('/api-docs/'), true);
  assert.equal(isBackendPath('/apple-touch-icon.png'), false);
  assert.equal(isBackendPath('/apiary'), false);
});
