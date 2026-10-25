require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const request = require('supertest');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const createInternalRouter = require('../src/infrastructure/http/routes/internalRouter');
const errorHandler = require('../src/infrastructure/http/middlewares/errorHandler');
const { createServiceAuth, SERVICE_KEY_HEADER } = require('../src/infrastructure/http/middlewares/serviceAuth');
const MediaSyncController = require('../src/adapters/controllers/MediaSyncController');
const PostgresMediaMirrorRepository = require('../src/adapters/repositories/PostgresMediaMirrorRepository');
const { ReconcileMediaManifest, StoreMediaFile, GetMediaFile } = require('../src/use-cases/catalog/MediaSyncUseCases');
const MediaSyncWorker = require('../src/infrastructure/workers/MediaSyncWorker');
const { isMediaPath, contentTypeFor, localFileFor } = require('../src/infrastructure/media/mediaPaths');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');

const KEY = 'k'.repeat(40);
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('foto de prueba')]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png')]);
const RUTA = '/api/v1/media/productos/7861001234567.jpg';

// Repositorio en memoria con el mismo contrato que PostgresMediaMirrorRepository.
function memoryRepo() {
  const files = new Map();
  return {
    files,
    async reconcile(list, { prune = true } = {}) {
      const missing = list.filter(file => files.get(file.ruta)?.sha256 !== file.sha256.toLowerCase()).map(file => file.ruta);
      const wanted = new Set(list.map(file => file.ruta));
      const stale = prune ? [...files.keys()].filter(ruta => !wanted.has(ruta)) : [];
      stale.forEach(ruta => files.delete(ruta));
      return { missing, removed: stale.length };
    },
    async save({ ruta, sha256, tipoContenido, data }) { files.set(ruta, { sha256, contentType: tipoContenido, data, updatedAt: new Date() }); },
    async find(ruta) { return files.get(ruta) || null; }
  };
}

function buildApp(repo = memoryRepo()) {
  const controller = new MediaSyncController({
    reconcileUC: new ReconcileMediaManifest(repo),
    storeFileUC: new StoreMediaFile(repo),
    getFileUC: new GetMediaFile(repo)
  });
  const app = express();
  app.use('/api/v1/media', (req, res, next) => controller.serve(req, res, next));
  app.use('/internal/v1', createInternalRouter({ mediaSyncController: controller }, createServiceAuth(KEY), [express.json({ limit: '1mb' })]));
  app.use(errorHandler);
  return { app, repo };
}

const upload = (app, ruta, body, headers = {}) => request(app)
  .put('/internal/v1/store/sync/media').query({ ruta })
  .set(SERVICE_KEY_HEADER, KEY).set('content-type', 'application/octet-stream').set('x-content-sha256', sha(body)).set(headers)
  .send(body);

// ─── contrato de rutas ─────────────────────────────────────────────────────────────────────────
test('solo las fotos de productos con nombre simple y extensión de imagen son rutas de medios válidas', () => {
  assert.ok(isMediaPath(RUTA));
  assert.ok(isMediaPath('/api/v1/media/productos/leche-entera_1L.PNG'));
  for (const bad of [
    '/api/v1/media/productos/../../.env', '/api/v1/media/productos/a/b.jpg', '/api/v1/media/otros/a.jpg',
    '/api/v1/media/productos/a.svg', '/api/v1/media/productos/.oculto.jpg', '/api/v1/media/productos/a..jpg',
    'https://cdn.example/a.jpg', '/api/v1/media/productos/', null, undefined, 42
  ]) {
    assert.equal(isMediaPath(bad), false, String(bad));
  }
  assert.equal(contentTypeFor(RUTA), 'image/jpeg');
  assert.equal(contentTypeFor('/api/v1/media/productos/a.webp'), 'image/webp');
  assert.ok(localFileFor('/srv/media', RUTA).replace(/\\/g, '/').endsWith('/srv/media/productos/7861001234567.jpg'));
});

test('el manifiesto rechaza rutas inválidas, hashes mal formados y campos desconocidos', () => {
  const file = { ruta: RUTA, sha256: sha(JPEG), size: JPEG.length };
  assert.ok(schemas.mediaManifestBody.safeParse({ files: [file] }).success);
  assert.equal(schemas.mediaManifestBody.parse({ files: [] }).prune, true);
  for (const bad of [
    { files: [{ ...file, ruta: '/api/v1/media/productos/../x.jpg' }] },
    { files: [{ ...file, sha256: 'abc' }] },
    { files: [{ ...file, size: 0 }] },
    { files: [{ ...file, extra: 1 }] }
  ]) {
    assert.equal(schemas.mediaManifestBody.safeParse(bad).success, false);
  }
});

