const { ForbiddenException } = require('../../domain/exceptions/DomainExceptions');

const STAFF_ROLES = new Set(['BODEGUERO', 'PERCHERO', 'ADMIN']);

class ReservationController {
  constructor(reservarStockUC, getReservationByCodeUC, confirmReservationUC, cancelReservationUC, getReservationsByUserUC, extendReservationUC) {
    this.reservarStockUC = reservarStockUC;
    this.getReservationByCodeUC = getReservationByCodeUC;
    this.confirmReservationUC = confirmReservationUC;
    this.cancelReservationUC = cancelReservationUC;
    this.getReservationsByUserUC = getReservationsByUserUC;
    this.extendReservationUC = extendReservationUC;
  }

  async createReservation(req, res, next) {
    try {
      const reservation = await this.reservarStockUC.execute({
        usuarioId: req.user.id,
        items: req.body.items,
        ttlMinutos: req.body.ttlMinutos
      });
      // Con portal y tienda separados, la tienda puede tardar en responder: 202 y el cliente consulta después.
      const awaitingStore = reservation.estado === 'PENDIENTE_SYNC';
      res.status(awaitingStore ? 202 : 201).json({
        success: true,
        message: awaitingStore
          ? 'Reserva recibida. La tienda la está confirmando; consulta su estado en unos segundos.'
          : 'Reserva de stock realizada con éxito. Presenta este código en caja SIACI para retirar tu compra.',
        data: {
          id: reservation.id,
          codigoRetiro: reservation.codigoRetiro,
          estado: reservation.estado,
          fechaExpiracion: reservation.fechaExpiracion,
          detalles: reservation.detalles
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async consultByCode(req, res, next) {
    try {
      const { code } = req.params;
      const reservation = await this.getReservationByCodeUC.execute(code);
      res.json({
        success: true,
        data: {
          id: reservation.id,
          codigoRetiro: reservation.codigoRetiro,
          estado: reservation.estado,
          fechaExpiracion: reservation.fechaExpiracion,
          clienteNombre: reservation.clienteNombre || 'Cliente',
          detalles: reservation.detalles,
          total: reservation.detalles?.reduce((acc, d) => acc + Number(d.precioUnitario) * d.cantidad, 0) || 0,
          created_at: reservation.created_at,
          updated_at: reservation.updated_at
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async extend(req, res, next) {
    try {
      const { id } = req.params;
      const minutos = req.body?.minutosAdicionales || 30;
      if (!this.extendReservationUC) {
        return res.status(501).json({ success: false, message: 'Operación no implementada.' });
      }
      const reservation = await this.extendReservationUC.execute(id, req.user, minutos);
      res.json({
        success: true,
        message: `Tiempo de reserva extendido en ${minutos} minutos.`,
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  }

  async getByCode(req, res, next) {
    try {
      const { code } = req.params;
      const reservation = await this.getReservationByCodeUC.execute(code);
      if (!STAFF_ROLES.has(req.user.rol) && reservation.usuarioId !== req.user.id) {
        throw new ForbiddenException('No puede consultar una reserva perteneciente a otro usuario.');
      }
      res.json({
        success: true,
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  }

  async confirm(req, res, next) {
    try {
      const { id } = req.params;
      const reservation = await this.confirmReservationUC.execute(id, req.user);
      res.json({
        success: true,
        message: 'Reserva confirmada y cobrada en caja SIACI.',
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      if (!this.cancelReservationUC) {
        return res.status(501).json({ success: false, message: 'Operación no implementada.' });
      }
      const reservation = await this.cancelReservationUC.execute(id, req.user);
      res.json({
        success: true,
        message: 'Reserva cancelada exitosamente y stock liberado.',
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  }

  async getByUser(req, res, next) {
    try {
      const { userId } = req.params;
      if (!STAFF_ROLES.has(req.user.rol) && req.user.id !== userId) {
        throw new ForbiddenException('No puede consultar las reservas de otro usuario.');
      }
      if (!this.getReservationsByUserUC) {
        return res.json({ success: true, data: [] });
      }
      const reservations = await this.getReservationsByUserUC.execute(userId, req.query);
      res.json({
        success: true,
        pagination: {
          limit: req.query.limit,
          offset: req.query.offset,
          returned: reservations.length
        },
        data: reservations
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReservationController;

