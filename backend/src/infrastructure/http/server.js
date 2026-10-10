const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { testConnection, getPool } = require('../db/postgres');
const { runMigrations } = require('../db/migrations');
const setupSwagger = require('../swagger/swaggerDoc');
const errorHandler = require('./middlewares/errorHandler');
const createAuthMiddleware = require('./middlewares/auth');
const { createSecurityMiddlewares, validateProductionSecurity, cookieCsrfProtection } = require('./middlewares/security');
const AlertStreamManager = require('../sse/AlertStreamManager');
const ReservationCleanerWorker = require('../workers/ReservationCleanerWorker');
const LotExpiryWorker = require('../workers/LotExpiryWorker');
const HeartbeatMonitor = require('../heartbeat/HeartbeatMonitor');
const PromotionCache = require('../cache/PromotionCache');
const aiMetrics = require('../metrics/AiMetricsCollector');

// Repositorios & Adaptadores
const {
  PostgresCategoryRepository,
  PostgresProductRepository,
  PostgresLotRepository,
  PostgresReservationRepository,
  PostgresUserRepository,
  PostgresAlertRepository,
  PostgresPromotionRepository
} = require('../../adapters/repositories/PostgresRepositories');
const InMemoryRepositories = require('../../adapters/repositories/InMemoryRepositories');
const GeminiAdapter = require('../../adapters/ai/GeminiAdapter');

// Use Cases
const { GetCategories, CreateCategory } = require('../../use-cases/categories/CategoryUseCases');
const { GetProducts, GetProductByBarcode, CreateProduct } = require('../../use-cases/products/ProductUseCases');
const { GetLots, GetPublicLotAvailability, IngresarLote, UpdateLotLocation, RegisterMerma, GetInventoryMovements, GetWastes, ObtenerAlertasCaducidad, ExpireLots } = require('../../use-cases/lots/LotUseCases');
const { ReservarStock, GetReservationByCode, ConfirmReservation, CleanExpiredReservations, CancelReservation, GetReservationsByUser } = require('../../use-cases/reservations/ReservationUseCases');
const {
  GenerarPromocionesIA,
  GetPromotions,
  GetPendingPromotions,
  ApprovePromotion,
  RejectPromotion
} = require('../../use-cases/promotions/PromotionUseCases');
const { RegisterUser, LoginUser } = require('../../use-cases/auth/AuthUseCases');

// Controllers
const CategoryController = require('../../adapters/controllers/CategoryController');
const ProductController = require('../../adapters/controllers/ProductController');
const LotController = require('../../adapters/controllers/LotController');
const ReservationController = require('../../adapters/controllers/ReservationController');
const AlertController = require('../../adapters/controllers/AlertController');
const PromotionController = require('../../adapters/controllers/PromotionController');
const AuthController = require('../../adapters/controllers/AuthController');
const HeartbeatController = require('../../adapters/controllers/HeartbeatController');
const createApiRouter = require('./routes/router');

