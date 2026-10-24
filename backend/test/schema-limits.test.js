require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');

// Guarda contra el desfase que causaba errores 500: ningún campo de texto puede aceptar más
// caracteres de los que admite su columna. Compara los máximos de zod con la base real y se omite
// si no hay PostgreSQL (el CI lo ejecuta en el job con base de datos).
const FIELDS = [
  [schemas.categoryBody, 'nombre', 'categorias', 'nombre'],
  [schemas.productBody, 'nombre', 'productos', 'nombre'],
  [schemas.productBody, 'codigoBarras', 'productos', 'codigo_barras'],
  [schemas.lotBody, 'numeroLote', 'lotes', 'numero_lote'],
  [schemas.registerBody, 'nombre', 'usuarios', 'nombre'],
  [schemas.registerBody, 'email', 'usuarios', 'email'],
  [schemas.loginBody, 'email', 'usuarios', 'email']
];

// zod 4 expone el largo máximo en `maxLength`; con `.transform()` el campo es un pipe y el
// esquema de entrada está en `.in`.
const maxLengthOf = (schema) => (schema.in ?? schema).maxLength;

test.after(() => closePool());

test('los largos máximos de los esquemas no superan los de las columnas', async (t) => {
  if (!(await testConnection())) {
    t.skip('PostgreSQL no disponible');
    return;
  }
  const pool = getPool();
  for (const [schema, field, table, column] of FIELDS) {
    const zodMax = maxLengthOf(schema.shape[field]);
    assert.ok(Number.isInteger(zodMax), `${field}: el esquema debe declarar un largo máximo`);

    const res = await pool.query(
      `SELECT character_maximum_length AS max FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (res.rows.length === 0) {
      t.skip(`la tabla ${table} no existe en esta base`);
      return;
    }
    const columnMax = res.rows[0].max;
    if (columnMax === null) continue; // TEXT: sin límite
    assert.ok(zodMax <= columnMax, `${table}.${column}: el esquema admite ${zodMax} y la columna ${columnMax}`);
  }
});
