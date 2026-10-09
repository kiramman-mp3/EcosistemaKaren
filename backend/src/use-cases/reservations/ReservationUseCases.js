const { NotFoundException, ValidationException, ForbiddenException } = require('../../domain/exceptions/DomainExceptions');
const Reservation = require('../../domain/entities/Reservation');
const { RESERVATION_TTL_MINUTES } = require('../../domain/policies/BusinessRules');

class ReservarStock {
  constructor(reservationRepository, heartbeatMonitor) {
    this.reservationRepository = reservationRepository;
    this.heartbeatMonitor = heartbeatMonitor;
  }

  async execute({ usuarioId, items }) {
    if (!usuarioId) {
      throw new ValidationException('El usuario autenticado es requerido para realizar la reserva.');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationException('La reserva debe contener al menos un producto.');
    }

    // Agrupar productos repetidos y ordenar los bloqueos evita asignaciones dobles
    // dentro de la misma solicitud y reduce el riesgo de deadlocks concurrentes.
    const quantitiesByProduct = new Map();
    for (const item of items) {
      if (!item || !item.productoId) {
        throw new ValidationException('Cada item debe incluir productoId.');
      }
      const quantity = Number(item.cantidad);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new ValidationException(
          `Cantidad inválida (${item.cantidad}) para el producto '${item.productoId}'.`
        );
      }
      quantitiesByProduct.set(
        item.productoId,
        (quantitiesByProduct.get(item.productoId) || 0) + quantity
      );
    }

    const normalizedItems = [...quantitiesByProduct.entries()]
      .map(([productoId, cantidad]) => ({ productoId, cantidad }))
      .sort((a, b) => a.productoId.localeCompare(b.productoId));

    // La reserva no puede comenzar si la tienda no ha reportado conectividad
    // recientemente. Se comprueba justo antes de abrir la transacción de stock.
    this.heartbeatMonitor.assertReservationsAvailable();

    const reservation = new Reservation({
      usuarioId,
      estado: 'PENDIENTE',
      fechaExpiracion: Reservation.calcularFechaExpiracionDefault(RESERVATION_TTL_MINUTES)
    });

    return this.reservationRepository.createWithLockedStock(reservation, normalizedItems);
  }
}

class GetReservationByCode {
  constructor(reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  async execute(codigoRetiro) {
    const reservation = await this.reservationRepository.findByCode(codigoRetiro);
    if (!reservation) {
      throw new NotFoundException(`Reserva con código '${codigoRetiro}' no encontrada.`);
    }
    return reservation;
  }
}

class ConfirmReservation {
  constructor(reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  async execute(reservationId, actor) {
    if (!actor || !['BODEGUERO', 'ADMIN'].includes(actor.rol)) {
      throw new ForbiddenException('Solo BODEGUERO o ADMIN puede confirmar ventas reservadas.');
    }
    return this.reservationRepository.confirmWithLockedStock(reservationId, actor);
  }
}

class CleanExpiredReservations {
  constructor(reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  async execute() {
    return this.reservationRepository.expirePendingWithLockedStock();
  }
}

class CancelReservation {
  constructor(reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  async execute(reservationId, actor) {
    if (!actor || !actor.id || !actor.rol) {
      throw new ValidationException('La identidad del usuario es requerida para cancelar.');
    }
    return this.reservationRepository.cancelWithLockedStock(reservationId, actor);
  }
}

class GetReservationsByUser {
  constructor(reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  async execute(usuarioId) {
    if (!usuarioId) {
      throw new ValidationException('El usuarioId es requerido.');
    }
    return this.reservationRepository.findByUserId(usuarioId);
  }
}

module.exports = {
  ReservarStock,
  GetReservationByCode,
  ConfirmReservation,
  CleanExpiredReservations,
  CancelReservation,
  GetReservationsByUser
};
