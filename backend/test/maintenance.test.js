require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const MaintenanceWorker = require('../src/infrastructure/workers/MaintenanceWorker');
const {
  createMaintenanceTasks, purgeExpiredTokens, purgeExpiredRateLimits, purgeResolvedCommands
} = require('../src/infrastructure/maintenance/maintenanceTasks');
const { readServiceConfig } = require('../src/apps/shared/serviceConfig');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');

// ─── worker ────────────────────────────────────────────────────────────────────────────────────
const quiet = async (fn) => {
  const { log, error } = console;
  console.log = () => {};
  console.error = () => {};
  try { return await fn(); } finally { console.log = log; console.error = error; }
};

test('el worker ejecuta todas las tareas y un fallo no detiene a las demás', async () => {
  const ran = [];
  const worker = new MaintenanceWorker([
    { name: 'a', run: async () => { ran.push('a'); return 3; } },
    { name: 'b', run: async () => { ran.push('b'); throw new Error('base caída'); } },
    { name: 'c', run: async () => { ran.push('c'); return 0; } }
  ]);
  const report = await quiet(() => worker.runOnce());
  assert.deepEqual(ran, ['a', 'b', 'c']);
  assert.deepEqual(report, [
    { name: 'a', removed: 3 },
    { name: 'b', error: 'base caída' },
    { name: 'c', removed: 0 }
  ]);
});

test('una vuelta en curso no se solapa con la siguiente', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const worker = new MaintenanceWorker([{ name: 'lenta', run: async () => { calls += 1; await gate; return 0; } }]);
  const first = worker.runOnce();
  assert.deepEqual(await worker.runOnce(), [], 'la segunda se omite mientras la primera corre');
  release();
  await first;
  assert.equal(calls, 1);
});

test('las tareas de cada servicio: el portal con base propia también depura sus comandos resueltos', () => {
  const pool = { query: async () => ({ rowCount: 0 }) };
  assert.deepEqual(createMaintenanceTasks({ pool, retentionDays: 30 }).map(task => task.name),
    ['tokens revocados vencidos', 'contadores de límite de tasa vencidos']);
  assert.equal(createMaintenanceTasks({ pool, retentionDays: 30, portalQueue: true }).length, 3);
});

test('los parámetros de mantenimiento tienen valores por defecto y límites', () => {
  const base = { NODE_ENV: 'development' };
  const defaults = readServiceConfig({ store: true, portal: true }, base);
  assert.equal(defaults.maintenanceIntervalMs, 60 * 60 * 1000);
  assert.equal(defaults.retentionDays, 30);
  const custom = readServiceConfig({ store: true, portal: true }, { ...base, MAINTENANCE_INTERVAL_MINUTES: '15', RETENTION_DAYS: '7' });
  assert.equal(custom.maintenanceIntervalMs, 15 * 60 * 1000);
  assert.equal(custom.retentionDays, 7);
  const invalid = readServiceConfig({ store: true, portal: true }, { ...base, MAINTENANCE_INTERVAL_MINUTES: '0', RETENTION_DAYS: '-5' });
  assert.equal(invalid.maintenanceIntervalMs, 60 * 60 * 1000);
  assert.equal(invalid.retentionDays, 30);
});

