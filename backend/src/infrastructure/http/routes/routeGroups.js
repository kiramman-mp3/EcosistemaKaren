const validate = require('../middlewares/validateRequest');
const schemas = require('../validation/requestSchemas');

// Cada grupo registra un conjunto de rutas en un Router. Los routers de store-api y
// portal-api (y el monolito de transición) se arman combinando grupos, de modo que
// cada ruta se define en un único lugar.

function rootRoutes(router) {
  router.get('/', (req, res) => {
    res.json({
      name: 'Ecosistema Karen - Backend Server API v1',
      version: '1.0.0',
      status: 'ONLINE',
      docs: '/api-docs',
    });
  });
}

// Lectura pública del catálogo y la disponibilidad
function catalogReadRoutes(router, { categoryController, productController, lotController }) {
  router.get('/categories', (req, res, next) => categoryController.getCategories(req, res, next));
  router.get('/products', validate({ query: schemas.productQuery }), (req, res, next) => productController.getProducts(req, res, next));
  router.get('/products/barcode/:barcode', validate({ params: schemas.barcodeParams }), (req, res, next) => productController.getProductByBarcode(req, res, next));
  router.get('/availability', (req, res, next) => lotController.getPublicAvailability(req, res, next));
}

function catalogAdminRoutes(router, { categoryController, productController }, { authenticate, authorize }) {
  router.post('/categories', authenticate, authorize('ADMIN'), validate({ body: schemas.categoryBody }), (req, res, next) => categoryController.createCategory(req, res, next));
  router.post('/products', authenticate, authorize('ADMIN'), validate({ body: schemas.productBody }), (req, res, next) => productController.createProduct(req, res, next));
}

function inventoryRoutes(router, { lotController }, { authenticate, authorize }) {
  router.get('/lots', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res, next) => lotController.getLots(req, res, next));
  router.post('/lots', authenticate, authorize('BODEGUERO', 'ADMIN'), validate({ body: schemas.lotBody }), (req, res, next) => lotController.ingresarLote(req, res, next));
  router.patch('/lots/:id/location', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), validate({ params: schemas.idParams, body: schemas.locationBody }), (req, res, next) => lotController.updateLocation(req, res, next));
  router.post('/lots/:id/merma', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), validate({ params: schemas.idParams, body: schemas.wasteBody }), (req, res, next) => lotController.registerMerma(req, res, next));
  router.get('/inventory/movements', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), validate({ query: schemas.movementQuery }), (req, res, next) => lotController.getMovements(req, res, next));
  router.get('/inventory/wastes', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), validate({ query: schemas.wasteQuery }), (req, res, next) => lotController.getWastes(req, res, next));
}

// Reservas que originan los clientes (portal)
function customerReservationRoutes(router, { reservationController }, { authenticate, authorize }) {
  router.post('/reservations', authenticate, authorize('CLIENTE'), validate({ body: schemas.reservationBody }), (req, res, next) => reservationController.createReservation(req, res, next));
  router.get('/reservations/user/:userId', authenticate, validate({ params: schemas.userParams, query: schemas.reservationQuery }), (req, res, next) => reservationController.getByUser(req, res, next));
  router.post('/reservations/:id/cancel', authenticate, authorize('CLIENTE', 'ADMIN'), validate({ params: schemas.idParams, body: schemas.emptyBody }), (req, res, next) => reservationController.cancel(req, res, next));
}

function reservationLookupRoutes(router, { reservationController }, { authenticate }) {
  router.get('/reservations/code/:code', authenticate, validate({ params: schemas.reservationCodeParams }), (req, res, next) => reservationController.getByCode(req, res, next));
}

// Confirmación en caja (tienda)
function storeReservationRoutes(router, { reservationController }, { authenticate, authorize }) {
  router.post('/reservations/:id/confirm', authenticate, authorize('BODEGUERO', 'ADMIN'), validate({ params: schemas.idParams, body: schemas.emptyBody }), (req, res, next) => reservationController.confirm(req, res, next));
}

