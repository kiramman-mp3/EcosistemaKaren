const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { createUser } = require('../scripts/create-user');
const { findDefaultAccounts, assertNoDefaultAccounts } = require('../src/infrastructure/security/defaultAccounts');

const INIT_DB = path.resolve(__dirname, '../init-db');
const demoSql = fs.readFileSync(path.join(INIT_DB, 'dev/01-demo-data.sql'), 'utf8');
const schemaSql = fs.readFileSync(path.join(INIT_DB, 'store/01-schema.sql'), 'utf8');
const DEMO_HASH = demoSql.match(/'(\$2a\$10\$[^']+)'/)[1];

// ─── el esquema ya no crea cuentas ─────────────────────────────────────────────────────────────
test('el esquema inicial no crea cuentas ni datos de demostración; esos viven en init-db/dev', () => {
  assert.ok(!/INSERT\s+INTO\s+usuarios/i.test(schemaSql), '01-schema.sql no debe insertar usuarios');
  assert.ok(!/INSERT\s+INTO\s+(productos|lotes|categorias)/i.test(schemaSql), '01-schema.sql no debe insertar datos de ejemplo');
  assert.match(demoSql, /INSERT\s+INTO\s+usuarios/i);
  assert.match(demoSql, /admin@karen\.com/);
});

test('el hash de las cuentas de demostración corresponde a la contraseña conocida', async () => {
  assert.equal(await bcrypt.compare('demo123', DEMO_HASH), true);
});

// ─── guarda de arranque en producción ──────────────────────────────────────────────────────────
function poolWith(rows) {
  const queries = [];
  return { queries, query: async (sql, params) => { queries.push([sql, params]); return { rows }; } };
}

test('detecta las cuentas de demostración que aún aceptan su contraseña conocida', async () => {
  const changed = await bcrypt.hash('UnaClaveNueva-2026', 4);
  const pool = poolWith([
    { email: 'admin@karen.com', rol: 'ADMIN', passwordHash: DEMO_HASH },
    { email: 'bodega@karen.com', rol: 'BODEGUERO', passwordHash: changed },
    { email: 'cliente@demo.karen.ec', rol: 'CLIENTE', passwordHash: await bcrypt.hash('Karen2026*', 4) }
  ]);
  const found = await findDefaultAccounts(pool);
  assert.deepEqual(found.map(account => account.email).sort(), ['admin@karen.com', 'cliente@demo.karen.ec']);
  assert.deepEqual(pool.queries[0][1], [['%@karen.com', '%@demo.karen.ec']]);
});

test('en producción no arranca si queda una cuenta con contraseña conocida y no revela contraseñas', async () => {
  const pool = poolWith([{ email: 'admin@karen.com', rol: 'ADMIN', passwordHash: DEMO_HASH }]);
  await assert.rejects(
    () => assertNoDefaultAccounts(pool, { NODE_ENV: 'production' }),
    (error) => {
      assert.match(error.message, /admin@karen\.com \(ADMIN\)/);
      assert.match(error.message, /user:create/);
      assert.ok(!/demo123|Karen2026/.test(error.message), 'el mensaje no menciona las contraseñas');
      return true;
    }
  );
});

test('en producción arranca si las cuentas de demostración ya no existen o cambiaron su contraseña', async () => {
  await assert.doesNotReject(() => assertNoDefaultAccounts(poolWith([]), { NODE_ENV: 'production' }));
  const changed = await bcrypt.hash('UnaClaveNueva-2026', 4);
  await assert.doesNotReject(() => assertNoDefaultAccounts(poolWith([{ email: 'admin@karen.com', rol: 'ADMIN', passwordHash: changed }]), { NODE_ENV: 'production' }));
});

test('fuera de producción la guarda no consulta la base ni bloquea el desarrollo', async () => {
  const pool = poolWith([{ email: 'admin@karen.com', rol: 'ADMIN', passwordHash: DEMO_HASH }]);
  await assert.doesNotReject(() => assertNoDefaultAccounts(pool, { NODE_ENV: 'development' }));
  assert.equal(pool.queries.length, 0);
});

// ─── script para crear personal ────────────────────────────────────────────────────────────────
function userPool(existing = []) {
  const inserted = [];
  const updated = [];
  return {
    inserted, updated,
    query: async (sql, params) => {
      if (/^SELECT id, rol FROM usuarios/.test(sql)) return { rows: existing.filter(user => user.email === params[0]) };
      if (/^INSERT INTO usuarios/.test(sql)) { inserted.push(params); return { rows: [{ id: 'nuevo-id' }] }; }
      if (/^UPDATE usuarios/.test(sql)) { updated.push(params); return { rows: [] }; }
      throw new Error(`consulta inesperada: ${sql}`);
    }
  };
}

test('crea una cuenta de personal con la contraseña cifrada y el correo en minúsculas', async () => {
  const pool = userPool();
  const result = await createUser({ pool, nombre: 'Ana Pérez', email: 'Ana@Tienda.TEST', rol: 'admin', password: 'ClaveAdmin12345', rounds: 4 });
  assert.deepEqual(result, { id: 'nuevo-id', email: 'ana@tienda.test', rol: 'ADMIN', accion: 'cuenta creada' });
  const [nombre, email, rol, hash] = pool.inserted[0];
  assert.deepEqual([nombre, email, rol], ['Ana Pérez', 'ana@tienda.test', 'ADMIN']);
  assert.notEqual(hash, 'ClaveAdmin12345');
  assert.equal(await bcrypt.compare('ClaveAdmin12345', hash), true);
});

test('rechaza roles desconocidos, contraseñas cortas y correos inválidos sin tocar la base', async () => {
  const pool = userPool();
  const base = { pool, nombre: 'Luis Mora', email: 'luis@tienda.test', rol: 'BODEGUERO', password: 'ClaveSegura123', rounds: 4 };
  await assert.rejects(() => createUser({ ...base, rol: 'GERENTE' }), /rol debe ser/);
  await assert.rejects(() => createUser({ ...base, password: 'corta' }), /al menos 8/);
  await assert.rejects(() => createUser({ ...base, email: 'no-es-correo' }), /correo/i);
  assert.equal(pool.inserted.length, 0);
});

test('no sobrescribe una cuenta existente salvo que se pida restablecerla', async () => {
  const pool = userPool([{ id: 'u1', email: 'ana@tienda.test', rol: 'ADMIN' }]);
  const base = { pool, nombre: 'Ana Pérez', email: 'ana@tienda.test', rol: 'ADMIN', password: 'ClaveAdmin12345', rounds: 4 };
  await assert.rejects(() => createUser(base), /--reset/);
  assert.equal(pool.updated.length, 0);

  const result = await createUser({ ...base, reset: true });
  assert.equal(result.accion, 'contraseña restablecida');
  assert.equal(result.rol, 'ADMIN', 'conserva el rol que ya tenía');
  assert.equal(pool.updated.length, 1);
  assert.equal(await bcrypt.compare('ClaveAdmin12345', pool.updated[0][0]), true);
});
