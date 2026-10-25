// Tareas periódicas que impiden que tablas de apoyo crezcan sin límite. Todas son borrados idempotentes
// que solo tocan filas que ya no sirven, así que es seguro que varias instancias las ejecuten a la vez.

/** Tokens revocados cuya expiración ya pasó: un token vencido se rechaza igual, ya no hace falta recordarlo. */
function purgeExpiredTokens(pool) {
  return {
    name: 'tokens revocados vencidos',
    async run() {
      const res = await pool.query('DELETE FROM tokens_revocados WHERE expira_en <= CURRENT_TIMESTAMP');
      return res.rowCount;
    }
  };
}

/** Contadores de límite de tasa cuya ventana terminó hace más de una hora (el contador se reinicia al reutilizarse). */
function purgeExpiredRateLimits(pool) {
  return {
    name: 'contadores de límite de tasa vencidos',
    async run() {
      const res = await pool.query("DELETE FROM rate_limit_hits WHERE reset_at < CURRENT_TIMESTAMP - interval '1 hour'");
      return res.rowCount;
    }
  };
}

/** Comandos de reserva ya resueltos hace más de `retentionDays` días (la reserva se conserva: es el historial del cliente). */
function purgeResolvedCommands(pool, retentionDays) {
  return {
    name: 'comandos de reserva resueltos',
    async run() {
      const res = await pool.query(
        "DELETE FROM comandos_tienda WHERE estado = 'RESUELTO' AND resuelto_at < CURRENT_TIMESTAMP - ($1::int * interval '1 day')",
        [retentionDays]
      );
      return res.rowCount;
    }
  };
}

/** Tareas de cada servicio. `portalQueue` es true solo si portal-api guarda la cola de comandos en su propia base. */
function createMaintenanceTasks({ pool, retentionDays, portalQueue = false }) {
  const tasks = [purgeExpiredTokens(pool), purgeExpiredRateLimits(pool)];
  if (portalQueue) tasks.push(purgeResolvedCommands(pool, retentionDays));
  return tasks;
}

module.exports = { createMaintenanceTasks, purgeExpiredTokens, purgeExpiredRateLimits, purgeResolvedCommands };
