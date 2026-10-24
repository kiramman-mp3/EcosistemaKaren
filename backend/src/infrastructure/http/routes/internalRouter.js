const { Router } = require('express');
const validate = require('../middlewares/validateRequest');
const schemas = require('../validation/requestSchemas');

// Canal interno `/internal/v1` de portal-api: solo lo usa store-api, autenticado con la
// API key de servicio (ADR-003). La tienda inicia siempre la comunicación.
function createInternalRouter({ heartbeatController }, serviceAuth) {
  const router = Router();
  router.use(serviceAuth);

  router.post('/store/heartbeat', validate({ body: schemas.storeHeartbeatBody }), (req, res, next) => heartbeatController.ping(req, res, next));

  return router;
}

module.exports = createInternalRouter;
