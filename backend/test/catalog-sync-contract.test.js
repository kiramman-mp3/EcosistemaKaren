const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const createInternalRouter = require('../src/infrastructure/http/routes/internalRouter');
const errorHandler = require('../src/infrastructure/http/middlewares/errorHandler');
const { createServiceAuth, SERVICE_KEY_HEADER } = require('../src/infrastructure/http/middlewares/serviceAuth');
const CatalogSyncController = require('../src/adapters/controllers/CatalogSyncController');
const { ApplyCatalogSnapshot } = require('../src/use-cases/catalog/CatalogSyncUseCases');
const { SECTIONS, SECTION_ORDER } = require('../src/infrastructure/sync/catalogSections');

const KEY = 'k'.repeat(40);
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const samples = {
  categorias: { id: uuid(1), nombre: 'Lácteos', descripcion: null },
  productos: {
    id: uuid(2), categoriaId: uuid(1), codigoBarras: '7861001234567', nombre: 'Leche entera 1L',
    descripcion: null, precioVenta: 1.25, impuestoPorcentaje: 0, imagenUrl: '/api/v1/media/productos/leche.jpg'
  },
  lotes: {
    id: uuid(3), productoId: uuid(2), numeroLote: 'L-001', fechaCaducidad: '2026-12-31',
    cantidadIngresada: 40, cantidadDisponible: 32
  },
  promociones: {
    id: uuid(4), loteId: uuid(3), descuentoPorcentaje: 20, frasePromocional: 'Aprovecha la leche',
    createdAt: '2026-10-24T12:00:00.000Z'
  }
};

test('el contrato cubre exactamente las secciones que publica la tienda, en orden de dependencia', () => {
  assert.deepEqual(Object.keys(SECTIONS).sort(), [...SECTION_ORDER].sort());
  assert.ok(SECTION_ORDER.indexOf('categorias') < SECTION_ORDER.indexOf('productos'));
  assert.ok(SECTION_ORDER.indexOf('productos') < SECTION_ORDER.indexOf('lotes'));
  assert.ok(SECTION_ORDER.indexOf('lotes') < SECTION_ORDER.indexOf('promociones'));
});

test('el esquema acepta un snapshot válido de cada sección', () => {
  for (const section of SECTION_ORDER) {
    const result = schemas.catalogSyncBody.safeParse({ section, version: 1, items: [samples[section]] });
    assert.ok(result.success, `${section}: ${result.error?.message}`);
  }
  assert.ok(schemas.catalogSyncBody.safeParse({ section: 'lotes', version: 1, items: [] }).success, 'un snapshot vacío es válido');
});

test('el esquema rechaza campos internos que nunca deben salir de la tienda', () => {
  const withCost = { ...samples.lotes, costoUnitario: 0.8 };
  const withLocation = { ...samples.lotes, ubicacion: 'BODEGA' };
  const withAiReason = { ...samples.promociones, razonIa: 'razón interna' };
  assert.ok(!schemas.catalogSyncBody.safeParse({ section: 'lotes', version: 1, items: [withCost] }).success);
  assert.ok(!schemas.catalogSyncBody.safeParse({ section: 'lotes', version: 1, items: [withLocation] }).success);
  assert.ok(!schemas.catalogSyncBody.safeParse({ section: 'promociones', version: 1, items: [withAiReason] }).success);
});

test('el esquema rechaza secciones, versiones e ids inválidos', () => {
  const parse = (body) => schemas.catalogSyncBody.safeParse(body).success;
  assert.equal(parse({ section: 'usuarios', version: 1, items: [] }), false);
  assert.equal(parse({ section: 'lotes', version: 0, items: [] }), false);
  assert.equal(parse({ section: 'lotes', version: 1.5, items: [] }), false);
  assert.equal(parse({ section: 'lotes', version: 1, items: [{ ...samples.lotes, id: 'no-es-uuid' }] }), false);
  assert.equal(parse({ section: 'lotes', version: 1, items: [{ ...samples.lotes, fechaCaducidad: '31/12/2026' }] }), false);
  assert.equal(parse({ section: 'lotes', version: 1, items: [{ ...samples.lotes, cantidadDisponible: -1 }] }), false);
});

