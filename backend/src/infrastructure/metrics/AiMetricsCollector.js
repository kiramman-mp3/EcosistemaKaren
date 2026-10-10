/**
 * AiMetricsCollector
 * Recolector desacoplado en memoria de métricas de IA/Gemini.
 * Encapsulado detrás de interfaz para sustituirse en el futuro por Prometheus/OTEL.
 */
class AiMetricsCollector {
  constructor() {
    this._counters = {
      gemini_requests_total: 0,
      gemini_success_total: 0,
      gemini_timeouts_total: 0,
      gemini_cache_hits_total: 0,
      gemini_cache_misses_total: 0,
      promotions_pending_total: 0,
      promotions_approved_total: 0,
      promotions_rejected_total: 0,
    };

    // Error counters keyed by error type
    this._errorCounters = {};

    // Latency tracking (ms)
    this._geminiLatencies = [];   // latency of Gemini API call itself
    this._ucLatencies = [];       // latency of the full use-case
    this._maxSamples = 1000;      // keep last N samples to bound memory
  }

  // ─── Counters ─────────────────────────────────────────────────────────────

  incRequest()              { this._counters.gemini_requests_total++; }
  incSuccess()              { this._counters.gemini_success_total++; }
  incTimeout()              { this._counters.gemini_timeouts_total++; }
  incCacheHit()             { this._counters.gemini_cache_hits_total++; }
  incCacheMiss()            { this._counters.gemini_cache_misses_total++; }
  incPromotionPending()     { this._counters.promotions_pending_total++; }
  incPromotionApproved()    { this._counters.promotions_approved_total++; }
  incPromotionRejected()    { this._counters.promotions_rejected_total++; }

  /**
   * @param {'CONFIG'|'TIMEOUT'|'RATE_LIMIT'|'INVALID_RESPONSE'|'EXTERNAL'} type
   */
  incError(type = 'EXTERNAL') {
    const key = `gemini_errors_total_${type}`;
    this._errorCounters[key] = (this._errorCounters[key] || 0) + 1;
  }

  // ─── Latency ──────────────────────────────────────────────────────────────

  recordGeminiLatency(ms) {
    this._push(this._geminiLatencies, ms);
  }

  recordUcLatency(ms) {
    this._push(this._ucLatencies, ms);
  }

  _push(arr, value) {
    arr.push(value);
    if (arr.length > this._maxSamples) arr.shift();
  }

  _stats(arr) {
    if (arr.length === 0) return { avg_ms: null, max_ms: null, count: 0 };
    const sum = arr.reduce((a, b) => a + b, 0);
    return {
      avg_ms: Math.round(sum / arr.length),
      max_ms: Math.max(...arr),
      count: arr.length,
    };
  }

  // ─── Snapshot ─────────────────────────────────────────────────────────────

  snapshot() {
    return {
      counters: { ...this._counters },
      errors: { ...this._errorCounters },
      gemini_latency: this._stats(this._geminiLatencies),
      uc_latency: this._stats(this._ucLatencies),
      collected_at: new Date().toISOString(),
    };
  }
}

// Export a singleton so all modules share the same counters
module.exports = new AiMetricsCollector();
