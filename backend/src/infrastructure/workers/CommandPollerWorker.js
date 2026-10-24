const defaultSleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// store-api: pide comandos de reserva al portal con long-poll, los ejecuta en orden y encola el
// resultado en la bandeja de salida. Si un comando falla de forma inesperada no se informa nada:
// el portal lo vuelve a entregar pasado su plazo de visibilidad.
class CommandPollerWorker {
  constructor({ channel, processor, outbox, onResultsQueued, waitSeconds = 25, limit = 20, sleep = defaultSleep }) {
    this.channel = channel;
    this.processor = processor;
    this.outbox = outbox;
    this.onResultsQueued = onResultsQueued;
    this.waitSeconds = waitSeconds;
    this.limit = limit;
    this.sleep = sleep;
    this.stopped = true;
    this.abort = null;
    this.loop = null;
    this.consecutiveFailures = 0;
  }

  async pollOnce() {
    this.abort = new AbortController();
    const commands = await this.channel.fetchCommands({
      waitSeconds: this.waitSeconds, limit: this.limit, signal: this.abort.signal
    });
    let queued = 0;
    for (const command of commands) {
      try {
        const body = await this.processor.execute(command);
        await this.outbox.enqueue({
          tipo: 'COMMAND_RESULT',
          clave: `result:${command.id}`,
          payload: { commandId: command.id, body }
        });
        queued += 1;
      } catch (err) {
        console.error(`⚠️ No se pudo procesar el comando ${command.id} (${command.tipo}):`, err.message);
      }
    }
    // Los resultados salen de inmediato: el cliente está esperando la respuesta de su reserva.
    if (queued > 0 && this.onResultsQueued) await this.onResultsQueued();
    return commands.length;
  }

  async _run() {
    while (!this.stopped) {
      try {
        await this.pollOnce();
        if (this.consecutiveFailures > 0) {
          console.log(`🔌 Comunicación con el portal restablecida tras ${this.consecutiveFailures} fallo(s).`);
        }
        this.consecutiveFailures = 0;
      } catch (err) {
        if (this.stopped) break;
        if (this.consecutiveFailures === 0) {
          console.error('⚠️ No se pudieron pedir comandos al portal:', err.message);
        }
        this.consecutiveFailures += 1;
        await this.sleep(Math.min(30000, 1000 * 2 ** Math.min(this.consecutiveFailures, 5)));
      }
    }
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    console.log(`📥 CommandPollerWorker iniciado (long-poll de ${this.waitSeconds}s).`);
    this.loop = this._run();
  }

  async stop() {
    this.stopped = true;
    this.abort?.abort();
    await this.loop?.catch(() => {});
    this.loop = null;
  }
}

module.exports = CommandPollerWorker;
