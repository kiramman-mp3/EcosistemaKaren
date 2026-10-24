/**
 * Verifica contra una PostgreSQL real que las migraciones de cada servicio (ADR-003) dejan el esquema
 * esperado y que se pueden aplicar dos veces:
 *
 *   - store-api sobre su base (esquema inicial init-db/store/01 + migraciones de la tienda)
 *   - portal-api sobre una base propia (migraciones del portal desde cero)
 *   - el monolito de transición sobre una tercera base (ambos conjuntos)
 *
 * Usa DB_HOST, DB_PORT, DB_USER y DB_PASSWORD; crea las bases `<DB_NAME>_verify_*` y las elimina al
 * terminar, de modo que no toca los datos de DB_NAME.
 *
 *   npm run test:migrations
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool, Client } = require('pg');
const { runMigrations } = require('../src/infrastructure/db/migrations');
const { checkStore, checkPortal, checkMonolith } = require('./lib/migrationChecks');

const print = console.log;

const base = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'karen_user',
  password: process.env.DB_PASSWORD || 'karen_pass'
};
const prefix = `${process.env.DB_NAME || 'ecosistema_karen'}_verify`;
const initialSchema = fs.readFileSync(path.resolve(__dirname, '../init-db/store/01-schema.sql'), 'utf8');

async function withAdmin(fn) {
  const admin = new Client({ ...base, database: 'postgres' });
  await admin.connect();
  try { return await fn(admin); } finally { await admin.end(); }
}

async function createDatabase(name) {
  await withAdmin(async admin => {
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.query(`CREATE DATABASE ${name}`);
  });
  return new Pool({ ...base, database: name, max: 2 });
}

async function dropDatabase(name, pool) {
  await pool.end();
  await withAdmin(admin => admin.query(`DROP DATABASE IF EXISTS ${name}`));
}

async function scenario(name, targets, withInitialSchema, check) {
  const database = `${prefix}_${name}`;
  const pool = await createDatabase(database);
  try {
    if (withInitialSchema) await pool.query(initialSchema);
    await runMigrations(pool, { targets });
    await runMigrations(pool, { targets }); // aplicar de nuevo no debe fallar ni cambiar nada
    const problems = await check(pool);
    print(`${problems.length === 0 ? '✔' : '✖'} ${name}: ${targets.join(' + ')}`);
    problems.forEach(problem => print(`    - ${problem}`));
    return problems.length;
  } finally {
    await dropDatabase(database, pool);
  }
}

async function main() {
  // runMigrations informa cada migración aplicada; aquí solo interesa el resultado de cada escenario.
  console.log = () => {};
  let failures = 0;
  try {
    failures += await scenario('store', ['store'], true, checkStore);
    failures += await scenario('portal', ['portal'], false, checkPortal);
    failures += await scenario('monolith', ['store', 'portal'], true, checkMonolith);
  } catch (error) {
    console.log = print;
    console.error('✖ No se pudo verificar las migraciones:', error.message);
    process.exit(1);
  }
  console.log = print;
  process.exit(failures > 0 ? 1 : 0);
}

main();
