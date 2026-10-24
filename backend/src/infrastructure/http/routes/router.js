const { Router } = require('express');
const groups = require('./routeGroups');

// Grupos de rutas que sirve cada servicio (ver ADR-003). Mientras ambos compartan base de
// datos, store-api y portal-api exponen los mismos contratos públicos de lectura y de auth.
const STORE_GROUPS = [
  groups.rootRoutes,
  groups.catalogReadRoutes,
  groups.catalogAdminRoutes,
  groups.inventoryRoutes,
  groups.reservationLookupRoutes,
  groups.storeReservationRoutes,
  groups.alertRoutes,
  groups.publicPromotionRoutes,
  groups.promotionAdminRoutes,
  groups.authRoutes,
  groups.heartbeatRoutes
];

const PORTAL_GROUPS = [
  groups.rootRoutes,
  groups.catalogReadRoutes,
  groups.catalogStatusRoutes,
  groups.customerReservationRoutes,
  groups.reservationLookupRoutes,
  groups.publicPromotionRoutes,
  groups.authRoutes,
  groups.heartbeatRoutes
];

function composeRouter(routeGroups, controllers, security) {
  const router = Router();
  for (const registerGroup of new Set(routeGroups)) {
    registerGroup(router, controllers, security);
  }
  return router;
}

const createStoreRouter = (controllers, security) => composeRouter(STORE_GROUPS, controllers, security);
const createPortalRouter = (controllers, security) => composeRouter(PORTAL_GROUPS, controllers, security);

// Monolito de transición: la unión de ambos servicios, con cada grupo registrado una sola vez.
const createApiRouter = (controllers, security) =>
  composeRouter([...STORE_GROUPS, ...PORTAL_GROUPS], controllers, security);

module.exports = createApiRouter;
module.exports.createStoreRouter = createStoreRouter;
module.exports.createPortalRouter = createPortalRouter;
