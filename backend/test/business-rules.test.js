const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RESERVATION_TTL_MINUTES,
  classifyExpiryDays
} = require('../src/domain/policies/BusinessRules');
const Reservation = require('../src/domain/entities/Reservation');

test('la política aprobada usa un TTL de 10 minutos', () => {
  assert.equal(RESERVATION_TTL_MINUTES, 10);

  const start = Date.now();
  const expiration = Reservation.calcularFechaExpiracionDefault();
  const elapsedMinutes = (expiration.getTime() - start) / 60000;

  assert.ok(elapsedMinutes >= 9.99 && elapsedMinutes <= 10.01);
});

test('clasifica los límites de caducidad de forma inequívoca', () => {
  assert.equal(classifyExpiryDays(-1), 'VENCIDO');
  assert.equal(classifyExpiryDays(0), 'VENCIDO');
  assert.equal(classifyExpiryDays(1), 'ROJO');
  assert.equal(classifyExpiryDays(6), 'ROJO');
  assert.equal(classifyExpiryDays(7), 'AMARILLO');
  assert.equal(classifyExpiryDays(14), 'AMARILLO');
  assert.equal(classifyExpiryDays(15), 'NORMAL');
  assert.equal(classifyExpiryDays(30), 'NORMAL');
});
