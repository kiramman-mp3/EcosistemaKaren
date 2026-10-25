const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const errorHandler = require('../src/infrastructure/http/middlewares/errorHandler');
const { mapDatabaseError, isDatabaseDataError } = require('../src/infrastructure/http/middlewares/databaseErrors');
const { ProcessStoreCommand } = require('../src/use-cases/reservations/StoreCommandUseCases');
const Reservation = require('../src/domain/entities/Reservation');
const { PostgresReservationRepository } = require('../src/adapters/repositories/PostgresRepositories');

const UUID = '00000000-0000-4000-8000-000000000001';
const pgError = (code, extra = {}) => Object.assign(new Error(`pg ${code}`), { code, ...extra });

// ─── errores de base de datos → 4xx ────────────────────────────────────────────────────────────
test('los errores de datos de PostgreSQL se traducen a 4xx y los demás no', () => {
  assert.equal(mapDatabaseError(pgError('23505')).status, 409);
  assert.equal(mapDatabaseError(pgError('23503')).status, 409);
  for (const code of ['22P02', '22001', '22003', '22007', '23502', '23514']) {
    assert.equal(mapDatabaseError(pgError(code)).status, 400, code);
  }
  assert.equal(mapDatabaseError(pgError('22999')).status, 400, 'cualquier otro error de la clase 22 es de datos');
  for (const code of ['08006', '40001', '57P01', '53300', 'ECONNREFUSED']) {
    assert.equal(mapDatabaseError(pgError(code)), null, `${code} es un fallo del servidor`);
  }
  assert.equal(mapDatabaseError(new Error('sin código')), null);
  assert.equal(isDatabaseDataError(pgError('23505')), true);
  assert.equal(isDatabaseDataError(pgError('08006')), false);
});

test('el mensaje de un duplicado nombra el dato sin revelar la tabla ni el valor', () => {
  const email = mapDatabaseError(pgError('23505', { constraint: 'usuarios_email_key', detail: 'Key (email)=(ana@x.co) already exists.' }));
  assert.equal(email.message, 'El correo electrónico ya está registrado.');
  const barcode = mapDatabaseError(pgError('23505', { constraint: 'productos_codigo_barras_key' }));
  assert.match(barcode.message, /código de barras/);
  const unknown = mapDatabaseError(pgError('23505', { constraint: 'otra_restriccion', detail: 'Key (x)=(secreto)' }));
  assert.equal(unknown.message, 'El registro ya existe.');
  for (const mapped of [email, barcode, unknown, mapDatabaseError(pgError('22P02'))]) {
    assert.ok(!/ana@x\.co|secreto|usuarios|productos|uuid/i.test(mapped.message), mapped.message);
  }
});

test('el manejador de errores responde 409 y 400 en vez de 500 ante errores de datos de la base', async () => {
  const app = express();
  app.get('/duplicado', (req, res, next) => next(pgError('23505', { constraint: 'usuarios_email_key' })));
  app.get('/formato', (req, res, next) => next(pgError('22P02')));
  app.get('/caida', (req, res, next) => next(pgError('08006')));
  app.use(errorHandler);

  const duplicate = await request(app).get('/duplicado');
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error, 'Conflict');
  assert.equal((await request(app).get('/formato')).status, 400);

  const originalError = console.error;
  console.error = () => {};
  try {
    const down = await request(app).get('/caida');
    assert.equal(down.status, 500);
    assert.ok(!JSON.stringify(down.body).includes('08006'), 'el 500 no revela el código interno');
  } finally {
    console.error = originalError;
  }
});

