const fs = require('fs');
const path = require('path');

const INIT_DB = path.resolve(__dirname, '../../../init-db');

// Cada servicio (ADR-003) tiene su propio conjunto de migraciones y su propia base de datos.
// El monolito de transición aplica ambos conjuntos sobre una misma base.
const MIGRATION_SETS = {
  store: [
    { version: '002_promotions_approval', file: path.join(INIT_DB, 'store/02-promotions-approval.sql') },
    { version: '003_promotions_production_hardening', file: path.join(INIT_DB, 'store/03-promotions-production-hardening.sql') },
    { version: '004_inventory_traceability', file: path.join(INIT_DB, 'store/04-inventory-traceability.sql') },
    { version: '005_refresh_demo_lots', file: path.join(INIT_DB, 'store/05-refresh-demo-lots.sql') },
    { version: '006_fix_demo_barcodes', file: path.join(INIT_DB, 'store/06-fix-demo-barcodes.sql') },
    { version: '007_product_tax', file: path.join(INIT_DB, 'store/07-product-tax.sql') },
    { version: '008_product_image', file: path.join(INIT_DB, 'store/08-product-image.sql') },
    { version: '009_product_search', file: path.join(INIT_DB, 'store/09-product-search.sql') },
    { version: '010_heartbeat_and_ratelimit', file: path.join(INIT_DB, 'store/10-heartbeat-and-ratelimit.sql') },
    { version: '011_token_revocation', file: path.join(INIT_DB, 'store/11-token-revocation.sql') },
    { version: '012_remote_clients_and_outbox', file: path.join(INIT_DB, 'store/12-remote-clients-and-outbox.sql') }
  ],
  portal: [
    { version: 'portal_001_schema', file: path.join(INIT_DB, 'portal/01-portal-schema.sql') },
    { version: 'portal_002_catalog_mirror', file: path.join(INIT_DB, 'portal/02-catalog-mirror.sql') },
    { version: 'portal_003_reservations', file: path.join(INIT_DB, 'portal/03-reservations.sql') }
  ]
};

function migrationsFor(targets) {
  const unknown = targets.filter(target => !MIGRATION_SETS[target]);
  if (unknown.length > 0) {
    throw new Error(`Conjunto de migraciones desconocido: ${unknown.join(', ')}.`);
  }
  return targets.flatMap(target => MIGRATION_SETS[target]);
}

async function runMigrations(pool, { targets = ['store'] } = {}) {
  const migrations = migrationsFor(targets);
  const client = await pool.connect();
  const migrationLockId = 742601;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [migrationLockId]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const migration of migrations) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [migration.version]
      );
      if (alreadyApplied.rowCount > 0) continue;

      const sql = fs.readFileSync(migration.file, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [migration.version]
        );
        await client.query('COMMIT');
        console.log(`✅ Migración aplicada: ${migration.version}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`No se pudo aplicar la migración ${migration.version}: ${error.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [migrationLockId]).catch(() => {});
    client.release();
  }
}

module.exports = { runMigrations, MIGRATION_SETS };
