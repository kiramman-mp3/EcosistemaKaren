class HeartbeatSimulatorWorker {
  constructor(heartbeatMonitor, intervalMs = 25000) {
    this.heartbeatMonitor = heartbeatMonitor;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  async ping() {
    try {
      await this.heartbeatMonitor.recordHeartbeat();
    } catch (err) {
      console.error('⚠️ Error en HeartbeatSimulatorWorker:', err.message);
    }
  }

  start() {
    if (this.timer) return;
    console.log(`💓 HeartbeatSimulatorWorker iniciado (frecuencia: cada ${this.intervalMs / 1000}s).`);
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

module.exports = HeartbeatSimulatorWorker;
