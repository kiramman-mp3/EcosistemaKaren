const express = require('express');
const { MIGRATION_SETS } = require('../db/migrations');

// Sondas para el orquestador (Docker, balanceador). Van en la raíz, fuera de /api/v1, para no pasar
// por los límites de tasa ni depender de rutas de negocio.
//
//   /healthz  liveness: el proceso responde. Nunca toca la base de datos; si falla, hay que reiniciarlo.
//   /readyz   readiness: la base responde y tiene aplicadas todas las migraciones del servicio.
//             Si falla, se le deja de enviar tráfico, pero no se reinicia.
//
// La tienda no depende del portal para estar lista: debe seguir atendiendo a la red local con el
// portal caído (el estado de la sincronización se ve en /api/v1/catalog/status).
const CHECK_TIMEOUT_MS = 2000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function expectedVersions(migrations) {
  return migrations.flatMap(target => (MIGRATION_SETS[target] || []).map(migration => migration.version));
}

async function checkDatabase(pool, migrations) {
  if (!pool) return { ok: false, reason: 'sin conexión a la base de datos' };
  try {
    const result = await withTimeout(pool.query('SELECT version FROM schema_migrations'), CHECK_TIMEOUT_MS);
    const applied = new Set(result.rows.map(row => row.version));
    const missing = expectedVersions(migrations).filter(version => !applied.has(version));
    return missing.length === 0 ? { ok: true } : { ok: false, reason: `migraciones pendientes: ${missing.join(', ')}` };
  } catch (error) {
    return { ok: false, reason: error.message === 'timeout' ? 'la base de datos no respondió a tiempo' : 'la base de datos no responde' };
  }
}

function createHealthRouter({ pool, service, migrations = ['store'] }) {
  const router = express.Router();

  router.get('/healthz', (req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok', service });
  });

  router.get('/readyz', async (req, res) => {
    const database = await checkDatabase(pool, migrations);
    // El motivo se devuelve sin detalles internos (ni cadenas de conexión ni mensajes del driver).
    res.set('Cache-Control', 'no-store').status(database.ok ? 200 : 503).json({
      status: database.ok ? 'ready' : 'unavailable',
      service,
      checks: { database: database.ok ? 'ok' : database.reason }
    });
  });

  return router;
}

module.exports = { createHealthRouter, checkDatabase };
