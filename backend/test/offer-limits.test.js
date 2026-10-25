const test = require('node:test');
const assert = require('node:assert/strict');

const Promotion = require('../src/domain/entities/Promotion');
const Reservation = require('../src/domain/entities/Reservation');
const InMemoryRepositories = require('../src/adapters/repositories/InMemoryRepositories');
const { assertOfferTerms, offerLimitViolation } = require('../src/domain/policies/PromotionPolicy');
const { ManagePromotions } = require('../src/use-cases/promotions/PromotionUseCases');
const { ProcessStoreCommand } = require('../src/use-cases/reservations/StoreCommandUseCases');
const { RequestReservation } = require('../src/use-cases/reservations/PortalReservationUseCases');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const { OfferLimitException, ValidationException } = require('../src/domain/exceptions/DomainExceptions');

const admin = { id: 'admin-test', rol: 'ADMIN' };
const base = {
  loteId: 'lote-1', descuentoPorcentaje: 20, frasePromocional: 'Oferta', razonIa: 'Lote por vencer'
};
const HOUR = 3600 * 1000;

test('la promoción valida sus límites: enteros positivos y el límite por pedido no pasa el stock de oferta', () => {
  const sinTopes = new Promotion(base);
  assert.deepEqual([sinTopes.limitePorPedido, sinTopes.stockOferta, sinTopes.vigenteHasta], [null, null, null]);

  const until = new Date(Date.now() + HOUR).toISOString();
  const conTopes = new Promotion({ ...base, limitePorPedido: '2', stockOferta: 3, vigenteHasta: until });
  assert.equal(conTopes.limitePorPedido, 2);
  assert.equal(conTopes.toPublicDTO().vigenteHasta, until);
  assert.equal(conTopes.toPublicDTO().stockOferta, 3);

  assert.throws(() => new Promotion({ ...base, limitePorPedido: 4, stockOferta: 3 }), /no puede superar el stock/);
  assert.throws(() => new Promotion({ ...base, limitePorPedido: 1.5 }), /entero/);
  assert.throws(() => new Promotion({ ...base, stockOferta: 0 }), /entero/);
  assert.throws(() => new Promotion({ ...base, vigenteHasta: 'mañana' }), /no es válida/);
});

test('las reglas de la línea: vigencia, límite por pedido y unidades de oferta que quedan', () => {
  const now = new Date('2026-10-25T12:00:00Z');
  const offer = { limitePorPedido: 2, stockOferta: 3, vigenteHasta: '2026-10-25T18:00:00Z' };
  assert.equal(offerLimitViolation(offer, 2, 0, now), null);
  assert.match(offerLimitViolation(offer, 3, 0, now), /hasta 2 unidad/);
  assert.match(offerLimitViolation(offer, 2, 2, now), /Solo quedan 1/);
  assert.match(offerLimitViolation(offer, 1, 3, now), /agotaron/);
  assert.match(offerLimitViolation(offer, 1, 0, new Date('2026-10-25T18:00:00Z')), /terminó/);
  assert.equal(offerLimitViolation({}, 500, 10_000, now), null, 'sin topes vale todo el lote');
});

test('el ADMIN no puede prometer más unidades de las que tiene el lote ni una hora de fin pasada', () => {
  const lot = { cantidadDisponible: 10 };
  assert.doesNotThrow(() => assertOfferTerms({ stockOferta: 10 }, lot));
  assert.throws(() => assertOfferTerms({ stockOferta: 11 }, lot), /no puede superar las 10 unidades/);
  assert.throws(() => assertOfferTerms({ vigenteHasta: new Date(Date.now() - 1000) }, lot), /debe ser futura/);
  assert.doesNotThrow(() => assertOfferTerms({ stockOferta: null, vigenteHasta: null }, lot));
});

test('la API del borrador acepta los tres límites opcionales y null los quita', () => {
  const ok = schemas.promotionUpdateBody.safeParse({
    descuentoPorcentaje: 20, frasePromocional: 'Oferta del día',
    limitePorPedido: 2, stockOferta: 3, vigenteHasta: '2026-10-26T20:00:00-05:00'
  });
  assert.ok(ok.success);
  assert.ok(schemas.promotionUpdateBody.safeParse({ descuentoPorcentaje: 20, frasePromocional: 'Oferta', stockOferta: null }).success);
  assert.ok(!schemas.promotionUpdateBody.safeParse({ descuentoPorcentaje: 20, frasePromocional: 'Oferta', limitePorPedido: 5, stockOferta: 3 }).success);
  assert.ok(!schemas.promotionUpdateBody.safeParse({ descuentoPorcentaje: 20, frasePromocional: 'Oferta', vigenteHasta: '2026-10-26' }).success);
  assert.ok(!schemas.promotionUpdateBody.safeParse({ descuentoPorcentaje: 20, frasePromocional: 'Oferta', limitePorPedido: 0 }).success);
});

