// Lógica de entorno del modo `node start.js --split` (ADR-003): store-api y portal-api como dos
// procesos, cada uno con su base de datos, y cada app apuntando al backend que le corresponde.
// Son funciones puras para poder probarlas sin Docker ni procesos.
const MIN_KEY_LENGTH = 32;

const isWeakKey = (key) => !key || key.length < MIN_KEY_LENGTH || key.includes('change_me');

/** Devuelve el contenido de .env con STORE_SERVICE_KEY fijada (reemplaza la línea o la agrega). */
function withServiceKey(envText, key) {
  const eol = envText.includes('\r\n') ? '\r\n' : '\n';
  const line = `STORE_SERVICE_KEY=${key}`;
  if (/^STORE_SERVICE_KEY=.*$/m.test(envText)) return envText.replace(/^STORE_SERVICE_KEY=.*$/m, line);
  return `${envText}${envText.endsWith('\n') || envText === '' ? '' : eol}${line}${eol}`;
}

/** Conexión de la base de portal-api: PORTAL_DB_* de .env o los valores por defecto de docker-compose. */
function portalDbEnv(env) {
  return {
    PORTAL_DB_HOST: env.PORTAL_DB_HOST || 'localhost',
    PORTAL_DB_PORT: env.PORTAL_DB_PORT || env.PORTAL_DB_EXPOSED_PORT || '5434',
    PORTAL_DB_NAME: env.PORTAL_DB_NAME || 'ecosistema_karen_portal',
    PORTAL_DB_USER: env.PORTAL_DB_USER || 'karen_portal',
    PORTAL_DB_PASSWORD: env.PORTAL_DB_PASSWORD || 'karen_portal_pass'
  };
}

function servicePorts(env) {
  return {
    storePort: Number(env.STORE_PORT) || Number(env.PORT) || 4000,
    portalPort: Number(env.PORTAL_PORT) || 4001
  };
}

/** Variables que comparten ambos servicios y las propias de cada uno. */
function buildSplitEnv({ env, serviceKey }) {
  const { storePort, portalPort } = servicePorts(env);
  const common = {
    STORE_SERVICE_KEY: serviceKey,
    PORTAL_URL: `http://localhost:${portalPort}`,
    ...portalDbEnv(env)
  };
  return {
    storePort,
    portalPort,
    store: { ...common, STORE_PORT: String(storePort) },
    portal: { ...common, PORTAL_PORT: String(portalPort) },
    // El portal web llama a /api del mismo origen y vite lo reenvía al portal.
    web: { VITE_PROXY_TARGET: `http://localhost:${portalPort}` },
    portalDb: portalDbEnv(env)
  };
}

/**
 * URL del backend de cada app móvil. Un teléfono no alcanza "localhost" de la PC, por eso se usa la
 * IP de la red local. `--api-url` fija la del portal móvil y `--store-api-url` la de bodega; en este
 * modo EXPO_PUBLIC_API_URL no se usa porque no se sabría a cuál de los dos backends corresponde.
 */
function mobileApiUrls({ args, lanHost, storePort, portalPort }) {
  const pick = (explicit, port) => {
    if (typeof explicit === 'string') return explicit.replace(/\/$/, '');
    return lanHost ? `http://${lanHost}:${port}/api/v1` : null;
  };
  return {
    portal: pick(args['api-url'], portalPort),
    bodega: pick(args['store-api-url'], storePort)
  };
}

/**
 * Entorno de `node start.js --backend-tienda`: solo store-api y su base, para la PC de la tienda.
 * Sin `portalUrl` la tienda funciona sola (latido, sincronización de catálogo y cola de reservas
 * apagados, así que no escribe nada en ningún portal); con `portalUrl` se conecta a ese portal con
 * la clave de servicio.
 */
function storeOnlyEnv({ env, portalUrl, serviceKey }) {
  const { storePort } = servicePorts(env);
  const base = { STORE_PORT: String(storePort) };
  const url = typeof portalUrl === 'string' ? portalUrl.trim().replace(/\/+$/, '') : '';
  if (url) {
    return { storePort, connected: true, store: { ...base, PORTAL_URL: url, STORE_SERVICE_KEY: serviceKey } };
  }
  return {
    storePort,
    connected: false,
    store: { ...base, HEARTBEAT_ENABLED: 'false', CATALOG_SYNC_ENABLED: 'false', RESERVATION_QUEUE_ENABLED: 'false' }
  };
}

/** URL de store-api para la app de bodega: `--store-api-url` o la IP de la red local. */
function storeApiUrl({ args, lanHost, storePort }) {
  if (typeof args['store-api-url'] === 'string') return args['store-api-url'].replace(/\/$/, '');
  return lanHost ? `http://${lanHost}:${storePort}/api/v1` : null;
}

// Variables que ya no hacen nada y siguen en algunos .env: se avisa para que se retiren.
const DEPRECATED_ENV = {
  HEARTBEAT_AUTO_PING: 'ya no existe: el latido lo emite store-api (ver HEARTBEAT_ENABLED)'
};

/** Variables obsoletas presentes en un .env ya leído: [{ name, reason }]. */
function deprecatedEnvVars(env) {
  return Object.entries(DEPRECATED_ENV)
    .filter(([name]) => env[name] !== undefined)
    .map(([name, reason]) => ({ name, reason }));
}

module.exports = {
  isWeakKey, withServiceKey, portalDbEnv, servicePorts, buildSplitEnv, storeOnlyEnv, storeApiUrl, mobileApiUrls, deprecatedEnvVars
};
