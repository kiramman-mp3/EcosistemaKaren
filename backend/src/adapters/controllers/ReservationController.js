class ReservationController {
  constructor(reservarStockUC, getReservationByCodeUC, confirmReservationUC) {
    this.reservarStockUC = reservarStockUC;
    this.getReservationByCodeUC = getReservationByCodeUC;
    this.confirmReservationUC = confirmReservationUC;
  }

  async createReservation(req, res, next) {
    try {
      const reservation = await this.reservarStockUC.execute(req.body);
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
      const reservation = await this.confirmReservationUC.execute(id);
      res.json({
        success: true,
        message: 'Reserva confirmada y cobrada en caja SIACI.',
        data: reservation
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReservationController;
