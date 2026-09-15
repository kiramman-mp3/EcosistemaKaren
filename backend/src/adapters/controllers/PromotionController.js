class PromotionController {
  constructor(generarPromocionesIAUC, getPromotionsUC) {
    this.generarPromocionesIAUC = generarPromocionesIAUC;
    this.getPromotionsUC = getPromotionsUC;
  }

  async generatePromotion(req, res, next) {
    try {
      const promotion = await this.generarPromocionesIAUC.execute(req.body);
      res.json({
        success: true,
        message: 'Promoción comercial generada exitosamente con Gemini AI.',
        data: promotion
      });
    } catch (err) {
      next(err);
    }
  }

  async getPromotions(req, res, next) {
    try {
      const promotions = await this.getPromotionsUC.execute();
      res.json({
        success: true,
        count: promotions.length,
        data: promotions
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PromotionController;
