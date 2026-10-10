const { ForbiddenException } = require('../../domain/exceptions/DomainExceptions');

const STAFF_ROLES = new Set(['BODEGUERO', 'PERCHERO', 'ADMIN']);

class ReservationController {
  constructor(reservarStockUC, getReservationByCodeUC, confirmReservationUC, cancelReservationUC, getReservationsByUserUC) {
    this.reservarStockUC = reservarStockUC;
    this.getReservationByCodeUC = getReservationByCodeUC;
    this.confirmReservationUC = confirmReservationUC;
    this.cancelReservationUC = cancelReservationUC;
    this.getReservationsByUserUC = getReservationsByUserUC;
  }

  async createReservation(req, res, next) {
    try {
      const reservation = await this.reservarStockUC.execute({
        usuarioId: req.user.id,
        items: req.body.items
      });
      res.status(201).json({
        success: true,
        message: 'Reserva de stock realizada con éxito. Presenta este código en caja SIACI para retirar tu compra.',
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

