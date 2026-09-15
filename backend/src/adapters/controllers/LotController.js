class LotController {
  constructor(getLotsUC, ingresarLoteUC, updateLotLocationUC, registerMermaUC) {
    this.getLotsUC = getLotsUC;
    this.ingresarLoteUC = ingresarLoteUC;
    this.updateLotLocationUC = updateLotLocationUC;
    this.registerMermaUC = registerMermaUC;
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
      const lot = await this.ingresarLoteUC.execute(req.body);
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
      const lot = await this.updateLotLocationUC.execute(id, ubicacion);
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
      const lot = await this.registerMermaUC.execute(id, cantidad, razon);
      res.json({
        success: true,
        message: 'Baja por merma registrada exitosamente.',
        data: lot
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = LotController;
