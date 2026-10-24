const test = require('node:test');
const assert = require('node:assert/strict');
const { connectionSettings } = require('../src/infrastructure/db/postgres');

const storeEnv = {
  DB_HOST: 'db-tienda',
  DB_PORT: '5433',
  DB_NAME: 'ecosistema_karen',
  DB_USER: 'karen_user',
  DB_PASSWORD: 'secreto-tienda'
};

test('la tienda siempre usa DB_*, aunque existan PORTAL_DB_*', () => {
  const settings = connectionSettings('store', { ...storeEnv, PORTAL_DB_NAME: 'ecosistema_karen_portal' });
  assert.deepEqual(settings, {
    host: 'db-tienda',
    port: 5433,
    database: 'ecosistema_karen',
    user: 'karen_user',
    password: 'secreto-tienda'
  });
});

test('el portal usa PORTAL_DB_* y cae en DB_* para lo que no esté definido', () => {
  const settings = connectionSettings('portal', {
    ...storeEnv,
    PORTAL_DB_PORT: '5434',
    PORTAL_DB_NAME: 'ecosistema_karen_portal',
    PORTAL_DB_PASSWORD: 'secreto-portal'
  });
  assert.equal(settings.host, 'db-tienda');
  assert.equal(settings.port, 5434);
  assert.equal(settings.database, 'ecosistema_karen_portal');
  assert.equal(settings.user, 'karen_user');
  assert.equal(settings.password, 'secreto-portal');
});

test('un portal sin PORTAL_DB_* comparte la conexión de la tienda (monolito o despliegue solo del portal)', () => {
  assert.deepEqual(connectionSettings('portal', storeEnv), connectionSettings('store', storeEnv));
});

test('las variables vacías se ignoran y se aplican los valores por defecto', () => {
  const settings = connectionSettings('portal', { PORTAL_DB_NAME: '', DB_PORT: 'no-es-numero' });
  assert.equal(settings.database, 'ecosistema_karen');
  assert.equal(settings.port, 5432);
  assert.equal(settings.host, 'localhost');
});
