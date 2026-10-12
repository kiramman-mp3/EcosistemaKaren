const test = require('node:test');
const assert = require('node:assert/strict');
const { applyBusinessTimezone, parseBusinessDate, toDateOnly, daysUntil } = require('../src/domain/policies/BusinessDates');
const Lot = require('../src/domain/entities/Lot');

applyBusinessTimezone({ BUSINESS_TIMEZONE: 'America/Guayaquil' });

test('las fechas AAAA-MM-DD se interpretan como día calendario local', () => {
  const date = parseBusinessDate('2026-10-13');
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 13);
  assert.equal(toDateOnly('2026-10-13'), '2026-10-13');
  assert.equal(parseBusinessDate('2026-02-30'), null);
});

test('los días para vencer usan el día de Ecuador aunque en UTC ya sea mañana', () => {
  // 21:30 en Guayaquil del 12/10 = 02:30 UTC del 13/10.
  const eveningInEcuador = new Date('2026-10-13T02:30:00.000Z');
  assert.equal(daysUntil('2026-10-13', eveningInEcuador), 1);
  assert.equal(daysUntil('2026-10-12', eveningInEcuador), 0);
});

test('el lote publica sus fechas como AAAA-MM-DD', () => {
  const lot = new Lot({
    productoId: 'p1', numeroLote: 'L-1', fechaElaboracion: '2026-10-01',
    fechaCaducidad: '2026-10-20', costoUnitario: 1, cantidadIngresada: 5,
  });
  const json = JSON.parse(JSON.stringify(lot));
  assert.equal(json.fechaCaducidad, '2026-10-20');
  assert.equal(json.fechaElaboracion, '2026-10-01');
  assert.equal(lot.calcularDiasParaVencer(new Date(2026, 9, 18, 23, 59)), 2);
});
