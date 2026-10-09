const { ServiceUnavailableException } = require('../../domain/exceptions/DomainExceptions');

class HeartbeatMonitor {
  constructor(timeoutSeconds = 60, clock = () => Date.now()) {
    const parsedTimeout = Number(timeoutSeconds);
    if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
      throw new Error('HEARTBEAT_TIMEOUT_SECONDS debe ser un número positivo.');
    }

    this.timeoutMs = parsedTimeout * 1000;
    this.clock = clock;
    this.lastHeartbeatTime = null;
  }

  recordHeartbeat() {
    this.lastHeartbeatTime = this.clock();
    return this.getStatus();
  }

  getStatus() {
    const now = this.clock();
    const hasHeartbeat = this.lastHeartbeatTime !== null;
    const elapsedMs = hasHeartbeat ? Math.max(0, now - this.lastHeartbeatTime) : null;
    const isOnline = hasHeartbeat && elapsedMs <= this.timeoutMs;

    return {
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      lastHeartbeatAt: hasHeartbeat ? new Date(this.lastHeartbeatTime).toISOString() : null,
      secondsSinceLastHeartbeat: hasHeartbeat ? Math.floor(elapsedMs / 1000) : null,
      timeoutSeconds: this.timeoutMs / 1000,
      reservationsBlocked: !isOnline
    };
  }

  assertReservationsAvailable() {
    const status = this.getStatus();
    if (status.reservationsBlocked) {
      throw new ServiceUnavailableException(
        'Reservas temporalmente bloqueadas: no existe un heartbeat vigente de la tienda.'
      );
    }
    return status;
  }
}

module.exports = HeartbeatMonitor;
