class AlertStreamManager {
  constructor() {
    this.clients = new Set();
  }

  addClient(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Enviar mensaje de bienvenida / handshake SSE
    res.write(`data: ${JSON.stringify({ message: 'Conectado al canal SSE de alertas del Supermercado Karen' })}\n\n`);

    this.clients.add(res);
    console.log(`📡 Nuevo cliente conectado a SSE (Total clientes: ${this.clients.size})`);

    req.on('close', () => {
      this.clients.delete(res);
      console.log(`📡 Cliente desconectado de SSE (Total clientes: ${this.clients.size})`);
    });
  }

  broadcastAlert(alertEvent) {
    const data = `data: ${JSON.stringify(alertEvent)}\n\n`;
    for (const client of this.clients) {
      client.write(data);
    }
  }
}

module.exports = AlertStreamManager;
