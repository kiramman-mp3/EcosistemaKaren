/**
 * Prueba de punta a punta de store-api y portal-api como dos procesos reales que hablan por HTTP, cada
 * uno con su propia base PostgreSQL (ADR-003).
 *
 *   npm run test:e2e-split
 *
 * Variables: DB_* (base de la tienda, con el esquema inicial init-db/store/01-schema.sql) y
 * PORTAL_DB_NAME (base del portal, vacía y distinta de la de la tienda). Usar bases descartables:
 * el script crea su propio personal, categoría, producto y lote, y no los borra.
 */
require('dotenv').config();
const { spawn } = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const BACKEND = path.resolve(__dirname, '..');
const STORE_PORT = Number(process.env.E2E_STORE_PORT) || 4100;
const PORTAL_PORT = Number(process.env.E2E_PORTAL_PORT) || 4101;
const STORE_DB = process.env.DB_NAME || 'ecosistema_karen';
const PORTAL_DB = process.env.PORTAL_DB_NAME;
const SERVICE_KEY = crypto.randomBytes(24).toString('hex');
const STAMP = Date.now();
const PASSWORD = 'ClaveSegura123';

if (!PORTAL_DB || PORTAL_DB === STORE_DB) {
  console.error('Defina PORTAL_DB_NAME con una base distinta de DB_NAME para el portal.');
  process.exit(2);
}

const connection = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'karen_user',
  password: process.env.DB_PASSWORD || 'karen_pass'
};
const storeDb = new Pool({ ...connection, database: STORE_DB, max: 2 });
const portalDb = new Pool({ ...connection, database: PORTAL_DB, max: 2 });

const serviceEnv = {
  ...process.env,
  NODE_ENV: 'development',
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  DB_NAME: STORE_DB,
  PORTAL_DB_NAME: PORTAL_DB,
  STORE_SERVICE_KEY: SERVICE_KEY,
  PORTAL_URL: `http://127.0.0.1:${PORTAL_PORT}`,
  HEARTBEAT_TIMEOUT_SECONDS: '10',
  CATALOG_SYNC_INTERVAL_SECONDS: '5',
  RESERVATION_SYNC_WAIT_SECONDS: '3',
  SWAGGER_ENABLED: 'false',
  RATE_LIMIT_MAX: '1000000',
  AUTH_RATE_LIMIT_MAX: '1000000',
  RESERVATION_RATE_LIMIT_MAX: '1000000'
};

const processes = {};
const logs = [];
function startService(name, script, port, portVariable) {
  const child = spawn(process.execPath, [script], { cwd: BACKEND, env: { ...serviceEnv, [portVariable]: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => logs.push(`[${name}] ${chunk}`));
  child.stderr.on('data', chunk => logs.push(`[${name}] ${chunk}`));
  processes[name] = child;
}
const stopService = async (name) => { processes[name]?.kill(); await sleep(500); };
const startStore = () => startService('store', 'index.store.js', STORE_PORT, 'STORE_PORT');
const startPortal = () => startService('portal', 'index.portal.js', PORTAL_PORT, 'PORTAL_PORT');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(fn, ms = 30000, step = 250) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(step);
  }
  return null;
}

