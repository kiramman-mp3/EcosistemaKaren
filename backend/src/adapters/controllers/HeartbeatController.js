class HeartbeatController {
  constructor(heartbeatMonitor) {
    this.heartbeatMonitor = heartbeatMonitor;
  }

  ping(req, res) {
    const status = this.heartbeatMonitor.recordHeartbeat();
    res.json({
      success: true,
      ...status,
      timestamp: status.lastHeartbeatAt,
      message: 'Señal de latido de red física de la tienda recibida correctamente.'
    });
  }

  getStatus(req, res) {
    const status = this.heartbeatMonitor.getStatus();

    res.json({
      success: true,
      ...status,
      message: status.status === 'ONLINE'
        ? 'Conectividad activa con el servidor local de tienda.'
        : '⚠️ No existe un heartbeat vigente de la tienda. Reservas web bloqueadas temporalmente.'
    });
  }
}

module.exports = HeartbeatController;
