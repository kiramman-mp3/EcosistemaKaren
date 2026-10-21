const { NotFoundException } = require('../../domain/exceptions/DomainExceptions');

class AlertController {
  constructor(obtenerAlertasCaducidadUC, alertStreamManager, atenderAlertaCaducidadUC = null) {
    this.obtenerAlertasCaducidadUC = obtenerAlertasCaducidadUC;
    this.alertStreamManager = alertStreamManager;
    this.atenderAlertaCaducidadUC = atenderAlertaCaducidadUC;
  }

  async getAlerts(req, res, next) {
    try {
      const filters = {};
      if (req.query.atendida !== undefined) {
        filters.atendida = req.query.atendida;
      }
      if (req.query.nivel) {
        filters.nivel = req.query.nivel;
      }
      if (req.query.loteId) {
        filters.loteId = req.query.loteId;
      }
      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit, 10);
      }
      if (req.query.offset) {
        filters.offset = parseInt(req.query.offset, 10);
      }

      const alerts = await this.obtenerAlertasCaducidadUC.execute(filters);
      res.json({
        success: true,
        count: alerts.length,
        data: alerts
      });
    } catch (err) {
      next(err);
    }
  }

  async markAsAttended(req, res, next) {
    try {
      const { id } = req.params;
      if (!this.atenderAlertaCaducidadUC) {
        throw new NotFoundException('El servicio para atender alertas no está configurado.');
      }
      const updated = await this.atenderAlertaCaducidadUC.execute(id);
      res.json({
        success: true,
        message: 'Alerta marcada como atendida exitosamente.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  subscribeStream(req, res) {
    this.alertStreamManager.addClient(req, res);
  }
}

module.exports = AlertController;

