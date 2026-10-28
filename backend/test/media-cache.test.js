require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const request = require('supertest');
const sharp = require('sharp');
const { isContentHashed, setMediaCacheHeaders, IMMUTABLE_CACHE_CONTROL } = require('../src/infrastructure/media/mediaPaths');
const { ThumbnailService } = require('../src/infrastructure/media/ThumbnailService');
const createStoreThumbnailHandler = require('../src/infrastructure/media/storeThumbnailHandler');
const MediaSyncController = require('../src/adapters/controllers/MediaSyncController');

const HASHED = '/api/v1/media/productos/7861001234567-ab12cd34ef.jpg';
const PLAIN = '/api/v1/media/productos/7861001234567.jpg';

test('solo los nombres con hash de contenido se consideran inmutables', () => {
  assert.ok(isContentHashed(HASHED));
  assert.ok(isContentHashed('/srv/media/productos/7861001234567-AB12CD34EF.PNG'));
  for (const name of [PLAIN, '/api/v1/media/productos/leche-entera.jpg', '/api/v1/media/productos/x-ab12cd34e.jpg',
    '/api/v1/media/productos/x-ab12cd34efg.jpg', '/api/v1/media/productos/x-ab12cd34ef.gif', null, undefined, 7]) {
    assert.equal(isContentHashed(name), false, `no es inmutable: ${name}`);
  }
});

async function storeApp() {
  const mediaDir = await fs.mkdtemp(path.join(os.tmpdir(), 'karen-cache-'));
  await fs.mkdir(path.join(mediaDir, 'productos'));
  const jpeg = await sharp({ create: { width: 800, height: 800, channels: 3, background: '#2980b9' } }).jpeg().toBuffer();
  for (const name of ['7861001234567-ab12cd34ef.jpg', '7861001234567.jpg']) {
    await fs.writeFile(path.join(mediaDir, 'productos', name), jpeg);
  }
  const app = express();
  app.use('/api/v1/media', createStoreThumbnailHandler({ mediaDir, service: new ThumbnailService() }));
  app.use('/api/v1/media', express.static(mediaDir, { maxAge: '7d', fallthrough: false, setHeaders: setMediaCacheHeaders }));
  return { app, cleanup: () => fs.rm(mediaDir, { recursive: true, force: true }) };
}

test('tienda: la foto con hash se cachea un año como inmutable y la de nombre simple conserva 7 días', async (t) => {
  const { app, cleanup } = await storeApp();
  t.after(cleanup);

  assert.equal((await request(app).get(HASHED)).headers['cache-control'], IMMUTABLE_CACHE_CONTROL);
  assert.match((await request(app).get(PLAIN)).headers['cache-control'], /max-age=604800/);
  assert.doesNotMatch((await request(app).get(PLAIN)).headers['cache-control'], /immutable/);
});

test('tienda: la miniatura de una foto con hash también es inmutable', async (t) => {
  const { app, cleanup } = await storeApp();
  t.after(cleanup);

  assert.equal((await request(app).get(HASHED).query({ w: 320 })).headers['cache-control'], IMMUTABLE_CACHE_CONTROL);
  assert.match((await request(app).get(PLAIN).query({ w: 320 })).headers['cache-control'], /max-age=604800/);
});

test('portal: la foto sincronizada con hash es inmutable y la de nombre simple se revalida cada día', async () => {
  const data = await sharp({ create: { width: 800, height: 800, channels: 3, background: '#27ae60' } }).jpeg().toBuffer();
  const file = { sha256: crypto.createHash('sha256').update(data).digest('hex'), contentType: 'image/jpeg', data, updatedAt: new Date() };
  const controller = new MediaSyncController({ getFileUC: { execute: async () => file } });
  const app = express();
  app.use('/api/v1/media', (req, res, next) => controller.serve(req, res, next));

  assert.equal((await request(app).get(HASHED)).headers['cache-control'], IMMUTABLE_CACHE_CONTROL);
  assert.equal((await request(app).get(HASHED).query({ w: 160 })).headers['cache-control'], IMMUTABLE_CACHE_CONTROL);
  assert.equal((await request(app).get(PLAIN)).headers['cache-control'], 'public, max-age=86400');
});
