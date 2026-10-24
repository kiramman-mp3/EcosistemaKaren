const test = require('node:test');
const assert = require('node:assert/strict');
const { createServiceAuth, SERVICE_KEY_HEADER } = require('../src/infrastructure/http/middlewares/serviceAuth');
const { readServiceConfig } = require('../src/apps/shared/serviceConfig');

const KEY = 'k'.repeat(40);

function run(middleware, headerValue) {
  const req = { get: name => (name === SERVICE_KEY_HEADER ? headerValue : undefined) };
  let received;
  middleware(req, {}, err => { received = err; });
  return received;
}

test('serviceAuth acepta la clave correcta', () => {
  assert.equal(run(createServiceAuth(KEY), KEY), undefined);
});

test('serviceAuth rechaza claves ausentes o incorrectas con 401', () => {
  assert.equal(run(createServiceAuth(KEY), undefined).statusCode, 401);
  assert.equal(run(createServiceAuth(KEY), 'otra-clave').statusCode, 401);
});

test('serviceAuth deshabilita el canal con 503 si no hay clave configurada', () => {
  assert.equal(run(createServiceAuth(''), KEY).statusCode, 503);
});

test('readServiceConfig no exige nada en el monolito', () => {
  assert.doesNotThrow(() => readServiceConfig({ store: true, portal: true }, { NODE_ENV: 'production' }));
});

test('readServiceConfig exige clave fuerte en producción para store o portal por separado', () => {
  const env = { NODE_ENV: 'production', PORTAL_URL: 'https://portal.karen.example', STORE_SERVICE_KEY: 'corta' };
  assert.throws(() => readServiceConfig({ store: true, portal: false }, env), /STORE_SERVICE_KEY/);
  assert.throws(() => readServiceConfig({ store: false, portal: true }, env), /STORE_SERVICE_KEY/);
  assert.doesNotThrow(() => readServiceConfig({ store: false, portal: true }, { ...env, STORE_SERVICE_KEY: KEY }));
});

test('readServiceConfig exige PORTAL_URL válida y https en producción para store-api', () => {
  const base = { NODE_ENV: 'development', STORE_SERVICE_KEY: KEY };
  assert.throws(() => readServiceConfig({ store: true, portal: false }, base), /PORTAL_URL/);
  assert.throws(() => readServiceConfig({ store: true, portal: false }, { ...base, PORTAL_URL: 'ftp://x' }), /http o https/);
  assert.throws(
    () => readServiceConfig({ store: true, portal: false }, { ...base, NODE_ENV: 'production', PORTAL_URL: 'http://portal.local' }),
    /https/
  );
  const config = readServiceConfig({ store: true, portal: false }, { ...base, PORTAL_URL: 'http://localhost:4001/' });
  assert.equal(config.portalUrl, 'http://localhost:4001');
  assert.equal(config.storeId, 'tienda-principal');
});

test('readServiceConfig permite desactivar el heartbeat, la sincronización de catálogo y la cola de reservas', () => {
  const config = readServiceConfig(
    { store: true, portal: false },
    { NODE_ENV: 'development', HEARTBEAT_ENABLED: 'false', CATALOG_SYNC_ENABLED: 'false', RESERVATION_QUEUE_ENABLED: 'false' }
  );
  assert.equal(config.heartbeatEnabled, false);
  assert.equal(config.catalogSyncEnabled, false);
});

test('la sincronización de catálogo por sí sola exige PORTAL_URL y clave aunque el heartbeat esté desactivado', () => {
  assert.throws(
    () => readServiceConfig({ store: true, portal: false }, { NODE_ENV: 'development', HEARTBEAT_ENABLED: 'false' }),
    /STORE_SERVICE_KEY/
  );
});

test('los intervalos de sincronización tienen valores por defecto y mínimos', () => {
  const env = { NODE_ENV: 'development', STORE_SERVICE_KEY: KEY, PORTAL_URL: 'http://localhost:4001' };
  const defaults = readServiceConfig({ store: true, portal: false }, env);
  assert.equal(defaults.catalogSyncIntervalMs, 15000);
  assert.equal(defaults.catalogResyncMs, 600000);

  const custom = readServiceConfig({ store: true, portal: false }, { ...env, CATALOG_SYNC_INTERVAL_SECONDS: '30', CATALOG_RESYNC_SECONDS: '120' });
  assert.equal(custom.catalogSyncIntervalMs, 30000);
  assert.equal(custom.catalogResyncMs, 120000);

  const tooFast = readServiceConfig({ store: true, portal: false }, { ...env, CATALOG_SYNC_INTERVAL_SECONDS: '1' });
  assert.equal(tooFast.catalogSyncIntervalMs, 15000, 'un intervalo menor al mínimo vuelve al valor por defecto');
});
