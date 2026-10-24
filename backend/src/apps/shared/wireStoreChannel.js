const PostgresOutbox = require('../../infrastructure/outbox/PostgresOutbox');
const HttpPortalChannel = require('../../infrastructure/outbox/HttpPortalChannel');
const ReservationEventPublisher = require('../../infrastructure/outbox/ReservationEventPublisher');
const OutboxFlusherWorker = require('../../infrastructure/workers/OutboxFlusherWorker');
const CommandPollerWorker = require('../../infrastructure/workers/CommandPollerWorker');
const { ProcessStoreCommand } = require('../../use-cases/reservations/StoreCommandUseCases');

// store-api separada del portal (ADR-003): atiende las reservas que el portal le encarga. Pide
// los comandos con long-poll, los ejecuta sobre la base de la tienda y deja el resultado, junto
// con los cambios de estado posteriores, en la bandeja de salida que se vacía hacia el portal.
function wireStoreChannel({ pool, reservationRepo, serviceConfig }) {
  const outbox = new PostgresOutbox(pool);
  const channel = new HttpPortalChannel({ baseUrl: serviceConfig.portalUrl, apiKey: serviceConfig.storeServiceKey });
  const flusher = new OutboxFlusherWorker({ outbox, channel });
  const poller = new CommandPollerWorker({
    channel,
    processor: new ProcessStoreCommand(reservationRepo),
    outbox,
    // El cliente espera la respuesta de su reserva: el resultado sale sin aguardar al siguiente ciclo.
    onResultsQueued: () => flusher.flush(),
    waitSeconds: serviceConfig.reservationPollWaitSeconds
  });

  return {
    outbox,
    eventPublisher: new ReservationEventPublisher(outbox),
    workers: [flusher, poller]
  };
}

module.exports = wireStoreChannel;
