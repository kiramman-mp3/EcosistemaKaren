const test = require('node:test');
const assert = require('node:assert/strict');

const HeartbeatMonitor = require('../src/infrastructure/heartbeat/HeartbeatMonitor');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const { ExpireLots, ObtenerAlertasCaducidad } = require('../src/use-cases/lots/LotUseCases');

test('heartbeat inicia bloqueado, se habilita con ping y vuelve a expirar', () => {
  let now = Date.parse('2026-10-09T12:00:00.000Z');
  const monitor = new HeartbeatMonitor(60, () => now);

  assert.equal(monitor.getStatus().reservationsBlocked, true);
  assert.throws(() => monitor.assertReservationsAvailable(), error => error.statusCode === 503);

  monitor.recordHeartbeat();
  assert.equal(monitor.getStatus().status, 'ONLINE');
  now += 61_000;
  assert.equal(monitor.getStatus().status, 'OFFLINE');
  assert.throws(() => monitor.assertReservationsAvailable(), error => error.statusCode === 503);
});

test('marca lotes vencidos una sola vez, los excluye del inventario activo y conserva su alerta', async () => {
  const memory = new InMemoryRepositories();
  const repository = memory.lotRepository;
  const lot = memory.lots[0];
  lot.estado = 'ACTIVO';
  lot.fechaCaducidad = new Date(2000, 0, 1);

  assert.equal((await repository.findAllActive()).some(item => item.id === lot.id), false);
  const expireLots = new ExpireLots(repository);
  assert.equal((await expireLots.execute()).countExpired, 1);
  assert.equal((await expireLots.execute()).countExpired, 0);
  assert.equal(lot.estado, 'VENCIDO');

  const alerts = await new ObtenerAlertasCaducidad(repository).execute();
  assert.equal(alerts.some(alert => alert.loteId === lot.id && alert.nivel === 'VENCIDO'), true);
});
