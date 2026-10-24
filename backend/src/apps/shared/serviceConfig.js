const MIN_KEY_LENGTH = 32;

function isWeakKey(key) {
  return !key || key.length < MIN_KEY_LENGTH || key.includes('change_me');
}

// Lee y valida la configuración del canal interno store-api -> portal-api (ADR-003).
// En el monolito de transición el latido es local y no se exige ninguna clave.
function readServiceConfig({ store, portal }, env = process.env) {
  const production = env.NODE_ENV === 'production';
  const split = store !== portal;
  const storeServiceKey = (env.STORE_SERVICE_KEY || '').trim();
  const portalUrl = (env.PORTAL_URL || '').trim().replace(/\/+$/, '');
  const heartbeatEnabled = env.HEARTBEAT_ENABLED !== 'false';

  if (split && production && isWeakKey(storeServiceKey)) {
    throw new Error(`STORE_SERVICE_KEY debe ser un secreto aleatorio de al menos ${MIN_KEY_LENGTH} caracteres en producción.`);
  }

  if (store && !portal && heartbeatEnabled) {
    if (!storeServiceKey) {
      throw new Error('STORE_SERVICE_KEY es obligatorio para que store-api envíe el heartbeat al portal.');
    }
    let parsed;
    try {
      parsed = new URL(portalUrl);
    } catch {
      throw new Error('PORTAL_URL debe ser una URL http(s) válida para que store-api envíe el heartbeat.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('PORTAL_URL debe usar http o https.');
    }
    if (production && parsed.protocol !== 'https:') {
      throw new Error('PORTAL_URL debe usar https en producción.');
    }
  }

  return {
    storeServiceKey,
    portalUrl,
    storeId: (env.STORE_ID || 'tienda-principal').trim(),
    heartbeatEnabled
  };
}

module.exports = { readServiceConfig, MIN_KEY_LENGTH };
