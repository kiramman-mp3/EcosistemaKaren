require('dotenv').config();
const runServer = require('./src/apps/shared/runServer');
const createStoreServer = require('./src/apps/store/createStoreServer');

void runServer({
  createServer: createStoreServer,
  label: 'store-api (Ecosistema Karen)',
  port: process.env.STORE_PORT || process.env.PORT || 4000
});
