/**
 * Sondeos de robustez contra la API con PostgreSQL real: ningún dato inválido o repetido debe
 * producir un error 500, y la autorización básica debe mantenerse.
 *
 *   npm run test:http-errors
 *
 * Arranca el monolito en un puerto efímero con la base configurada (DB_*) y crea sus propios
 * usuarios de personal. Usar una base descartable: deja categorías, productos y reservas de prueba.
 */
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_MAX = '1000000';
process.env.AUTH_RATE_LIMIT_MAX = '1000000';
process.env.RESERVATION_RATE_LIMIT_MAX = '1000000';

const { getPool, testConnection, closePool } = require('../src/infrastructure/db/postgres');
const createServer = require('../src/infrastructure/http/server');

const stamp = Date.now();
const PASSWORD = 'ClaveSegura123';
const results = [];
let base;

async function call(method, path, body, token) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = {}; }
  return { status: response.status, body: json };
}

function check(id, description, ok, detail) {
  results.push({ id, ok });
  console.log(`${ok ? '✔' : '✖'} ${id.padEnd(3)} ${description}${detail ? ` -> ${detail}` : ''}`);
}

const expectStatus = (id, description, response, accepted) =>
  check(id, description, accepted.includes(response.status), `${response.status}${accepted.includes(response.status) ? '' : ` (se esperaba ${accepted.join('/')})`}`);

// Varias solicitudes iguales a la vez: exactamente una se acepta y el resto es un conflicto, nunca un 500.
function expectOneWinner(id, description, responses) {
  const statuses = responses.map(r => r.status);
  const created = statuses.filter(s => s === 201).length;
  const conflicts = statuses.filter(s => s === 409).length;
  check(id, description, created === 1 && created + conflicts === statuses.length, `estados: ${statuses.join(',')}`);
}

async function createStaff(pool, role) {
  const email = `sondeo.${role.toLowerCase()}.${stamp}@example.test`;
  const hash = await bcrypt.hash(PASSWORD, 4);
  await pool.query('INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES ($1, $2, $3, $4)', [`Sondeo ${role}`, email, role, hash]);
  const login = await call('POST', '/auth/login', { email, password: PASSWORD });
  return login.body.data?.token;
}

