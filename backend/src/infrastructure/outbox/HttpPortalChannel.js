const { SERVICE_KEY_HEADER } = require('../http/middlewares/serviceAuth');

// Cliente HTTP de store-api hacia el canal interno de portal-api (ADR-003). Toda llamada nace
// en la tienda; el portal nunca se conecta a ella.
class HttpPortalChannel {
  constructor({ baseUrl, apiKey, fetchImpl = fetch, requestTimeoutMs = 15000 }) {
    this.base = `${baseUrl}/internal/v1/store`;
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.requestTimeoutMs = requestTimeoutMs;
  }

  async _request(path, { method = 'GET', body, timeoutMs = this.requestTimeoutMs, signal } = {}) {
    const signals = [AbortSignal.timeout(timeoutMs)];
    if (signal) signals.push(signal);
    const response = await this.fetchImpl(`${this.base}${path}`, {
      method,
      headers: { 'content-type': 'application/json', [SERVICE_KEY_HEADER]: this.apiKey },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.any(signals)
    });
    if (!response.ok) {
      const error = new Error(`El portal respondió HTTP ${response.status} en ${method} ${path}.`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  /** Long-poll: el portal responde apenas hay comandos o al cumplirse `waitSeconds`. */
  async fetchCommands({ waitSeconds = 25, limit = 20, signal } = {}) {
    const body = await this._request(`/commands?wait=${waitSeconds}&limit=${limit}`, {
      timeoutMs: (waitSeconds + 10) * 1000, signal
    });
    return body.commands || [];
  }

  sendResult(commandId, result) {
    return this._request(`/commands/${encodeURIComponent(commandId)}/result`, { method: 'POST', body: result });
  }

  sendEvents(events) {
    return this._request('/events', { method: 'POST', body: { events } });
  }
}

module.exports = HttpPortalChannel;
