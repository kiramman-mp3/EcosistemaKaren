const createApp = require('../../apps/shared/createApp');

// Monolito de transición: store-api y portal-api en un solo proceso (ADR-003).
const createServer = () => createApp({ name: 'monolith', store: true, portal: true });

module.exports = createServer;
