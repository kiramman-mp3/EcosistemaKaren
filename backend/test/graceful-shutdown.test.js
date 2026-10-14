process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_ecosistema_karen_2026_super_secret_32chars';
const test = require('node:test');
const assert = require('node:assert/strict');
const createServer = require('../src/infrastructure/http/server');
const { closePool } = require('../src/infrastructure/db/postgres');

test('el servidor expone app.locals.shutdown y libera trabajadores, SSE y conexiones DB', async () => {
  const app = await createServer();

  assert.equal(typeof app.locals.shutdown, 'function');

  // Ejecuta la rutina de apagado ordenado
  await assert.doesNotReject(async () => {
    await app.locals.shutdown();
  });

  // Una llamada posterior a closePool debe ser idempotente
  await assert.doesNotReject(async () => {
    await closePool();
  });
});