// ─── canal interno + servicio público ──────────────────────────────────────────────────────────
test('flujo completo: el manifiesto pide la foto, se sube, se sirve con ETag y deja de pedirse', async () => {
  const { app } = buildApp();
  const files = [{ ruta: RUTA, sha256: sha(JPEG), size: JPEG.length }];

  const first = await request(app).post('/internal/v1/store/sync/media/manifest').set(SERVICE_KEY_HEADER, KEY).send({ files });
  assert.deepEqual(first.body.missing, [RUTA]);

  const stored = await upload(app, RUTA, JPEG);
  assert.equal(stored.status, 200, JSON.stringify(stored.body));

  const served = await request(app).get(RUTA);
  assert.equal(served.status, 200);
  assert.equal(served.headers['content-type'], 'image/jpeg');
  assert.match(served.headers['cache-control'], /max-age=86400/);
  assert.deepEqual(served.body, JPEG);
  const cached = await request(app).get(RUTA).set('If-None-Match', served.headers.etag);
  assert.equal(cached.status, 304);

  const second = await request(app).post('/internal/v1/store/sync/media/manifest').set(SERVICE_KEY_HEADER, KEY).send({ files });
  assert.deepEqual(second.body.missing, [], 'ya está al día');
});

test('una foto que cambió de contenido vuelve a pedirse y la que la tienda quitó se elimina', async () => {
  const { app, repo } = buildApp();
  await upload(app, RUTA, JPEG);
  await upload(app, '/api/v1/media/productos/vieja.png', PNG);

  const changed = Buffer.concat([JPEG, Buffer.from('v2')]);
  const response = await request(app).post('/internal/v1/store/sync/media/manifest').set(SERVICE_KEY_HEADER, KEY)
    .send({ files: [{ ruta: RUTA, sha256: sha(changed), size: changed.length }] });
  assert.deepEqual(response.body.missing, [RUTA]);
  assert.equal(response.body.removed, 1);
  assert.ok(!repo.files.has('/api/v1/media/productos/vieja.png'));
});

test('con prune:false el portal no borra nada aunque la tienda no liste una foto', async () => {
  const { app, repo } = buildApp();
  await upload(app, RUTA, JPEG);
  const response = await request(app).post('/internal/v1/store/sync/media/manifest').set(SERVICE_KEY_HEADER, KEY).send({ files: [], prune: false });
  assert.equal(response.body.removed, 0);
  assert.ok(repo.files.has(RUTA));
});

test('la subida rechaza hash que no coincide, firma de otro formato, ruta peligrosa, vacío y exceso de tamaño', async () => {
  const { app } = buildApp();
  assert.equal((await upload(app, RUTA, JPEG, { 'x-content-sha256': sha(Buffer.from('otra cosa')) })).status, 400, 'hash');
  assert.equal((await upload(app, RUTA, PNG)).status, 400, 'un PNG con extensión .jpg');
  assert.equal((await upload(app, RUTA, Buffer.from('<script>alert(1)</script>'))).status, 400, 'no es una imagen');
  assert.equal((await upload(app, '/api/v1/media/productos/../../x.jpg', JPEG)).status, 400, 'ruta');
  assert.equal((await upload(app, RUTA, Buffer.alloc(0))).status, 400, 'vacía');
  assert.equal((await upload(app, RUTA, Buffer.concat([JPEG, Buffer.alloc(3 * 1024 * 1024)]))).status, 413, 'más de 2 MB');
});

test('sin la clave de servicio no se acepta ni el manifiesto ni la subida', async () => {
  const { app } = buildApp();
  assert.equal((await request(app).post('/internal/v1/store/sync/media/manifest').send({ files: [] })).status, 401);
  const response = await request(app).put('/internal/v1/store/sync/media').query({ ruta: RUTA }).set('content-type', 'application/octet-stream').send(JPEG);
  assert.equal(response.status, 401);
});

test('una foto inexistente o una ruta fuera del contrato no se sirve', async () => {
  const { app } = buildApp();
  assert.equal((await request(app).get('/api/v1/media/productos/nada.jpg')).status, 404);
  assert.equal((await request(app).get('/api/v1/media/productos/..%2f..%2f.env')).status, 404);
});

// ─── worker de la tienda ───────────────────────────────────────────────────────────────────────
function fakeFiles(contents) {
  const reads = [];
  const norm = (file) => file.replace(/\\/g, '/');
  return {
    reads,
    async stat(file) {
      const key = [...contents.keys()].find(candidate => norm(file).endsWith(candidate));
      if (!key) throw new Error('ENOENT');
      return { isFile: () => true, size: contents.get(key).length, mtimeMs: 1000 };
    },
    async readFile(file) {
      reads.push(file);
      const key = [...contents.keys()].find(candidate => norm(file).endsWith(candidate));
      if (!key) throw new Error('ENOENT');
      return contents.get(key);
    }
  };
}

function fakeTransport(missingFor) {
  const calls = { manifest: [], upload: [] };
  return {
    calls,
    async manifest(payload) { calls.manifest.push(payload); return { missing: missingFor(payload.files) }; },
    async upload(payload) { calls.upload.push(payload); return { success: true }; }
  };
}

async function quiet(fn) {
  const { log, warn, error } = console;
  console.log = console.warn = console.error = () => {};
  try { return await fn(); } finally { Object.assign(console, { log, warn, error }); }
}

