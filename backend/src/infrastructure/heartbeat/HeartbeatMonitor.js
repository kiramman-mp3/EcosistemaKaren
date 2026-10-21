const { ServiceUnavailableException } = require('../../domain/exceptions/DomainExceptions');

class HeartbeatMonitor {
  constructor(timeoutSeconds = 60, clock = () => Date.now(), store = null) {
    const parsedTimeout = Number(timeoutSeconds);
    if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
      throw new Error('HEARTBEAT_TIMEOUT_SECONDS debe ser un número positivo.');
    }

    this.timeoutMs = parsedTimeout * 1000;
    this.clock = clock;
    this.lastHeartbeatTime = null;
    this.store = store;
  }

  _buildStatus(lastTime, now) {
    const hasHeartbeat = lastTime !== null && lastTime !== undefined;
    const elapsedMs = hasHeartbeat ? Math.max(0, now - lastTime) : null;
    const isOnline = hasHeartbeat && elapsedMs <= this.timeoutMs;

    return {
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      lastHeartbeatAt: hasHeartbeat ? new Date(lastTime).toISOString() : null,
      secondsSinceLastHeartbeat: hasHeartbeat ? Math.floor(elapsedMs / 1000) : null,
      timeoutSeconds: this.timeoutMs / 1000,
      reservationsBlocked: !isOnline
    };
  }

  recordHeartbeat() {
    const now = this.clock();
    this.lastHeartbeatTime = now;

    if (!this.store) {
      return this._buildStatus(this.lastHeartbeatTime, now);
    }

    return (async () => {
      await this.store.setLastHeartbeat(now);
      return this._buildStatus(this.lastHeartbeatTime, now);
    })();
  }

  getStatus() {
    const now = this.clock();

    if (!this.store) {
      return this._buildStatus(this.lastHeartbeatTime, now);
    }

    return (async () => {
      const persisted = await this.store.getLastHeartbeat();
      if (persisted !== null && persisted !== undefined) {
        this.lastHeartbeatTime = persisted;
      }
      return this._buildStatus(this.lastHeartbeatTime, now);
    })();
  }

  assertReservationsAvailable() {
    if (!this.store) {
      const status = this.getStatus();
      if (status.reservationsBlocked) {
        throw new ServiceUnavailableException(
          'Reservas temporalmente bloqueadas: no existe un heartbeat vigente de la tienda.'
        );
      }
      return status;
    }

    return (async () => {
      const status = await this.getStatus();
      if (status.reservationsBlocked) {
        throw new ServiceUnavailableException(
          'Reservas temporalmente bloqueadas: no existe un heartbeat vigente de la tienda.'
        );
      }
      return status;
    })();
  }
}

module.exports = HeartbeatMonitor;