async function withSyncApi(run, { repository } = {}) {
  const applied = [];
  const mirror = repository || {
    async applySnapshot(section, version, items) {
      applied.push({ section, version, count: items.length });
      return { applied: true, count: items.length };
    }
  };
  const app = express();
  app.use('/internal/v1', createInternalRouter(
    { heartbeatController: {}, catalogSyncController: new CatalogSyncController(new ApplyCatalogSnapshot(mirror)) },
    createServiceAuth(KEY),
    [express.json({ limit: '10mb' })]
  ));
  app.use(errorHandler);
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  try {
    await run({ applied, url: `http://127.0.0.1:${server.address().port}/internal/v1/store/sync/catalog` });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

const post = (url, body, key = KEY) => fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(key ? { [SERVICE_KEY_HEADER]: key } : {}) },
  body: JSON.stringify(body)
});

test('POST /internal/v1/store/sync/catalog aplica un snapshot autenticado', () => withSyncApi(async ({ applied, url }) => {
  const res = await post(url, { section: 'categorias', version: 7, items: [samples.categorias] });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true, section: 'categorias', version: 7, applied: true, count: 1 });
  assert.deepEqual(applied, [{ section: 'categorias', version: 7, count: 1 }]);
}));

test('el canal de sincronización exige la clave de servicio y no toca la copia sin ella', () => withSyncApi(async ({ applied, url }) => {
  assert.equal((await post(url, { section: 'categorias', version: 1, items: [] }, null)).status, 401);
  assert.equal((await post(url, { section: 'categorias', version: 1, items: [] }, 'incorrecta')).status, 401);
  assert.equal(applied.length, 0);
}));

test('un snapshot inválido responde 400 y no llega al repositorio', () => withSyncApi(async ({ applied, url }) => {
  const res = await post(url, { section: 'lotes', version: 1, items: [{ ...samples.lotes, costoUnitario: 1 }] });
  assert.equal(res.status, 400);
  assert.equal(applied.length, 0);
}));

test('acepta snapshots mayores que el límite de la API pública (100 kb)', () => withSyncApi(async ({ applied, url }) => {
  const items = Array.from({ length: 1500 }, (_, i) => ({ ...samples.lotes, id: uuid(1000 + i), numeroLote: `L-${i}` }));
  assert.ok(JSON.stringify(items).length > 100 * 1024);
  const res = await post(url, { section: 'lotes', version: 2, items });
  assert.equal(res.status, 200);
  assert.equal(applied[0].count, 1500);
}));

test('un snapshot de una versión ya aplicada responde 200 con applied=false', () => withSyncApi(async ({ url }) => {
  const res = await post(url, { section: 'lotes', version: 3, items: [] });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).applied, false);
}, {
  repository: { applySnapshot: async (section, version, items) => ({ applied: false, count: items.length }) }
}));

test('portal-api sin PostgreSQL no registra la ruta, pero tampoco rechaza cuerpos grandes del canal interno', async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_ecosistema_karen_2026_super_secret_32chars';
  process.env.STORE_SERVICE_KEY = KEY;
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = '1';
  const createPortalServer = require('../src/apps/portal/createPortalServer');
  const { closePool } = require('../src/infrastructure/db/postgres');
  const app = await createPortalServer();
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const items = Array.from({ length: 1500 }, (_, i) => ({ ...samples.lotes, id: uuid(i), numeroLote: `L-${i}` }));
    const internal = await post(`${base}/internal/v1/store/sync/catalog`, { section: 'lotes', version: 1, items });
    assert.equal(internal.status, 404, 'sin base de datos la ruta no existe, pero el cuerpo no se rechaza por tamaño');

    const publicApi = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(200 * 1024) })
    });
    assert.equal(publicApi.status, 413, 'la API pública conserva su límite de 100 kb');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await app.locals.shutdown();
    await closePool();
  }
});
