// Canal SSE de alertas para el personal. Un stream queda abierto muchas horas, así que además de
// enviar alertas cierra la conexión cuando el token con que se abrió expira o se revoca (cierre de
// sesión): sin eso, una sesión terminada seguiría recibiendo alertas hasta que el cliente se desconecte.
class AlertStreamManager {
  /**
   * @param {object} [options]
   * @param {(jti: string) => Promise<boolean>} [options.isRevoked] consulta si un token fue revocado
   * @param {number} [options.revocationCheckMs] cada cuánto se consulta (60 s por defecto)
   * @param {() => number} [options.clock] reloj en ms, para pruebas
   */
  constructor({ isRevoked = null, revocationCheckMs = 60000, clock = () => Date.now() } = {}) {
    this.clients = new Map();
    this.isRevoked = isRevoked;
    this.revocationCheckMs = revocationCheckMs;
    this.clock = clock;
  }

  addClient(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Enviar mensaje de bienvenida / handshake SSE
    res.write(`data: ${JSON.stringify({ message: 'Conectado al canal SSE de alertas del Supermercado Karen' })}\n\n`);

    res.write('retry: 5000\n\n');
    const heartbeat = setInterval(() => {
      if (!res.writableEnded && !res.destroyed) res.write(': heartbeat\n\n');
    }, 25000);
    heartbeat.unref?.();
    const timers = [heartbeat];

    // Cierre al expirar el token. `exp` viene en segundos desde epoch.
    const exp = Number(req.user?.exp);
    if (Number.isFinite(exp) && exp > 0) {
      const expiry = setTimeout(
        () => this.closeClient(res, 'session-expired', 'La sesión expiró.'),
        Math.max(0, exp * 1000 - this.clock())
      );
      expiry.unref?.();
      timers.push(expiry);
    }

    // Cierre si el token se revoca (cierre de sesión) mientras el stream sigue abierto.
    if (this.isRevoked && req.user?.jti) {
      const revocation = setInterval(async () => {
        try {
          if (await this.isRevoked(req.user.jti)) this.closeClient(res, 'session-revoked', 'La sesión se cerró.');
        } catch {
          // Si la consulta falla se reintenta en la siguiente vuelta.
        }
      }, this.revocationCheckMs);
      revocation.unref?.();
      timers.push(revocation);
    }

    this.clients.set(res, timers);
    console.log(`📡 Nuevo cliente conectado a SSE (Total clientes: ${this.clients.size})`);

    req.on('close', () => {
      this._release(res);
      console.log(`📡 Cliente desconectado de SSE (Total clientes: ${this.clients.size})`);
    });
  }

  _release(response) {
    const timers = this.clients.get(response);
    if (!timers) return;
    for (const timer of timers) {
      clearInterval(timer);
      clearTimeout(timer);
    }
    this.clients.delete(response);
  }

  /** Avisa al cliente el motivo y cierra su conexión; el cliente deberá volver a autenticarse. */
  closeClient(response, event, message) {
    if (!response.writableEnded && !response.destroyed) {
      response.write(`event: ${event}\ndata: ${JSON.stringify({ message })}\n\n`);
      response.end();
    }
    this._release(response);
  }

  broadcastAlert(alertEvent) {
    const data = `data: ${JSON.stringify(alertEvent)}\n\n`;
    for (const response of [...this.clients.keys()]) {
      if (response.writableEnded || response.destroyed) {
        this._release(response);
      } else {
        response.write(data);
      }
    }
  }

  closeAll() {
    for (const response of [...this.clients.keys()]) {
      if (!response.writableEnded && !response.destroyed) {
        response.write('event: shutdown\ndata: {"message":"Servidor cerrando"}\n\n');
        response.end();
      }
      this._release(response);
    }
    this.clients.clear();
  }
}

module.exports = AlertStreamManager;
