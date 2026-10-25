const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isWeakKey, withServiceKey, portalDbEnv, servicePorts, buildSplitEnv, mobileApiUrls, deprecatedEnvVars
} = require('./splitEnv');

const KEY = 'k'.repeat(48);

test('una clave de servicio débil o de ejemplo se considera inválida', () => {
  assert.equal(isWeakKey(''), true);
  assert.equal(isWeakKey(undefined), true);
  assert.equal(isWeakKey('corta'), true);
  assert.equal(isWeakKey('change_me_with_another_long_random_secret'), true);
  assert.equal(isWeakKey(KEY), false);
});

test('withServiceKey reemplaza la línea existente sin tocar el resto del archivo', () => {
  const before = 'PORT=4000\nSTORE_SERVICE_KEY=change_me_with_another_long_random_secret\nJWT_SECRET=abc\n';
  assert.equal(withServiceKey(before, KEY), `PORT=4000\nSTORE_SERVICE_KEY=${KEY}\nJWT_SECRET=abc\n`);
});

test('withServiceKey agrega la línea si no existe, respetando el fin de línea del archivo', () => {
  assert.equal(withServiceKey('PORT=4000\n', KEY), `PORT=4000\nSTORE_SERVICE_KEY=${KEY}\n`);
  assert.equal(withServiceKey('PORT=4000', KEY), `PORT=4000\nSTORE_SERVICE_KEY=${KEY}\n`);
  assert.equal(withServiceKey('PORT=4000\r\n', KEY), `PORT=4000\r\nSTORE_SERVICE_KEY=${KEY}\r\n`);
  assert.equal(withServiceKey('', KEY), `STORE_SERVICE_KEY=${KEY}\n`);
});

test('la base del portal usa los valores por defecto de docker-compose si .env no los define', () => {
  assert.deepEqual(portalDbEnv({}), {
    PORTAL_DB_HOST: 'localhost',
    PORTAL_DB_PORT: '5434',
    PORTAL_DB_NAME: 'ecosistema_karen_portal',
    PORTAL_DB_USER: 'karen_portal',
    PORTAL_DB_PASSWORD: 'karen_portal_pass'
  });
  const custom = portalDbEnv({ PORTAL_DB_EXPOSED_PORT: '6000', PORTAL_DB_NAME: 'otra', PORTAL_DB_PASSWORD: 'secreto' });
  assert.equal(custom.PORTAL_DB_PORT, '6000');
  assert.equal(custom.PORTAL_DB_NAME, 'otra');
  assert.equal(custom.PORTAL_DB_PASSWORD, 'secreto');
  assert.equal(portalDbEnv({ PORTAL_DB_PORT: '5999', PORTAL_DB_EXPOSED_PORT: '6000' }).PORTAL_DB_PORT, '5999');
});

test('los puertos de los servicios salen de .env con valores por defecto 4000 y 4001', () => {
  assert.deepEqual(servicePorts({}), { storePort: 4000, portalPort: 4001 });
  assert.deepEqual(servicePorts({ PORT: '4100', PORTAL_PORT: '4200' }), { storePort: 4100, portalPort: 4200 });
  assert.deepEqual(servicePorts({ PORT: '4100', STORE_PORT: '4300' }), { storePort: 4300, portalPort: 4001 });
});

test('buildSplitEnv conecta la tienda con el portal y reenvía el portal web al portal', () => {
  const split = buildSplitEnv({ env: { PORT: '4000' }, serviceKey: KEY });
  assert.equal(split.store.STORE_PORT, '4000');
  assert.equal(split.portal.PORTAL_PORT, '4001');
  for (const side of [split.store, split.portal]) {
    assert.equal(side.STORE_SERVICE_KEY, KEY, 'ambos servicios comparten la clave');
    assert.equal(side.PORTAL_URL, 'http://localhost:4001');
    assert.equal(side.PORTAL_DB_NAME, 'ecosistema_karen_portal');
  }
  assert.equal(split.web.VITE_PROXY_TARGET, 'http://localhost:4001');
});

test('cada app móvil apunta a su backend con la IP de la red local', () => {
  const urls = mobileApiUrls({ args: {}, lanHost: '192.168.1.20', storePort: 4000, portalPort: 4001 });
  assert.equal(urls.portal, 'http://192.168.1.20:4001/api/v1');
  assert.equal(urls.bodega, 'http://192.168.1.20:4000/api/v1');
});

test('las URLs explícitas tienen prioridad y se limpia la barra final', () => {
  const urls = mobileApiUrls({
    args: { 'api-url': 'https://portal.karen.example/api/v1/', 'store-api-url': 'http://10.0.0.5:4000/api/v1' },
    lanHost: '192.168.1.20', storePort: 4000, portalPort: 4001
  });
  assert.equal(urls.portal, 'https://portal.karen.example/api/v1');
  assert.equal(urls.bodega, 'http://10.0.0.5:4000/api/v1');
});

test('sin IP de red local ni URL explícita no se inventa una', () => {
  const urls = mobileApiUrls({ args: { 'api-url': true }, lanHost: null, storePort: 4000, portalPort: 4001 });
  assert.equal(urls.portal, null);
  assert.equal(urls.bodega, null);
});

test('avisa de las variables obsoletas que siguen en el .env', () => {
  assert.deepEqual(deprecatedEnvVars({ PORT: '4000' }), []);
  const found = deprecatedEnvVars({ PORT: '4000', HEARTBEAT_AUTO_PING: 'FALSE' });
  assert.equal(found.length, 1);
  assert.equal(found[0].name, 'HEARTBEAT_AUTO_PING');
  assert.match(found[0].reason, /HEARTBEAT_ENABLED/);
});
