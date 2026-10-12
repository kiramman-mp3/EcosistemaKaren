const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const AlertStreamManager = require('../src/infrastructure/sse/AlertStreamManager');

function createConnection() {
  const req = new EventEmitter();
  const writes = [];
  const headers = {};
  const res = {
    writableEnded: false,
    destroyed: false,
    setHeader: (key, value) => { headers[key] = value; },
    flushHeaders: () => {},
    write: value => { writes.push(value); },
  };
  return { req, res, writes, headers };
}

test('SSE configura streaming, registra cliente y publica alertas', () => {
  const manager = new AlertStreamManager();
  const connection = createConnection();

  manager.addClient(connection.req, connection.res);
  manager.broadcastAlert({ type: 'LOTE_CRITICO', loteId: 'lot-1' });

  assert.equal(connection.headers['Content-Type'], 'text/event-stream');
  assert.equal(connection.headers['X-Accel-Buffering'], 'no');
  assert.equal(manager.clients.size, 1);
  assert.match(connection.writes.join(''), /LOTE_CRITICO/);

  connection.req.emit('close');
  assert.equal(manager.clients.size, 0);
});

test('SSE elimina conexiones cerradas al publicar', () => {
  const manager = new AlertStreamManager();
  const connection = createConnection();
  manager.addClient(connection.req, connection.res);
  connection.res.destroyed = true;

  manager.broadcastAlert({ type: 'TEST' });

  assert.equal(manager.clients.size, 0);
});
