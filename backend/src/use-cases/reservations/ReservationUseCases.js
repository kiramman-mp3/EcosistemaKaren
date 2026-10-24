const { NotFoundException, ValidationException, ForbiddenException } = require('../../domain/exceptions/DomainExceptions');
const Reservation = require('../../domain/entities/Reservation');
const { RESERVATION_TTL_MINUTES } = require('../../domain/policies/BusinessRules');

// Valida y normaliza las líneas de una reserva: agrupa productos repetidos y las ordena para que
// todas las transacciones adquieran los bloqueos en el mismo orden.
function normalizeReservationItems(items) {
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
    const key = `${item.productoId}::${item.promocionId || ''}`;
    const current = quantitiesByProduct.get(key);
    quantitiesByProduct.set(key, {
      productoId: item.productoId,
      promocionId: item.promocionId,
      cantidad: (current?.cantidad || 0) + quantity
    });
  }

  return [...quantitiesByProduct.values()]
    .sort((a, b) => `${a.productoId}:${a.promocionId || ''}`.localeCompare(`${b.productoId}:${b.promocionId || ''}`));
}

class ReservarStock {
  constructor(reservationRepository, heartbeatMonitor) {
    this.reservationRepository = reservationRepository;
    this.heartbeatMonitor = heartbeatMonitor;
  }

  async execute({ usuarioId, items }) {
    if (!usuarioId) {
      throw new ValidationException('El usuario autenticado es requerido para realizar la reserva.');
    }
    const normalizedItems = normalizeReservationItems(items);

    // La reserva no puede comenzar si la tienda no ha reportado conectividad
    // recientemente. Se comprueba justo antes de abrir la transacción de stock.
    await this.heartbeatMonitor.assertReservationsAvailable();

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
  // `eventPublisher` (opcional) avisa al portal los cambios de estado cuando la tienda va separada.
  constructor(reservationRepository, eventPublisher = null) {
    this.reservationRepository = reservationRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute(reservationId, actor) {
    if (!actor || !['BODEGUERO', 'ADMIN'].includes(actor.rol)) {
      throw new ForbiddenException('Solo BODEGUERO o ADMIN puede confirmar ventas reservadas.');
    }
    let reservation;
    try {
      reservation = await this.reservationRepository.confirmWithLockedStock(reservationId, actor);
    } catch (error) {
      // Confirmar una reserva vencida la deja EXPIRADA con su stock liberado: el portal debe saberlo.
      if (this.eventPublisher) {
        const current = await this.reservationRepository.findById(reservationId).catch(() => null);
        if (current?.estado === 'EXPIRADA') {
          await this.eventPublisher.publishStateChange({ reservaId: reservationId, estado: 'EXPIRADA' });
        }
      }
      throw error;
    }
    await this.eventPublisher?.publishStateChange({ reservaId: reservationId, estado: 'CONFIRMADA' });
    return reservation;
  }
}

class CleanExpiredReservations {
  constructor(reservationRepository, eventPublisher = null) {
    this.reservationRepository = reservationRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute() {
    const result = await this.reservationRepository.expirePendingWithLockedStock();
    if (this.eventPublisher) {
      for (const reservaId of result.reservaIds || []) {
        await this.eventPublisher.publishStateChange({ reservaId, estado: 'EXPIRADA' });
      }
    }
    return result;
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

  async execute(usuarioId, pagination = {}) {
    if (!usuarioId) {
      throw new ValidationException('El usuarioId es requerido.');
    }
    return this.reservationRepository.findByUserId(usuarioId, pagination);
  }
}

module.exports = {
  normalizeReservationItems,
  ReservarStock,
  GetReservationByCode,
  ConfirmReservation,
  CleanExpiredReservations,
  CancelReservation,
  GetReservationsByUser
};
