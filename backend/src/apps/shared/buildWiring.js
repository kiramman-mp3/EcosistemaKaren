const { resolveMediaDir } = require('../../infrastructure/media/mediaPaths');
const SharpImageProcessor = require('../../infrastructure/media/SharpImageProcessor');
const LocalMediaStorage = require('../../infrastructure/media/LocalMediaStorage');
const createAuthMiddleware = require('../../infrastructure/http/middlewares/auth');
const AlertStreamManager = require('../../infrastructure/sse/AlertStreamManager');
const ReservationCleanerWorker = require('../../infrastructure/workers/ReservationCleanerWorker');
const LotExpiryWorker = require('../../infrastructure/workers/LotExpiryWorker');
const HeartbeatSenderWorker = require('../../infrastructure/workers/HeartbeatSenderWorker');
const HttpHeartbeatTransport = require('../../infrastructure/heartbeat/HttpHeartbeatTransport');
const LocalHeartbeatTransport = require('../../infrastructure/heartbeat/LocalHeartbeatTransport');
const CatalogSyncWorker = require('../../infrastructure/workers/CatalogSyncWorker');
const HttpCatalogSyncTransport = require('../../infrastructure/sync/HttpCatalogSyncTransport');
const MediaSyncWorker = require('../../infrastructure/workers/MediaSyncWorker');
const HttpMediaSyncTransport = require('../../infrastructure/sync/HttpMediaSyncTransport');
const PostgresCatalogSnapshotReader = require('../../infrastructure/sync/PostgresCatalogSnapshotReader');
const packageInfo = require('../../../package.json');
const HeartbeatMonitor = require('../../infrastructure/heartbeat/HeartbeatMonitor');
const PostgresHeartbeatStore = require('../../infrastructure/heartbeat/PostgresHeartbeatStore');
const PromotionCache = require('../../infrastructure/cache/PromotionCache');
const aiMetrics = require('../../infrastructure/metrics/AiMetricsCollector');
const GeminiAdapter = require('../../adapters/ai/GeminiAdapter');

