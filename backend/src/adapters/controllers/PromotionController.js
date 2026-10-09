const { GeminiError, GeminiErrorType } = require('../../adapters/ai/GeminiAdapter');

class PromotionController {
  /**
   * @param {object} generarPromocionesIAUC
   * @param {object} getPromotionsUC
   * @param {object} getPendingPromotionsUC
   * @param {object} approvePromotionUC
   * @param {object} rejectPromotionUC
   * @param {object} aiMetrics              - AiMetricsCollector singleton
   */
  constructor(
    generarPromocionesIAUC,
    getPromotionsUC,
    getPendingPromotionsUC,
    approvePromotionUC,
    rejectPromotionUC,
    aiMetrics,
  ) {
    this.generarPromocionesIAUC  = generarPromocionesIAUC;
    this.getPromotionsUC         = getPromotionsUC;
    this.getPendingPromotionsUC  = getPendingPromotionsUC;
    this.approvePromotionUC      = approvePromotionUC;
    this.rejectPromotionUC       = rejectPromotionUC;
    this.aiMetrics               = aiMetrics;
  }

  // ─── POST /promotions/generate ────────────────────────────────────────────
  async generatePromotion(req, res, next) {
    try {
      const promotion = await this.generarPromocionesIAUC.execute(req.body, req.user);
      return res.status(202).json({
        success: true,
        message: 'Borrador de promoción generado. Pendiente de aprobación por ADMIN.',
        data: typeof promotion.toOperationalDTO === 'function'
          ? promotion.toOperationalDTO()
          : promotion,
      });
    } catch (err) {
      return this._handleGeminiError(err, res, next);
    }
  }

  // ─── GET /promotions  (public — approved only) ────────────────────────────
  async getPromotions(req, res, next) {
    try {
      const promotions = await this.getPromotionsUC.execute();
      return res.json({
        success: true,
        count: promotions.length,
        data: promotions.map(promotion =>
          typeof promotion.toPublicDTO === 'function' ? promotion.toPublicDTO() : promotion
        ),
      });
    } catch (err) {
      return next(err);
    }
  }

  // ─── GET /promotions/pending  (ADMIN) ─────────────────────────────────────
  async getPendingPromotions(req, res, next) {
    try {
      const promotions = await this.getPendingPromotionsUC.execute();
      return res.json({
        success: true,
        count: promotions.length,
        data: promotions,
      });
    } catch (err) {
      return next(err);
    }
  }

  // ─── POST /promotions/:id/approve  (ADMIN) ────────────────────────────────
  async approvePromotion(req, res, next) {
    try {
      const promotion = await this.approvePromotionUC.execute(
        { promotionId: req.params.id },
        req.user,
      );
      return res.json({
        success: true,
        message: 'Promoción aprobada y publicada correctamente.',
        data: promotion,
      });
    } catch (err) {
      return next(err);
    }
  }

  // ─── POST /promotions/:id/reject  (ADMIN) ────────────────────────────────
  async rejectPromotion(req, res, next) {
    try {
      const promotion = await this.rejectPromotionUC.execute(
        { promotionId: req.params.id, motivoRechazo: req.body.motivoRechazo },
        req.user,
      );
      return res.json({
        success: true,
        message: 'Promoción rechazada.',
        data: promotion,
      });
    } catch (err) {
      return next(err);
    }
  }

  // ─── GET /metrics/ai  (ADMIN) ─────────────────────────────────────────────
  async getAiMetrics(req, res) {
    return res.json({
      success: true,
      data: this.aiMetrics.snapshot(),
    });
  }

  // ─── Error mapping ────────────────────────────────────────────────────────
  _handleGeminiError(err, res, next) {
    if (err instanceof GeminiError) {
      switch (err.type) {
        case GeminiErrorType.CONFIG:
          return res.status(503).json({
            success: false,
            error: 'GeminiNotConfigured',
            message: err.message,
          });

        case GeminiErrorType.TIMEOUT:
          return res.status(504).json({
            success: false,
            error: 'GeminiTimeout',
            message: 'La generación con IA excedió el tiempo límite. Intente nuevamente.',
          });

        case GeminiErrorType.RATE_LIMIT:
          return res.status(429).json({
            success: false,
            error: 'GeminiRateLimit',
            message: 'Límite de solicitudes de IA alcanzado. Espere antes de reintentar.',
            retryAfterSeconds: 60,
          });

        case GeminiErrorType.INVALID_RESPONSE:
          return res.status(502).json({
            success: false,
            error: 'GeminiInvalidResponse',
            message: 'La IA devolvió una respuesta que no cumple el esquema requerido.',
          });

        default:
          return res.status(502).json({
            success: false,
            error: 'GeminiExternalError',
            message: 'Error al comunicarse con el servicio de IA.',
          });
      }
    }
    return next(err);
  }
}

module.exports = PromotionController;
