const MAX_BACKOFF_SECONDS = 300;

// Bandeja de salida de store-api hacia portal-api (ADR-003). Lo que la tienda debe comunicar al
// portal se guarda aquí antes de enviarse y se reintenta con espera creciente hasta que el portal
// lo confirma, de modo que una caída del portal o de la conexión no pierde nada. `clave` evita
// encolar dos veces el mismo hecho.
class PostgresOutbox {
  constructor(pool) {
    this.pool = pool;
  }

  async enqueue({ tipo, clave, payload }) {
    const res = await this.pool.query(`
      INSERT INTO outbox_portal (tipo, clave, payload)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (clave) DO NOTHING
    `, [tipo, clave, JSON.stringify(payload)]);
    return res.rowCount === 1;
  }

  /** Filas pendientes cuyo próximo intento ya llegó, en orden de creación. */
  async claimDue(limit = 50) {
    const res = await this.pool.query(`
      SELECT id, tipo, clave, payload, intentos
      FROM outbox_portal
      WHERE enviado_at IS NULL AND proximo_intento_at <= CURRENT_TIMESTAMP
      ORDER BY id
      LIMIT $1
    `, [limit]);
    return res.rows.map(row => ({ ...row, id: Number(row.id) }));
  }

  async markSent(ids) {
    if (ids.length === 0) return;
    await this.pool.query(
      'UPDATE outbox_portal SET enviado_at = CURRENT_TIMESTAMP, ultimo_error = NULL WHERE id = ANY($1::bigint[])',
      [ids]
    );
  }

  /** Registra el fallo y pospone el siguiente intento: 2, 4, 8... segundos, hasta 5 minutos. */
  async markFailed(ids, error, attempts) {
    if (ids.length === 0) return;
    const delaySeconds = Math.min(MAX_BACKOFF_SECONDS, 2 ** Math.min(attempts + 1, 10));
    await this.pool.query(`
      UPDATE outbox_portal
      SET intentos = intentos + 1, ultimo_error = $2,
          proximo_intento_at = CURRENT_TIMESTAMP + ($3::int * interval '1 second')
      WHERE id = ANY($1::bigint[])
    `, [ids, String(error).slice(0, 500), delaySeconds]);
  }

  async pendingCount() {
    const res = await this.pool.query('SELECT COUNT(*)::int AS total FROM outbox_portal WHERE enviado_at IS NULL');
    return Number(res.rows[0].total);
  }

  async pruneSent(olderThanDays = 7) {
    const res = await this.pool.query(
      "DELETE FROM outbox_portal WHERE enviado_at IS NOT NULL AND enviado_at < CURRENT_TIMESTAMP - ($1::int * interval '1 day')",
      [olderThanDays]
    );
    return res.rowCount;
  }
}

module.exports = PostgresOutbox;
