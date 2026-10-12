class LotExpiryWorker {
  constructor(expireLotsUC, intervalMs = 60000) {
    this.expireLotsUC = expireLotsUC;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.running = false;
  }

  async sweep() {
    if (this.running) return { countExpired: 0 };
    this.running = true;
    try {
      const result = await this.expireLotsUC.execute();
      if (result.countExpired > 0) {
        console.log(`📦 Caducidad de inventario: ${result.countExpired} lote(s) marcado(s) como VENCIDO.`);
      }
      return result;
    } catch (error) {
      console.error('⚠️ Error en LotExpiryWorker:', error.message);
      return { countExpired: 0, error };
    } finally {
      this.running = false;
    }
  }

  start() {
    console.log(`⏱️ LotExpiryWorker iniciado (frecuencia: cada ${this.intervalMs / 1000}s).`);
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = LotExpiryWorker;
