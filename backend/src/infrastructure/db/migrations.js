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
  },
  {
    version: '005_refresh_demo_lots',
    file: path.resolve(__dirname, '../../../init-db/05-refresh-demo-lots.sql')
  },
  {
    version: '006_fix_demo_barcodes',
    file: path.resolve(__dirname, '../../../init-db/06-fix-demo-barcodes.sql')
  },
  {
    version: '007_product_tax',
    file: path.resolve(__dirname, '../../../init-db/07-product-tax.sql')
  },
  {
    version: '008_product_image',
    file: path.resolve(__dirname, '../../../init-db/08-product-image.sql')
  },
  {
    version: '009_product_search',
    file: path.resolve(__dirname, '../../../init-db/09-product-search.sql')
  },
  {
    version: '010_heartbeat_and_ratelimit',
    file: path.resolve(__dirname, '../../../init-db/10-heartbeat-and-ratelimit.sql')
  },
  {
    version: '011_token_revocation',
    file: path.resolve(__dirname, '../../../init-db/11-token-revocation.sql')
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
