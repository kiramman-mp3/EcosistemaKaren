const { Router } = require('express');

function createApiRouter(controllers) {
  const router = Router();
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
  router.post('/categories', (req, res, next) => categoryController.createCategory(req, res, next));

  // Productos
  router.get('/products', (req, res, next) => productController.getProducts(req, res, next));
  router.get('/products/barcode/:barcode', (req, res, next) => productController.getProductByBarcode(req, res, next));
  router.post('/products', (req, res, next) => productController.createProduct(req, res, next));

  // Lotes e Inventario
  router.get('/lots', (req, res, next) => lotController.getLots(req, res, next));
  router.post('/lots', (req, res, next) => lotController.ingresarLote(req, res, next));
  router.patch('/lots/:id/location', (req, res, next) => lotController.updateLocation(req, res, next));
  router.post('/lots/:id/merma', (req, res, next) => lotController.registerMerma(req, res, next));

  // Reservaciones Anti-Overbooking
  router.post('/reservations', (req, res, next) => reservationController.createReservation(req, res, next));
  router.get('/reservations/code/:code', (req, res, next) => reservationController.getByCode(req, res, next));
  router.get('/reservations/user/:userId', (req, res, next) => reservationController.getByUser(req, res, next));
  router.post('/reservations/:id/confirm', (req, res, next) => reservationController.confirm(req, res, next));
  router.post('/reservations/:id/cancel', (req, res, next) => reservationController.cancel(req, res, next));

  // Alertas y SSE Stream
  router.get('/alerts', (req, res, next) => alertController.getAlerts(req, res, next));
  router.get('/alerts/stream', (req, res) => alertController.subscribeStream(req, res));

  // Promociones e IA Gemini
  router.post('/promotions/generate', (req, res, next) => promotionController.generatePromotion(req, res, next));
  router.get('/promotions', (req, res, next) => promotionController.getPromotions(req, res, next));

  // Autenticación
  router.post('/auth/register', (req, res, next) => authController.register(req, res, next));
  router.post('/auth/login', (req, res, next) => authController.login(req, res, next));

  // Heartbeat Red Local
  router.post('/heartbeat', (req, res) => heartbeatController.ping(req, res));
  router.get('/heartbeat', (req, res) => heartbeatController.getStatus(req, res));

  return router;
}

module.exports = createApiRouter;