// ─── identificadores y largos ───────────────────────────────────────────────────────────────────
test('todo identificador que se compara con una columna uuid exige formato UUID', () => {
  const bad = 'abc';
  const cases = [
    ['idParams', schemas.idParams, { id: bad }, { id: UUID }],
    ['userParams', schemas.userParams, { userId: bad }, { userId: UUID }],
    ['productQuery.categoriaId', schemas.productQuery, { categoriaId: bad }, { categoriaId: UUID }],
    ['promotionBody.loteId', schemas.promotionBody, { loteId: bad }, { loteId: UUID }],
    ['reservationBody.productoId', schemas.reservationBody, { items: [{ productoId: bad, cantidad: 1 }] }, { items: [{ productoId: UUID, cantidad: 1 }] }],
    ['reservationBody.promocionId', schemas.reservationBody, { items: [{ productoId: UUID, cantidad: 1, promocionId: bad }] }, { items: [{ productoId: UUID, cantidad: 1, promocionId: UUID }] }]
  ];
  for (const [name, schema, invalid, valid] of cases) {
    assert.equal(schema.safeParse(invalid).success, false, `${name} debe rechazar "abc"`);
    assert.equal(schema.safeParse(valid).success, true, `${name} debe aceptar un UUID`);
  }
  const lot = { numeroLote: 'L-1', fechaElaboracion: '2026-01-01', fechaCaducidad: '2027-01-01', costoUnitario: 1, cantidadIngresada: 5 };
  assert.equal(schemas.lotBody.safeParse({ ...lot, productoId: bad }).success, false);
  assert.equal(schemas.lotBody.safeParse({ ...lot, productoId: UUID }).success, true);
  const product = { codigoBarras: '7861001234567', nombre: 'Leche entera', precioVenta: 1.5 };
  assert.equal(schemas.productBody.safeParse({ ...product, categoriaId: bad }).success, false);
  assert.equal(schemas.productBody.safeParse({ ...product, categoriaId: UUID }).success, true);
});

test('acepta UUID de datos semilla que no cumplen el estándar RFC 4122', () => {
  assert.equal(schemas.idParams.safeParse({ id: 'd8a7b6c5-1111-2222-3333-444455556666' }).success, true);
});

test('los largos permitidos coinciden con las columnas', () => {
  const product = { categoriaId: UUID, codigoBarras: '7861001234567', precioVenta: 1.5 };
  assert.equal(schemas.productBody.safeParse({ ...product, nombre: 'N'.repeat(150) }).success, true);
  assert.equal(schemas.productBody.safeParse({ ...product, nombre: 'N'.repeat(151) }).success, false);
  assert.equal(schemas.productBody.safeParse({ ...product, nombre: 'Leche', codigoBarras: '9'.repeat(50) }).success, true);
  assert.equal(schemas.productBody.safeParse({ ...product, nombre: 'Leche', codigoBarras: '9'.repeat(51) }).success, false);
  assert.equal(schemas.barcodeParams.safeParse({ barcode: '9'.repeat(51) }).success, false);

  const lot = { productoId: UUID, fechaElaboracion: '2026-01-01', fechaCaducidad: '2027-01-01', costoUnitario: 1, cantidadIngresada: 5 };
  assert.equal(schemas.lotBody.safeParse({ ...lot, numeroLote: 'L'.repeat(50) }).success, true);
  assert.equal(schemas.lotBody.safeParse({ ...lot, numeroLote: 'L'.repeat(51) }).success, false);

  const email = (length) => `${'a'.repeat(length - 7)}@ex.com`;
  assert.equal(schemas.registerBody.safeParse({ nombre: 'Ana', email: email(150), password: 'ClaveSegura123' }).success, true);
  assert.equal(schemas.registerBody.safeParse({ nombre: 'Ana', email: email(151), password: 'ClaveSegura123' }).success, false);
  assert.equal(schemas.loginBody.safeParse({ email: email(151), password: 'x' }).success, false);
});

