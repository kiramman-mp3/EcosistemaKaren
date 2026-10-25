/**
 * Prueba de humo de los servicios (ADR-003): arranca store-api, portal-api y el monolito de
 * transición en puertos efímeros y comprueba que cada uno expone solo las rutas que le tocan.
 *
 *   npm run test:services
 *
 * Usa la base de datos configurada (DB_*, PORTAL_DB_*) y, si no hay PostgreSQL, el respaldo en
 * memoria. Los procesos de fondo y la comunicación entre servicios se desactivan; esto solo mira rutas.
 */
require('dotenv').config();
const crypto = require('crypto');

process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
process.env.STORE_SERVICE_KEY = process.env.STORE_SERVICE_KEY || crypto.randomBytes(24).toString('hex');
process.env.HEARTBEAT_ENABLED = 'false';
process.env.CATALOG_SYNC_ENABLED = 'false';
process.env.RESERVATION_QUEUE_ENABLED = 'false';
// Las comprobaciones provocan 400/401 a propósito; con los límites normales, varias corridas seguidas
// llegarían a 429 porque el contador de intentos fallidos se guarda en la base de datos.
process.env.AUTH_RATE_LIMIT_MAX = '1000000';
process.env.RATE_LIMIT_MAX = '1000000';

const { testConnection, closePool } = require('../src/infrastructure/db/postgres');

const SERVICES = [
  {
    name: 'store-api',
    load: () => require('../src/apps/store/createStoreServer'),
    expect: [
      ['GET', '/api/v1/', 200],
      ['GET', '/api/v1/categories', 200],
      ['GET', '/api/v1/availability', 200],
      ['GET', '/api/v1/lots', 401],
      ['GET', '/api/v1/promotions/pending', 401],
      ['GET', '/api/v1/reservations/user/x', 404],
      ['GET', '/api/v1/catalog/status', 404],
      ['POST', '/api/v1/auth/register', 404],
      ['POST', '/internal/v1/store/heartbeat', 404]
    ]
  },
  {
    name: 'portal-api',
    load: () => require('../src/apps/portal/createPortalServer'),
    expect: [
      ['GET', '/api/v1/', 200],
      ['GET', '/api/v1/categories', 200],
      ['GET', '/api/v1/availability', 200],
      ['GET', '/api/v1/lots', 404],
      ['GET', '/api/v1/promotions/pending', 404],
      ['GET', '/api/v1/reservations/user/x', 401],
      ['GET', '/api/v1/catalog/status', 200],
      ['POST', '/api/v1/auth/register', 400],
      ['POST', '/internal/v1/store/heartbeat', 401]
    ]
  },
  {
    name: 'monolito',
    load: () => require('../src/infrastructure/http/server'),
    expect: [
      ['GET', '/api/v1/', 200],
      ['GET', '/api/v1/lots', 401],
      ['GET', '/api/v1/reservations/user/x', 401],
      ['GET', '/api/v1/catalog/status', 200],
      ['POST', '/internal/v1/store/heartbeat', 401]
    ]
  }
];

async function main() {
  const reachable = await testConnection();
  console.log(reachable ? 'Base de datos: PostgreSQL' : 'Base de datos: respaldo en memoria');
  let failures = 0;

  for (const service of SERVICES) {
    const app = await service.load()();
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      for (const [method, path, expected] of service.expect) {
        const response = await fetch(base + path, { method });
        const ok = response.status === expected;
        if (!ok) failures += 1;
        console.log(`${ok ? '✔' : '✖'} ${service.name} ${method} ${path} -> ${response.status}${ok ? '' : ` (se esperaba ${expected})`}`);
      }
    } finally {
      await new Promise(resolve => server.close(resolve));
      await app.locals.shutdown();
    }
  }

  await closePool();
  if (failures > 0) {
    console.error(`\n${failures} comprobación(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodos los servicios exponen las rutas esperadas.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
