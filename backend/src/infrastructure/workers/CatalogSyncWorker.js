const crypto = require('node:crypto');
const { SECTION_ORDER } = require('../sync/catalogSections');

// Publica al portal los snapshots de catálogo. En cada ciclo lee todas las secciones, pero solo
// envía las que cambiaron desde el último envío confirmado (o todas cada `resyncMs`, para que
// el portal se recupere si perdió datos). Una falla se registra y el siguiente ciclo reintenta.
class CatalogSyncWorker {
  constructor({ reader, transport, intervalMs = 15000, resyncMs = 600000, warnBytes = 2 * 1024 * 1024, clock = () => Date.now() }) {
    this.reader = reader;
    this.transport = transport;
    this.intervalMs = intervalMs;
    this.resyncMs = resyncMs;
    this.clock = clock;
    this.timer = null;
    this.running = false;
    this.version = 0;
    this.sent = new Map();
    this.consecutiveFailures = 0;
    this.warnBytes = warnBytes;
    this.warned = new Map();
    // Tamaño (bytes) del último snapshot enviado de cada sección, para medir cuánto crece el catálogo.
    this.stats = new Map();
  }

  // Avisa (como máximo una vez por hora y sección) si un snapshot se acerca al límite del canal interno;
  // es la señal para pasar de snapshots completos a cambios parciales.
  _watchSize(section, bytes, now) {
    this.stats.set(section, bytes);
    if (bytes < this.warnBytes) return;
    const lastWarning = this.warned.get(section);
    if (lastWarning !== undefined && now - lastWarning < 60 * 60 * 1000) return;
    this.warned.set(section, now);
    console.warn(`⚠️ El snapshot de '${section}' pesa ${(bytes / 1048576).toFixed(1)} MB; considere sincronizar solo los cambios.`);
  }

  _nextVersion() {
    this.version = Math.max(this.version + 1, this.clock());
    return this.version;
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      for (const section of SECTION_ORDER) {
        const items = await this.reader.read(section);
        const serialized = JSON.stringify(items);
        const hash = crypto.createHash('sha256').update(serialized).digest('hex');
        this._watchSize(section, Buffer.byteLength(serialized), this.clock());
        const previous = this.sent.get(section);
        const now = this.clock();
        if (previous && previous.hash === hash && now - previous.at < this.resyncMs) continue;

        const response = await this.transport.send({ section, version: this._nextVersion(), items });
        if (response && response.applied === false && Number.isFinite(response.currentVersion)) {
          // El portal ya tiene una versión igual o mayor (p. ej. por un reloj atrasado):
          // se sube la propia y se reenvía en el próximo ciclo.
          this.version = Math.max(this.version, response.currentVersion);
          continue;
        }
        this.sent.set(section, { hash, at: now });
      }
      if (this.consecutiveFailures > 0) {
        console.log(`🔄 Sincronización de catálogo restablecida tras ${this.consecutiveFailures} fallo(s).`);
      }
      this.consecutiveFailures = 0;
    } catch (err) {
      // Solo se registra el primer fallo de cada racha para no inundar el log sin conexión.
      if (this.consecutiveFailures === 0) {
        console.error('⚠️ No se pudo sincronizar el catálogo con el portal:', err.message);
      }
      this.consecutiveFailures += 1;
    } finally {
      this.running = false;
    }
  }

  start() {
    if (this.timer) return;
    console.log(`🔄 CatalogSyncWorker iniciado (cada ${this.intervalMs / 1000}s, reenvío completo cada ${this.resyncMs / 1000}s).`);
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

module.exports = CatalogSyncWorker;
