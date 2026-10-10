class LotController {
  constructor(getLotsUC, getPublicLotAvailabilityUC, ingresarLoteUC, updateLotLocationUC, registerMermaUC, getInventoryMovementsUC, getWastesUC) {
    this.getLotsUC = getLotsUC;
    this.getPublicLotAvailabilityUC = getPublicLotAvailabilityUC;
    this.ingresarLoteUC = ingresarLoteUC;
    this.updateLotLocationUC = updateLotLocationUC;
    this.registerMermaUC = registerMermaUC;
    this.getInventoryMovementsUC = getInventoryMovementsUC;
    this.getWastesUC = getWastesUC;
  }

  async getPublicAvailability(req, res, next) {
    try {
      const lots = await this.getPublicLotAvailabilityUC.execute();
      res.json({ success: true, count: lots.length, data: lots });
    } catch (err) {
      next(err);
    }
  }

  async getLots(req, res, next) {
    try {
      const lots = await this.getLotsUC.execute();
      res.json({
        success: true,
        count: lots.length,
        data: lots
      });
    } catch (err) {
      next(err);
    }
  }

  async ingresarLote(req, res, next) {
    try {
      const lot = await this.ingresarLoteUC.execute(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Lote de inventario ingresado correctamente en bodega.',
        data: lot
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLocation(req, res, next) {
    try {
      const { id } = req.params;
      const { ubicacion } = req.body;
      const lot = await this.updateLotLocationUC.execute(id, ubicacion, req.user);
      res.json({
        success: true,
        message: `Ubicación del lote actualizada a '${lot.ubicacion}'.`,
        data: lot
      });
    } catch (err) {
      next(err);
    }
  }

  async registerMerma(req, res, next) {
    try {
      const { id } = req.params;
      const { cantidad, razon } = req.body;
      const result = await this.registerMermaUC.execute(id, cantidad, razon, req.user);
      res.json({
        success: true,
        message: 'Baja por merma registrada exitosamente.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getMovements(req, res, next) {
    try {
      const data = await this.getInventoryMovementsUC.execute(req.query, req.user);
      res.json({ success: true, count: data.length, data });
    } catch (err) { next(err); }
  }

  async getWastes(req, res, next) {
    try {
      const data = await this.getWastesUC.execute(req.query, req.user);
      res.json({ success: true, count: data.length, data });
    } catch (err) { next(err); }
  }
}

module.exports = LotController;
