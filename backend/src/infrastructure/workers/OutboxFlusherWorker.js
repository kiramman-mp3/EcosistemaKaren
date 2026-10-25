const EVENT_BATCH_SIZE = 200;
const PRUNE_EVERY_MS = 60 * 60 * 1000;

// Vacía la bandeja de salida hacia el portal en orden. Un fallo de red o un 5xx detiene el ciclo
// y reintenta más tarde con espera creciente; un 4xx permanente en una fila no bloquea las demás.
class OutboxFlusherWorker {
  constructor({ outbox, channel, intervalMs = 2000, batchSize = 50, clock = () => Date.now() }) {
    this.outbox = outbox;
    this.channel = channel;
    this.intervalMs = intervalMs;
    this.batchSize = batchSize;
    this.clock = clock;
    this.timer = null;
    this.running = false;
    this.consecutiveFailures = 0;
    this.lastPrune = 0;
  }

  async flush() {
    if (this.running) return { sent: 0 };
    this.running = true;
    let sent = 0;
    try {
      const rows = await this.outbox.claimDue(this.batchSize);
      let index = 0;
      while (index < rows.length) {
        const row = rows[index];
        let group = [row];
        if (row.tipo === 'RESERVATION_STATE') {
          group = [];
          while (index + group.length < rows.length && rows[index + group.length].tipo === 'RESERVATION_STATE'
            && group.length < EVENT_BATCH_SIZE) {
            group.push(rows[index + group.length]);
          }
        }

        try {
          await this._send(group);
          await this.outbox.markSent(group.map(item => item.id));
          sent += group.length;
          index += group.length;
        } catch (err) {
          const permanent = err.status >= 400 && err.status < 500 && ![401, 403, 408, 429].includes(err.status);
          if (err.status === 404) {
            // El portal no conoce el comando: no hay a quién informar.
            console.warn(`⚠️ El portal no conoce ${row.clave}; se descarta de la bandeja de salida.`);
            await this.outbox.markSent(group.map(item => item.id));
            index += group.length;
            continue;
          }
          await this.outbox.markFailed(group.map(item => item.id), err.message, row.intentos);
          if (this.consecutiveFailures === 0) {
            console.error('⚠️ No se pudo enviar la bandeja de salida al portal:', err.message);
          }
          this.consecutiveFailures += 1;
          if (!permanent) break;
          index += group.length;
        }
      }
      if (sent > 0 && this.consecutiveFailures > 0) {
        console.log('📤 Bandeja de salida restablecida: el portal vuelve a recibir los avisos.');
        this.consecutiveFailures = 0;
      }
      await this._maybePrune();
    } catch (err) {
      console.error('⚠️ Error en OutboxFlusherWorker:', err.message);
    } finally {
      this.running = false;
    }
    return { sent };
  }

  async _send(group) {
    const [first] = group;
    if (first.tipo === 'COMMAND_RESULT') {
      await this.channel.sendResult(first.payload.commandId, first.payload.body);
    } else if (first.tipo === 'RESERVATION_STATE') {
      await this.channel.sendEvents(group.map(item => item.payload));
    } else {
      throw Object.assign(new Error(`Tipo de salida desconocido: ${first.tipo}`), { status: 400 });
    }
  }

  async _maybePrune() {
    const now = this.clock();
    if (now - this.lastPrune < PRUNE_EVERY_MS) return;
    this.lastPrune = now;
    await this.outbox.pruneSent();
  }

  start() {
    if (this.timer) return;
    console.log(`📤 OutboxFlusherWorker iniciado (cada ${this.intervalMs / 1000}s).`);
    void this.flush();
    this.timer = setInterval(() => void this.flush(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = OutboxFlusherWorker;
