const {
  NotFoundException,
  ValidationException,
  OverbookingException,
  OfferLimitException,
  ForbiddenException
} = require('../../domain/exceptions/DomainExceptions');
const Reservation = require('../../domain/entities/Reservation');
const { RESERVATION_MAX_TOTAL_MINUTES } = require('../../domain/policies/BusinessRules');
const { normalizeReservationItems } = require('./ReservationUseCases');
const { isDatabaseDataError } = require('../../infrastructure/http/middlewares/databaseErrors');

// Lo que el cliente puede ver de cada línea asignada por la tienda.
function toPublicLine(detail) {
  return {
    loteId: detail.loteId,
    cantidad: Number(detail.cantidad),
    precioUnitario: Number(detail.precioUnitario),
    numeroLote: detail.numeroLote,
    productoId: detail.productoId,
    productoNombre: detail.productoNombre,
    codigoBarras: detail.codigoBarras,
    imagenUrl: detail.imagenUrl || null
  };
}

function acceptedResult(reservation) {
  return {
    status: 'ACCEPTED',
    reservation: {
      codigoRetiro: reservation.codigoRetiro,
      fechaExpiracion: new Date(reservation.fechaExpiracion).toISOString(),
      detalles: reservation.detalles.map(toPublicLine)
    }
  };
}

function rejectedResult(reason, message) {
  return { status: 'REJECTED', reason, message };
}

// store-api: ejecuta un comando de reserva que envía portal-api y devuelve el resultado que
// debe informarle. La tienda es la única autoridad sobre el stock: aquí se asignan los lotes
// (FEFO) dentro de una transacción. Es idempotente: si el comando se entrega otra vez porque
// el resultado anterior no llegó, devuelve el mismo resultado sin reservar de nuevo.
class ProcessStoreCommand {
  constructor(reservationRepository, clock = () => new Date()) {
    this.reservationRepository = reservationRepository;
    this.clock = clock;
  }

  async execute(command) {
    if (command.tipo === 'RESERVATION_CREATE') return this._create(command);
    if (command.tipo === 'RESERVATION_CANCEL') return this._cancel(command);
    if (command.tipo === 'RESERVATION_EXTEND') return this._extend(command);
    throw new ValidationException(`Tipo de comando desconocido: ${command.tipo}.`);
  }

  async _create({ reservaId, payload }) {
    const existing = await this.reservationRepository.findById(reservaId);
    if (existing) return acceptedResult(existing);

    const expiresAt = new Date(payload.fechaExpiracion);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= this.clock()) {
      return rejectedResult('EXPIRED', 'La reserva venció antes de que la tienda pudiera atenderla.');
    }

    try {
      const items = normalizeReservationItems(payload.items);
      const created = await this.reservationRepository.createWithLockedStock(
        new Reservation({ usuarioId: payload.clienteId, estado: 'PENDIENTE', fechaExpiracion: expiresAt }),
        items,
        { remote: { id: reservaId, clienteNombre: payload.clienteNombre } }
      );
      // Se vuelve a leer para incluir nombres de producto, número de lote e imagen.
      return acceptedResult(await this.reservationRepository.findById(created.id));
    } catch (error) {
      if (error instanceof OverbookingException) return rejectedResult('OVERBOOKING', error.message);
      if (error instanceof OfferLimitException) return rejectedResult('OFFER_LIMIT', error.message);
      if (error instanceof NotFoundException) return rejectedResult('NOT_FOUND', error.message);
      if (error instanceof ValidationException) return rejectedResult('VALIDATION', error.message);
      // Un dato que la base rechaza (formato, longitud...) nunca se arregla reintentando: se rechaza la
      // reserva en vez de dejar el comando sin respuesta hasta agotar sus reentregas.
      if (isDatabaseDataError(error)) return rejectedResult('VALIDATION', 'Los datos de la reserva no son válidos.');
      throw error;
    }
  }

  // El portal manda el vencimiento de destino (`hasta`): reaplicar el mismo comando no extiende dos veces. El tope total
  // es el de la tienda; lo que diga el portal solo puede ser más estricto.
  async _extend({ reservaId, payload }) {
    try {
      const maxTotalMinutes = Math.min(Number(payload.maxTotalMinutos) || RESERVATION_MAX_TOTAL_MINUTES, RESERVATION_MAX_TOTAL_MINUTES);
      const updated = await this.reservationRepository.extendTimeWithLockedStock(
        reservaId,
        { id: payload.clienteId, rol: 'CLIENTE', remote: true },
        payload.minutosAdicionales,
        { until: payload.hasta, maxTotalMinutes }
      );
      return { status: 'EXTENDED', fechaExpiracion: new Date(updated.fechaExpiracion).toISOString() };
    } catch (error) {
      if (error instanceof NotFoundException) return rejectedResult('NOT_FOUND', error.message);
      if (error instanceof ValidationException || error instanceof ForbiddenException) return rejectedResult('VALIDATION', error.message);
      if (isDatabaseDataError(error)) return rejectedResult('VALIDATION', 'Los datos de la extensión no son válidos.');
      throw error;
    }
  }

  async _cancel({ reservaId, payload }) {
    try {
      await this.reservationRepository.cancelWithLockedStock(
        reservaId,
        { id: payload.clienteId, rol: 'CLIENTE', remote: true }
      );
      return { status: 'APPLIED', estado: 'CANCELADA' };
    } catch (error) {
      if (error instanceof NotFoundException) return { status: 'IGNORED', estado: 'DESCONOCIDA' };
      if (error instanceof ValidationException || error instanceof ForbiddenException) {
        // Ya estaba confirmada, expirada o cancelada: se informa el estado real.
        const current = await this.reservationRepository.findById(reservaId);
        const known = ['CANCELADA', 'CONFIRMADA', 'EXPIRADA'];
        return { status: 'IGNORED', estado: current && known.includes(current.estado) ? current.estado : 'DESCONOCIDA' };
      }
      throw error;
    }
  }
}

module.exports = { ProcessStoreCommand };
