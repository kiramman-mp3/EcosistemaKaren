const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const AlertStreamManager = require('../src/infrastructure/sse/AlertStreamManager');

function createConnection(user) {
  const req = new EventEmitter();
  req.user = user;
  const writes = [];
  const res = {
    writableEnded: false,
    destroyed: false,
    setHeader: () => {},
    flushHeaders: () => {},
    write: value => { writes.push(value); },
    end: () => { res.writableEnded = true; }
  };
  return { req, res, writes };
}
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const inSeconds = (seconds) => Math.floor(Date.now() / 1000) + seconds;

test('SSE cierra el stream cuando el token con que se abrió expira', async () => {
  const manager = new AlertStreamManager();
  const connection = createConnection({ jti: 'j1', exp: inSeconds(1) });
  manager.addClient(connection.req, connection.res);
  assert.equal(manager.clients.size, 1);

  await wait(1300);
  assert.equal(manager.clients.size, 0);
  assert.equal(connection.res.writableEnded, true);
  assert.match(connection.writes.join(''), /event: session-expired/);
});

test('SSE cierra de inmediato un stream abierto con un token ya vencido', async () => {
  const manager = new AlertStreamManager();
  const connection = createConnection({ jti: 'j1', exp: inSeconds(-5) });
  manager.addClient(connection.req, connection.res);
  await wait(30);
  assert.equal(manager.clients.size, 0);
  assert.match(connection.writes.join(''), /session-expired/);
});

test('SSE cierra el stream cuando el token se revoca y no antes', async () => {
  let revoked = false;
  const manager = new AlertStreamManager({ isRevoked: async (jti) => revoked && jti === 'j1', revocationCheckMs: 20 });
  const connection = createConnection({ jti: 'j1', exp: inSeconds(3600) });
  manager.addClient(connection.req, connection.res);

  await wait(80);
  assert.equal(manager.clients.size, 1, 'sigue abierto mientras el token es válido');
  revoked = true;
  await wait(80);
  assert.equal(manager.clients.size, 0);
  assert.match(connection.writes.join(''), /event: session-revoked/);
});

test('SSE tolera un fallo al consultar la revocación y libera los temporizadores al desconectarse', async () => {
  let calls = 0;
  const manager = new AlertStreamManager({ isRevoked: async () => { calls += 1; throw new Error('base caída'); }, revocationCheckMs: 15 });
  const connection = createConnection({ jti: 'j1', exp: inSeconds(3600) });
  manager.addClient(connection.req, connection.res);
  await wait(60);
  assert.equal(manager.clients.size, 1, 'un fallo de consulta no cierra el stream');
  assert.ok(calls >= 2);

  connection.req.emit('close');
  const callsAtClose = calls;
  await wait(60);
  assert.equal(calls, callsAtClose, 'no se sigue consultando tras desconectarse');
});

test('un stream sin datos de sesión (token sin exp ni jti) sigue funcionando como antes', () => {
  const manager = new AlertStreamManager({ isRevoked: async () => true });
  const connection = createConnection({});
  manager.addClient(connection.req, connection.res);
  manager.broadcastAlert({ tipo: 'PRUEBA' });
  assert.equal(manager.clients.size, 1);
  assert.match(connection.writes.join(''), /PRUEBA/);
  connection.req.emit('close');
  assert.equal(manager.clients.size, 0);
});
