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
const { ThumbnailService, parseThumbnailWidth } = require('../src/infrastructure/media/ThumbnailService');
const createStoreThumbnailHandler = require('../src/infrastructure/media/storeThumbnailHandler');
const MediaSyncController = require('../src/adapters/controllers/MediaSyncController');

const RUTA = '/api/v1/media/productos/7861001234567.jpg';

const photo = (width, height = width) => sharp({ create: { width, height, channels: 3, background: '#c0392b' } }).jpeg().toBuffer();
const widthOf = async (buffer) => (await sharp(buffer).metadata()).width;
const binary = (res, done) => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => done(null, Buffer.concat(chunks))); };

test('solo se aceptan los anchos de miniatura permitidos', () => {
  assert.equal(parseThumbnailWidth('160'), 160);
  assert.equal(parseThumbnailWidth('320'), 320);
  assert.equal(parseThumbnailWidth('640'), 640);
  for (const invalid of ['321', '0', '-320', '99999', '3.2e2', '', 'abc', undefined, ['320'], { w: 320 }]) {
    assert.equal(parseThumbnailWidth(invalid), null, `rechaza ${JSON.stringify(invalid)}`);
  }
});

test('la miniatura se reduce al ancho pedido y nunca agranda una foto menor', async () => {
  const service = new ThumbnailService();
  const big = await photo(1024, 800);
  const small = await photo(100);

  const thumb = await service.render('a', 'v1', 320, async () => big);
  assert.equal(await widthOf(thumb), 320);
  assert.ok(thumb.length < big.length);

  assert.equal(await widthOf(await service.render('b', 'v1', 640, async () => small)), 100);
});

test('una variante ya calculada sale de la caché y una foto nueva (otra versión) se recalcula', async () => {
  const service = new ThumbnailService();
  const big = await photo(1024);
  let loads = 0;
  const load = async () => { loads += 1; return big; };

  const first = await service.render('a', 'v1', 320, load);
  assert.equal(await service.render('a', 'v1', 320, load), first);
  assert.equal(loads, 1);

  await service.render('a', 'v1', 160, load);
  await service.render('a', 'v2', 320, load);
  assert.equal(loads, 3, 'otro ancho u otra versión no reutilizan la caché');
});

test('peticiones simultáneas de la misma miniatura comparten un solo cálculo', async () => {
  const service = new ThumbnailService();
  const big = await photo(1024);
  let loads = 0;
  const load = async () => { loads += 1; return big; };

  const results = await Promise.all([1, 2, 3, 4].map(() => service.render('a', 'v1', 320, load)));
  assert.equal(loads, 1);
  assert.ok(results.every(buffer => buffer === results[0]));
});

test('una foto ilegible devuelve null y no se guarda en la caché', async () => {
  const service = new ThumbnailService();
  assert.equal(await service.render('rota', 'v1', 320, async () => Buffer.from('no soy una imagen')), null);
  assert.equal(service.cache.size, 0);
});

test('la caché descarta primero las miniaturas menos usadas al pasar su límite', async () => {
  const big = await photo(1024);
  const service = new ThumbnailService({ maxEntries: 2 });
  const load = async () => big;

  const a = await service.render('a', 'v', 320, load);
  await service.render('b', 'v', 320, load);
  await service.render('a', 'v', 320, load); // a pasa a ser la más reciente
  await service.render('c', 'v', 320, load); // expulsa a b

  assert.equal(service.cache.size, 2);
  assert.ok(service.cache.has('a|v|320'));
  assert.ok(!service.cache.has('b|v|320'));
  assert.equal(service.cache.get('a|v|320'), a);
});

// ─── tienda: fotos en disco ────────────────────────────────────────────────────────────────────
async function storeApp(content) {
  const mediaDir = await fs.mkdtemp(path.join(os.tmpdir(), 'karen-thumbs-'));
  await fs.mkdir(path.join(mediaDir, 'productos'));
  const original = content || await photo(1024, 900);
  await fs.writeFile(path.join(mediaDir, 'productos', '7861001234567.jpg'), original);

  const app = express();
  app.use('/api/v1/media', createStoreThumbnailHandler({ mediaDir, service: new ThumbnailService() }));
  app.use('/api/v1/media', express.static(mediaDir, { fallthrough: false }));
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
  return { app, original, cleanup: () => fs.rm(mediaDir, { recursive: true, force: true }) };
}

