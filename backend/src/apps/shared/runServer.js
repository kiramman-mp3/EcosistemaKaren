require('dotenv').config();
// Antes de cualquier fecha: el día de negocio (caducidades, FEFO) es el de Ecuador.
require('../../domain/policies/BusinessDates').applyBusinessTimezone();

// Arranca un servicio con apagado ordenado. `createServer` devuelve la app de Express.
async function runServer({ createServer, label, port }) {
  let server;
  let app;
  let isShuttingDown = false;

  const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n🛑 Recibida señal ${signal}. Iniciando apagado ordenado...`);

    const forceExitTimeout = setTimeout(() => {
      console.error('⚠️ Tiempo límite de apagado alcanzado (10s). Forzando cierre del proceso.');
      process.exit(1);
    }, 10000);
    forceExitTimeout.unref?.();

    try {
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((err) => {
            if (err) return reject(err);
            console.log('🔒 Servidor HTTP cerrado (no se aceptan nuevas conexiones).');
            resolve();
          });
        });
      }

      if (app?.locals?.shutdown) {
        await app.locals.shutdown();
        console.log('🧹 Recursos en segundo plano, SSE y conexiones DB liberados.');
      }

      console.log('✅ Apagado ordenado completado exitosamente.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error durante el apagado ordenado:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

  try {
    app = await createServer();
    server = app.listen(port, () => {
      console.log(`\n🚀 ${label} iniciado correctamente en puerto ${port}`);
      console.log(`🌐 Base URL: http://localhost:${port}/api/v1`);
      if (app.locals.swaggerEnabled) console.log(`📖 Documentación Swagger UI: http://localhost:${port}/api-docs\n`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}

module.exports = runServer;
