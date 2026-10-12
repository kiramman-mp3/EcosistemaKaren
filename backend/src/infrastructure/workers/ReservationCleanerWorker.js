const BATCH_SIZE = 100;
const MAX_BATCHES_PER_SWEEP = 20;

class ReservationCleanerWorker {
  constructor(cleanExpiredReservationsUC, intervalMs = 60000) {
    this.cleanExpiredReservationsUC = cleanExpiredReservationsUC;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.running = false;
  }

  // Libera lotes de hasta BATCH_SIZE reservas hasta vaciar la cola, para que un pico
  // de expiraciones no quede reteniendo stock varios minutos.
  async sweep() {
    if (this.running) return { countLiberadas: 0 };
    this.running = true;
    let total = 0;
    try {
      for (let batch = 0; batch < MAX_BATCHES_PER_SWEEP; batch++) {
        const result = await this.cleanExpiredReservationsUC.execute();
        total += result.countLiberadas;
        if (result.countLiberadas < BATCH_SIZE) break;
      }
      if (total > 0) {
        console.log(`🧹 Sweeper Anti-Overbooking: Se liberaron ${total} reservas expiradas por TTL.`);
      }
      return { countLiberadas: total };
    } catch (err) {
      console.error('⚠️ Error en ReservationCleanerWorker:', err.message);
      return { countLiberadas: total, error: err };
    } finally {
      this.running = false;
    }
  }

  start() {
    console.log(`⏱️ ReservationCleanerWorker iniciado (frecuencia: cada ${this.intervalMs / 1000}s).`);
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

module.exports = ReservationCleanerWorker;