async function createServer() {
  validateProductionSecurity(process.env);
  const app = express();
  const httpSecurity = createSecurityMiddlewares(process.env);

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) app.set('trust proxy', trustProxyHops);

  // Seguridad HTTP común
  app.disable('x-powered-by');
  app.use(httpSecurity.requestId);
  app.use(httpSecurity.headers);
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
  app.use('/api/v1', httpSecurity.general);
  app.use('/api/v1/auth', httpSecurity.auth);
  app.use('/api/v1/reservations', httpSecurity.reservations);
  app.use('/api/v1/promotions/generate', httpSecurity.ai);
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb', strict: true }));
  app.use(httpSecurity.normalizeJsonBody);
  app.use(cookieParser());
  app.use(cookieCsrfProtection(allowedOrigins, process.env.NODE_ENV === 'production'));
  app.use('/api/v1/auth', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api/v1/reservations', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(httpSecurity.hpp);
  app.use(httpSecurity.rejectDangerousKeys);

  // Probar conexión PostgreSQL
  const dbConnected = await testConnection();

  let categoryRepo, productRepo, lotRepo, reservationRepo, userRepo, alertRepo, promotionRepo;

  if (dbConnected) {
    const pool = getPool();
    await runMigrations(pool);
    categoryRepo = new PostgresCategoryRepository(pool);
    productRepo = new PostgresProductRepository(pool);
    lotRepo = new PostgresLotRepository(pool);
    reservationRepo = new PostgresReservationRepository(pool);
    userRepo = new PostgresUserRepository(pool);
    alertRepo = new PostgresAlertRepository(pool);
    promotionRepo = new PostgresPromotionRepository(pool);
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PostgreSQL es obligatorio en producción; se rechazó el fallback en memoria.');
    }
    const mem = new InMemoryRepositories();
    categoryRepo = mem.categoryRepository;
    productRepo = mem.productRepository;
    lotRepo = mem.lotRepository;
    reservationRepo = mem.reservationRepository;
    userRepo = mem.userRepository;
    alertRepo = mem.alertRepository;
    promotionRepo = mem.promotionRepository;
  }

  // Componentes de Infraestructura
  const alertStreamManager = new AlertStreamManager();
  const geminiAdapter = new GeminiAdapter(process.env.GEMINI_API_KEY);
  const heartbeatMonitor = new HeartbeatMonitor(process.env.HEARTBEAT_TIMEOUT_SECONDS || 60);
  const cacheTtlSeconds = process.env.GEMINI_CACHE_TTL_SECONDS === undefined
    ? 900
    : Number(process.env.GEMINI_CACHE_TTL_SECONDS);
  const cacheMaxEntries = process.env.GEMINI_CACHE_MAX_ENTRIES === undefined
    ? 1000
    : Number(process.env.GEMINI_CACHE_MAX_ENTRIES);
  const promotionCache = new PromotionCache(cacheTtlSeconds, cacheMaxEntries);

  // Instanciar Casos de Uso
  const getCategoriesUC = new GetCategories(categoryRepo);
  const createCategoryUC = new CreateCategory(categoryRepo);

  const getProductsUC = new GetProducts(productRepo);
  const getProductByBarcodeUC = new GetProductByBarcode(productRepo);
  const createProductUC = new CreateProduct(productRepo, categoryRepo);

  const getLotsUC = new GetLots(lotRepo);
  const getPublicLotAvailabilityUC = new GetPublicLotAvailability(lotRepo);
  const ingresarLoteUC = new IngresarLote(lotRepo, productRepo, alertRepo, alertStreamManager);
  const updateLotLocationUC = new UpdateLotLocation(lotRepo);
  const registerMermaUC = new RegisterMerma(lotRepo);
  const getInventoryMovementsUC = new GetInventoryMovements(lotRepo);
  const getWastesUC = new GetWastes(lotRepo);
  const obtenerAlertasCaducidadUC = new ObtenerAlertasCaducidad(lotRepo);
  const expireLotsUC = new ExpireLots(lotRepo);

  const reservarStockUC = new ReservarStock(reservationRepo, heartbeatMonitor);
  const getReservationByCodeUC = new GetReservationByCode(reservationRepo);
  const confirmReservationUC = new ConfirmReservation(reservationRepo);
  const cleanExpiredReservationsUC = new CleanExpiredReservations(reservationRepo);
  const cancelReservationUC = new CancelReservation(reservationRepo);
  const getReservationsByUserUC = new GetReservationsByUser(reservationRepo);

  const generarPromocionesIAUC = new GenerarPromocionesIA(
    lotRepo,
    promotionRepo,
    geminiAdapter,
    promotionCache,
    productRepo
  );
  const getPromotionsUC = new GetPromotions(promotionRepo);
  const getPendingPromotionsUC = new GetPendingPromotions(promotionRepo);
  const approvePromotionUC = new ApprovePromotion(promotionRepo);
  const rejectPromotionUC = new RejectPromotion(promotionRepo);

  const registerUserUC = new RegisterUser(userRepo, process.env.JWT_SECRET);
  const loginUserUC = new LoginUser(userRepo, process.env.JWT_SECRET);

  // Instanciar Controladores
  const categoryController = new CategoryController(getCategoriesUC, createCategoryUC);
  const productController = new ProductController(getProductsUC, getProductByBarcodeUC, createProductUC);
  const lotController = new LotController(getLotsUC, getPublicLotAvailabilityUC, ingresarLoteUC, updateLotLocationUC, registerMermaUC, getInventoryMovementsUC, getWastesUC);
  const reservationController = new ReservationController(
    reservarStockUC,
    getReservationByCodeUC,
    confirmReservationUC,
    cancelReservationUC,
    getReservationsByUserUC
  );
  const alertController = new AlertController(obtenerAlertasCaducidadUC, alertStreamManager);
  const promotionController = new PromotionController(
    generarPromocionesIAUC,
    getPromotionsUC,
    getPendingPromotionsUC,
    approvePromotionUC,
    rejectPromotionUC,
    aiMetrics
  );
  const authController = new AuthController(registerUserUC, loginUserUC);
  const heartbeatController = new HeartbeatController(heartbeatMonitor);
  const security = createAuthMiddleware(process.env.JWT_SECRET);

  // Iniciar Worker Background Sweeper para expiración de reservas TTL
  const sweeperWorker = new ReservationCleanerWorker(cleanExpiredReservationsUC, 60000);
  sweeperWorker.start();
  const lotExpiryWorker = new LotExpiryWorker(expireLotsUC, 60000);
  lotExpiryWorker.start();

  // Configurar Swagger UI
  const swaggerEnabled = setupSwagger(app, process.env);
  app.locals.swaggerEnabled = swaggerEnabled;

  // Montar Router `/api/v1`
  const apiRouter = createApiRouter({
    categoryController,
    productController,
    lotController,
    reservationController,
    alertController,
    promotionController,
    authController,
    heartbeatController
  }, security);

  app.use('/api/v1', apiRouter);

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

module.exports = createServer;
