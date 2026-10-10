class AlertStreamManager {
  constructor() {
    this.clients = new Map();
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
    this.clients.set(res, heartbeat);
    console.log(`📡 Nuevo cliente conectado a SSE (Total clientes: ${this.clients.size})`);

    req.on('close', () => {
      clearInterval(heartbeat);
      this.clients.delete(res);
      console.log(`📡 Cliente desconectado de SSE (Total clientes: ${this.clients.size})`);
    });
  }

  broadcastAlert(alertEvent) {
    const data = `data: ${JSON.stringify(alertEvent)}\n\n`;
    for (const [response, heartbeat] of this.clients) {
      if (response.writableEnded || response.destroyed) {
        clearInterval(heartbeat);
        this.clients.delete(response);
      } else {
        response.write(data);
      }
    }
  }
}

module.exports = AlertStreamManager;
