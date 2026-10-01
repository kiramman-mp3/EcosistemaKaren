const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection, getPool } = require('../db/postgres');
const setupSwagger = require('../swagger/swaggerDoc');
const errorHandler = require('./middlewares/errorHandler');
const AlertStreamManager = require('../sse/AlertStreamManager');
const ReservationCleanerWorker = require('../workers/ReservationCleanerWorker');

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
const { GetLots, IngresarLote, UpdateLotLocation, RegisterMerma, ObtenerAlertasCaducidad } = require('../../use-cases/lots/LotUseCases');
const { ReservarStock, GetReservationByCode, ConfirmReservation, CleanExpiredReservations, CancelReservation, GetReservationsByUser } = require('../../use-cases/reservations/ReservationUseCases');
const { GenerarPromocionesIA, GetPromotions } = require('../../use-cases/promotions/PromotionUseCases');
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
  const app = express();

  // Middlewares estándar
  app.use(cors());
  app.use(express.json());

  // Probar conexión PostgreSQL
  const dbConnected = await testConnection();

  let categoryRepo, productRepo, lotRepo, reservationRepo, userRepo, alertRepo, promotionRepo;

  if (dbConnected) {
    const pool = getPool();
    categoryRepo = new PostgresCategoryRepository(pool);
    productRepo = new PostgresProductRepository(pool);
    lotRepo = new PostgresLotRepository(pool);
    reservationRepo = new PostgresReservationRepository(pool);
    userRepo = new PostgresUserRepository(pool);
    alertRepo = new PostgresAlertRepository(pool);
    promotionRepo = new PostgresPromotionRepository(pool);
  } else {
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

  // Instanciar Casos de Uso
  const getCategoriesUC = new GetCategories(categoryRepo);
  const createCategoryUC = new CreateCategory(categoryRepo);

  const getProductsUC = new GetProducts(productRepo);
  const getProductByBarcodeUC = new GetProductByBarcode(productRepo);
  const createProductUC = new CreateProduct(productRepo, categoryRepo);

  const getLotsUC = new GetLots(lotRepo);
  const ingresarLoteUC = new IngresarLote(lotRepo, productRepo, alertRepo, alertStreamManager);
  const updateLotLocationUC = new UpdateLotLocation(lotRepo);
  const registerMermaUC = new RegisterMerma(lotRepo);
  const obtenerAlertasCaducidadUC = new ObtenerAlertasCaducidad(lotRepo);

  const reservarStockUC = new ReservarStock(reservationRepo, lotRepo, productRepo);
  const getReservationByCodeUC = new GetReservationByCode(reservationRepo);
  const confirmReservationUC = new ConfirmReservation(reservationRepo, lotRepo);
  const cleanExpiredReservationsUC = new CleanExpiredReservations(reservationRepo, lotRepo);
  const cancelReservationUC = new CancelReservation(reservationRepo, lotRepo);
  const getReservationsByUserUC = new GetReservationsByUser(reservationRepo);

  const generarPromocionesIAUC = new GenerarPromocionesIA(lotRepo, promotionRepo, geminiAdapter);
  const getPromotionsUC = new GetPromotions(promotionRepo);

  const registerUserUC = new RegisterUser(userRepo, process.env.JWT_SECRET);
  const loginUserUC = new LoginUser(userRepo, process.env.JWT_SECRET);

  // Instanciar Controladores
  const categoryController = new CategoryController(getCategoriesUC, createCategoryUC);
  const productController = new ProductController(getProductsUC, getProductByBarcodeUC, createProductUC);
  const lotController = new LotController(getLotsUC, ingresarLoteUC, updateLotLocationUC, registerMermaUC);
  const reservationController = new ReservationController(
    reservarStockUC,
    getReservationByCodeUC,
    confirmReservationUC,
    cancelReservationUC,
    getReservationsByUserUC
  );
  const alertController = new AlertController(obtenerAlertasCaducidadUC, alertStreamManager);
  const promotionController = new PromotionController(generarPromocionesIAUC, getPromotionsUC);
  const authController = new AuthController(registerUserUC, loginUserUC);
  const heartbeatController = new HeartbeatController();

  // Iniciar Worker Background Sweeper para expiración de reservas TTL
  const sweeperWorker = new ReservationCleanerWorker(cleanExpiredReservationsUC, 60000);
  sweeperWorker.start();

  // Configurar Swagger UI
  setupSwagger(app);

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
  });

  app.use('/api/v1', apiRouter);

  // Root redirect & info
  app.get('/', (req, res) => {
    res.json({
      name: 'Ecosistema Karen - Backend Server API',
      version: '1.0.0',
      status: 'ONLINE',
      swaggerDocs: '/api-docs',
      apiBaseUrl: '/api/v1'
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

module.exports = createServer;
