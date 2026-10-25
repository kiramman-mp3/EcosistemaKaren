const express = require('express');
const { Router } = express;
const { MAX_MEDIA_BYTES } = require('../../media/mediaPaths');
const validate = require('../middlewares/validateRequest');
const schemas = require('../validation/requestSchemas');

// Canal interno `/internal/v1` de portal-api: solo lo usa store-api, autenticado con la
// API key de servicio (ADR-003). La tienda inicia siempre la comunicación.
// `bodyParsers` se monta después de autenticar, de modo que un llamador sin clave nunca
// obliga al servidor a leer un cuerpo grande.
function createInternalRouter(
  { heartbeatController, catalogSyncController, mediaSyncController, storeChannelController },
  serviceAuth,
  bodyParsers = []
) {
  const router = Router();
  router.use(serviceAuth);
  if (bodyParsers.length > 0) router.use(bodyParsers);

  router.post('/store/heartbeat', validate({ body: schemas.storeHeartbeatBody }), (req, res, next) => heartbeatController.ping(req, res, next));

  // Solo existe cuando portal-api tiene su propia copia del catálogo; el monolito comparte las tablas.
  if (catalogSyncController) {
    router.post('/store/sync/catalog', validate({ body: schemas.catalogSyncBody }), (req, res, next) => catalogSyncController.apply(req, res, next));
  }

  // Fotos de productos: el manifiesto dice cuáles hay y la subida entrega el archivo (binario, no JSON).
  if (mediaSyncController) {
    router.post('/store/sync/media/manifest', validate({ body: schemas.mediaManifestBody }), (req, res, next) => mediaSyncController.manifest(req, res, next));
    router.put(
      '/store/sync/media',
      validate({ query: schemas.mediaUploadQuery }),
      express.raw({ type: () => true, limit: MAX_MEDIA_BYTES }),
      (req, res, next) => mediaSyncController.upload(req, res, next)
    );
  }

  // Cola de comandos de reserva: solo cuando portal-api tiene base propia donde guardarla.
  if (storeChannelController) {
    router.get('/store/commands', validate({ query: schemas.storeCommandsQuery }), (req, res, next) => storeChannelController.getCommands(req, res, next));
    router.post('/store/commands/:id/result', validate({ params: schemas.commandIdParams, body: schemas.storeCommandResultBody }), (req, res, next) => storeChannelController.postResult(req, res, next));
    router.post('/store/events', validate({ body: schemas.storeEventsBody }), (req, res, next) => storeChannelController.postEvents(req, res, next));
  }

  return router;
}

module.exports = createInternalRouter;