async function main() {
  if (!(await testConnection())) {
    console.error('Este script necesita PostgreSQL (DB_*). Use una base descartable.');
    process.exit(2);
  }
  const app = await createServer();
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
  const pool = getPool();

  try {
    // El monolito emite su propio latido; las reservas se aceptan al recibir el primero.
    for (let i = 0; i < 40; i++) {
      if ((await call('GET', '/heartbeat')).body.status === 'ONLINE') break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    const admin = await createStaff(pool, 'ADMIN');
    const warehouse = await createStaff(pool, 'BODEGUERO');
    const registered = await call('POST', '/auth/register', { nombre: 'Cliente Sondeo', email: `cliente.${stamp}@example.test`, password: PASSWORD });
    const client = registered.body.data?.token;
    const clientId = registered.body.data?.user?.id;

    const category = (await call('POST', '/categories', { nombre: `Categoría sondeo ${stamp}` }, admin)).body.data;
    const barcode = () => String(Math.floor(Math.random() * 1e13)).padStart(13, '7');
    const product = (await call('POST', '/products', { categoriaId: category.id, codigoBarras: barcode(), nombre: 'Producto de sondeo', precioVenta: 2.5 }, admin)).body.data;
    const lot = await call('POST', '/lots', {
      productoId: product.id, numeroLote: `SONDEO-${stamp}`, fechaElaboracion: '2026-01-01', fechaCaducidad: '2099-01-01', costoUnitario: 1, cantidadIngresada: 20
    }, warehouse);
    check('S0', 'preparación: categoría, producto y lote de sondeo', Boolean(category && product && lot.status === 201), String(lot.status));

    console.log('\nUnicidad y concurrencia');
    expectOneWinner('U1', 'registrar el mismo correo 6 veces a la vez',
      await Promise.all(Array.from({ length: 6 }, () => call('POST', '/auth/register', { nombre: 'Doble', email: `doble.${stamp}@example.test`, password: PASSWORD }))));
    const sharedBarcode = barcode();
    expectOneWinner('U2', 'crear el mismo producto 5 veces a la vez',
      await Promise.all(Array.from({ length: 5 }, () => call('POST', '/products', { categoriaId: category.id, codigoBarras: sharedBarcode, nombre: 'Producto duplicado', precioVenta: 1.5 }, admin))));
    expectOneWinner('U3', 'crear la misma categoría 5 veces a la vez',
      await Promise.all(Array.from({ length: 5 }, () => call('POST', '/categories', { nombre: `Categoría doble ${stamp}` }, admin))));

    console.log('\nIdentificadores que no son UUID');
    expectStatus('I1', 'POST /reservations con productoId "abc"', await call('POST', '/reservations', { items: [{ productoId: 'abc', cantidad: 1 }] }, client), [400]);
    expectStatus('I2', 'GET /reservations/user/abc', await call('GET', '/reservations/user/abc', undefined, warehouse), [400]);
    expectStatus('I3', 'POST /reservations/abc/confirm', await call('POST', '/reservations/abc/confirm', {}, warehouse), [400]);
    expectStatus('I4', 'POST /reservations/abc/cancel', await call('POST', '/reservations/abc/cancel', {}, client), [400]);
    expectStatus('I5', 'GET /products?categoriaId=abc', await call('GET', '/products?categoriaId=abc'), [400]);
    expectStatus('I6', 'PATCH /lots/abc/location', await call('PATCH', '/lots/abc/location', { ubicacion: 'PERCHA' }, warehouse), [400]);
    expectStatus('I7', 'PATCH /alerts/abc/atender', await call('PATCH', '/alerts/abc/atender', {}, warehouse), [400]);
    expectStatus('I8', 'POST /promotions/abc/approve', await call('POST', '/promotions/abc/approve', {}, admin), [400]);
    expectStatus('I9', 'POST /lots con productoId "abc"', await call('POST', '/lots', { productoId: 'abc', numeroLote: 'L1', fechaElaboracion: '2026-01-01', fechaCaducidad: '2027-01-01', costoUnitario: 1, cantidadIngresada: 5 }, warehouse), [400]);

    console.log('\nLargos que exceden las columnas');
    const lotBase = { productoId: product.id, fechaElaboracion: '2026-01-01', fechaCaducidad: '2099-01-01', costoUnitario: 1, cantidadIngresada: 5 };
    expectStatus('L1', 'número de lote de 80 caracteres', await call('POST', '/lots', { ...lotBase, numeroLote: 'L'.repeat(80) }, warehouse), [400]);
    expectStatus('L2', 'nombre de producto de 190 caracteres', await call('POST', '/products', { categoriaId: category.id, codigoBarras: barcode(), nombre: 'N'.repeat(190), precioVenta: 2 }, admin), [400]);
    expectStatus('L3', 'código de barras de 60 caracteres', await call('POST', '/products', { categoriaId: category.id, codigoBarras: '9'.repeat(60), nombre: 'Producto largo', precioVenta: 2 }, admin), [400]);
    expectStatus('L4', 'nombre de cliente de 150 caracteres', await call('POST', '/auth/register', { nombre: 'N'.repeat(150), email: `largo.${stamp}@example.test`, password: PASSWORD }), [400]);
    expectStatus('L5', 'correo de 200 caracteres', await call('POST', '/auth/register', { nombre: 'Largo', email: `${'a'.repeat(190)}@example.test`, password: PASSWORD }), [400]);

    console.log('\nAutorización y entradas hostiles');
    expectStatus('A1', 'un cliente no puede crear lotes', await call('POST', '/lots', lotBase, client), [403]);
    expectStatus('A2', 'sin token no se listan lotes', await call('GET', '/lots'), [401]);
    expectStatus('A3', 'un cliente no lee las reservas de otro', await call('GET', `/reservations/user/${product.id}`, undefined, client), [403]);
    expectStatus('A4', 'el registro público ignora un rol en el cuerpo', await call('POST', '/auth/register', { nombre: 'Intruso', email: `intruso.${stamp}@example.test`, password: PASSWORD, rol: 'ADMIN' }), [400]);
    expectStatus('A5', 'JSON con __proto__', await call('POST', '/auth/login', '{"email":"a@b.co","password":"x","__proto__":{"x":1}}'), [400]);
    const forged = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ id: clientId, rol: 'ADMIN' })).toString('base64url')}.`;
    expectStatus('A6', 'token sin firma (alg none)', await call('GET', '/auth/me', undefined, forged), [401]);
    expectStatus('A7', 'cantidad enorme en una reserva', await call('POST', '/reservations', { items: [{ productoId: product.id, cantidad: 9999999999 }] }, client), [400]);

    console.log('\nReservas');
    const reservation = await call('POST', '/reservations', { items: [{ productoId: product.id, cantidad: 1 }] }, client);
    expectStatus('R1', 'reserva normal', reservation, [201]);
    const otherToken = (await call('POST', '/auth/register', { nombre: 'Otro', email: `otro.${stamp}@example.test`, password: PASSWORD })).body.data?.token;
    expectStatus('R2', 'otro cliente no consulta el código de una reserva ajena', await call('GET', `/reservations/code/${reservation.body.data?.codigoRetiro}`, undefined, otherToken), [403]);
    expectStatus('R3', 'cancelar la reserva', await call('POST', `/reservations/${reservation.body.data?.id}/cancel`, {}, client), [200]);
    expectStatus('R4', 'cancelar por segunda vez', await call('POST', `/reservations/${reservation.body.data?.id}/cancel`, {}, client), [400]);
    const outOfStock = await Promise.all(Array.from({ length: 6 }, () => call('POST', '/reservations', { items: [{ productoId: product.id, cantidad: 5 }] }, client)));
    const accepted = outOfStock.filter(r => r.status === 201).length;
    check('R5', 'reservas simultáneas sin sobreventa (25 de 20 unidades)', accepted === 4 && outOfStock.every(r => [201, 409].includes(r.status)), `${accepted} aceptadas de 6, estados: ${outOfStock.map(r => r.status).join(',')}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await app.locals.shutdown();
    await closePool();
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length} sondeos, ${failed.length} fallaron${failed.length ? `: ${failed.map(r => r.id).join(', ')}` : ''}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
