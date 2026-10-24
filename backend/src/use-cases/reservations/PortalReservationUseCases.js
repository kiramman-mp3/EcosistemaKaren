const {
  NotFoundException,
  ValidationException,
  OverbookingException,
  ServiceUnavailableException
} = require('../../domain/exceptions/DomainExceptions');
const Reservation = require('../../domain/entities/Reservation');
const { RESERVATION_TTL_MINUTES } = require('../../domain/policies/BusinessRules');
const { normalizeReservationItems } = require('./ReservationUseCases');

const defaultSleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Traduce el rechazo de la tienda al error que ya entienden las apps de los clientes.
function rejectionToException(reservation) {
  const message = reservation.mensajeRechazo || 'La tienda no pudo reservar los productos solicitados.';
  switch (reservation.motivoRechazo) {
    case 'OVERBOOKING': return new OverbookingException(message);
    case 'NOT_FOUND': return new NotFoundException(message);
    case 'STORE_ERROR': return new ServiceUnavailableException(message);
    default: return new ValidationException(message);
  }
}

// portal-api: recibe la reserva del cliente y se la encarga a la tienda (ADR-003). Espera unos
// segundos la respuesta para que el cliente vea el resultado final en la misma llamada; si la
// tienda tarda más, devuelve la reserva en PENDIENTE_SYNC y el cliente la consulta después.
class RequestReservation {
  constructor(portalReservationRepository, heartbeatMonitor, options = {}) {
    this.portalReservationRepository = portalReservationRepository;
    this.heartbeatMonitor = heartbeatMonitor;
    this.waitMs = options.waitMs ?? 8000;
    this.pollMs = options.pollMs ?? 200;
    this.sleep = options.sleep || defaultSleep;
    this.clock = options.clock || (() => Date.now());
  }

  async execute({ usuarioId, items }) {
    if (!usuarioId) {
      throw new ValidationException('El usuario autenticado es requerido para realizar la reserva.');
    }
    const normalizedItems = normalizeReservationItems(items);

    // Sin latido vigente de la tienda no se aceptan reservas nuevas.
    await this.heartbeatMonitor.assertReservationsAvailable();

    let reservation = await this.portalReservationRepository.createPending({
      clienteId: usuarioId,
      fechaExpiracion: Reservation.calcularFechaExpiracionDefault(RESERVATION_TTL_MINUTES),
      items: normalizedItems
    });

    const deadline = this.clock() + this.waitMs;
    while (reservation.estado === 'PENDIENTE_SYNC' && this.clock() < deadline) {
      await this.sleep(this.pollMs);
      reservation = (await this.portalReservationRepository.findById(reservation.id)) || reservation;
    }

    if (reservation.estado === 'RECHAZADA') throw rejectionToException(reservation);
    return reservation;
  }
}

class GetPortalReservationByCode {
  constructor(portalReservationRepository) {
    this.portalReservationRepository = portalReservationRepository;
  }

  async execute(codigoRetiro) {
    const reservation = await this.portalReservationRepository.findByCode(codigoRetiro);
    if (!reservation) {
      throw new NotFoundException(`Reserva con código '${codigoRetiro}' no encontrada.`);
    }
    return reservation;
  }
}

class GetPortalReservationsByUser {
  constructor(portalReservationRepository) {
    this.portalReservationRepository = portalReservationRepository;
  }

  async execute(usuarioId, pagination = {}) {
    if (!usuarioId) {
      throw new ValidationException('El usuarioId es requerido.');
    }
    return this.portalReservationRepository.findByUserId(usuarioId, pagination);
  }
}

class CancelPortalReservation {
  constructor(portalReservationRepository) {
    this.portalReservationRepository = portalReservationRepository;
  }

  async execute(reservationId, actor) {
    if (!actor || !actor.id || !actor.rol) {
      throw new ValidationException('La identidad del usuario es requerida para cancelar.');
    }
    return this.portalReservationRepository.cancelByClient(reservationId, actor);
  }
}

// Reservas que la tienda nunca aceptó y cuyo plazo venció.
class ExpireUnacknowledgedReservations {
  constructor(portalReservationRepository) {
    this.portalReservationRepository = portalReservationRepository;
  }

  async execute() {
    const ids = await this.portalReservationRepository.expireUnacknowledged();
    return { countExpiradas: ids.length };
  }
}

// Canal interno: la tienda pide comandos con long-poll, informa resultados y cambios de estado.
class DeliverStoreCommands {
  constructor(portalReservationRepository, options = {}) {
    this.portalReservationRepository = portalReservationRepository;
    this.pollMs = options.pollMs ?? 500;
    this.sleep = options.sleep || defaultSleep;
    this.clock = options.clock || (() => Date.now());
    this.visibilityMs = options.visibilityMs ?? 60000;
    this.maxAttempts = options.maxAttempts ?? 5;
  }

  async execute({ waitSeconds = 0, limit = 20, signal } = {}) {
    const deadline = this.clock() + waitSeconds * 1000;
    for (;;) {
      const commands = await this.portalReservationRepository.claimCommands({
        limit, visibilityMs: this.visibilityMs, maxAttempts: this.maxAttempts
      });
      if (commands.length > 0 || this.clock() >= deadline || signal?.aborted) return commands;
      await this.sleep(this.pollMs);
      if (signal?.aborted) return [];
    }
  }
}

class ApplyStoreCommandResult {
  constructor(portalReservationRepository) {
    this.portalReservationRepository = portalReservationRepository;
  }

  async execute(commandId, result) {
    return this.portalReservationRepository.resolveCommand(commandId, result);
  }
}

class ApplyReservationEvents {
  constructor(portalReservationRepository) {
    this.portalReservationRepository = portalReservationRepository;
  }

  async execute(events) {
    return this.portalReservationRepository.applyStoreStates(events);
  }
}

module.exports = {
  RequestReservation,
  GetPortalReservationByCode,
  GetPortalReservationsByUser,
  CancelPortalReservation,
  ExpireUnacknowledgedReservations,
  DeliverStoreCommands,
  ApplyStoreCommandResult,
  ApplyReservationEvents
};
