require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');

const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const { PostgresAlertRepository } = require('../src/adapters/repositories/PostgresRepositories');
const { ObtenerAlertasCaducidad, AtenderAlertaCaducidad } = require('../src/use-cases/lots/LotUseCases');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');

test.after(async () => {
  await closePool();
});

test('InMemoryAlertRepository soporta save, findAll con filtros, findById y markAsAttended', async () => {
  const mem = new InMemoryRepositories();
  const repo = mem.alertRepository;

  const alerts = await repo.findAll();
  assert.ok(alerts.length > 0, 'debe tener alertas iniciales del seed');

  const pendientes = await repo.findAll({ atendida: false });
  assert.ok(pendientes.length > 0);
  assert.ok(pendientes.every(a => a.atendida === false));

  const target = pendientes[0];
  assert.ok(target.id);
  assert.ok(target.numeroLote);
  assert.ok(target.productoNombre);

  const found = await repo.findById(target.id);
  assert.equal(found.id, target.id);

  const updated = await repo.markAsAttended(target.id);
  assert.equal(updated.id, target.id);
  assert.equal(updated.atendida, true);

  const atendidas = await repo.findAll({ atendida: true });
  assert.ok(atendidas.some(a => a.id === target.id));
});

test('AtenderAlertaCaducidad valida existencia y marca la alerta como atendida', async () => {
  const mem = new InMemoryRepositories();
  const repo = mem.alertRepository;
  const useCase = new AtenderAlertaCaducidad(repo);

  const [primera] = await repo.findAll({ atendida: false });
  assert.ok(primera);

  const resultado = await useCase.execute(primera.id);
  assert.equal(resultado.id, primera.id);
  assert.equal(resultado.atendida, true);

  await assert.rejects(
    () => useCase.execute('alerta-inexistente-1234'),
    error => error.statusCode === 404
  );

  await assert.rejects(
    () => useCase.execute(''),
    error => error.statusCode === 400
  );
});

test('ObtenerAlertasCaducidad consulta el repositorio cuando está inyectado y preserva fallback si no se inyecta', async () => {
  const mem = new InMemoryRepositories();

  // Con alertRepository inyectado
  const ucConRepo = new ObtenerAlertasCaducidad(mem.lotRepository, mem.alertRepository);
  const alertasDesdeRepo = await ucConRepo.execute({ nivel: 'ROJO' });
  assert.ok(alertasDesdeRepo.length > 0);
  assert.ok(alertasDesdeRepo.every(a => a.nivel === 'ROJO'));

  // Sin alertRepository inyectado (fallback dinámico retrocompatible)
  const ucSinRepo = new ObtenerAlertasCaducidad(mem.lotRepository);
  const alertasCalculadas = await ucSinRepo.execute();
  assert.ok(alertasCalculadas.length > 0);
  assert.ok(alertasCalculadas[0].id.startsWith('alerta-'));
});

test('PostgresAlertRepository consulta y gestiona estado en la tabla alertas_caducidad', async (t) => {
  const reachable = await testConnection();
  if (!reachable) {
    t.skip('PostgreSQL no disponible en este entorno.');
    return;
  }

  const pool = getPool();
  const repo = new PostgresAlertRepository(pool);

  let todas = await repo.findAll({ limit: 10 });
  let createdAlertId = null;

  if (todas.length === 0) {
    const lotRes = await pool.query('SELECT id FROM lotes LIMIT 1');
    if (!lotRes.rowCount) {
      t.skip('Faltan semillas de lotes en la base de datos.');
      return;
    }
    const alertId = require('node:crypto').randomUUID();
    await repo.save({
      id: alertId,
      loteId: lotRes.rows[0].id,
      diasParaVencer: 3,
      nivel: 'ROJO',
      atendida: false
    });
    createdAlertId = alertId;
    todas = await repo.findAll({ limit: 10 });
  }

  t.after(async () => {
    if (createdAlertId) {
      await pool.query('DELETE FROM alertas_caducidad WHERE id = $1', [createdAlertId]).catch(() => {});
    }
  });

  assert.ok(todas.length > 0, 'debe leer alertas de la base de datos');
  const [primera] = todas;
  assert.ok(primera.id);
  assert.ok(primera.loteId);
  assert.ok(primera.numeroLote);
  assert.ok(primera.productoNombre);

  const encontrada = await repo.findById(primera.id);
  assert.ok(encontrada);
  assert.equal(encontrada.id, primera.id);

  const actualizada = await repo.markAsAttended(primera.id);
  assert.ok(actualizada);
  assert.equal(actualizada.id, primera.id);
  assert.equal(actualizada.atendida, true);

  const verificada = await repo.findById(primera.id);
  assert.equal(verificada.atendida, true);
});
