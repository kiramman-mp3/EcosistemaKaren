const crypto = require('node:crypto');
const { SECTION_ORDER } = require('../sync/catalogSections');

// Publica al portal los snapshots de catálogo. En cada ciclo lee todas las secciones, pero solo
// envía las que cambiaron desde el último envío confirmado (o todas cada `resyncMs`, para que
// el portal se recupere si perdió datos). Una falla se registra y el siguiente ciclo reintenta.
class CatalogSyncWorker {
  constructor({ reader, transport, intervalMs = 15000, resyncMs = 600000, clock = () => Date.now() }) {
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
        const hash = crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex');
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
