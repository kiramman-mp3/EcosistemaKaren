/**
 * PromotionCache
 * Caché en memoria para resultados de Gemini AI, encapsulada detrás de una
 * interfaz simple para poder sustituirla por Redis en producción sin tocar
 * la lógica de negocio.
 *
 * Anti-stampede: dos llamadas concurrentes con la misma clave comparten
 * la misma Promise en vuelo en lugar de duplicar la llamada a Gemini.
 */
class PromotionCache {
  constructor(ttlSeconds = 900, maxEntries = 1000) {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('GEMINI_CACHE_TTL_SECONDS debe ser un entero positivo.');
    }
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new Error('GEMINI_CACHE_MAX_ENTRIES debe ser un entero positivo.');
    }
    this._ttlMs = ttlSeconds * 1000;
    this._maxEntries = maxEntries;
    this._store = new Map();   // cacheKey → { value, expiresAt }
    this._inflight = new Map(); // cacheKey → Promise  (anti-stampede)
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Returns the cached value for key, or null if absent / expired.
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Stores value under key.
   */
  set(key, value) {
    this.purgeExpired();
    if (!this._store.has(key) && this._store.size >= this._maxEntries) {
      const oldestKey = this._store.keys().next().value;
      if (oldestKey !== undefined) this._store.delete(oldestKey);
    }
    this._store.set(key, {
      value,
      expiresAt: Date.now() + this._ttlMs,
    });
  }

  /**
   * Invalidates a specific key.
   */
  del(key) {
    this._store.delete(key);
    this._inflight.delete(key);
  }

  /**
   * Anti-stampede wrapper.
   * If a generation is already in flight for the given key, wait for it.
   * Otherwise, run `fn`, cache the result and resolve all waiters.
   *
   * @param {string} key
   * @param {() => Promise<any>} fn  - the expensive Gemini call
   * @returns {{ result: any, cacheHit: boolean }}
   */
  async getOrGenerate(key, fn) {
    // 1. Serve from cache
    const cached = this.get(key);
    if (cached !== null) {
      return { result: cached, cacheHit: true };
    }

    // 2. Anti-stampede: join an existing in-flight promise
    if (this._inflight.has(key)) {
      const result = await this._inflight.get(key);
      return { result, cacheHit: true };
    }

    // 3. Execute fn, register it as in-flight
    const promise = fn().then((value) => {
      this.set(key, value);
      this._inflight.delete(key);
      return value;
    }).catch((err) => {
      this._inflight.delete(key);
      throw err;
    });

    this._inflight.set(key, promise);

    const result = await promise;
    return { result, cacheHit: false };
  }

  /**
   * Expire old entries (call periodically if needed).
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now >= entry.expiresAt) this._store.delete(key);
    }
  }
}

module.exports = PromotionCache;
