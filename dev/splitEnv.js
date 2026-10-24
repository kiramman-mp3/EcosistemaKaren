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

module.exports = { isWeakKey, withServiceKey, portalDbEnv, servicePorts, buildSplitEnv, mobileApiUrls };
