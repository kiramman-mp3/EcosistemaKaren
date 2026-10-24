const {
  PostgresCategoryRepository,
  PostgresProductRepository,
  PostgresLotRepository,
  PostgresReservationRepository,
  PostgresUserRepository,
  PostgresAlertRepository,
  PostgresPromotionRepository,
  PostgresTokenBlacklistRepository
} = require('../../adapters/repositories/PostgresRepositories');
const InMemoryRepositories = require('../../adapters/repositories/InMemoryRepositories');

// PostgreSQL si hay conexión; repositorios en memoria como respaldo de desarrollo.
function buildRepositories(pool, dbConnected) {
  if (dbConnected) {
    return {
      categoryRepo: new PostgresCategoryRepository(pool),
      productRepo: new PostgresProductRepository(pool),
      lotRepo: new PostgresLotRepository(pool),
      reservationRepo: new PostgresReservationRepository(pool),
      userRepo: new PostgresUserRepository(pool),
      alertRepo: new PostgresAlertRepository(pool),
      promotionRepo: new PostgresPromotionRepository(pool),
      tokenBlacklistRepo: new PostgresTokenBlacklistRepository(pool)
    };
  }

  const mem = new InMemoryRepositories();
  return {
    categoryRepo: mem.categoryRepository,
    productRepo: mem.productRepository,
    lotRepo: mem.lotRepository,
    reservationRepo: mem.reservationRepository,
    userRepo: mem.userRepository,
    alertRepo: mem.alertRepository,
    promotionRepo: mem.promotionRepository,
    tokenBlacklistRepo: mem.tokenBlacklistRepository
  };
}

module.exports = buildRepositories;
