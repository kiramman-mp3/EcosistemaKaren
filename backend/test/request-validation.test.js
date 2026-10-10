const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const validate = require('../src/infrastructure/http/middlewares/validateRequest');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');
const errorHandler = require('../src/infrastructure/http/middlewares/errorHandler');

function validationApp(method, path, contract) {
  const app = express();
  app.use(express.json());
  app[method](path, validate(contract), (req, res) => res.json({
    body: req.body,
    params: req.params,
    query: req.query
  }));
  app.use(errorHandler);
  return app;
}

test('normaliza campos válidos y rechaza propiedades no declaradas', async () => {
  const app = validationApp('post', '/register', { body: schemas.registerBody });
  const valid = await request(app).post('/register').send({
    nombre: '  Karen Cliente  ',
    email: '  CLIENTE@EXAMPLE.COM ',
    password: 'segura-123'
  });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.body.nombre, 'Karen Cliente');
  assert.equal(valid.body.body.email, 'cliente@example.com');

  const injected = await request(app).post('/register').send({
    nombre: 'Karen Cliente',
    email: 'cliente@example.com',
    password: 'segura-123',
    rol: 'ADMIN'
  });
  assert.equal(injected.status, 400);
  assert.equal(injected.body.error, 'ValidationException');
  assert.ok(injected.body.details.some(item => item.message.includes('Unrecognized')));
});

test('valida fechas reales y su orden cronológico al ingresar lotes', async () => {
  const app = validationApp('post', '/lots', { body: schemas.lotBody });
  const response = await request(app).post('/lots').send({
    productoId: 'producto-1',
    numeroLote: 'LOTE-01',
    fechaElaboracion: '2026-02-30',
    fechaCaducidad: '2026-02-20',
    costoUnitario: 1.25,
    cantidadIngresada: 20
  });
  assert.equal(response.status, 400);
  assert.ok(response.body.details.some(item => item.field === 'fechaElaboracion'));
});

test('limita reservas y pagina consultas con valores numéricos seguros', async () => {
  const reservationApp = validationApp('post', '/reservations', { body: schemas.reservationBody });
  const oversized = await request(reservationApp).post('/reservations').send({
    items: [{ productoId: 'producto-1', cantidad: 10001 }]
  });
  assert.equal(oversized.status, 400);

  const queryApp = validationApp('get', '/users/:userId', {
    params: schemas.userParams,
    query: schemas.reservationQuery
  });
  const defaults = await request(queryApp).get('/users/usuario-1');
  assert.equal(defaults.status, 200);
  assert.deepEqual(defaults.body.query, { limit: 50, offset: 0 });

  const invalid = await request(queryApp).get('/users/usuario-1?limit=101&offset=-1');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.details.length, 2);
});

test('rechaza códigos de retiro y filtros de auditoría mal formados', async () => {
  const codeApp = validationApp('get', '/reservations/:code', { params: schemas.reservationCodeParams });
  assert.equal((await request(codeApp).get('/reservations/../../etc')).status, 404);
  assert.equal((await request(codeApp).get('/reservations/KR-12%20OR%201')).status, 400);

  const auditApp = validationApp('get', '/movements', { query: schemas.movementQuery });
  const response = await request(auditApp).get('/movements?tipo=DESCONOCIDO&limit=1000');
  assert.equal(response.status, 400);
  assert.equal(response.body.details.length, 2);
});
