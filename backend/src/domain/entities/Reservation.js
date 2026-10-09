const { ValidationException } = require('../exceptions/DomainExceptions');
const { RESERVATION_TTL_MINUTES } = require('../policies/BusinessRules');

class Reservation {
  constructor({
    id,
    usuarioId,
    codigoRetiro,
    estado,
    fechaExpiracion,
    created_at,
    updated_at,
    detalles = []
  }) {
    if (!usuarioId) {
      throw new ValidationException('El usuarioId es obligatorio para una reserva.');
    }

    const estadosValidos = ['PENDIENTE', 'CONFIRMADA', 'EXPIRADA', 'CANCELADA'];
    const estadoUpper = estado ? estado.toUpperCase() : 'PENDIENTE';
    if (!estadosValidos.includes(estadoUpper)) {
      throw new ValidationException(`El estado de reserva '${estado}' no es válido.`);
    }

    this.id = id;
    this.usuarioId = usuarioId;
    this.codigoRetiro = codigoRetiro || Reservation.generarCodigoRetiro();
    this.estado = estadoUpper;
    this.fechaExpiracion = fechaExpiracion
      ? new Date(fechaExpiracion)
      : Reservation.calcularFechaExpiracionDefault();
    this.created_at = created_at || new Date();
    this.updated_at = updated_at || new Date();
    this.detalles = detalles;
  }

  static generarCodigoRetiro() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'KR-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static calcularFechaExpiracionDefault(ttlMinutos = RESERVATION_TTL_MINUTES) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + ttlMinutos);
    return date;
  }

  estaExpirada(ahora = new Date()) {
    return this.estado === 'PENDIENTE' && new Date(ahora) > this.fechaExpiracion;
  }

  marcarExpirada() {
    if (this.estado === 'PENDIENTE') {
      this.estado = 'EXPIRADA';
      this.updated_at = new Date();
    }
  }

  confirmar() {
    if (this.estado !== 'PENDIENTE') {
      throw new ValidationException(`No se puede confirmar una reserva en estado ${this.estado}.`);
    }
    this.estado = 'CONFIRMADA';
    this.updated_at = new Date();
  }

  cancelar() {
    if (this.estado === 'CONFIRMADA') {
      throw new ValidationException('No se puede cancelar una reserva ya confirmada.');
    }
    this.estado = 'CANCELADA';
    this.updated_at = new Date();
  }
}

module.exports = Reservation;
