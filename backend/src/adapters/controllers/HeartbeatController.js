class HeartbeatController {
  constructor(heartbeatMonitor) {
    this.heartbeatMonitor = heartbeatMonitor;
  }

  async ping(req, res, next) {
    try {
      const status = await this.heartbeatMonitor.recordHeartbeat();
      res.json({
        success: true,
        ...status,
        timestamp: status.lastHeartbeatAt,
        message: 'Señal de latido de red física de la tienda recibida correctamente.'
      });
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req, res, next) {
    try {
      const status = await this.heartbeatMonitor.getStatus();

      res.json({
        success: true,
        ...status,
        message: status.status === 'ONLINE'
          ? 'Conectividad activa con el servidor local de tienda.'
          : '⚠️ No existe un heartbeat vigente de la tienda. Reservas web bloqueadas temporalmente.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = HeartbeatController;
