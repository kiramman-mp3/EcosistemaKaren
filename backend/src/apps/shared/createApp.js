const createBaseApp = require('./createBaseApp');
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

  const { app, pool, dbConnected } = await createBaseApp();
  const repos = buildRepositories(pool, dbConnected);
  const wiring = buildWiring({ pool, repos, store, portal });

  wiring.start();

  app.locals.appName = name;
  app.locals.shutdown = async () => {
    wiring.stop();
    await closePool();
  };

  // Configurar Swagger UI
  const swaggerEnabled = setupSwagger(app, process.env);
  app.locals.swaggerEnabled = swaggerEnabled;

  // Montar Router `/api/v1`
  let createRouter = createApiRouter;
  if (!portal) createRouter = createStoreRouter;
  else if (!store) createRouter = createPortalRouter;
  app.use('/api/v1', createRouter(wiring.controllers, wiring.security));

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
