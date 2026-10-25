const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { testConnection, getPool } = require('../../infrastructure/db/postgres');
const { runMigrations } = require('../../infrastructure/db/migrations');
const { createSecurityMiddlewares, validateProductionSecurity, cookieCsrfProtection } = require('../../infrastructure/http/middlewares/security');
const { assertNoDefaultAccounts } = require('../../infrastructure/security/defaultAccounts');
const { createHealthRouter } = require('../../infrastructure/http/health');
const { createAccessLog, isEnabled: accessLogEnabled } = require('../../infrastructure/http/middlewares/accessLog');

// Pila HTTP común a store-api y portal-api: base de datos, cabeceras de seguridad, CORS,
// límites de tasa, parseo de cuerpo y protección CSRF.
//
// `database` indica a qué base se conecta el servicio (`store` o `portal`) y `migrations`
// qué conjuntos de migraciones aplica sobre ella (el monolito aplica ambos a una sola base).
async function createBaseApp({ database = 'store', migrations = ['store'] } = {}) {
  validateProductionSecurity(process.env);
  const app = express();

  // Probar conexión PostgreSQL
  const dbConnected = await testConnection(database);
  let pool = null;

  if (dbConnected) {
    pool = getPool(database);
    await runMigrations(pool, { targets: migrations });
    // En producción no se arranca con cuentas de demostración que aún aceptan su contraseña conocida.
    await assertNoDefaultAccounts(pool);
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PostgreSQL es obligatorio en producción; se rechazó el fallback en memoria.');
    }
  }

  const httpSecurity = createSecurityMiddlewares(process.env, { pool });

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) app.set('trust proxy', trustProxyHops);

  // Seguridad HTTP común
  app.disable('x-powered-by');
  app.use(httpSecurity.requestId);
  if (accessLogEnabled(process.env)) app.use(createAccessLog({ service: database }));
  app.use(httpSecurity.headers);
  // Sondas de liveness/readiness: antes de los límites de tasa, que no deben tumbar al orquestador.
  app.use(createHealthRouter({ pool, service: database, migrations }));
  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',').map(value => value.trim()).filter(Boolean);
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const error = new Error('Origen no permitido por CORS.');
      error.statusCode = 403;
      return callback(error);
    }
  }));
  // Imágenes de productos; antes del rate limit porque un catálogo carga decenas por vista.
  app.use('/api/v1/media', express.static(path.resolve(__dirname, '../../../public/media'), {
    maxAge: '7d',
    fallthrough: false
  }));
  app.use('/api/v1', httpSecurity.general);
  app.use('/api/v1/auth', httpSecurity.auth);
  app.use('/api/v1/reservations', httpSecurity.reservations);
  app.use('/api/v1/promotions/generate', httpSecurity.ai);
  // El canal interno /internal/v1 lee su propio cuerpo, con otro límite y después de autenticar.
  const publicJson = express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb', strict: true });
  app.use((req, res, next) => (req.path.startsWith('/internal/') ? next() : publicJson(req, res, next)));
  app.use(httpSecurity.normalizeJsonBody);
  app.use(cookieParser());
  app.use(cookieCsrfProtection(allowedOrigins, process.env.NODE_ENV === 'production'));
  app.use('/api/v1/auth', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api/v1/reservations', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(httpSecurity.hpp);
  app.use(httpSecurity.rejectDangerousKeys);

  return { app, pool, dbConnected, httpSecurity };
}

module.exports = createBaseApp;
