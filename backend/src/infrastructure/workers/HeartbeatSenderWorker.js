// Emite el latido de la tienda a intervalos fijos. Una falla de red solo se registra: el
// siguiente ciclo reintenta, y el portal bloquea las reservas mientras no llegue un latido.
class HeartbeatSenderWorker {
  // `getPendingEvents` informa cuántos avisos esperan en la bandeja de salida hacia el portal.
  constructor(transport, intervalMs = 25000, { storeId, version, getPendingEvents } = {}) {
    this.transport = transport;
    this.intervalMs = intervalMs;
    this.storeId = storeId;
    this.version = version;
    this.getPendingEvents = getPendingEvents;
    this.timer = null;
    this.consecutiveFailures = 0;
  }

  async ping() {
    try {
      await this.transport.send({ storeId: this.storeId, version: this.version, pendingEvents: this.getPendingEvents ? await this._pendingEvents() : 0 });
      if (this.consecutiveFailures > 0) {
        console.log(`💓 Heartbeat restablecido tras ${this.consecutiveFailures} fallo(s).`);
      }
      this.consecutiveFailures = 0;
    } catch (err) {
      // Solo se registra el primer fallo de cada racha para no inundar el log sin conexión.
      if (this.consecutiveFailures === 0) {
        console.error('⚠️ No se pudo enviar el heartbeat al portal:', err.message);
      }
      this.consecutiveFailures += 1;
    }
  }

  async _pendingEvents() {
    if (!this.getPendingEvents) return 0;
    try {
      return Math.max(0, Math.floor(Number(await this.getPendingEvents()) || 0));
    } catch {
      return 0;
    }
  }

  start() {
    if (this.timer) return;
    console.log(`💓 HeartbeatSenderWorker iniciado (frecuencia: cada ${this.intervalMs / 1000}s).`);
    void this.ping();
    this.timer = setInterval(() => void this.ping(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = HeartbeatSenderWorker;
