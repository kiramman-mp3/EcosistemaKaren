const fs = require('fs');
const { Pool, types } = require('pg');
const { businessTimezone } = require('../../domain/policies/BusinessDates');

// DATE (OID 1082) llega como 'AAAA-MM-DD': es un día calendario y no debe convertirse
// a medianoche de la zona horaria del servidor Node.
types.setTypeParser(1082, value => value);

const pools = new Map();

// store-api (y el monolito) usan DB_*. portal-api usa PORTAL_DB_* y, para cada valor que no
// esté definido, cae en el DB_* correspondiente: en un despliegue solo del portal basta con
// DB_*, y en desarrollo con dos contenedores PORTAL_DB_* apunta al segundo.
function connectionSettings(role = 'store', env = process.env) {
  const pick = (name) => {
    const own = role === 'portal' ? env[`PORTAL_${name}`] : undefined;
    return own !== undefined && own !== '' ? own : env[name];
  };
  return {
    host: pick('DB_HOST') || 'localhost',
    port: parseInt(pick('DB_PORT'), 10) || 5432,
    database: pick('DB_NAME') || 'ecosistema_karen',
    user: pick('DB_USER') || 'karen_user',
    password: pick('DB_PASSWORD') || 'karen_pass'
  };
}

// DB_SSL (o PORTAL_DB_SSL en el portal): 'true' cifra la conexión y verifica el certificado del
// servidor; 'no-verify' solo cifra. Sin definir, no hay TLS.
// DB_SSL_CA (o PORTAL_DB_SSL_CA) añade una autoridad certificadora propia para verificar: es el
// texto PEM o la ruta a un archivo. Hace falta con Supabase, que firma con su propia CA.
function sslSettings(role = 'store', env = process.env) {
  const pick = (name) => {
    const own = role === 'portal' ? env[`PORTAL_${name}`] : undefined;
    return own !== undefined && own !== '' ? own : env[name];
  };
  const value = (pick('DB_SSL') || '').trim().toLowerCase();
  if (value === 'no-verify') return { rejectUnauthorized: false };
  if (value !== 'true') return undefined;
  const ca = (pick('DB_SSL_CA') || '').trim();
  if (!ca) return { rejectUnauthorized: true };
  return { rejectUnauthorized: true, ca: ca.includes('-----BEGIN') ? ca : fs.readFileSync(ca, 'utf8') };
}

// Dos roles con la misma conexión (monolito, desarrollo con una sola base) comparten pool.
function poolKey(settings) {
  return `${settings.host}:${settings.port}/${settings.database}@${settings.user}`;
}

function getPool(role = 'store') {
  const settings = connectionSettings(role);
  const key = poolKey(settings);
  if (!pools.has(key)) {
    const pool = new Pool({
      ...settings,
      ssl: sslSettings(role),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
      // CURRENT_DATE debe ser el día del negocio, no el del contenedor (normalmente UTC).
      options: `-c TimeZone=${businessTimezone()}`
    });

    pool.on('error', (err) => {
      console.error('⚠️ Error inesperado en el pool de PostgreSQL:', err.message);
    });
    pools.set(key, pool);
  }
  return pools.get(key);
}

async function testConnection(role = 'store') {
  try {
    const p = getPool(role);
    const res = await p.query('SELECT NOW()');
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL:', res.rows[0].now);
    return true;
  } catch (err) {
    console.warn('⚠️ No se pudo conectar a PostgreSQL (' + err.message + '). Se activará el repositorio en memoria como respaldo.');
    return false;
  }
}

async function closePool() {
  const open = [...pools.values()];
  pools.clear();
  await Promise.all(open.map(pool => pool.end()));
}

module.exports = {
  getPool,
  testConnection,
  closePool,
  connectionSettings,
  sslSettings
};
