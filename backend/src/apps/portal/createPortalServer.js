const createApp = require('../shared/createApp');

// portal-api: servicio en la nube para clientes (ADR-003).
const createPortalServer = () => createApp({ name: 'portal-api', portal: true });

module.exports = createPortalServer;
