// Latido en proceso para el monolito de transición, donde tienda y portal comparten monitor.
class LocalHeartbeatTransport {
  constructor(heartbeatMonitor) {
    this.heartbeatMonitor = heartbeatMonitor;
  }

  async send() {
    await this.heartbeatMonitor.recordHeartbeat();
  }
}

module.exports = LocalHeartbeatTransport;
