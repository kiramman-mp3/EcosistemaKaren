const ReservationController = require('../../adapters/controllers/ReservationController');
const StoreChannelController = require('../../adapters/controllers/StoreChannelController');
const PostgresPortalReservationRepository = require('../../adapters/repositories/PostgresPortalReservationRepository');
const PortalReservationSweeperWorker = require('../../infrastructure/workers/PortalReservationSweeperWorker');
const {
  RequestReservation,
  ExtendPortalReservation,
  GetPortalReservationByCode,
  GetPortalReservationsByUser,
  CancelPortalReservation,
  ExpireUnacknowledgedReservations,
  DeliverStoreCommands,
  ApplyStoreCommandResult,
  ApplyReservationEvents
} = require('../../use-cases/reservations/PortalReservationUseCases');

// portal-api con base propia (ADR-003): las reservas de los clientes se encolan como comandos
// para la tienda, que es la única autoridad sobre el stock. Devuelve el controlador público de
// reservas, el del canal interno con la tienda y los procesos de fondo.
function wirePortalReservations({ pool, heartbeatMonitor, serviceConfig }) {
  const repository = new PostgresPortalReservationRepository(pool);

  return {
    reservationController: new ReservationController(
      new RequestReservation(repository, heartbeatMonitor, { waitMs: serviceConfig.reservationSyncWaitMs }),
      new GetPortalReservationByCode(repository),
      undefined,
      new CancelPortalReservation(repository),
      new GetPortalReservationsByUser(repository),
      new ExtendPortalReservation(repository, heartbeatMonitor, { waitMs: serviceConfig.reservationSyncWaitMs })
    ),
    storeChannelController: new StoreChannelController(
      new DeliverStoreCommands(repository),
      new ApplyStoreCommandResult(repository),
      new ApplyReservationEvents(repository)
    ),
    workers: [new PortalReservationSweeperWorker(new ExpireUnacknowledgedReservations(repository))]
  };
}

module.exports = wirePortalReservations;
