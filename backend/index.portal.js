require('dotenv').config();
const runServer = require('./src/apps/shared/runServer');
const createPortalServer = require('./src/apps/portal/createPortalServer');

void runServer({
  createServer: createPortalServer,
  label: 'portal-api (Ecosistema Karen)',
  port: process.env.PORTAL_PORT || 4001
});
