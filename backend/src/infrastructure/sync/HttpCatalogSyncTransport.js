const { SERVICE_KEY_HEADER } = require('../http/middlewares/serviceAuth');

// Publica un snapshot de catálogo de store-api a portal-api por el canal interno (ADR-003).
class HttpCatalogSyncTransport {
  constructor({ baseUrl, apiKey, timeoutMs = 20000, fetchImpl = fetch }) {
    this.url = `${baseUrl}/internal/v1/store/sync/catalog`;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async send({ section, version, items }) {
    const response = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SERVICE_KEY_HEADER]: this.apiKey },
      body: JSON.stringify({ section, version, items }),
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) {
      throw new Error(`El portal respondió HTTP ${response.status} al recibir la sección '${section}'.`);
    }
    return response.json();
  }
}

module.exports = HttpCatalogSyncTransport;
