const MIN_KEY_LENGTH = 32;

// Segundos configurables con un valor por defecto y un mínimo que protege al portal de ráfagas.
function positiveSeconds(value, fallback, minimum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? Math.floor(parsed) : fallback;
}

function boundedSeconds(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? Math.floor(parsed) : fallback;
}

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
  const catalogSyncEnabled = env.CATALOG_SYNC_ENABLED !== 'false';
  const reservationQueueEnabled = env.RESERVATION_QUEUE_ENABLED !== 'false';

  if (split && production && isWeakKey(storeServiceKey)) {
    throw new Error(`STORE_SERVICE_KEY debe ser un secreto aleatorio de al menos ${MIN_KEY_LENGTH} caracteres en producción.`);
  }

  if (store && !portal && (heartbeatEnabled || catalogSyncEnabled || reservationQueueEnabled)) {
    if (!storeServiceKey) {
      throw new Error('STORE_SERVICE_KEY es obligatorio para que store-api se comunique con el portal.');
    }
    let parsed;
    try {
      parsed = new URL(portalUrl);
    } catch {
      throw new Error('PORTAL_URL debe ser una URL http(s) válida para que store-api se comunique con el portal.');
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
    heartbeatEnabled,
    catalogSyncEnabled,
    reservationQueueEnabled,
    // Espera del long-poll con el que la tienda pide comandos de reserva al portal.
    reservationPollWaitSeconds: boundedSeconds(env.RESERVATION_POLL_WAIT_SECONDS, 25, 5, 30),
    catalogSyncIntervalMs: positiveSeconds(env.CATALOG_SYNC_INTERVAL_SECONDS, 15, 5) * 1000,
    catalogResyncMs: positiveSeconds(env.CATALOG_RESYNC_SECONDS, 600, 30) * 1000,
    // Debe ser mayor que el reenvío completo: las secciones sin cambios solo se reenvían entonces.
    catalogStaleSeconds: positiveSeconds(env.CATALOG_STALE_SECONDS, 1200, 60),
    // Limpieza periódica de tablas de apoyo y días que se conservan los comandos de reserva ya resueltos.
    maintenanceIntervalMs: boundedSeconds(env.MAINTENANCE_INTERVAL_MINUTES, 60, 1, 1440) * 60 * 1000,
    retentionDays: boundedSeconds(env.RETENTION_DAYS, 30, 1, 3650),
    // Cuánto espera portal-api la respuesta de la tienda antes de devolver la reserva como PENDIENTE_SYNC.
    reservationSyncWaitMs: boundedSeconds(env.RESERVATION_SYNC_WAIT_SECONDS, 8, 0, 25) * 1000
  };
}

module.exports = { readServiceConfig, MIN_KEY_LENGTH };
