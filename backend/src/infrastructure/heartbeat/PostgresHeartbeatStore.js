class PostgresHeartbeatStore {
  constructor(pool) {
    this.pool = pool;
  }

  async setLastHeartbeat(timestampMs) {
    const isoDate = new Date(timestampMs).toISOString();
    await this.pool.query(
      `INSERT INTO tienda_heartbeat (id, last_heartbeat_at, updated_at)
       VALUES (1, $1, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE
       SET last_heartbeat_at = EXCLUDED.last_heartbeat_at,
           updated_at = CURRENT_TIMESTAMP`,
      [isoDate]
    );
  }

  async getLastHeartbeat() {
    const res = await this.pool.query(
      'SELECT last_heartbeat_at as "lastHeartbeatAt" FROM tienda_heartbeat WHERE id = 1'
    );
    if (!res.rows.length || !res.rows[0].lastHeartbeatAt) {
      return null;
    }
    return new Date(res.rows[0].lastHeartbeatAt).getTime();
  }
}

module.exports = PostgresHeartbeatStore;
