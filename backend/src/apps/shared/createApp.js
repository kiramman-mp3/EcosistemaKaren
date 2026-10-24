const express = require('express');
const createBaseApp = require('./createBaseApp');
const { readServiceConfig } = require('./serviceConfig');
const { createServiceAuth } = require('../../infrastructure/http/middlewares/serviceAuth');
const createInternalRouter = require('../../infrastructure/http/routes/internalRouter');
const buildRepositories = require('./buildRepositories');
const buildWiring = require('./buildWiring');
const setupSwagger = require('../../infrastructure/swagger/swaggerDoc');
const errorHandler = require('../../infrastructure/http/middlewares/errorHandler');
const createApiRouter = require('../../infrastructure/http/routes/router');
const { closePool } = require('../../infrastructure/db/postgres');

const { createStoreRouter, createPortalRouter } = createApiRouter;

// Raíz de composición compartida. `store` y `portal` activan las piezas de cada servicio
// (ADR-003): store-api, portal-api, o ambos a la vez en el monolito de transición.
async function createApp({ name, store = false, portal = false }) {
  if (!store && !portal) throw new Error('createApp requiere activar al menos store o portal.');

  const serviceConfig = readServiceConfig({ store, portal });
  // Cada servicio usa su propia base (ADR-003); el monolito comparte la de la tienda.
  const { app, pool, dbConnected, httpSecurity } = await createBaseApp({
    database: portal && !store ? 'portal' : 'store',
    migrations: [...(store ? ['store'] : []), ...(portal ? ['portal'] : [])]
  });
  const repos = buildRepositories(pool, dbConnected);
  const wiring = buildWiring({ pool, repos, store, portal, serviceConfig });

  wiring.start();

  app.locals.appName = name;
  app.locals.shutdown = async () => {
    wiring.stop();
    await closePool();
  };

  // Configurar Swagger UI
  const swaggerEnabled = setupSwagger(app, process.env, { store, portal });
  app.locals.swaggerEnabled = swaggerEnabled;

  // Montar Router `/api/v1`
  let createRouter = createApiRouter;
  if (!portal) createRouter = createStoreRouter;
  else if (!store) createRouter = createPortalRouter;
  app.use('/api/v1', createRouter(wiring.controllers, wiring.security));

  // Canal interno que recibe las llamadas de store-api. Solo los intentos fallidos cuentan
  // contra el límite, igual que en /auth, para frenar la fuerza bruta sobre la clave.
  if (portal) {
    app.use(
      '/internal/v1',
      httpSecurity.auth,
      createInternalRouter(wiring.controllers, createServiceAuth(serviceConfig.storeServiceKey), [
        // Los snapshots de catálogo superan el límite de la API pública.
        express.json({ limit: process.env.INTERNAL_BODY_LIMIT || '10mb', strict: true }),
        httpSecurity.normalizeJsonBody,
        httpSecurity.rejectDangerousKeys
      ])
    );
  }

  // Root redirect & info
  app.get('/', (req, res) => {
    res.json({
      name: 'Ecosistema Karen - Backend Server API',
      version: '1.0.0',
      status: 'ONLINE',
      swaggerDocs: swaggerEnabled ? '/api-docs' : null,
      apiBaseUrl: '/api/v1'
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
