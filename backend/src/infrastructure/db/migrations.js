const fs = require('fs');
const path = require('path');

const MIGRATIONS = [
  {
    version: '002_promotions_approval',
    file: path.resolve(__dirname, '../../../init-db/02-promotions-approval.sql')
  },
  {
    version: '003_promotions_production_hardening',
    file: path.resolve(__dirname, '../../../init-db/03-promotions-production-hardening.sql')
  },
  {
    version: '004_inventory_traceability',
    file: path.resolve(__dirname, '../../../init-db/04-inventory-traceability.sql')
  }
];

async function runMigrations(pool) {
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

    for (const migration of MIGRATIONS) {
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

module.exports = { runMigrations };