test('editar el borrador guarda los límites y rechaza un stock de oferta mayor que el lote', async () => {
  const memory = new InMemoryRepositories();
  const manager = new ManagePromotions(memory.promotionRepository, memory.lotRepository);
  const lot = memory.lots.find(item => item.cantidadDisponible >= 3);
  const draft = await memory.promotionRepository.savePending({
    loteId: lot.id, descuentoPorcentaje: 15, frasePromocional: 'Frase', razonIa: 'Razón',
    modeloIa: 'test', promptVersion: 'v1', cacheKey: 'limits-test', cacheHit: false
  });
  const until = new Date(Date.now() + 5 * HOUR).toISOString();

  const updated = await manager.update({
    promotionId: draft.id, descuentoPorcentaje: 15, frasePromocional: 'Frase',
    limitePorPedido: 1, stockOferta: 3, vigenteHasta: until
  }, admin);
  assert.deepEqual([updated.limitePorPedido, updated.stockOferta], [1, 3]);
  assert.equal(new Date(updated.vigenteHasta).toISOString(), until);

  await assert.rejects(() => manager.update({
    promotionId: draft.id, descuentoPorcentaje: 15, frasePromocional: 'Frase', stockOferta: lot.cantidadDisponible + 1
  }, admin), ValidationException);
  await assert.rejects(() => manager.update({ promotionId: draft.id, descuentoPorcentaje: 15, frasePromocional: 'Frase' },
    { id: 'b', rol: 'BODEGUERO' }), /Solo un administrador/);
});

test('en memoria: la reserva respeta el límite y el stock de oferta, y una cancelación devuelve las unidades', async () => {
  const memory = new InMemoryRepositories();
  const offer = memory.promotions.find(item => item.estado === 'APROBADA' && item.activa);
  const lot = memory.lots.find(item => item.id === offer.loteId);
  lot.cantidadDisponible = Math.max(lot.cantidadDisponible, 10);
  offer.limitePorPedido = 2;
  offer.stockOferta = 3;
  const repo = memory.reservationRepository;
  const reserve = (cantidad) => repo.createWithLockedStock(
    new Reservation({ usuarioId: 'cliente', fechaExpiracion: Reservation.calcularFechaExpiracionDefault(30) }),
    [{ productoId: lot.productoId, promocionId: offer.id, cantidad }]
  );

  await assert.rejects(() => reserve(3), OfferLimitException);
  const first = await reserve(2);
  assert.equal(first.detalles[0].promocionId, offer.id);
  await assert.rejects(() => reserve(2), /Solo quedan 1/);
  assert.equal((await memory.promotionRepository.findAllApproved()).find(item => item.id === offer.id).unidadesRestantes, 1);
  await reserve(1);
  assert.equal((await memory.promotionRepository.findAllApproved()).some(item => item.id === offer.id), false, 'agotada: sale del catálogo');

  await repo.cancelWithLockedStock(first.id, { id: 'cliente', rol: 'CLIENTE' });
  assert.equal((await memory.promotionRepository.findAllApproved()).find(item => item.id === offer.id).unidadesRestantes, 2);

  offer.vigenteHasta = new Date(Date.now() - 1000);
  await assert.rejects(() => reserve(1), /terminó/);
  assert.equal((await memory.promotionRepository.findAllApproved()).some(item => item.id === offer.id), false, 'vencida: sale del catálogo');
});

test('la tienda informa OFFER_LIMIT y el portal lo traduce al mismo error para el cliente', async () => {
  const repo = {
    findById: async () => null,
    createWithLockedStock: async () => { throw new OfferLimitException('Esta oferta admite hasta 2 unidad(es) por pedido.'); }
  };
  const result = await new ProcessStoreCommand(repo).execute({
    tipo: 'RESERVATION_CREATE', reservaId: '00000000-0000-4000-8000-000000000001',
    payload: { clienteId: 'c', fechaExpiracion: new Date(Date.now() + HOUR).toISOString(), items: [{ productoId: 'p', cantidad: 3, promocionId: 'o' }] }
  });
  assert.deepEqual(result, { status: 'REJECTED', reason: 'OFFER_LIMIT', message: 'Esta oferta admite hasta 2 unidad(es) por pedido.' });
  assert.ok(schemas.storeCommandResultBody.safeParse(result).success);

  const portalRepo = {
    createPending: async () => ({ id: 'r', estado: 'RECHAZADA', motivoRechazo: 'OFFER_LIMIT', mensajeRechazo: result.message })
  };
  const request = new RequestReservation(portalRepo, { assertReservationsAvailable: async () => {} });
  await assert.rejects(
    () => request.execute({ usuarioId: 'c', items: [{ productoId: 'p', cantidad: 3, promocionId: 'o' }] }),
    (error) => error instanceof OfferLimitException && error.statusCode === 409 && /hasta 2/.test(error.message)
  );
});
