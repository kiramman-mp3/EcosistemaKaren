// Canal interno portal-api <-> store-api para las reservas (ADR-003): la tienda pide comandos
// con long-poll, informa el resultado de cada uno y avisa los cambios de estado.
class StoreChannelController {
  constructor(deliverStoreCommandsUC, applyStoreCommandResultUC, applyReservationEventsUC) {
    this.deliverStoreCommandsUC = deliverStoreCommandsUC;
    this.applyStoreCommandResultUC = applyStoreCommandResultUC;
    this.applyReservationEventsUC = applyReservationEventsUC;
  }

  async getCommands(req, res, next) {
    try {
      // Si la tienda corta la conexión mientras espera, se deja de consultar la base.
      const abort = new AbortController();
      res.on('close', () => abort.abort());
      const commands = await this.deliverStoreCommandsUC.execute({
        waitSeconds: req.query.wait, limit: req.query.limit, signal: abort.signal
      });
      if (!res.writableEnded && !abort.signal.aborted) res.json({ success: true, commands });
    } catch (err) {
      next(err);
    }
  }

  async postResult(req, res, next) {
    try {
      const result = await this.applyStoreCommandResultUC.execute(req.params.id, req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async postEvents(req, res, next) {
    try {
      const result = await this.applyReservationEventsUC.execute(req.body.events);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = StoreChannelController;
