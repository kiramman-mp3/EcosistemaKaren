const createAuthMiddleware = require('../../infrastructure/http/middlewares/auth');
const AlertStreamManager = require('../../infrastructure/sse/AlertStreamManager');
const ReservationCleanerWorker = require('../../infrastructure/workers/ReservationCleanerWorker');
const LotExpiryWorker = require('../../infrastructure/workers/LotExpiryWorker');
const HeartbeatSenderWorker = require('../../infrastructure/workers/HeartbeatSenderWorker');
const HttpHeartbeatTransport = require('../../infrastructure/heartbeat/HttpHeartbeatTransport');
const LocalHeartbeatTransport = require('../../infrastructure/heartbeat/LocalHeartbeatTransport');
const packageInfo = require('../../../package.json');
const HeartbeatMonitor = require('../../infrastructure/heartbeat/HeartbeatMonitor');
const PostgresHeartbeatStore = require('../../infrastructure/heartbeat/PostgresHeartbeatStore');
const PromotionCache = require('../../infrastructure/cache/PromotionCache');
const aiMetrics = require('../../infrastructure/metrics/AiMetricsCollector');
const GeminiAdapter = require('../../adapters/ai/GeminiAdapter');

const { GetCategories, CreateCategory } = require('../../use-cases/categories/CategoryUseCases');
const { GetProducts, GetProductByBarcode, CreateProduct } = require('../../use-cases/products/ProductUseCases');
const { GetLots, GetPublicLotAvailability, IngresarLote, UpdateLotLocation, RegisterMerma, GetInventoryMovements, GetWastes, ObtenerAlertasCaducidad, AtenderAlertaCaducidad, ExpireLots } = require('../../use-cases/lots/LotUseCases');
const { ReservarStock, GetReservationByCode, ConfirmReservation, CleanExpiredReservations, CancelReservation, GetReservationsByUser } = require('../../use-cases/reservations/ReservationUseCases');
const {
  GenerarPromocionesIA,
  GetPromotions,
  GetPendingPromotions,
  ApprovePromotion,
  RejectPromotion,
  ManagePromotions
} = require('../../use-cases/promotions/PromotionUseCases');
const { RegisterUser, LoginUser } = require('../../use-cases/auth/AuthUseCases');

const CategoryController = require('../../adapters/controllers/CategoryController');
const ProductController = require('../../adapters/controllers/ProductController');
const LotController = require('../../adapters/controllers/LotController');
const ReservationController = require('../../adapters/controllers/ReservationController');
const AlertController = require('../../adapters/controllers/AlertController');
const PromotionController = require('../../adapters/controllers/PromotionController');
const AuthController = require('../../adapters/controllers/AuthController');
const HeartbeatController = require('../../adapters/controllers/HeartbeatController');

