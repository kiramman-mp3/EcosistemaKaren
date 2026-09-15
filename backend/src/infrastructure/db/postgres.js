const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'ecosistema_karen',
      user: process.env.DB_USER || 'karen_user',
      password: process.env.DB_PASSWORD || 'karen_pass',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000
    });

    pool.on('error', (err) => {
      console.error('⚠️ Error inesperado en el pool de PostgreSQL:', err.message);
    });
  }
  return pool;
}

async function testConnection() {
  try {
    const p = getPool();
    const res = await p.query('SELECT NOW()');
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL:', res.rows[0].now);
    return true;
  } catch (err) {
    console.warn('⚠️ No se pudo conectar a PostgreSQL (' + err.message + '). Se activará el repositorio en memoria como respaldo.');
    return false;
  }
}

module.exports = {
  getPool,
  testConnection
};
