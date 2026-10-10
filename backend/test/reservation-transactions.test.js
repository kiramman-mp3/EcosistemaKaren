const test = require('node:test');
const assert = require('node:assert/strict');

const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const {
  ReservarStock,
  ConfirmReservation,
  CancelReservation,
  CleanExpiredReservations
} = require('../src/use-cases/reservations/ReservationUseCases');

const CUSTOMER = { id: 'd8a7b6c5-1111-2222-3333-444455556666', rol: 'CLIENTE' };
const PRODUCT_ID = 'c8a4d2e1-1111-2222-3333-444455556668';
const ACTIVE_HEARTBEAT = { assertReservationsAvailable: () => ({ status: 'ONLINE' }) };

test('agrupa productos repetidos y una cancelación restaura todo el stock', async () => {
  const memory = new InMemoryRepositories();
  const repository = memory.reservationRepository;
  const reserve = new ReservarStock(repository, ACTIVE_HEARTBEAT);
  const cancel = new CancelReservation(repository);
  const lot = memory.lots.find(item => item.productoId === PRODUCT_ID);
  const initialAvailable = lot.cantidadDisponible;

  const reservation = await reserve.execute({
    usuarioId: CUSTOMER.id,
    items: [
      { productoId: PRODUCT_ID, cantidad: 2 },
      { productoId: PRODUCT_ID, cantidad: 3 }
    ]
  });

  assert.equal(reservation.detalles.reduce((sum, item) => sum + item.cantidad, 0), 5);
  assert.equal(lot.cantidadDisponible, initialAvailable - 5);
  await cancel.execute(reservation.id, CUSTOMER);
  assert.equal(lot.cantidadDisponible, initialAvailable);
  assert.equal(reservation.estado, 'CANCELADA');
});

test('solo el propietario o ADMIN puede cancelar', async () => {
  const memory = new InMemoryRepositories();
  const repository = memory.reservationRepository;
  const reservation = await new ReservarStock(repository, ACTIVE_HEARTBEAT).execute({
    usuarioId: CUSTOMER.id,
    items: [{ productoId: PRODUCT_ID, cantidad: 1 }]
  });

  await assert.rejects(
    () => new CancelReservation(repository).execute(reservation.id, { id: 'otro', rol: 'CLIENTE' }),
    error => error.statusCode === 403
  );
});

test('confirmar consume stock reservado sin devolverlo a disponible', async () => {
  const memory = new InMemoryRepositories();
  const repository = memory.reservationRepository;
  const lot = memory.lots.find(item => item.productoId === PRODUCT_ID);
  const initialAvailable = lot.cantidadDisponible;
  const reservation = await new ReservarStock(repository, ACTIVE_HEARTBEAT).execute({
    usuarioId: CUSTOMER.id,
    items: [{ productoId: PRODUCT_ID, cantidad: 2 }]
  });

  await new ConfirmReservation(repository).execute(reservation.id, { id: 'staff-1', rol: 'BODEGUERO' });
  assert.equal(reservation.estado, 'CONFIRMADA');
  assert.equal(lot.cantidadDisponible, initialAvailable - 2);
  assert.equal(lot.cantidadReservada, 0);
});

test('el sweeper expira y libera cada reserva una sola vez', async () => {
  const memory = new InMemoryRepositories();
  const repository = memory.reservationRepository;
  const lot = memory.lots.find(item => item.productoId === PRODUCT_ID);
  const initialAvailable = lot.cantidadDisponible;
  const reservation = await new ReservarStock(repository, ACTIVE_HEARTBEAT).execute({
    usuarioId: CUSTOMER.id,
    items: [{ productoId: PRODUCT_ID, cantidad: 2 }]
  });
  reservation.fechaExpiracion = new Date(Date.now() - 1000);

  const cleaner = new CleanExpiredReservations(repository);
  assert.equal((await cleaner.execute()).countLiberadas, 1);
  assert.equal((await cleaner.execute()).countLiberadas, 0);
  assert.equal(reservation.estado, 'EXPIRADA');
  assert.equal(lot.cantidadDisponible, initialAvailable);
});

test('rechaza crear reservas cuando no existe un heartbeat vigente', async () => {
  const memory = new InMemoryRepositories();
  const blockedHeartbeat = {
    assertReservationsAvailable() {
      const error = new Error('heartbeat vencido');
      error.statusCode = 503;
      throw error;
    }
  };

  await assert.rejects(
    () => new ReservarStock(memory.reservationRepository, blockedHeartbeat).execute({
      usuarioId: CUSTOMER.id,
      items: [{ productoId: PRODUCT_ID, cantidad: 1 }]
    }),
    error => error.statusCode === 503
  );
});
