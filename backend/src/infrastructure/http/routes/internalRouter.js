const { Router } = require('express');
const validate = require('../middlewares/validateRequest');
const schemas = require('../validation/requestSchemas');

// Canal interno `/internal/v1` de portal-api: solo lo usa store-api, autenticado con la
// API key de servicio (ADR-003). La tienda inicia siempre la comunicación.
// `bodyParsers` se monta después de autenticar, de modo que un llamador sin clave nunca
// obliga al servidor a leer un cuerpo grande.
function createInternalRouter({ heartbeatController, catalogSyncController }, serviceAuth, bodyParsers = []) {
  const router = Router();
  router.use(serviceAuth);
  if (bodyParsers.length > 0) router.use(bodyParsers);

  router.post('/store/heartbeat', validate({ body: schemas.storeHeartbeatBody }), (req, res, next) => heartbeatController.ping(req, res, next));

  // Solo existe cuando portal-api tiene su propia copia del catálogo; el monolito comparte las tablas.
  if (catalogSyncController) {
    router.post('/store/sync/catalog', validate({ body: schemas.catalogSyncBody }), (req, res, next) => catalogSyncController.apply(req, res, next));
  }

  return router;
}

module.exports = createInternalRouter;
