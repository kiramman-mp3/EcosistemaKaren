class AlertController {
  constructor(obtenerAlertasCaducidadUC, alertStreamManager) {
    this.obtenerAlertasCaducidadUC = obtenerAlertasCaducidadUC;
    this.alertStreamManager = alertStreamManager;
  }

  async getAlerts(req, res, next) {
    try {
      const alerts = await this.obtenerAlertasCaducidadUC.execute();
      res.json({
        success: true,
        count: alerts.length,
        data: alerts
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
