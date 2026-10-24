const {
  NotFoundException,
  ValidationException,
  OverbookingException,
  ForbiddenException
} = require('../../domain/exceptions/DomainExceptions');
const Reservation = require('../../domain/entities/Reservation');
const { normalizeReservationItems } = require('./ReservationUseCases');

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
      if (error instanceof NotFoundException) return rejectedResult('NOT_FOUND', error.message);
      if (error instanceof ValidationException) return rejectedResult('VALIDATION', error.message);
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