// ─── comando de reserva con datos que la base rechaza ───────────────────────────────────────────
test('un comando cuyos datos rechaza la base se responde como REJECTED VALIDATION, no se deja sin respuesta', async () => {
  const command = {
    id: 'cmd-1', tipo: 'RESERVATION_CREATE', reservaId: UUID,
    payload: { clienteId: UUID, clienteNombre: 'Ana', fechaExpiracion: new Date(Date.now() + 600000).toISOString(), items: [{ productoId: 'abc', cantidad: 1 }] }
  };
  const repo = {
    findById: async () => null,
    createWithLockedStock: async () => { throw pgError('22P02'); }
  };
  const result = await new ProcessStoreCommand(repo).execute(command);
  assert.equal(result.status, 'REJECTED');
  assert.equal(result.reason, 'VALIDATION');
  assert.ok(!/uuid|22P02/i.test(result.message));

  const down = { findById: async () => null, createWithLockedStock: async () => { throw pgError('08006'); } };
  await assert.rejects(() => new ProcessStoreCommand(down).execute(command), /pg 08006/);
});

// ─── código de retiro ───────────────────────────────────────────────────────────────────────────
test('el código de retiro tiene el formato esperado y no se repite en una muestra grande', () => {
  const codes = new Set();
  for (let i = 0; i < 5000; i++) {
    const code = Reservation.generarCodigoRetiro();
    assert.match(code, /^KR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    codes.add(code);
  }
  assert.ok(codes.size > 4990, `solo ${codes.size} códigos distintos de 5000`);
});

test('ante una colisión del código de retiro se genera otro y se reintenta la reserva', async () => {
  const attempts = [];
  const pool = {
    connect: async () => ({
      query: async (sql) => {
        if (/INSERT INTO reservas /.test(sql)) {
          attempts.push(true);
          if (attempts.length < 3) throw pgError('23505', { constraint: 'reservas_codigo_retiro_key' });
        }
        if (/FROM productos/.test(sql)) return { rows: [{ id: UUID, nombre: 'Leche', precioVenta: '1.00' }] };
        if (/FROM lotes/.test(sql)) return { rows: [{ id: 'l1', cantidadDisponible: 5, cantidadReservada: 0, ubicacion: 'BODEGA' }] };
        if (/INSERT INTO reservas /.test(sql)) {
          return { rows: [{ id: UUID, usuarioId: UUID, codigoRetiro: 'KR-ABC234', estado: 'PENDIENTE', fechaExpiracion: new Date(), created_at: new Date(), updated_at: new Date() }] };
        }
        if (/INSERT INTO reserva_detalles/.test(sql)) return { rows: [{ id: 'd1', loteId: 'l1', cantidad: 1, precioUnitario: '1.00' }] };
        return { rows: [], rowCount: 1 };
      },
      release() {}
    })
  };
  const reservation = new Reservation({ usuarioId: UUID });
  const first = reservation.codigoRetiro;
  const saved = await new PostgresReservationRepository(pool).createWithLockedStock(reservation, [{ productoId: UUID, cantidad: 1 }]);
  assert.equal(attempts.length, 3, 'dos colisiones y un éxito');
  assert.notEqual(reservation.codigoRetiro, first, 'se generó un código nuevo');
  assert.equal(saved.estado, 'PENDIENTE');
});

test('si las colisiones persisten, el error se propaga tras tres intentos', async () => {
  let inserts = 0;
  const pool = {
    connect: async () => ({
      query: async (sql) => {
        if (/FROM productos/.test(sql)) return { rows: [{ id: UUID, nombre: 'Leche', precioVenta: '1.00' }] };
        if (/FROM lotes/.test(sql)) return { rows: [{ id: 'l1', cantidadDisponible: 5, cantidadReservada: 0, ubicacion: 'BODEGA' }] };
        if (/INSERT INTO reservas /.test(sql)) { inserts += 1; throw pgError('23505', { constraint: 'reservas_codigo_retiro_key' }); }
        return { rows: [], rowCount: 1 };
      },
      release() {}
    })
  };
  await assert.rejects(
    () => new PostgresReservationRepository(pool).createWithLockedStock(new Reservation({ usuarioId: UUID }), [{ productoId: UUID, cantidad: 1 }]),
    error => error.code === '23505'
  );
  assert.equal(inserts, 3);
});