const { GetCategories, CreateCategory } = require('../../use-cases/categories/CategoryUseCases');
const { GetProducts, GetProductByBarcode, CreateProduct, SetProductImage } = require('../../use-cases/products/ProductUseCases');
const { GetLots, GetPublicLotAvailability, IngresarLote, UpdateLotLocation, RegisterMerma, GetInventoryMovements, GetWastes, ObtenerAlertasCaducidad, AtenderAlertaCaducidad, ExpireLots } = require('../../use-cases/lots/LotUseCases');
const { ReservarStock, GetReservationByCode, ConfirmReservation, CleanExpiredReservations, CancelReservation, ExtendReservation, GetReservationsByUser } = require('../../use-cases/reservations/ReservationUseCases');
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
const CatalogSyncController = require('../../adapters/controllers/CatalogSyncController');
const MediaSyncController = require('../../adapters/controllers/MediaSyncController');
const PostgresMediaMirrorRepository = require('../../adapters/repositories/PostgresMediaMirrorRepository');
const { ReconcileMediaManifest, StoreMediaFile, GetMediaFile } = require('../../use-cases/catalog/MediaSyncUseCases');
const PostgresCatalogMirrorRepository = require('../../adapters/repositories/PostgresCatalogMirrorRepository');
const CatalogStatusController = require('../../adapters/controllers/CatalogStatusController');
const wirePortalReservations = require('./wirePortalReservations');
const wireStoreChannel = require('./wireStoreChannel');
const MaintenanceWorker = require('../../infrastructure/workers/MaintenanceWorker');
const { createMaintenanceTasks } = require('../../infrastructure/maintenance/maintenanceTasks');
const { ApplyCatalogSnapshot, GetCatalogSyncStatus } = require('../../use-cases/catalog/CatalogSyncUseCases');

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
    store ? new CreateProduct(productRepo, categoryRepo) : undefined,
    store ? new SetProductImage({
      productRepository: productRepo,
      imageProcessor: new SharpImageProcessor(),
      mediaStorage: new LocalMediaStorage({ mediaDir: resolveMediaDir(serviceConfig.mediaDir) })
    }) : undefined
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

  // portal-api con base propia recibe la copia del catálogo; en el monolito las tablas se comparten.
  // Sin PostgreSQL (respaldo en memoria) no hay dónde guardarla y la ruta no se registra.
  const catalogMirrorRepo = portal && !store && pool ? new PostgresCatalogMirrorRepository(pool) : null;
  if (catalogMirrorRepo) {
    controllers.catalogSyncController = new CatalogSyncController(new ApplyCatalogSnapshot(catalogMirrorRepo));
    // Las fotos de los productos llegan con el catálogo y se sirven desde la base del portal.
    const mediaMirrorRepo = new PostgresMediaMirrorRepository(pool);
    controllers.mediaSyncController = new MediaSyncController({
      reconcileUC: new ReconcileMediaManifest(mediaMirrorRepo),
      storeFileUC: new StoreMediaFile(mediaMirrorRepo),
      getFileUC: new GetMediaFile(mediaMirrorRepo)
    });
  }
  if (portal) {
    controllers.catalogStatusController = new CatalogStatusController(new GetCatalogSyncStatus(catalogMirrorRepo, {
      mode: store ? 'direct' : 'mirror',
      staleAfterSeconds: serviceConfig.catalogStaleSeconds
    }));
  }

  const workers = [];

  // portal-api con base propia encola las reservas para la tienda en vez de descontar stock.
  const portalReservations = portal && !store && pool
    ? wirePortalReservations({ pool, heartbeatMonitor, serviceConfig })
    : null;
  if (portalReservations) {
    controllers.storeChannelController = portalReservations.storeChannelController;
    workers.push(...portalReservations.workers);
  }

  // Limpieza periódica de tokens revocados, contadores de límite de tasa y comandos de reserva resueltos.
  if (pool) {
    workers.push(new MaintenanceWorker(
      createMaintenanceTasks({ pool, retentionDays: serviceConfig.retentionDays, portalQueue: Boolean(portalReservations) }),
      serviceConfig.maintenanceIntervalMs
    ));
  }

  let alertStreamManager = null;
  let lotUseCases = {};
  let confirmReservationUC;
  let promotionUseCases = {};

  if (store) {
    // Los streams de alertas se cierran cuando su token expira o se revoca.
    alertStreamManager = new AlertStreamManager({ isRevoked: (jti) => tokenBlacklistRepo.isRevoked(jti) });
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
    // Con la tienda separada del portal, atiende las reservas que éste le encarga y le avisa los cambios.
    const storeChannel = !portal && pool && serviceConfig.reservationQueueEnabled
      ? wireStoreChannel({ pool, reservationRepo, serviceConfig })
      : null;
    if (storeChannel) {
      workers.push(...storeChannel.workers);
      // Los cambios de estado quedan en la bandeja de salida dentro de la misma transacción que el cambio.
      reservationRepo.enableStateEvents?.();
    }
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

    // Con base propia, el portal recibe una copia del catálogo que la tienda le publica.
    if (!portal && pool && serviceConfig.catalogSyncEnabled) {
      workers.push(new CatalogSyncWorker({
        reader: new PostgresCatalogSnapshotReader(pool),
        transport: new HttpCatalogSyncTransport({ baseUrl: serviceConfig.portalUrl, apiKey: serviceConfig.storeServiceKey }),
        intervalMs: serviceConfig.catalogSyncIntervalMs,
        resyncMs: serviceConfig.catalogResyncMs
      }));
      // Las fotos locales de los productos también se copian al portal, que no alcanza la red de la tienda.
      if (serviceConfig.mediaSyncEnabled) {
        workers.push(new MediaSyncWorker({
          listPaths: async () => (await pool.query(
            "SELECT DISTINCT imagen_url FROM productos WHERE imagen_url LIKE '/api/v1/media/%'"
          )).rows.map(row => row.imagen_url),
          mediaDir: resolveMediaDir(serviceConfig.mediaDir),
          transport: new HttpMediaSyncTransport({ baseUrl: serviceConfig.portalUrl, apiKey: serviceConfig.storeServiceKey }),
          intervalMs: serviceConfig.mediaSyncIntervalMs
        }));
      }
    }

    // La tienda es quien emite el latido: por HTTP hacia el portal, o en proceso en el monolito.
    // En store-api, cada latido aceptado por el portal también se registra en su monitor local, así
    // GET /heartbeat de la tienda informa si el enlace con el portal (las reservas web) está activo.
    if (serviceConfig.heartbeatEnabled) {
      const timeoutSec = Number(process.env.HEARTBEAT_TIMEOUT_SECONDS) || 60;
      const intervalMs = Math.min(25000, Math.max(5000, Math.floor((timeoutSec * 1000) / 2)));
      const transport = portal
        ? new LocalHeartbeatTransport(heartbeatMonitor)
        : new HttpHeartbeatTransport({
          baseUrl: serviceConfig.portalUrl,
          apiKey: serviceConfig.storeServiceKey,
          onDelivered: () => heartbeatMonitor.recordHeartbeat()
        });
      workers.push(new HeartbeatSenderWorker(transport, intervalMs, {
        storeId: serviceConfig.storeId,
        version: packageInfo.version,
        getPendingEvents: storeChannel ? () => storeChannel.outbox.pendingCount() : undefined
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

  controllers.reservationController = portalReservations
    ? portalReservations.reservationController
    : new ReservationController(
      portal ? new ReservarStock(reservationRepo, heartbeatMonitor) : undefined,
      getReservationByCodeUC,
      confirmReservationUC,
      // El ADMIN cancela reservas desde la tienda (los clientes lo hacen en el portal).
      new CancelReservation(reservationRepo),
      portal ? new GetReservationsByUser(reservationRepo) : undefined,
      portal ? new ExtendReservation(reservationRepo) : undefined
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
