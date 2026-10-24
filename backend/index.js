require('dotenv').config();
const runServer = require('./src/apps/shared/runServer');
const createServer = require('./src/infrastructure/http/server');

// Monolito de transición (store-api + portal-api). Ver index.store.js e index.portal.js.
void runServer({
  createServer,
  label: 'Servidor Ecosistema Karen',
  port: process.env.PORT || 4000
});
