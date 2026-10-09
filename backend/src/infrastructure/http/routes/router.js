const { Router } = require('express');

function createApiRouter(controllers, security) {
  const router = Router();
  const { authenticate, authorize } = security;
  const {
    categoryController,
    productController,
    lotController,
    reservationController,
    alertController,
    promotionController,
    authController,
    heartbeatController
  } = controllers;

  // Categorías
  router.get('/categories', (req, res, next) => categoryController.getCategories(req, res, next));
  router.post('/categories', authenticate, authorize('ADMIN'), (req, res, next) => categoryController.createCategory(req, res, next));

  // Productos
  router.get('/products', (req, res, next) => productController.getProducts(req, res, next));
  router.get('/products/barcode/:barcode', (req, res, next) => productController.getProductByBarcode(req, res, next));
  router.post('/products', authenticate, authorize('ADMIN'), (req, res, next) => productController.createProduct(req, res, next));

  // Lotes e Inventario
  router.get('/availability', (req, res, next) => lotController.getPublicAvailability(req, res, next));
  router.get('/lots', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res, next) => lotController.getLots(req, res, next));
  router.post('/lots', authenticate, authorize('BODEGUERO', 'ADMIN'), (req, res, next) => lotController.ingresarLote(req, res, next));
  router.patch('/lots/:id/location', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res, next) => lotController.updateLocation(req, res, next));
  router.post('/lots/:id/merma', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res, next) => lotController.registerMerma(req, res, next));
  router.get('/inventory/movements', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res, next) => lotController.getMovements(req, res, next));
  router.get('/inventory/wastes', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res, next) => lotController.getWastes(req, res, next));

  // Reservaciones Anti-Overbooking
  router.post('/reservations', authenticate, authorize('CLIENTE'), (req, res, next) => reservationController.createReservation(req, res, next));
  router.get('/reservations/code/:code', authenticate, (req, res, next) => reservationController.getByCode(req, res, next));
  router.get('/reservations/user/:userId', authenticate, (req, res, next) => reservationController.getByUser(req, res, next));
  router.post('/reservations/:id/confirm', authenticate, authorize('BODEGUERO', 'ADMIN'), (req, res, next) => reservationController.confirm(req, res, next));
  router.post('/reservations/:id/cancel', authenticate, authorize('CLIENTE', 'ADMIN'), (req, res, next) => reservationController.cancel(req, res, next));

  // Alertas y SSE Stream
  router.get('/alerts', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res, next) => alertController.getAlerts(req, res, next));
  router.get('/alerts/stream', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res) => alertController.subscribeStream(req, res));

  // Promociones e IA Gemini
  // - POST /promotions/generate: BODEGUERO, PERCHERO, ADMIN generan borrador PENDIENTE_APROBACION
  router.post('/promotions/generate', authenticate, authorize('BODEGUERO', 'PERCHERO', 'ADMIN'), (req, res, next) => promotionController.generatePromotion(req, res, next));
  // - GET /promotions: Público (únicamente promociones APROBADAS y activas)
  router.get('/promotions', (req, res, next) => promotionController.getPromotions(req, res, next));
  // - GET /promotions/pending: Solo ADMIN
  router.get('/promotions/pending', authenticate, authorize('ADMIN'), (req, res, next) => promotionController.getPendingPromotions(req, res, next));
  // - POST /promotions/:id/approve: Solo ADMIN
  router.post('/promotions/:id/approve', authenticate, authorize('ADMIN'), (req, res, next) => promotionController.approvePromotion(req, res, next));
  // - POST /promotions/:id/reject: Solo ADMIN
  router.post('/promotions/:id/reject', authenticate, authorize('ADMIN'), (req, res, next) => promotionController.rejectPromotion(req, res, next));

  // Métricas Observabilidad de IA (Solo ADMIN)
  router.get('/metrics/ai', authenticate, authorize('ADMIN'), (req, res) => promotionController.getAiMetrics(req, res));

  // Autenticación
  router.post('/auth/register', (req, res, next) => authController.register(req, res, next));
  router.post('/auth/login', (req, res, next) => authController.login(req, res, next));

  // Heartbeat Red Local
  router.post('/heartbeat', authenticate, authorize('BODEGUERO', 'ADMIN'), (req, res) => heartbeatController.ping(req, res));
  router.get('/heartbeat', (req, res) => heartbeatController.getStatus(req, res));

  return router;
}

module.exports = createApiRouter;
