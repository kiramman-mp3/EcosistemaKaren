// Avisa al portal, por la bandeja de salida, que una reserva cambió de estado en la tienda
// (confirmada en caja o expirada). El portal ignora las reservas que no conoce.
class ReservationEventPublisher {
  constructor(outbox, clock = () => new Date()) {
    this.outbox = outbox;
    this.clock = clock;
  }

  async publishStateChange({ reservaId, estado, at }) {
    try {
      await this.outbox.enqueue({
        tipo: 'RESERVATION_STATE',
        clave: `state:${reservaId}:${estado}`,
        payload: { reservaId, estado, at: (at || this.clock()).toISOString() }
      });
    } catch (err) {
      // La operación ya quedó confirmada en la tienda; el fallo solo retrasa el aviso al portal.
      console.error(`⚠️ No se pudo encolar el aviso de la reserva ${reservaId} (${estado}):`, err.message);
    }
  }
}

module.exports = ReservationEventPublisher;
