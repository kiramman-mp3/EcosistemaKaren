class HeartbeatController {
  constructor() {
    this.lastHeartbeatTime = Date.now();
  }

  ping(req, res) {
    this.lastHeartbeatTime = Date.now();
    res.json({
      success: true,
      status: 'ONLINE',
      timestamp: new Date(this.lastHeartbeatTime).toISOString(),
      message: 'Señal de latido de red física de la tienda recibida correctamente.'
    });
  }

  getStatus(req, res) {
    const elapsedSeconds = Math.floor((Date.now() - this.lastHeartbeatTime) / 1000);
    const isOnline = elapsedSeconds <= 60;

    res.json({
      success: true,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      secondsSinceLastHeartbeat: elapsedSeconds,
      reservationsBlocked: !isOnline,
      message: isOnline
        ? 'Conectividad activa con el servidor local de tienda.'
        : '⚠️ Advertencia: Pérdida de conectividad con la tienda por más de 60 segundos. Reservas web bloqueadas temporalmente.'
    });
  }
}

module.exports = HeartbeatController;
