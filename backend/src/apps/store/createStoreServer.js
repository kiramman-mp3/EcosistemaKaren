const createApp = require('../shared/createApp');

// store-api: servicio local de la tienda (ADR-003).
const createStoreServer = () => createApp({ name: 'store-api', store: true });

module.exports = createStoreServer;
