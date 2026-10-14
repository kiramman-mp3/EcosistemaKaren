require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const HeartbeatMonitor = require('../src/infrastructure/heartbeat/HeartbeatMonitor');
const HeartbeatSimulatorWorker = require('../src/infrastructure/workers/HeartbeatSimulatorWorker');
const PostgresRateLimitStore = require('../src/infrastructure/http/middlewares/PostgresRateLimitStore');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');
const PostgresHeartbeatStore = require('../src/infrastructure/heartbeat/PostgresHeartbeatStore');

test.after(async () => {
  await closePool();
});

test('dos monitores de heartbeat sincronizan su estado mediante una tienda compartida', async () => {
  // Simulación de almacenamiento en memoria compartido entre instancias
  let sharedTimestamp = null;
  const mockSharedStore = {
    setLastHeartbeat: async (ts) => { sharedTimestamp = ts; },
    getLastHeartbeat: async () => sharedTimestamp,
  };

  const fixedTime = Date.parse('2026-10-13T12:00:00.000Z');
  const monitorInstance1 = new HeartbeatMonitor(60, () => fixedTime, mockSharedStore);
  const monitorInstance2 = new HeartbeatMonitor(60, () => fixedTime, mockSharedStore);

  // Inicialmente ambas instancias ven la tienda OFFLINE
  const initialStatus2 = await monitorInstance2.getStatus();
  assert.equal(initialStatus2.status, 'OFFLINE');
  assert.equal(initialStatus2.reservationsBlocked, true);

  // La instancia 1 recibe el ping de la tienda física
  await monitorInstance1.recordHeartbeat();

  // La instancia 2 consulta el estado y lo ve ONLINE inmediatamente
  const updatedStatus2 = await monitorInstance2.getStatus();
  assert.equal(updatedStatus2.status, 'ONLINE');
  assert.equal(updatedStatus2.reservationsBlocked, false);
  assert.equal(updatedStatus2.secondsSinceLastHeartbeat, 0);

  // Ambas instancias permiten reservas
  await assert.doesNotReject(async () => {
    await monitorInstance2.assertReservationsAvailable();
  });
});

test('PostgresRateLimitStore y PostgresHeartbeatStore sincronizan en PostgreSQL', async (t) => {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    t.skip('PostgreSQL no disponible para prueba de integración');
    return;
  }

  const pool = getPool();
  const heartbeatStore = new PostgresHeartbeatStore(pool);
  const testTime = Date.now();

  await heartbeatStore.setLastHeartbeat(testTime);
  const retrievedTime = await heartbeatStore.getLastHeartbeat();
  assert.ok(Math.abs(retrievedTime - testTime) < 2000);

  const rateLimitStore = new PostgresRateLimitStore(pool);
  rateLimitStore.init({ windowMs: 10000 });
  const testKey = `test-ip-${Date.now()}`;

  const hit1 = await rateLimitStore.increment(testKey);
  assert.equal(hit1.totalHits, 1);
  assert.ok(hit1.resetTime instanceof Date);

  const hit2 = await rateLimitStore.increment(testKey);
  assert.equal(hit2.totalHits, 2);

  await rateLimitStore.decrement(testKey);
  await rateLimitStore.resetKey(testKey);
});

test('HeartbeatSimulatorWorker emite pings periódicos y mantiene el monitor ONLINE', async () => {
  let recorded = 0;
  const mockMonitor = {
    recordHeartbeat: async () => {
      recorded++;
      return { status: 'ONLINE', reservationsBlocked: false };
    }
  };

  const worker = new HeartbeatSimulatorWorker(mockMonitor, 50);
  worker.start();
  // Primer ping inmediato al iniciar
  assert.equal(recorded, 1);

  // Esperar un ciclo del timer
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.ok(recorded >= 2);

  worker.stop();
  const countAtStop = recorded;
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(recorded, countAtStop);
});
