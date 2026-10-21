class PostgresRateLimitStore {
  constructor(pool, prefix = 'rl:') {
    this.pool = pool;
    this.prefix = prefix;
    this.localKeys = true;
    this.windowMs = 60 * 1000;
  }

  init(options) {
    if (options && options.windowMs) {
      this.windowMs = options.windowMs;
    }
  }

  _getKey(key) {
    return `${this.prefix}${key}`;
  }

  async increment(key) {
    const dbKey = this._getKey(key);
    const res = await this.pool.query(
      `INSERT INTO rate_limit_hits (key, hits, reset_at)
       VALUES ($1, 1, CURRENT_TIMESTAMP + ($2 || ' milliseconds')::interval)
       ON CONFLICT (key) DO UPDATE
       SET hits = CASE
         WHEN rate_limit_hits.reset_at <= CURRENT_TIMESTAMP THEN 1
         ELSE rate_limit_hits.hits + 1
       END,
       reset_at = CASE
         WHEN rate_limit_hits.reset_at <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ($2 || ' milliseconds')::interval
         ELSE rate_limit_hits.reset_at
       END
       RETURNING hits, reset_at as "resetAt"`,
      [dbKey, this.windowMs]
    );

    const row = res.rows[0];
    return {
      totalHits: Number(row.hits),
      resetTime: new Date(row.resetAt)
    };
  }

  async decrement(key) {
    const dbKey = this._getKey(key);
    await this.pool.query(
      `UPDATE rate_limit_hits
       SET hits = GREATEST(0, hits - 1)
       WHERE key = $1 AND reset_at > CURRENT_TIMESTAMP`,
      [dbKey]
    );
  }

  async resetKey(key) {
    const dbKey = this._getKey(key);
    await this.pool.query('DELETE FROM rate_limit_hits WHERE key = $1', [dbKey]);
  }

  async resetAll() {
    await this.pool.query('DELETE FROM rate_limit_hits WHERE key LIKE $1', [`${this.prefix}%`]);
  }
}

module.exports = PostgresRateLimitStore;
