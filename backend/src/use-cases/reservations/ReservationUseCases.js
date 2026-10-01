const { NotFoundException, ValidationException, OverbookingException } = require('../../domain/exceptions/DomainExceptions');
const Reservation = require('../../domain/entities/Reservation');

class ReservarStock {
  constructor(reservationRepository, lotRepository, productRepository) {
    this.reservationRepository = reservationRepository;
    this.lotRepository = lotRepository;
    this.productRepository = productRepository;
  }

  async execute({ usuarioId, items }) {
    if (!usuarioId) {
      throw new ValidationException('El usuarioId es requerido para realizar la reserva.');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationException('La reserva debe contener al menos un producto (items).');
    }

    // 1. Validar disponibilidad y recopilar lotes asignados por FEFO
    const asignacionesLotes = []; // [{ lot, cantidad, precioUnitario }]

    for (const item of items) {
      const { productoId, cantidad } = item;
      const qtyRequested = parseInt(cantidad, 10);
      if (isNaN(qtyRequested) || qtyRequested <= 0) {
        throw new ValidationException(`Cantidad inválida (${cantidad}) para el producto '${productoId}'.`);
      }

      const product = await this.productRepository.findById(productoId);
      if (!product) {
        throw new NotFoundException(`El producto con ID '${productoId}' no existe.`);
      }

      // Obtener lotes activos ordenados por FEFO (First Expired, First Out)
      const lotesDisponibles = await this.lotRepository.findActiveByProductIdOrderedByExpiration(productoId);
      const totalDisponible = lotesDisponibles.reduce((sum, l) => sum + l.cantidadDisponible, 0);

      if (totalDisponible < qtyRequested) {
        throw new OverbookingException(
          `Stock insuficiente para '${product.nombre}'. Solicitado: ${qtyRequested}, Disponible en tienda: ${totalDisponible}`
        );
      }

      let restantePorAsignar = qtyRequested;
      for (const lot of lotesDisponibles) {
        if (restantePorAsignar <= 0) break;
        if (lot.cantidadDisponible <= 0) continue;

        const cantidadTomada = Math.min(lot.cantidadDisponible, restantePorAsignar);
        lot.reservar(cantidadTomada);
        asignacionesLotes.push({
          lote: lot,
          cantidad: cantidadTomada,
          precioUnitario: product.precioVenta
        });
        restantePorAsignar -= cantidadTomada;
      }
    }

    // 2. Crear cabecera de reserva
    const nuevaReserva = new Reservation({
      usuarioId,
      estado: 'PENDIENTE',
      fechaExpiracion: Reservation.calcularFechaExpiracionDefault(10)
    });

    // 3. Crear detalles de reserva
    nuevaReserva.detalles = asignacionesLotes.map(asig => ({
      loteId: asig.lote.id,
      cantidad: asig.cantidad,
      precioUnitario: asig.precioUnitario
    }));

    // 4. Guardar en repositorio (persiste reserva y actualiza estado de lotes)
    const savedReservation = await this.reservationRepository.saveWithDetails(nuevaReserva, asignacionesLotes.map(a => a.lote));
    return savedReservation;
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
  constructor(reservationRepository, lotRepository) {
    this.reservationRepository = reservationRepository;
    this.lotRepository = lotRepository;
  }

  async execute(reservationId) {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new NotFoundException(`Reserva con ID '${reservationId}' no encontrada.`);
    }

    reservation.confirmar();

    // Confirmar venta en los lotes involucrados
    for (const detalle of reservation.detalles) {
      const lot = await this.lotRepository.findById(detalle.loteId);
      if (lot) {
        lot.confirmarVentaReservada(detalle.cantidad);
        await this.lotRepository.update(lot);
      }
    }

    return await this.reservationRepository.update(reservation);
  }
}

class CleanExpiredReservations {
  constructor(reservationRepository, lotRepository) {
    this.reservationRepository = reservationRepository;
    this.lotRepository = lotRepository;
  }

  async execute() {
    const expiredReservations = await this.reservationRepository.findExpiredPending();
    let countLiberadas = 0;

    for (const reservation of expiredReservations) {
      reservation.marcarExpirada();
      await this.reservationRepository.update(reservation);

      // Devuelve stock reservado a stock libre
      for (const detalle of reservation.detalles) {
        const lot = await this.lotRepository.findById(detalle.loteId);
        if (lot) {
          lot.liberar(detalle.cantidad);
          await this.lotRepository.update(lot);
        }
      }
      countLiberadas++;
    }

    return { countLiberadas };
  }
}

class CancelReservation {
  constructor(reservationRepository, lotRepository) {
    this.reservationRepository = reservationRepository;
    this.lotRepository = lotRepository;
  }

  async execute(reservationId) {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new NotFoundException(`Reserva con ID '${reservationId}' no encontrada.`);
    }

    reservation.cancelar();

    // Liberar stock reservado en los lotes
    for (const detalle of reservation.detalles) {
      const lot = await this.lotRepository.findById(detalle.loteId);
      if (lot) {
        lot.liberar(detalle.cantidad);
        await this.lotRepository.update(lot);
      }
    }

    return await this.reservationRepository.update(reservation);
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
    return await this.reservationRepository.findByUserId(usuarioId);
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

