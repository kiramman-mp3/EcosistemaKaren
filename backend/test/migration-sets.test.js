const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runMigrations, MIGRATION_SETS } = require('../src/infrastructure/db/migrations');

function fakePool() {
  const applied = new Set();
  const executed = [];
  const client = {
    async query(sql, params) {
      if (/SELECT 1 FROM schema_migrations/.test(sql)) return { rowCount: applied.has(params[0]) ? 1 : 0 };
      if (/INSERT INTO schema_migrations/.test(sql)) applied.add(params[0]);
      executed.push(sql.trim().split('\n')[0].slice(0, 60));
      return { rowCount: 0 };
    },
    release() {}
  };
  return { pool: { connect: async () => client }, applied, executed };
}

test('cada migración declarada apunta a un archivo SQL existente y con versión única', () => {
  const versions = new Set();
  for (const [name, migrations] of Object.entries(MIGRATION_SETS)) {
    for (const migration of migrations) {
      assert.ok(fs.existsSync(migration.file), `${name}: falta ${migration.file}`);
      assert.ok(!versions.has(migration.version), `versión repetida: ${migration.version}`);
      versions.add(migration.version);
    }
  }
});

test('el portal no incluye migraciones de la tienda ni al revés', () => {
  const storeVersions = MIGRATION_SETS.store.map(m => m.version);
  const portalVersions = MIGRATION_SETS.portal.map(m => m.version);
  assert.ok(portalVersions.every(version => version.startsWith('portal_')));
  assert.ok(storeVersions.every(version => !version.startsWith('portal_')));
});

test('runMigrations aplica por defecto solo el conjunto de la tienda', async () => {
  const { pool, applied } = fakePool();
  await runMigrations(pool);
  assert.deepEqual([...applied], MIGRATION_SETS.store.map(m => m.version));
});

test('runMigrations aplica solo el conjunto del portal y es idempotente', async () => {
  const { pool, applied } = fakePool();
  await runMigrations(pool, { targets: ['portal'] });
  await runMigrations(pool, { targets: ['portal'] });
  assert.deepEqual([...applied], MIGRATION_SETS.portal.map(m => m.version));
});

test('el monolito aplica ambos conjuntos sobre la misma base', async () => {
  const { pool, applied } = fakePool();
  await runMigrations(pool, { targets: ['store', 'portal'] });
  assert.equal(applied.size, MIGRATION_SETS.store.length + MIGRATION_SETS.portal.length);
});

test('runMigrations rechaza conjuntos desconocidos antes de tocar la base', async () => {
  const { pool, executed } = fakePool();
  await assert.rejects(() => runMigrations(pool, { targets: ['otro'] }), /desconocido/);
  assert.equal(executed.length, 0);
});
