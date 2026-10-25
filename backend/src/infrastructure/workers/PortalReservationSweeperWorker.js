// portal-api: expira las reservas que la tienda nunca aceptó y cuyo plazo venció.
class PortalReservationSweeperWorker {
  constructor(expireUnacknowledgedReservationsUC, intervalMs = 30000) {
    this.expireUnacknowledgedReservationsUC = expireUnacknowledgedReservationsUC;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.running = false;
  }

  async sweep() {
    if (this.running) return { countExpiradas: 0 };
    this.running = true;
    try {
      const result = await this.expireUnacknowledgedReservationsUC.execute();
      if (result.countExpiradas > 0) {
        console.log(`🧹 Se expiraron ${result.countExpiradas} reservas que la tienda no llegó a aceptar.`);
      }
      return result;
    } catch (err) {
      console.error('⚠️ Error en PortalReservationSweeperWorker:', err.message);
      return { countExpiradas: 0, error: err };
    } finally {
      this.running = false;
    }
  }

  start() {
    if (this.timer) return;
    console.log(`⏱️ PortalReservationSweeperWorker iniciado (frecuencia: cada ${this.intervalMs / 1000}s).`);
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = PortalReservationSweeperWorker;