test('tienda: ?w= sirve una miniatura JPEG más liviana con caché y ETag', async (t) => {
  const { app, original, cleanup } = await storeApp();
  t.after(cleanup);

  const res = await request(app).get(RUTA).query({ w: 320 }).buffer().parse(binary);
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'image/jpeg');
  assert.match(res.headers['cache-control'], /max-age=604800/);
  assert.equal(await widthOf(res.body), 320);
  assert.ok(res.body.length < original.length);

  const cached = await request(app).get(RUTA).query({ w: 320 }).set('If-None-Match', res.headers.etag);
  assert.equal(cached.status, 304);

  const otherWidth = await request(app).get(RUTA).query({ w: 160 });
  assert.notEqual(otherWidth.headers.etag, res.headers.etag, 'cada ancho tiene su ETag');
});

test('tienda: sin ancho válido se sirve la foto original', async (t) => {
  const { app, original, cleanup } = await storeApp();
  t.after(cleanup);

  for (const query of [{}, { w: 321 }, { w: 'grande' }, { w: 99999 }]) {
    const res = await request(app).get(RUTA).query(query).buffer().parse(binary);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, original, `original con ${JSON.stringify(query)}`);
  }
});

test('tienda: una foto inexistente responde 404 aunque se pida miniatura', async (t) => {
  const { app, cleanup } = await storeApp();
  t.after(cleanup);

  assert.equal((await request(app).get('/api/v1/media/productos/nada.jpg').query({ w: 320 })).status, 404);
  // Una ruta fuera del contrato no se redimensiona: la rechaza el servidor estático (403 o 404).
  const traversal = await request(app).get('/api/v1/media/productos/..%2f..%2f.env').query({ w: 320 });
  assert.ok([403, 404].includes(traversal.status), `status ${traversal.status}`);
  assert.notEqual(traversal.headers['content-type'], 'image/jpeg');
});

test('tienda: una foto dañada cae al archivo original en vez de fallar', async (t) => {
  const corrupt = Buffer.from('no soy una imagen');
  const { app, cleanup } = await storeApp(corrupt);
  t.after(cleanup);

  const res = await request(app).get(RUTA).query({ w: 160 }).buffer().parse(binary);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, corrupt);
});

// ─── portal: fotos sincronizadas en base de datos ─────────────────────────────────────────────
async function portalApp() {
  const original = await photo(1024, 900);
  const sha256 = crypto.createHash('sha256').update(original).digest('hex');
  const file = { sha256, contentType: 'image/jpeg', data: original, updatedAt: new Date() };
  const controller = new MediaSyncController({
    getFileUC: { execute: async (ruta) => (ruta === RUTA ? file : null) }
  });
  const app = express();
  app.use('/api/v1/media', (req, res, next) => controller.serve(req, res, next));
  app.use((req, res) => res.status(404).end());
  return { app, original, sha256 };
}

test('portal: ?w= sirve la miniatura con un ETag distinto al del original', async () => {
  const { app, original, sha256 } = await portalApp();

  const full = await request(app).get(RUTA).buffer().parse(binary);
  assert.equal(full.headers.etag, `"${sha256}"`);
  assert.deepEqual(full.body, original);

  const thumb = await request(app).get(RUTA).query({ w: 160 }).buffer().parse(binary);
  assert.equal(thumb.status, 200);
  assert.equal(thumb.headers['content-type'], 'image/jpeg');
  assert.equal(thumb.headers.etag, `"${sha256}-w160"`);
  assert.equal(await widthOf(thumb.body), 160);

  assert.equal((await request(app).get(RUTA).query({ w: 160 }).set('If-None-Match', thumb.headers.etag)).status, 304);
  assert.equal((await request(app).get(RUTA).set('If-None-Match', thumb.headers.etag)).status, 200, 'el ETag de la miniatura no vale para el original');
});

test('portal: un ancho no permitido sirve el original y una foto inexistente sigue siendo 404', async () => {
  const { app, original } = await portalApp();

  const res = await request(app).get(RUTA).query({ w: 123 }).buffer().parse(binary);
  assert.deepEqual(res.body, original);
  assert.equal((await request(app).get('/api/v1/media/productos/nada.jpg').query({ w: 160 })).status, 404);
});