// Instancia casos de uso, controladores y procesos de fondo. `store` agrega la autoridad de
// inventario (lotes, alertas, Gemini, confirmación en caja, workers) y `portal` agrega las
// reservas de clientes. La lectura de catálogo, la auth y el heartbeat son comunes.
function buildWiring({ pool, repos, store, portal, serviceConfig }) {
  const { categoryRepo, productRepo, lotRepo, reservationRepo, userRepo, alertRepo, promotionRepo, tokenBlacklistRepo } = repos;

  const heartbeatStore = pool ? new PostgresHeartbeatStore(pool) : null;
  const heartbeatMonitor = new HeartbeatMonitor(
    process.env.HEARTBEAT_TIMEOUT_SECONDS || 60,
    () => Date.now(),
    heartbeatStore
  );

  // Comunes: catálogo (lectura), auth y heartbeat
  const categoryController = new CategoryController(
    new GetCategories(categoryRepo),
    store ? new CreateCategory(categoryRepo) : undefined
  );
  const productController = new ProductController(
    new GetProducts(productRepo),
    new GetProductByBarcode(productRepo),
    store ? new CreateProduct(productRepo, categoryRepo) : undefined
  );
  const getPublicLotAvailabilityUC = new GetPublicLotAvailability(lotRepo);
  const getReservationByCodeUC = new GetReservationByCode(reservationRepo);
  const getPromotionsUC = new GetPromotions(promotionRepo);

  const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev_jwt_secret_ecosistema_karen_2026_super_secret_32chars');
  const registerUserUC = new RegisterUser(userRepo, process.env.JWT_SECRET);
  const loginUserUC = new LoginUser(userRepo, process.env.JWT_SECRET);
  const authController = new AuthController(registerUserUC, loginUserUC, tokenBlacklistRepo, jwtSecret);
  const heartbeatController = new HeartbeatController(heartbeatMonitor);
  const security = createAuthMiddleware(jwtSecret, tokenBlacklistRepo);

  const controllers = {
    categoryController,
    productController,
    authController,
    heartbeatController
  };

  const workers = [];
  let alertStreamManager = null;
  let lotUseCases = {};
  let confirmReservationUC;
  let promotionUseCases = {};

  if (store) {
    alertStreamManager = new AlertStreamManager();
    const geminiAdapter = new GeminiAdapter(process.env.GEMINI_API_KEY);
    const cacheTtlSeconds = process.env.GEMINI_CACHE_TTL_SECONDS === undefined
      ? 900
      : Number(process.env.GEMINI_CACHE_TTL_SECONDS);
    const cacheMaxEntries = process.env.GEMINI_CACHE_MAX_ENTRIES === undefined
      ? 1000
      : Number(process.env.GEMINI_CACHE_MAX_ENTRIES);
    const promotionCache = new PromotionCache(cacheTtlSeconds, cacheMaxEntries);

    lotUseCases = {
      getLotsUC: new GetLots(lotRepo),
      ingresarLoteUC: new IngresarLote(lotRepo, productRepo, alertRepo, alertStreamManager),
      updateLotLocationUC: new UpdateLotLocation(lotRepo),
      registerMermaUC: new RegisterMerma(lotRepo),
      getInventoryMovementsUC: new GetInventoryMovements(lotRepo),
      getWastesUC: new GetWastes(lotRepo)
    };
    confirmReservationUC = new ConfirmReservation(reservationRepo);

    promotionUseCases = {
      generarPromocionesIAUC: new GenerarPromocionesIA(lotRepo, promotionRepo, geminiAdapter, promotionCache, productRepo),
      getPendingPromotionsUC: new GetPendingPromotions(promotionRepo),
      approvePromotionUC: new ApprovePromotion(promotionRepo),
      rejectPromotionUC: new RejectPromotion(promotionRepo),
      managePromotionsUC: new ManagePromotions(promotionRepo)
    };

    controllers.alertController = new AlertController(
      new ObtenerAlertasCaducidad(lotRepo, alertRepo),
      alertStreamManager,
      new AtenderAlertaCaducidad(alertRepo)
    );

    // Procesos de fondo: expiración de reservas TTL y de lotes
    workers.push(new ReservationCleanerWorker(new CleanExpiredReservations(reservationRepo), 60000));
    workers.push(new LotExpiryWorker(new ExpireLots(lotRepo), 60000));

    // La tienda es quien emite el latido: por HTTP hacia el portal, o en proceso en el monolito.
    if (serviceConfig.heartbeatEnabled) {
      const timeoutSec = Number(process.env.HEARTBEAT_TIMEOUT_SECONDS) || 60;
      const intervalMs = Math.min(25000, Math.max(5000, Math.floor((timeoutSec * 1000) / 2)));
      const transport = portal
        ? new LocalHeartbeatTransport(heartbeatMonitor)
        : new HttpHeartbeatTransport({ baseUrl: serviceConfig.portalUrl, apiKey: serviceConfig.storeServiceKey });
      workers.push(new HeartbeatSenderWorker(transport, intervalMs, {
        storeId: serviceConfig.storeId,
        version: packageInfo.version
      }));
    }
  }

  controllers.lotController = new LotController(
    lotUseCases.getLotsUC,
    getPublicLotAvailabilityUC,
    lotUseCases.ingresarLoteUC,
    lotUseCases.updateLotLocationUC,
    lotUseCases.registerMermaUC,
    lotUseCases.getInventoryMovementsUC,
    lotUseCases.getWastesUC
  );

  controllers.reservationController = new ReservationController(
    portal ? new ReservarStock(reservationRepo, heartbeatMonitor) : undefined,
    getReservationByCodeUC,
    confirmReservationUC,
    portal ? new CancelReservation(reservationRepo) : undefined,
    portal ? new GetReservationsByUser(reservationRepo) : undefined
  );

  controllers.promotionController = new PromotionController(
    promotionUseCases.generarPromocionesIAUC,
    getPromotionsUC,
    promotionUseCases.getPendingPromotionsUC,
    promotionUseCases.approvePromotionUC,
    promotionUseCases.rejectPromotionUC,
    promotionUseCases.managePromotionsUC,
    store ? aiMetrics : undefined
  );

  return {
    controllers,
    security,
    start() {
      workers.forEach(worker => worker.start());
    },
    stop() {
      workers.forEach(worker => worker.stop());
      alertStreamManager?.closeAll();
    }
  };
}

module.exports = buildWiring;
