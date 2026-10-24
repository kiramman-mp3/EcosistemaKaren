const { SERVICE_KEY_HEADER } = require('../http/middlewares/serviceAuth');

// Envía el latido de store-api a portal-api por el canal interno (ADR-003).
class HttpHeartbeatTransport {
  constructor({ baseUrl, apiKey, timeoutMs = 5000, fetchImpl = fetch }) {
    this.url = `${baseUrl}/internal/v1/store/heartbeat`;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async send(payload) {
    const response = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SERVICE_KEY_HEADER]: this.apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) {
      throw new Error(`El portal respondió HTTP ${response.status} al recibir el heartbeat.`);
    }
  }
}

module.exports = HttpHeartbeatTransport;
