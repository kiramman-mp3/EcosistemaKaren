const { SERVICE_KEY_HEADER } = require('../http/middlewares/serviceAuth');

// Publica al portal las fotos de productos por el canal interno (ADR-003): primero el manifiesto
// (qué fotos hay y su hash) y luego, una a una, las que el portal dice que le faltan.
class HttpMediaSyncTransport {
  constructor({ baseUrl, apiKey, timeoutMs = 20000, fetchImpl = fetch }) {
    this.manifestUrl = `${baseUrl}/internal/v1/store/sync/media/manifest`;
    this.uploadUrl = `${baseUrl}/internal/v1/store/sync/media`;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async manifest({ files, prune }) {
    const response = await this.fetchImpl(this.manifestUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SERVICE_KEY_HEADER]: this.apiKey },
      body: JSON.stringify({ files, prune }),
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) throw new Error(`El portal respondió HTTP ${response.status} al recibir el manifiesto de fotos.`);
    return response.json();
  }

  async upload({ ruta, sha256, data }) {
    const response = await this.fetchImpl(`${this.uploadUrl}?ruta=${encodeURIComponent(ruta)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream', 'x-content-sha256': sha256, [SERVICE_KEY_HEADER]: this.apiKey },
      body: data,
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) throw new Error(`El portal respondió HTTP ${response.status} al recibir la foto ${ruta}.`);
    return response.json();
  }
}

module.exports = HttpMediaSyncTransport;
