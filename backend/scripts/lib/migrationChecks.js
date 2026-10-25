// Comprobaciones del esquema que dejan las migraciones de cada servicio (ADR-003). Cada función
// recibe algo con `query(sql)` (un Pool de pg) y devuelve la lista de problemas encontrados.
const STORE_TABLES = [
  'categorias', 'productos', 'lotes', 'usuarios', 'reservas', 'reserva_detalles', 'alertas_caducidad',
  'promociones_ia', 'inventario_movimientos', 'mermas', 'outbox_portal', 'tokens_revocados',
  'rate_limit_hits', 'productos_precio_historial', 'schema_migrations'
];

const PORTAL_TABLES = [
  'usuarios', 'tokens_revocados', 'rate_limit_hits', 'tienda_heartbeat', 'categorias', 'productos', 'lotes',
  'promociones_ia', 'sync_estado', 'reservas_portal', 'comandos_tienda', 'media_archivos', 'schema_migrations'
];

// Lo que cada base no debe tener: la tienda no conoce la cola del portal ni al revés.
const STORE_FORBIDDEN = ['reservas_portal', 'comandos_tienda', 'sync_estado', 'media_archivos'];
const PORTAL_FORBIDDEN = ['reservas', 'reserva_detalles', 'inventario_movimientos', 'mermas', 'alertas_caducidad', 'outbox_portal', 'productos_precio_historial'];

async function tablesOf(db) {
  const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  return new Set(res.rows.map(row => row.table_name));
}

function compare(label, tables, required, forbidden) {
  return [
    ...required.filter(table => !tables.has(table)).map(table => `${label}: falta la tabla ${table}`),
    ...forbidden.filter(table => tables.has(table)).map(table => `${label}: no debería existir la tabla ${table}`)
  ];
}

async function reservationsReferenceUsers(db) {
  const res = await db.query(`
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.table_name = 'reservas' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'usuario_id'
  `);
  return res.rows.length > 0;
}

async function checkStore(db) {
  const problems = compare('tienda', await tablesOf(db), STORE_TABLES, STORE_FORBIDDEN);
  if (await reservationsReferenceUsers(db)) {
    problems.push('tienda: reservas.usuario_id no debe ser clave foránea (los clientes viven en la base del portal)');
  }
  return problems;
}

async function checkPortal(db) {
  return compare('portal', await tablesOf(db), PORTAL_TABLES, PORTAL_FORBIDDEN);
}

// El monolito aplica ambos conjuntos sobre una sola base: debe tener todo y conservar las tablas de la tienda.
async function checkMonolith(db) {
  const tables = await tablesOf(db);
  return compare('monolito', tables, [...new Set([...STORE_TABLES, ...PORTAL_TABLES])], []);
}

module.exports = { checkStore, checkPortal, checkMonolith, STORE_TABLES, PORTAL_TABLES };
