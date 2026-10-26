const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { connectionSettings, sslSettings } = require('../src/infrastructure/db/postgres');

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

test('sin DB_SSL no se usa TLS', () => {
  assert.equal(sslSettings('store', {}), undefined);
  assert.equal(sslSettings('portal', { DB_SSL: 'false' }), undefined);
});

test('DB_SSL=true verifica el certificado y no-verify solo cifra', () => {
  assert.deepEqual(sslSettings('store', { DB_SSL: 'true' }), { rejectUnauthorized: true });
  assert.deepEqual(sslSettings('store', { DB_SSL: 'no-verify' }), { rejectUnauthorized: false });
});

test('el portal prefiere PORTAL_DB_SSL y cae en DB_SSL; la tienda ignora PORTAL_DB_SSL', () => {
  assert.deepEqual(sslSettings('portal', { DB_SSL: 'true', PORTAL_DB_SSL: 'no-verify' }), { rejectUnauthorized: false });
  assert.deepEqual(sslSettings('portal', { DB_SSL: 'true', PORTAL_DB_SSL: '' }), { rejectUnauthorized: true });
  assert.equal(sslSettings('store', { PORTAL_DB_SSL: 'true' }), undefined);
});

test('DB_SSL_CA acepta el PEM en la variable o la ruta a un archivo y mantiene la verificación', () => {
  const pem = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
  assert.deepEqual(sslSettings('store', { DB_SSL: 'true', DB_SSL_CA: pem }), { rejectUnauthorized: true, ca: pem });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'karen-ca-')), 'ca.crt');
  fs.writeFileSync(file, pem);
  assert.deepEqual(sslSettings('store', { DB_SSL: 'true', DB_SSL_CA: file }), { rejectUnauthorized: true, ca: pem });
});

test('el portal prefiere PORTAL_DB_SSL_CA y DB_SSL_CA se ignora sin DB_SSL=true', () => {
  const pem = '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----';
  const other = '-----BEGIN CERTIFICATE-----\nBBBB\n-----END CERTIFICATE-----';
  assert.equal(sslSettings('portal', { DB_SSL: 'true', DB_SSL_CA: other, PORTAL_DB_SSL_CA: pem }).ca, pem);
  assert.equal(sslSettings('store', { DB_SSL_CA: pem }), undefined);
  assert.deepEqual(sslSettings('store', { DB_SSL: 'no-verify', DB_SSL_CA: pem }), { rejectUnauthorized: false });
});

test('una ruta de DB_SSL_CA inexistente falla de forma explícita', () => {
  assert.throws(() => sslSettings('store', { DB_SSL: 'true', DB_SSL_CA: path.join(os.tmpdir(), 'no-existe.crt') }), /ENOENT/);
});