test('el worker sube solo las fotos que el portal pide y reutiliza el hash mientras el archivo no cambie', async () => {
  const files = fakeFiles(new Map([['productos/a.jpg', JPEG], ['productos/b.jpg', Buffer.concat([JPEG, Buffer.from('b')])]]));
  const transport = fakeTransport(list => list.filter(file => file.ruta.endsWith('a.jpg')).map(file => file.ruta));
  const worker = new MediaSyncWorker({
    listPaths: async () => ['/api/v1/media/productos/a.jpg', '/api/v1/media/productos/b.jpg', '/api/v1/media/productos/a.jpg', 'https://cdn.example/x.jpg'],
    mediaDir: '/srv/media', transport, files
  });
  await quiet(() => worker.tick());

  assert.equal(transport.calls.manifest[0].files.length, 2, 'sin duplicados ni URLs externas');
  assert.equal(transport.calls.manifest[0].prune, true);
  assert.deepEqual(transport.calls.upload.map(call => call.ruta), ['/api/v1/media/productos/a.jpg']);
  assert.equal(transport.calls.upload[0].sha256, sha(JPEG));

  const readsAfterFirst = files.reads.length;
  await quiet(() => worker.tick());
  // El segundo ciclo no relee los archivos para calcular hashes; solo el de la subida pedida.
  assert.equal(files.reads.length - readsAfterFirst, 1);
});

test('si falta alguna foto en disco el worker pide no borrar y sigue con las demás', async () => {
  const files = fakeFiles(new Map([['productos/a.jpg', JPEG]]));
  const transport = fakeTransport(() => []);
  const worker = new MediaSyncWorker({
    listPaths: async () => ['/api/v1/media/productos/a.jpg', '/api/v1/media/productos/perdida.jpg'],
    mediaDir: '/srv/media', transport, files
  });
  await quiet(() => worker.tick());
  assert.equal(transport.calls.manifest[0].files.length, 1);
  assert.equal(transport.calls.manifest[0].prune, false);
});

test('el worker limita las subidas por ciclo y no se cae cuando el portal falla', async () => {
  const contents = new Map(Array.from({ length: 5 }, (_, i) => [`productos/p${i}.jpg`, Buffer.concat([JPEG, Buffer.from(String(i))])]));
  const files = fakeFiles(contents);
  const transport = fakeTransport(list => list.map(file => file.ruta));
  const worker = new MediaSyncWorker({
    listPaths: async () => [...contents.keys()].map(key => `/api/v1/media/${key}`),
    mediaDir: '/srv/media', transport, files, maxUploadsPerTick: 2
  });
  await quiet(() => worker.tick());
  assert.equal(transport.calls.upload.length, 2);

  const failing = new MediaSyncWorker({
    listPaths: async () => ['/api/v1/media/productos/p0.jpg'], mediaDir: '/srv/media', files,
    transport: { manifest: async () => { throw new Error('portal caído'); }, upload: async () => {} }
  });
  await quiet(() => failing.tick());
  assert.equal(failing.consecutiveFailures, 1);
});

// ─── repositorio con PostgreSQL real (se omite sin base migrada) ───────────────────────────────
test('PostgresMediaMirrorRepository guarda, compara, sirve y poda fotos', async (t) => {
  if (!(await testConnection())) return t.skip('sin PostgreSQL');
  const pool = getPool();
  try {
    const exists = await pool.query("SELECT to_regclass('public.media_archivos') AS t");
    if (!exists.rows[0].t) return t.skip('base sin migrar');

    const repo = new PostgresMediaMirrorRepository(pool);
    const a = `/api/v1/media/productos/test-${Date.now()}-a.jpg`;
    const b = `/api/v1/media/productos/test-${Date.now()}-b.jpg`;
    try {
      await repo.save({ ruta: a, sha256: sha(JPEG), tipoContenido: 'image/jpeg', data: JPEG });
      await repo.save({ ruta: b, sha256: sha(PNG), tipoContenido: 'image/png', data: PNG });

      const found = await repo.find(a);
      assert.deepEqual(found.data, JPEG);
      assert.equal(found.sha256, sha(JPEG));
      assert.equal(found.contentType, 'image/jpeg');
      assert.equal(await repo.find('/api/v1/media/productos/no-existe.jpg'), null);

      const same = await repo.reconcile([{ ruta: a, sha256: sha(JPEG).toUpperCase(), size: 1 }], { prune: false });
      assert.deepEqual(same, { missing: [], removed: 0 });
      const changed = await repo.reconcile([{ ruta: a, sha256: sha(PNG), size: 1 }], { prune: false });
      assert.deepEqual(changed.missing, [a]);
      assert.ok(await repo.find(b), 'sin poda no se borra nada');

      const pruned = await repo.reconcile([{ ruta: a, sha256: sha(JPEG), size: 1 }]);
      assert.ok(pruned.removed >= 1);
      assert.equal(await repo.find(b), null);

      await repo.save({ ruta: a, sha256: sha(PNG), tipoContenido: 'image/png', data: PNG });
      assert.deepEqual((await repo.find(a)).data, PNG, 'reemplaza el contenido');
    } finally {
      await pool.query('DELETE FROM media_archivos WHERE ruta = ANY($1::text[])', [[a, b]]);
    }
  } finally {
    await closePool();
  }
});
