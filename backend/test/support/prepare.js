// Lo ejecuta preload.mjs antes de cada archivo de pruebas (node --test --import ./test/support/preload.mjs).
// Si hay PostgreSQL, deja la base lista para las pruebas con base real: aplica las migraciones
// (así una base nueva no hace fallar las pruebas por no estar migrada) y, solo en bases cuyo
// nombre termina en _test o _probe, los datos de demostración que varias pruebas usan.
// Nunca se aplican datos de demostración en producción ni en otras bases (podrían crear cuentas
// con contraseñas conocidas).
const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config();

async function prepare() {
  if (process.env.NODE_ENV === 'production') return;
  const { getPool, testConnection, closePool, connectionSettings } = require('../../src/infrastructure/db/postgres');
  const { runMigrations } = require('../../src/infrastructure/db/migrations');

  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  try {
    if (!(await testConnection())) return;
    const pool = getPool();
    const tables = await pool.query("SELECT to_regclass('public.productos') AS productos");
    // Sin el esquema inicial (01-schema.sql) las migraciones no se pueden aplicar: se deja a las pruebas omitirse.
    if (!tables.rows[0].productos) return;
    await runMigrations(pool, { targets: ['store', 'portal'] });

    if (/_(test|probe)$/.test(connectionSettings('store').database)) {
      const demo = fs.readFileSync(path.resolve(__dirname, '../../init-db/dev/01-demo-data.sql'), 'utf8');
      await pool.query(demo);
    }
  } catch (error) {
    originalWarn(`⚠️ No se pudo preparar la base de pruebas: ${error.message}`);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    await closePool();
  }
}

module.exports = prepare;
