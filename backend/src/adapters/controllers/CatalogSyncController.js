class CatalogSyncController {
  constructor(applyCatalogSnapshotUC) {
    this.applyCatalogSnapshotUC = applyCatalogSnapshotUC;
  }

  async apply(req, res, next) {
    try {
      const result = await this.applyCatalogSnapshotUC.execute(req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CatalogSyncController;