// ─── limpieza real en PostgreSQL ───────────────────────────────────────────────────────────────
test('la limpieza borra solo lo vencido y conserva lo vigente (PostgreSQL)', async (t) => {
  if (!(await testConnection())) return t.skip('PostgreSQL no disponible');
  const pool = getPool();
  const ready = await pool.query("SELECT to_regclass('public.comandos_tienda') AS commands, to_regclass('public.tokens_revocados') AS tokens");
  if (!ready.rows[0].commands || !ready.rows[0].tokens) return t.skip('base sin migrar');

  const stamp = `mant-${Date.now()}`;
  try {
    // Tokens revocados: uno vencido y uno vigente.
    await pool.query("INSERT INTO tokens_revocados (jti, expira_en) VALUES ($1, CURRENT_TIMESTAMP - interval '1 day'), ($2, CURRENT_TIMESTAMP + interval '1 day')", [`${stamp}-viejo`, `${stamp}-vigente`]);
    // Contadores: uno vencido hace horas, uno vencido hace minutos (dentro de la hora de gracia) y uno vigente.
    await pool.query(
      `INSERT INTO rate_limit_hits (key, hits, reset_at) VALUES
        ($1, 5, CURRENT_TIMESTAMP - interval '3 hours'),
        ($2, 5, CURRENT_TIMESTAMP - interval '10 minutes'),
        ($3, 5, CURRENT_TIMESTAMP + interval '10 minutes')`,
      [`${stamp}:viejo`, `${stamp}:reciente`, `${stamp}:vigente`]
    );
    const removedTokens = await purgeExpiredTokens(pool).run();
    const removedHits = await purgeExpiredRateLimits(pool).run();
    assert.ok(removedTokens >= 1 && removedHits >= 1);

    const tokens = (await pool.query('SELECT jti FROM tokens_revocados WHERE jti LIKE $1', [`${stamp}-%`])).rows.map(row => row.jti);
    assert.deepEqual(tokens, [`${stamp}-vigente`]);
    const hits = (await pool.query('SELECT key FROM rate_limit_hits WHERE key LIKE $1 ORDER BY key', [`${stamp}:%`])).rows.map(row => row.key);
    assert.deepEqual(hits, [`${stamp}:reciente`, `${stamp}:vigente`]);

    // Comandos resueltos: el antiguo se borra; el reciente y el pendiente se conservan.
    const user = await pool.query("INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES ('Mantenimiento', $1, 'CLIENTE', 'x') RETURNING id", [`${stamp}@example.test`]);
    const reservation = await pool.query(
      "INSERT INTO reservas_portal (cliente_id, estado, fecha_expiracion, items) VALUES ($1, 'PENDIENTE_SYNC', CURRENT_TIMESTAMP + interval '30 minutes', '[]'::jsonb) RETURNING id",
      [user.rows[0].id]
    );
    await pool.query(
      `INSERT INTO comandos_tienda (tipo, reserva_id, payload, estado, resuelto_at) VALUES
        ('RESERVATION_CREATE', $1, '{"nota":"antiguo"}', 'RESUELTO', CURRENT_TIMESTAMP - interval '40 days'),
        ('RESERVATION_CANCEL', $1, '{"nota":"reciente"}', 'RESUELTO', CURRENT_TIMESTAMP - interval '2 days'),
        ('RESERVATION_CANCEL', $1, '{"nota":"pendiente"}', 'PENDIENTE', NULL)`,
      [reservation.rows[0].id]
    );
    const removedCommands = await purgeResolvedCommands(pool, 30).run();
    assert.ok(removedCommands >= 1);
    const notes = (await pool.query("SELECT payload->>'nota' AS nota FROM comandos_tienda WHERE reserva_id = $1 ORDER BY seq", [reservation.rows[0].id])).rows.map(row => row.nota);
    assert.deepEqual(notes, ['reciente', 'pendiente']);
    assert.equal((await pool.query('SELECT 1 FROM reservas_portal WHERE id = $1', [reservation.rows[0].id])).rows.length, 1, 'la reserva se conserva');

    await pool.query('DELETE FROM comandos_tienda WHERE reserva_id = $1', [reservation.rows[0].id]);
    await pool.query('DELETE FROM reservas_portal WHERE id = $1', [reservation.rows[0].id]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [user.rows[0].id]);
  } finally {
    await pool.query('DELETE FROM tokens_revocados WHERE jti LIKE $1', [`${stamp}-%`]);
    await pool.query('DELETE FROM rate_limit_hits WHERE key LIKE $1', [`${stamp}:%`]);
    await closePool();
  }
});
