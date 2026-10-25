const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const { MAX_MEDIA_BYTES, isMediaPath, localFileFor } = require('../media/mediaPaths');

// Mantiene en el portal una copia de las fotos de los productos. En cada ciclo calcula el hash de las
// fotos que usan los productos, se las informa al portal y le sube solo las que le faltan o cambiaron.
// Una falla se registra y el siguiente ciclo reintenta. Si la tienda no encuentra alguna de sus fotos
// (p. ej. se perdió la carpeta), le pide al portal que no borre nada: no es una señal fiable de que se quitaron.
class MediaSyncWorker {
  /**
   * @param {object} options
   * @param {() => Promise<string[]>} options.listPaths rutas `/api/v1/media/...` que usan los productos
   * @param {string} options.mediaDir carpeta local de medios
   * @param {{manifest: Function, upload: Function}} options.transport
   * @param {number} [options.maxUploadsPerTick] tope de subidas por ciclo, para no saturar el enlace
   */
  constructor({ listPaths, mediaDir, transport, intervalMs = 60000, maxUploadsPerTick = 25, files = fs }) {
    this.listPaths = listPaths;
    this.mediaDir = mediaDir;
    this.transport = transport;
    this.intervalMs = intervalMs;
    this.maxUploadsPerTick = maxUploadsPerTick;
    this.files = files;
    this.timer = null;
    this.running = false;
    this.hashes = new Map();
    this.consecutiveFailures = 0;
    this.warned = new Set();
  }

  _warnOnce(key, message) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(message);
  }

  /** Describe la foto local (ruta, tamaño, hash) o null si no existe o no cumple el contrato. */
  async _describe(ruta) {
    const file = localFileFor(this.mediaDir, ruta);
    let stat;
    try {
      stat = await this.files.stat(file);
    } catch {
      this._warnOnce(`missing:${ruta}`, `⚠️ Falta el archivo de la foto ${ruta}; no se sincroniza.`);
      return null;
    }
    if (!stat.isFile() || stat.size === 0 || stat.size > MAX_MEDIA_BYTES) {
      this._warnOnce(`size:${ruta}`, `⚠️ La foto ${ruta} está vacía o supera ${MAX_MEDIA_BYTES / 1048576} MB; no se sincroniza.`);
      return null;
    }
    const signature = `${stat.mtimeMs}:${stat.size}`;
    const cached = this.hashes.get(ruta);
    if (cached && cached.signature === signature) return { ruta, sha256: cached.sha256, size: stat.size };

    const data = await this.files.readFile(file);
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    this.hashes.set(ruta, { signature, sha256 });
    return { ruta, sha256, size: data.length };
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const referenced = [...new Set((await this.listPaths()).filter(isMediaPath))];
      const described = await Promise.all(referenced.map(ruta => this._describe(ruta)));
      const entries = described.filter(Boolean);
      const prune = entries.length === referenced.length;

      const { missing = [] } = await this.transport.manifest({ files: entries, prune });
      const wanted = new Set(entries.map(entry => entry.ruta));
      let uploaded = 0;
      for (const ruta of missing) {
        if (uploaded >= this.maxUploadsPerTick) break;
        if (!wanted.has(ruta)) continue;
        const entry = entries.find(candidate => candidate.ruta === ruta);
        const data = await this.files.readFile(localFileFor(this.mediaDir, ruta));
        await this.transport.upload({ ruta, sha256: entry.sha256, data });
        uploaded += 1;
      }
      if (uploaded > 0) console.log(`🖼️ ${uploaded} foto(s) de productos sincronizadas con el portal.`);
      // Quedaron pendientes por el tope: se continúa enseguida en vez de esperar al siguiente ciclo.
      if (missing.length > uploaded) setTimeout(() => void this.tick(), 1000).unref?.();
      if (this.consecutiveFailures > 0) console.log(`🔄 Sincronización de fotos restablecida tras ${this.consecutiveFailures} fallo(s).`);
      this.consecutiveFailures = 0;
    } catch (err) {
      if (this.consecutiveFailures === 0) console.error('⚠️ No se pudieron sincronizar las fotos con el portal:', err.message);
      this.consecutiveFailures += 1;
    } finally {
      this.running = false;
    }
  }

  start() {
    if (this.timer) return;
    console.log(`🖼️ MediaSyncWorker iniciado (cada ${this.intervalMs / 1000}s).`);
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = MediaSyncWorker;