async function http(port, method, route, body, token) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1${route}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  } catch {
    return { status: 0, body: {} };
  }
}
const portal = (method, route, body, token) => http(PORTAL_PORT, method, route, body, token);
const store = (method, route, body, token) => http(STORE_PORT, method, route, body, token);

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? '✔' : '✖'} ${label}${detail ? ` -> ${detail}` : ''}`);
}

async function stockOf(lotId) {
  const row = (await storeDb.query('SELECT cantidad_disponible AS d, cantidad_reservada AS r FROM lotes WHERE id = $1', [lotId])).rows[0];
  return row;
}

async function provisionStore() {
  const hash = await bcrypt.hash(PASSWORD, 4);
  const staffEmail = `e2e.bodega.${STAMP}@example.test`;
  await storeDb.query("INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES ('Bodega E2E', $1, 'BODEGUERO', $2)", [staffEmail, hash]);
  const category = (await storeDb.query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id', [`Categoría E2E ${STAMP}`])).rows[0].id;
  const product = (await storeDb.query(
    "INSERT INTO productos (categoria_id, codigo_barras, nombre, precio_venta) VALUES ($1, $2, 'Producto E2E', 2.5) RETURNING id",
    [category, String(STAMP).padStart(13, '7')]
  )).rows[0].id;
  const lot = (await storeDb.query(
    `INSERT INTO lotes (producto_id, numero_lote, fecha_elaboracion, fecha_caducidad, costo_unitario, cantidad_ingresada, cantidad_disponible)
     VALUES ($1, $2, CURRENT_DATE - 5, CURRENT_DATE + 60, 1.2, 50, 50) RETURNING id`,
    [product, `E2E-${STAMP}`]
  )).rows[0].id;
  return { staffEmail, productId: product, lotId: lot };
}

async function run() {
  startPortal();
  await waitFor(async () => (await portal('GET', '/')).status === 200);
  startStore();
  await waitFor(async () => (await store('GET', '/')).status === 200);
  const data = await provisionStore();

  console.log('\nLatido y catálogo');
  check('el portal recibe el latido de la tienda', Boolean(await waitFor(async () => (await portal('GET', '/heartbeat')).body.status === 'ONLINE')));
  const synced = await waitFor(async () => {
    const status = (await portal('GET', '/catalog/status')).body;
    return status.stale === false && status.sections?.length === 4 && (await portal('GET', '/availability')).body.data?.some(lot => lot.id === data.lotId);
  }, 45000);
  check('el lote creado en la tienda aparece en la disponibilidad del portal', Boolean(synced));
  const mirrored = (await portalDb.query('SELECT costo_unitario, fecha_elaboracion, cantidad_reservada FROM lotes WHERE id = $1', [data.lotId])).rows[0];
  check('no viajan costos, fecha de elaboración ni reservas al portal', mirrored && mirrored.costo_unitario === null && mirrored.fecha_elaboracion === null && mirrored.cantidad_reservada === 0);

  console.log('\nCuentas');
  const registered = await portal('POST', '/auth/register', { nombre: 'Cliente E2E', email: `e2e.cliente.${STAMP}@example.test`, password: PASSWORD });
  const client = registered.body.data?.token;
  const clientId = registered.body.data?.user?.id;
  check('registro de cliente en portal-api', registered.status === 201 && Boolean(client), String(registered.status));
  const staff = (await store('POST', '/auth/login', { email: data.staffEmail, password: PASSWORD })).body.data?.token;
  check('login del bodeguero en store-api', Boolean(staff));
  check('store-api no ofrece el registro público', (await store('POST', '/auth/register', { nombre: 'Intruso', email: `intruso.${STAMP}@example.test`, password: PASSWORD })).status === 404);
  check('el cliente no existe en la base de la tienda', (await storeDb.query('SELECT 1 FROM usuarios WHERE id = $1', [clientId])).rows.length === 0);

  console.log('\nReserva, caja y cancelación');
  const before = await stockOf(data.lotId);
  const started = Date.now();
  const reservation = await portal('POST', '/reservations', { items: [{ productoId: data.productId, cantidad: 2 }] }, client);
  check('POST /reservations responde 201 con código en la misma llamada', reservation.status === 201 && /^KR-/.test(reservation.body.data?.codigoRetiro || ''), `${reservation.status} (${Date.now() - started} ms)`);
  const reservationId = reservation.body.data?.id;
  const after = await stockOf(data.lotId);
  check('el stock se descuenta solo en la tienda', after.r === before.r + 2 && after.d === before.d - 2);
  const inStore = (await storeDb.query('SELECT estado, cliente_nombre FROM reservas WHERE id = $1', [reservationId])).rows[0];
  check('la reserva existe en la tienda con el mismo id y el nombre del cliente', inStore?.estado === 'PENDIENTE' && inStore?.cliente_nombre === 'Cliente E2E');
  const lookup = await store('GET', `/reservations/code/${reservation.body.data?.codigoRetiro}`, null, staff);
  check('caja encuentra el código del cliente remoto', lookup.status === 200 && lookup.body.data?.clienteNombre === 'Cliente E2E');

  const confirm = await store('POST', `/reservations/${reservationId}/confirm`, {}, staff);
  check('el bodeguero confirma el cobro', confirm.status === 200);
  check('el portal pasa a CONFIRMADA por el aviso de la tienda', Boolean(await waitFor(async () => (await portalDb.query('SELECT estado FROM reservas_portal WHERE id = $1', [reservationId])).rows[0].estado === 'CONFIRMADA', 15000)));
  check('la bandeja de salida queda vacía', Boolean(await waitFor(async () => (await storeDb.query('SELECT count(*)::int n FROM outbox_portal WHERE enviado_at IS NULL')).rows[0].n === 0, 15000)));

  check('sin stock suficiente responde 409', (await portal('POST', '/reservations', { items: [{ productoId: data.productId, cantidad: 9000 }] }, client)).status === 409);

  const mid = await stockOf(data.lotId);
  const second = await portal('POST', '/reservations', { items: [{ productoId: data.productId, cantidad: 1 }] }, client);
  const cancelled = await portal('POST', `/reservations/${second.body.data?.id}/cancel`, {}, client);
  check('el cliente cancela y el portal responde CANCELADA', cancelled.status === 200 && cancelled.body.data?.estado === 'CANCELADA');
  check('la tienda libera el stock por el comando CANCEL', Boolean(await waitFor(async () => { const s = await stockOf(data.lotId); return s.r === mid.r && s.d === mid.d; }, 15000)));

  console.log('\nDatos inválidos y concurrencia');
  check('un productoId que no es UUID responde 400 y no encola nada', (await portal('POST', '/reservations', { items: [{ productoId: 'abc', cantidad: 1 }] }, client)).status === 400);
  await storeDb.query('UPDATE lotes SET cantidad_disponible = 5, cantidad_reservada = 0 WHERE id = $1', [data.lotId]);
  const attempts = await Promise.all(Array.from({ length: 8 }, () => portal('POST', '/reservations', { items: [{ productoId: data.productId, cantidad: 1 }] }, client)));
  const accepted = attempts.filter(attempt => attempt.status === 201).length;
  const left = await stockOf(data.lotId);
  check('8 reservas simultáneas sobre 5 unidades: sin sobreventa', accepted === 5 && attempts.every(attempt => [201, 409].includes(attempt.status)) && left.d === 0, `${accepted} aceptadas, disponible ${left.d}`);

  console.log('\nTienda caída');
  await storeDb.query('UPDATE lotes SET cantidad_disponible = 20, cantidad_reservada = 0 WHERE id = $1', [data.lotId]);
  await stopService('store');
  const pending = await portal('POST', '/reservations', { items: [{ productoId: data.productId, cantidad: 1 }] }, client);
  check('con la tienda caída y el latido vigente responde 202 PENDIENTE_SYNC', pending.status === 202 && pending.body.data?.estado === 'PENDIENTE_SYNC', `${pending.status} ${pending.body.data?.estado}`);
  startStore();
  check('al volver la tienda la reserva se acepta con su código', Boolean(await waitFor(async () => (await portalDb.query('SELECT estado FROM reservas_portal WHERE id = $1', [pending.body.data.id])).rows[0]?.estado === 'PENDIENTE', 40000)));

  await stopService('store');
  check('sin la tienda el portal marca OFFLINE', Boolean(await waitFor(async () => (await portal('GET', '/heartbeat')).body.status === 'OFFLINE', 30000)));
  const blocked = await portal('POST', '/reservations', { items: [{ productoId: data.productId, cantidad: 1 }] }, client);
  check('sin latido POST /reservations responde 503', blocked.status === 503, String(blocked.status));
  const reservations = (await portalDb.query('SELECT count(*)::int n FROM reservas_portal WHERE cliente_id = $1', [clientId])).rows[0].n;
  check('no se guardó ninguna reserva nueva', reservations === 12, `${reservations} reservas del cliente`);
  startStore();
  check('al volver la tienda el portal vuelve a ONLINE', Boolean(await waitFor(async () => (await portal('GET', '/heartbeat')).body.status === 'ONLINE', 30000)));
}

async function main() {
  try {
    await run();
  } catch (error) {
    failures += 1;
    console.error('ERROR en la prueba:', error);
  } finally {
    await stopService('store');
    await stopService('portal');
    await storeDb.end();
    await portalDb.end();
    const warnings = logs.join('').split('\n').filter(line => /Error no controlado|❌/.test(line)).slice(0, 5);
    if (warnings.length) {
      console.log('\nErrores no controlados en los servicios:');
      warnings.forEach(line => console.log(`  ${line.slice(0, 160)}`));
      failures += 1;
    }
    console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobación(es) fallaron.`);
    process.exit(failures === 0 ? 0 : 1);
  }
}

main();
