class ReservationCleanerWorker {
  constructor(cleanExpiredReservationsUC, intervalMs = 60000) {
    this.cleanExpiredReservationsUC = cleanExpiredReservationsUC;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  start() {
    console.log(`⏱️ ReservationCleanerWorker iniciado (frecuencia: cada ${this.intervalMs / 1000}s).`);
    this.timer = setInterval(async () => {
      try {
        const result = await this.cleanExpiredReservationsUC.execute();
        if (result.countLiberadas > 0) {
          console.log(`🧹 Sweeper Anti-Overbooking: Se liberaron ${result.countLiberadas} reservas expiradas por TTL.`);
        }
      } catch (err) {
        console.error('⚠️ Error en ReservationCleanerWorker:', err.message);
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = ReservationCleanerWorker;