// Estado de la copia del catálogo, para que los clientes avisen si los datos están desactualizados
function catalogStatusRoutes(router, { catalogStatusController }) {
  router.get('/catalog/status', (req, res, next) => catalogStatusController.getStatus(req, res, next));
}

function alertRoutes(router, { alertController }, { authenticate, authorize }) {
  router.get('/alerts', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), validate({ query: schemas.alertQuery }), (req, res, next) => alertController.getAlerts(req, res, next));
  router.patch('/alerts/:id/atender', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), validate({ params: schemas.idParams }), (req, res, next) => alertController.markAsAttended(req, res, next));
  router.get('/alerts/stream', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res) => alertController.subscribeStream(req, res));
}

// GET /promotions: público (únicamente promociones APROBADAS y activas)
function publicPromotionRoutes(router, { promotionController }) {
  router.get('/promotions', (req, res, next) => promotionController.getPromotions(req, res, next));
}

function promotionAdminRoutes(router, { promotionController }, { authenticate, authorize }) {
  // BODEGUERO, PERCHERO, ADMIN generan borrador PENDIENTE_APROBACION
  router.post('/promotions/generate', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), validate({ body: schemas.promotionBody }), (req, res, next) => promotionController.generatePromotion(req, res, next));
  router.get('/promotions/pending', authenticate, authorize('ADMIN'), (req, res, next) => promotionController.getPendingPromotions(req, res, next));
  router.get('/promotions/manage', authenticate, authorize('ADMIN'), validate({ query: schemas.promotionAdminQuery }), (req, res, next) => promotionController.getOperationalPromotions(req, res, next));
  router.patch('/promotions/:id', authenticate, authorize('ADMIN'), validate({ params: schemas.idParams, body: schemas.promotionUpdateBody }), (req, res, next) => promotionController.updatePromotion(req, res, next));
  router.post('/promotions/:id/deactivate', authenticate, authorize('ADMIN'), validate({ params: schemas.idParams, body: schemas.emptyBody }), (req, res, next) => promotionController.deactivatePromotion(req, res, next));
  router.delete('/promotions/:id', authenticate, authorize('ADMIN'), validate({ params: schemas.idParams }), (req, res, next) => promotionController.deletePromotionDraft(req, res, next));
  router.post('/promotions/:id/approve', authenticate, authorize('ADMIN'), validate({ params: schemas.idParams, body: schemas.emptyBody }), (req, res, next) => promotionController.approvePromotion(req, res, next));
  router.post('/promotions/:id/reject', authenticate, authorize('ADMIN'), validate({ params: schemas.idParams, body: schemas.rejectionBody }), (req, res, next) => promotionController.rejectPromotion(req, res, next));

  // Métricas de observabilidad de IA (solo ADMIN)
  router.get('/metrics/ai', authenticate, authorize('ADMIN'), (req, res) => promotionController.getAiMetrics(req, res));
}

function authRoutes(router, { authController }, { authenticate }) {
  router.post('/auth/register', validate({ body: schemas.registerBody }), (req, res, next) => authController.register(req, res, next));
  router.post('/auth/login', validate({ body: schemas.loginBody }), (req, res, next) => authController.login(req, res, next));
  router.get('/auth/me', authenticate, (req, res) => authController.me(req, res));
  router.post('/auth/logout', validate({ body: schemas.emptyBody }), (req, res) => authController.logout(req, res));
}

// Estado del heartbeat de la tienda. El latido lo emite store-api por el canal interno
// (`POST /internal/v1/store/heartbeat`), no los clientes.
function heartbeatRoutes(router, { heartbeatController }) {
  router.get('/heartbeat', (req, res, next) => heartbeatController.getStatus(req, res, next));
}

module.exports = {
  rootRoutes,
  catalogReadRoutes,
  catalogAdminRoutes,
  catalogStatusRoutes,
  inventoryRoutes,
  customerReservationRoutes,
  reservationLookupRoutes,
  storeReservationRoutes,
  alertRoutes,
  publicPromotionRoutes,
  promotionAdminRoutes,
  authRoutes,
  heartbeatRoutes
};
