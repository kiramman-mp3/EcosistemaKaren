class CatalogStatusController {
  constructor(getCatalogSyncStatusUC) {
    this.getCatalogSyncStatusUC = getCatalogSyncStatusUC;
  }

  async getStatus(req, res, next) {
    try {
      const status = await this.getCatalogSyncStatusUC.execute();
      res.json({
        success: true,
        ...status,
        message: status.stale
          ? 'El catálogo y la disponibilidad pueden estar desactualizados: la tienda no ha sincronizado recientemente.'
          : 'Catálogo sincronizado.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CatalogStatusController;
