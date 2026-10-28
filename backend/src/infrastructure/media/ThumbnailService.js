const sharp = require('sharp');

// Anchos que se aceptan en `?w=`. Una lista cerrada impide que un cliente fuerce miles de variantes
// (y de recálculos de CPU) pidiendo un ancho distinto en cada petición.
const THUMBNAIL_WIDTHS = [160, 320, 640];
const THUMBNAIL_QUALITY = 75;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 1000;

/** Ancho pedido en `?w=` si es uno de los permitidos; si no, null (se sirve la foto original). */
function parseThumbnailWidth(value) {
  if (typeof value !== 'string' || !/^\d{2,4}$/.test(value)) return null;
  const width = Number(value);
  return THUMBNAIL_WIDTHS.includes(width) ? width : null;
}

/**
 * Reduce las fotos de producto a miniaturas JPEG para las listas, donde una tarjeta de ~200 px no
 * necesita los 1024 px de la foto guardada. Las variantes no se guardan: se calculan al vuelo y se
 * recuerdan en una caché LRU en memoria, así el contrato de sincronización tienda/portal no cambia.
 */
class ThumbnailService {
  constructor({ maxBytes = MAX_CACHE_BYTES, maxEntries = MAX_CACHE_ENTRIES } = {}) {
    this.maxBytes = maxBytes;
    this.maxEntries = maxEntries;
    this.cache = new Map();
    this.cachedBytes = 0;
    this.pending = new Map();
  }

  /**
   * Miniatura de `width` px. `version` identifica el contenido (hash o fecha de modificación) para que
   * una foto reemplazada no reutilice la miniatura vieja. `load` devuelve los bytes originales y solo
   * se llama si la variante no está en caché. Si la foto no se puede decodificar devuelve null.
   */
  async render(ruta, version, width, load) {
    const key = `${ruta}|${version}|${width}`;
    const hit = this.cache.get(key);
    if (hit) {
      // Reinsertar la mueve al final: el más antiguo (primero del Map) es el que se descarta.
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit;
    }
    // Peticiones simultáneas de la misma miniatura comparten un solo cálculo.
    if (!this.pending.has(key)) {
      this.pending.set(key, this._build(key, width, load).finally(() => this.pending.delete(key)));
    }
    return this.pending.get(key);
  }

  async _build(key, width, load) {
    let data;
    try {
      data = await sharp(await load())
        .rotate()
        .resize({ width, withoutEnlargement: true })
        // PNG/WebP con transparencia: el catálogo usa fondo claro, no negro.
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: THUMBNAIL_QUALITY, mozjpeg: true, progressive: true })
        .toBuffer();
    } catch {
      return null;
    }
    this._remember(key, data);
    return data;
  }

  _remember(key, data) {
    if (data.length > this.maxBytes) return;
    this.cache.set(key, data);
    this.cachedBytes += data.length;
    while (this.cachedBytes > this.maxBytes || this.cache.size > this.maxEntries) {
      const [oldestKey, oldest] = this.cache.entries().next().value;
      this.cache.delete(oldestKey);
      this.cachedBytes -= oldest.length;
    }
  }
}

module.exports = { ThumbnailService, parseThumbnailWidth, THUMBNAIL_WIDTHS };
