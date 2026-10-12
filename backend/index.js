require('dotenv').config();
// Antes de cualquier fecha: el día de negocio (caducidades, FEFO) es el de Ecuador.
require('./src/domain/policies/BusinessDates').applyBusinessTimezone();
const createServer = require('./src/infrastructure/http/server');

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    const app = await createServer();
    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor Ecosistema Karen iniciado correctamente en puerto ${PORT}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}/api/v1`);
      if (app.locals.swaggerEnabled) console.log(`📖 Documentación Swagger UI: http://localhost:${PORT}/api-docs\n`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}

bootstrap();
