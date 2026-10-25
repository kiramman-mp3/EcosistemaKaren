/* eslint-disable no-console */
/**
 * Seed masivo de demostración para Ecosistema Karen.
 *
 * - Catálogo real de productos comercializados en Ecuador (seed/catalogo-ecuador.json)
 *   con PVP referencial e IVA (15% o 0%), e imágenes descargadas de Open Food Facts.
 * - Usuarios, lotes, reservas, movimientos, mermas, alertas, promociones y cambios de PVP generados
 *   mediante una simulación cronológica que respeta las reglas del dominio (FEFO,
 *   saldos antes/después, estados de lote y de reserva).
 *
 * Uso:
 *   npm run db:seed                       # escala por defecto
 *   npm run db:seed -- --scale=3          # 3x usuarios y reservas
 *   npm run db:seed -- --skip-images      # no descarga imágenes (usa URL remota)
 *
 * Es re-ejecutable: elimina únicamente los datos generados por una corrida anterior
 * (lotes 'SEED-%' y usuarios '@demo.karen.ec') y actualiza el catálogo por código de barras.
 *
 * Todo se siembra en la base de la tienda (DB_*). Si portal-api usa una base distinta
 * (PORTAL_DB_*), los clientes demo también se copian allí para poder iniciar sesión en el portal.
 */
require('dotenv').config();
const { applyBusinessTimezone, toDateOnly } = require('../src/domain/policies/BusinessDates');

applyBusinessTimezone();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool, closePool, connectionSettings } = require('../src/infrastructure/db/postgres');
const { runMigrations } = require('../src/infrastructure/db/migrations');
const { buildPromotionCacheKey } = require('../src/domain/policies/PromotionPolicy');
const {
  RESERVATION_TTL_MINUTES, RESERVATION_MAX_TOTAL_MINUTES, RESERVATION_EXTENSION_MINUTES
} = require('../src/domain/policies/BusinessRules');

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  return [key, value === undefined ? true : value];
}));
const SCALE = Math.max(0.1, Number(args.scale || 1));
const SKIP_IMAGES = Boolean(args['skip-images']);
const RANDOM_SEED = Number(args.seed || 20261011);

const DEMO_EMAIL_DOMAIN = 'demo.karen.ec';
const DEMO_PASSWORD = 'Karen2026*';
const LOT_PREFIX = 'SEED-';
const MEDIA_DIR = path.resolve(__dirname, '../public/media/productos');
const MEDIA_URL = '/api/v1/media/productos';
const USER_AGENT = 'EcosistemaKaren-seed/1.0 (demo data loader)';
const HISTORY_DAYS = 120;
const DAY_MS = 86400000;
const MIN_MS = 60000;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(RANDOM_SEED);
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = list => list[Math.floor(rand() * list.length)];
const chance = p => rand() < p;
const round2 = n => Math.round(n * 100) / 100;
const uuid = () => crypto.randomUUID();

const NOW = Date.now();
// Medianoche del día de negocio (TZ fijada por applyBusinessTimezone), igual que CURRENT_DATE.
const startOfDay = ms => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const TODAY = startOfDay(NOW);
const dateOnly = ms => toDateOnly(new Date(ms));
const iso = ms => new Date(ms).toISOString();

function weightedPicker(items, weightOf) {
  const cumulative = [];
  let total = 0;
  for (const item of items) {
    total += weightOf(item);
    cumulative.push(total);
  }
  return () => {
    const r = rand() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < r) lo = mid + 1; else hi = mid;
    }
    return items[lo];
  };
}

async function bulkInsert(client, table, columns, rows, chunkSize = 2000) {
  if (!rows.length) return;
  const colNames = columns.map(([name]) => name).join(', ');
  const recordDef = columns.map(([name, type]) => `${name} ${type}`).join(', ');
  const selectList = columns.map(([name, type, cast]) => (cast ? `${name}::${cast}` : name)).join(', ');
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await client.query(
      `INSERT INTO ${table} (${colNames})
       SELECT ${selectList} FROM jsonb_to_recordset($1::jsonb) AS x(${recordDef})`,
      [JSON.stringify(chunk)]
    );
  }
}

// ---------------------------------------------------------------------------
// Catálogo e imágenes
// ---------------------------------------------------------------------------
const CATEGORY_INFO = {
  'Lácteos y Derivados': { desc: 'Leches, yogures, quesos y derivados lácteos', shelf: [20, 45], perishable: true },
  'Embutidos y Carnes': { desc: 'Carnes frías, embutidos y cortes empacados', shelf: [12, 35], perishable: true },
  'Bebidas y Jugos': { desc: 'Gaseosas, aguas, jugos, néctares, hidratantes y energizantes', shelf: [120, 365] },
  'Panadería y Tortillas': { desc: 'Panes de molde, tortillas, panetones y masas', shelf: [8, 25], perishable: true },
  'Galletas y Snacks': { desc: 'Galletas dulces y saladas, papas, chifles y canguil', shelf: [150, 300] },
  'Confitería y Chocolates': { desc: 'Chocolates, caramelos, gomitas, turrones y postres', shelf: [180, 365] },
  'Cereales, Avenas y Granolas': { desc: 'Cereales de desayuno, avenas, granolas y salvados', shelf: [180, 360] },
  'Aceites, Margarinas y Grasas': { desc: 'Aceites comestibles, margarinas, mantequillas y mantecas', shelf: [270, 540] },
  'Pastas, Harinas y Sopas': { desc: 'Fideos, pastas, harinas, granos andinos y sopas instantáneas', shelf: [270, 540] },
  'Salsas, Untables y Condimentos': { desc: 'Mayonesas, salsas, mermeladas, aliños y especias', shelf: [180, 420] },
  'Enlatados y Conservas': { desc: 'Atún, sardinas, macarela, vegetales y conservas', shelf: [540, 1080] },
  'Café, Té y Cocoa': { desc: 'Café soluble y molido, infusiones, té y bebidas de cacao', shelf: [270, 540] },
  'Azúcar y Endulzantes': { desc: 'Azúcar, stevia, sucralosa y edulcorantes', shelf: [365, 720] },
  'Bebés e Infantes': { desc: 'Fórmulas infantiles, colados, cereales infantiles y pañales', shelf: [270, 540] },
  'Vinos y Licores': { desc: 'Vinos, rones, vodkas y licores (venta a mayores de 18 años)', shelf: [1095, 1825] },
  'Cuidado Personal': { desc: 'Shampoo, desodorantes, cremas, protectores solares e higiene', shelf: [540, 1095] },
  'Limpieza y Hogar': { desc: 'Detergentes, desinfectantes y artículos de limpieza', shelf: [540, 1095] },
  'Congelados y Helados': { desc: 'Helados, papas prefritas y mariscos congelados', shelf: [120, 300] },
  'Nutrición y Suplementos': { desc: 'Multivitamínicos, proteínas, colágeno y suplementos', shelf: [365, 720] },
  'Frutos Secos y Semillas': { desc: 'Maní, almendras, pistachos, mezclas y semillas', shelf: [150, 300] }
};

async function downloadImage(product) {
  const target = path.join(MEDIA_DIR, `${product.codigoBarras}.jpg`);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) return true;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(product.imagenOrigen, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!(res.headers.get('content-type') || '').startsWith('image/')) throw new Error('respuesta no es imagen');
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(target, buffer);
      return true;
    } catch (error) {
      if (attempt === 3) {
        console.warn(`   ⚠️  Imagen no descargada (${product.codigoBarras}): ${error.message}`);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 800 * attempt));
    }
  }
  return false;
}

async function resolveImages(products) {
  if (SKIP_IMAGES) {
    products.forEach(p => { p.imagenUrl = p.imagenOrigen; });
    return { local: 0, remote: products.length };
  }
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  let index = 0;
  let local = 0;
  const worker = async () => {
    while (index < products.length) {
      const product = products[index++];
      const ok = await downloadImage(product);
      product.imagenUrl = ok ? `${MEDIA_URL}/${product.codigoBarras}.jpg` : product.imagenOrigen;
      if (ok) local++;
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return { local, remote: products.length - local };
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------
const FIRST_NAMES = ['María', 'José', 'Luis', 'Ana', 'Carlos', 'Gabriela', 'Juan', 'Daniela', 'Andrés', 'Paola',
  'Diego', 'Fernanda', 'Jorge', 'Valeria', 'Santiago', 'Carolina', 'Miguel', 'Andrea', 'David', 'Verónica',
  'Pablo', 'Sofía', 'Xavier', 'Mónica', 'Cristian', 'Lorena', 'Mateo', 'Karla', 'Fabián', 'Estefanía',
  'Byron', 'Jessica', 'Wilson', 'Patricia', 'Edison', 'Rosa', 'Esteban', 'Cecilia', 'Rubén', 'Nathaly',
  'Ricardo', 'Diana', 'Galo', 'Silvia', 'Marco', 'Tatiana', 'Javier', 'Belén', 'Hugo', 'Pamela'];
const LAST_NAMES = ['Rodríguez', 'Zambrano', 'Mendoza', 'Pérez', 'García', 'Vera', 'López', 'Torres', 'Cedeño',
  'Sánchez', 'Morales', 'Castillo', 'Guamán', 'Chicaiza', 'Quishpe', 'Jaramillo', 'Andrade', 'Vásquez',
  'Herrera', 'Ortiz', 'Salazar', 'Villacís', 'Paredes', 'Cevallos', 'Aguirre', 'Benítez', 'Toapanta',
  'Tituaña', 'Pazmiño', 'Espinoza', 'Coronel', 'Loor', 'Moreira', 'Bravo', 'Arcos', 'Naranjo', 'Calle',
  'Ordóñez', 'Granda', 'Montalvo', 'Yépez', 'Proaño', 'Carrillo', 'Velasco', 'Muñoz', 'Suárez'];
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

function buildUsers(passwordHash) {
  const users = [];
  const used = new Set();
  const make = (rol, label) => {
    let first; let last; let email;
    do {
      first = pick(FIRST_NAMES);
      last = `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`;
      email = `${slug(first)}.${slug(last.split(' ')[0])}${randInt(1, 999)}@${DEMO_EMAIL_DOMAIN}`;
    } while (used.has(email));
    used.add(email);
    users.push({
      id: uuid(), nombre: label ? `${first} ${last.split(' ')[0]} (${label})` : `${first} ${last}`,
      email, rol, password_hash: passwordHash,
      created_at: iso(NOW - randInt(HISTORY_DAYS + 5, HISTORY_DAYS + 400) * DAY_MS)
    });
  };
  for (let i = 0; i < 3; i++) make('ADMIN', 'Administración');
  for (let i = 0; i < 12; i++) make('BODEGUERO', 'Bodega');
  for (let i = 0; i < 10; i++) make('PERCHERO', 'Percha');
  const clients = Math.round(1500 * SCALE);
  for (let i = 0; i < clients; i++) make('CLIENTE');
  // Accesos fijos y fáciles de recordar para la demostración
  const fixed = [
    ['ADMIN', 'Admin Demo', `admin@${DEMO_EMAIL_DOMAIN}`],
    ['BODEGUERO', 'Bodega Demo', `bodega@${DEMO_EMAIL_DOMAIN}`],
    ['PERCHERO', 'Percha Demo', `percha@${DEMO_EMAIL_DOMAIN}`],
    ['CLIENTE', 'Cliente Demo', `cliente@${DEMO_EMAIL_DOMAIN}`]
  ];
  for (const [rol, nombre, email] of fixed) {
    users.push({ id: uuid(), nombre, email, rol, password_hash: passwordHash, created_at: iso(NOW - 500 * DAY_MS) });
  }
  return users;
}

// ---------------------------------------------------------------------------
// Simulación de inventario
// ---------------------------------------------------------------------------
const MERMA_REASONS = ['Empaque dañado en percha', 'Producto golpeado durante el traslado', 'Envase abierto por cliente',
  'Cadena de frío interrumpida', 'Rotura en bodega', 'Etiqueta ilegible / sin registro sanitario visible',
  'Devolución de cliente en mal estado'];
const EXPIRED_WASTE_REASON = 'Producto vencido retirado de percha';

function ingressQuantity(pvp) {
  if (pvp < 1) return randInt(5, 20) * 12;
  if (pvp < 3) return randInt(4, 12) * 12;
  if (pvp < 8) return randInt(4, 12) * 6;
  return randInt(2, 6) * 6;
}

// Días que un producto se considera "Nuevo" en el portal (debe coincidir con la regla de los frontends).
const NEW_PRODUCT_DAYS = 14;

function buildLots(products) {
  const lots = [];
  for (const product of products) {
    const info = CATEGORY_INFO[product.categoria];
    const perishable = Boolean(info.perishable);
    // Alrededor del 5 % del catálogo se dio de alta hace menos de dos semanas: solo tiene su primer lote.
    product.recentlyAdded = chance(0.05);
    const count = product.recentlyAdded ? 1 : perishable ? randInt(5, 8) : randInt(2, 4);
    const window = perishable ? 75 : HISTORY_DAYS + 30;
    for (let i = 0; i < count; i++) {
      // El último lote siempre es reciente para que todo producto tenga stock vigente.
      const daysAgo = i === count - 1 ? randInt(1, 6) : Math.round(window * (count - 1 - i) / (count - 1)) + randInt(0, 6);
      const ingreso = NOW - daysAgo * DAY_MS - randInt(6, 11) * 3600000;
      const shelf = randInt(info.shelf[0], info.shelf[1]);
      const elaboracion = startOfDay(ingreso)
        - randInt(1, Math.max(1, Math.min(10, Math.floor(shelf / 4)))) * DAY_MS;
      const qty = ingressQuantity(product.pvp);
      const baseCost = product.pvp / (1 + product.iva / 100);
      lots.push({
        id: uuid(),
        product,
        numero_lote: `${LOT_PREFIX}${product.codigoBarras.slice(-6)}-${String(i + 1).padStart(2, '0')}`,
        ingreso,
        elaboracion,
        caducidad: elaboracion + shelf * DAY_MS,
        costo: Math.round(baseCost * (0.62 + rand() * 0.16) * 10000) / 10000,
        ingresada: qty,
        disp: 0,
        res: 0,
        ubicacion: 'BODEGA',
        received: false,
        expired: false
      });
    }
    // El alta del producto es anterior a su primer lote: la de un producto nuevo, unas horas antes
    // (siempre dentro de la ventana de "Nuevos"); la de los demás, entre 3 días y 10 meses antes.
    const firstIngreso = Math.min(...lots.filter(lot => lot.product === product).map(lot => lot.ingreso));
    product.createdAt = product.recentlyAdded
      ? Math.max(NOW - (NEW_PRODUCT_DAYS - 1) * DAY_MS, firstIngreso - randInt(2, 20) * 3600000)
      : firstIngreso - randInt(3, 300) * DAY_MS;
  }
  return lots;
}

// ---------------------------------------------------------------------------
// Cambios de PVP
// ---------------------------------------------------------------------------
// Alrededor del 12 % de los productos subió de precio en el período simulado: la mitad al recibir un
// lote (el ADMIN fija el nuevo PVP en el ingreso) y la otra mitad desde el catálogo. El precio del
// catálogo es el nuevo; las reservas anteriores al cambio se hicieron con el precio de entonces.
function buildPriceChanges(products, lots, users) {
  const admins = users.filter(u => u.rol === 'ADMIN');
  const lotsByProduct = new Map();
  for (const lot of lots) {
    if (!lotsByProduct.has(lot.product.codigoBarras)) lotsByProduct.set(lot.product.codigoBarras, []);
    lotsByProduct.get(lot.product.codigoBarras).push(lot);
  }
  const changes = [];
  for (const product of products) {
    if (!chance(0.12)) continue;
    const anterior = round2(product.pvp * (0.86 + rand() * 0.1));
    if (anterior <= 0 || anterior >= product.pvp) continue;
    const candidates = (lotsByProduct.get(product.codigoBarras) || [])
      .filter(lot => lot.ingreso > NOW - HISTORY_DAYS * DAY_MS && lot.ingreso < NOW - DAY_MS);
    const withLot = candidates.length > 0 && chance(0.5);
    const lot = withLot ? pick(candidates) : null;
    const t = lot ? lot.ingreso : NOW - randInt(2, HISTORY_DAYS - 5) * DAY_MS - randInt(8, 18) * 3600000;
    const change = { t, anterior, nuevo: product.pvp, origen: lot ? 'INGRESO_LOTE' : 'MANUAL', lot, actor: pick(admins) };
    product.priceChange = change;
    changes.push({ product, ...change });
  }
  return changes;
}

/** PVP vigente del producto en el instante t (antes de su cambio, el precio anterior). */
const priceAt = (product, t) => (product.priceChange && t < product.priceChange.t ? product.priceChange.anterior : product.pvp);

function simulate({ products, lots, users }) {
  const clients = users.filter(u => u.rol === 'CLIENTE');
  const warehouse = users.filter(u => u.rol === 'BODEGUERO' || u.rol === 'PERCHERO');
  const cashiers = users.filter(u => u.rol !== 'CLIENTE');
  const lotsByProduct = new Map();
  for (const lot of lots) {
    if (!lotsByProduct.has(lot.product.codigoBarras)) lotsByProduct.set(lot.product.codigoBarras, []);
    lotsByProduct.get(lot.product.codigoBarras).push(lot);
  }
  for (const list of lotsByProduct.values()) list.sort((a, b) => a.caducidad - b.caducidad || a.id.localeCompare(b.id));

  // Popularidad tipo Pareto: pocos productos concentran muchas ventas.
  products.forEach(p => { p.popularity = Math.pow(rand(), 2.2) * 10 + 0.2 + (p.pvp < 2 ? 1.5 : 0); });
  const pickProduct = weightedPicker(products, p => p.popularity);
  const loyal = clients.slice(0, Math.ceil(clients.length * 0.2));
  const pickClient = () => (chance(0.6) ? pick(loyal) : pick(clients));

  const movements = [];
  const wastes = [];
  const reservations = [];
  const details = [];
  const codes = new Set();
  const newCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = 'KR-';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(rand() * chars.length)];
    } while (codes.has(code));
    codes.add(code);
    return code;
  };

  const move = (lot, tipo, cantidad, before, after, extra = {}) => {
    // Marca de tiempo estrictamente creciente por lote: el historial queda ordenado sin empates.
    const at = Math.max(extra.at, (lot.lastMovementAt || 0) + 1000);
    lot.lastMovementAt = at;
    const row = {
      id: uuid(), lote_id: lot.id, tipo, cantidad,
      disponible_antes: before.disp, disponible_despues: after.disp,
      reservada_antes: before.res, reservada_despues: after.res,
      ubicacion_origen: extra.origen === undefined ? lot.ubicacion : extra.origen,
      ubicacion_destino: extra.destino === undefined ? lot.ubicacion : extra.destino,
      motivo: extra.motivo || null, actor_id: extra.actor || null, reserva_id: extra.reserva || null,
      metadata: extra.metadata || { origen: 'seed' }, created_at: iso(at)
    };
    movements.push(row);
    return row;
  };

  // --- Línea de tiempo de eventos ---
  const events = [];
  for (const lot of lots) {
    events.push({ t: lot.ingreso, kind: 'ingreso', lot });
    if (chance(0.55)) events.push({ t: lot.ingreso + randInt(2, 30) * 3600000, kind: 'traslado', lot });
    if (lot.caducidad <= TODAY) {
      events.push({ t: lot.caducidad + randInt(1, 30) * MIN_MS, kind: 'vencimiento', lot });
      if (chance(0.55)) events.push({ t: lot.caducidad + randInt(3, 48) * 3600000, kind: 'retiro', lot });
    }
    if (chance(0.07)) {
      const end = Math.min(NOW - 3600000, lot.caducidad - DAY_MS);
      if (end > lot.ingreso + DAY_MS) events.push({ t: randInt(lot.ingreso + DAY_MS, end), kind: 'merma', lot });
    }
  }
  const totalReservations = Math.round(6000 * SCALE);
  for (let i = 0; i < totalReservations; i++) {
    // Más actividad reciente y en horario comercial (8h–21h, hora del negocio)
    const day = Math.floor(Math.pow(rand(), 1.3) * HISTORY_DAYS) + 1;
    const hourLocal = randInt(8, 20);
    const t = TODAY - day * DAY_MS + hourLocal * 3600000 + randInt(0, 3599) * 1000;
    if (t < NOW - 15 * MIN_MS) events.push({ t, kind: 'reserva' });
  }
  // Un traslado, un vencimiento o un retiro calculado a partir de la fecha del lote puede caer
  // después de este momento: esos eventos todavía no ocurrieron y no se siembran.
  const timeline = events.filter(event => event.t < NOW).sort((a, b) => a.t - b.t);

  const allocate = (product, qty, t) => {
    const allocation = [];
    let remaining = qty;
    for (const lot of lotsByProduct.get(product.codigoBarras)) {
      if (remaining === 0) break;
      if (!lot.received || lot.expired || lot.caducidad <= t || lot.disp <= 0) continue;
      const q = Math.min(lot.disp, remaining);
      allocation.push({ lot, q });
      remaining -= q;
    }
    return remaining === 0 ? allocation : null;
  };

  // Plazo que elige el cliente al apartar (como en las apps: 30 min por defecto) y, a veces, una o dos
  // extensiones de 30 min, sin pasar de 4 horas en total.
  const TTL_CHOICES = [[RESERVATION_TTL_MINUTES, 0.62], [45, 0.12], [60, 0.14], [90, 0.07], [120, 0.05]];
  const pickTtl = weightedPicker(TTL_CHOICES, ([, weight]) => weight);
  const reservationWindow = () => {
    const ttl = pickTtl()[0];
    const room = Math.floor((RESERVATION_MAX_TOTAL_MINUTES - ttl) / RESERVATION_EXTENSION_MINUTES);
    const extensions = chance(0.14) ? Math.min(room, randInt(1, 2)) : 0;
    return { ttl, extensions, minutes: ttl + extensions * RESERVATION_EXTENSION_MINUTES };
  };

  // La confirmación en caja, la cancelación o el vencimiento ocurren más tarde: se programan como
  // eventos propios para que el historial de cada lote siga en orden. Lo que todavía no ocurrió
  // (hora futura) deja la reserva PENDIENTE, con su stock apartado.
  const scheduled = [];
  const schedule = (at, run) => {
    let i = scheduled.length;
    while (i > 0 && scheduled[i - 1].at > at) i--;
    scheduled.splice(i, 0, { at, run });
  };
  const runScheduledUntil = (t) => {
    while (scheduled.length && scheduled[0].at <= t) scheduled.shift().run();
  };

  const placeReservation = (t, outcome, { user = pickClient(), window = reservationWindow() } = {}) => {
    const itemCount = Math.min(8, 1 + Math.floor(Math.pow(rand(), 1.8) * 8));
    const chosen = new Map();
    for (let i = 0; i < itemCount * 2 && chosen.size < itemCount; i++) {
      const product = pickProduct();
      if (!chosen.has(product.codigoBarras)) chosen.set(product.codigoBarras, product);
    }
    const reservaId = uuid();
    const lines = [];
    // Igual que el caso de uso: productos en orden estable para el bloqueo FEFO.
    for (const product of [...chosen.values()].sort((a, b) => a.codigoBarras.localeCompare(b.codigoBarras))) {
      const qty = product.pvp < 1.5 ? randInt(1, 6) : product.pvp < 6 ? randInt(1, 3) : randInt(1, 2);
      const allocation = allocate(product, qty, t);
      if (!allocation) continue;
      for (const { lot, q } of allocation) {
        const before = { disp: lot.disp, res: lot.res };
        lot.disp -= q;
        lot.res += q;
        move(lot, 'RESERVA', q, before, { disp: lot.disp, res: lot.res },
          { motivo: 'Stock asignado a reserva', actor: user.id, reserva: reservaId, at: t });
        lines.push({ lot, q, price: priceAt(product, t) });
      }
    }
    if (!lines.length) return null;

    const expiresAt = t + window.minutes * MIN_MS;
    const row = {
      id: reservaId, usuario_id: user.id, cliente_nombre: user.nombre, codigo_retiro: newCode(), estado: 'PENDIENTE',
      fecha_expiracion: iso(expiresAt), created_at: iso(t), updated_at: iso(t), extensiones: window.extensions
    };
    reservations.push(row);
    for (const { lot, q, price } of lines) {
      details.push({ id: uuid(), reserva_id: reservaId, lote_id: lot.id, cantidad: q, precio_unitario: price });
    }

    // Cada extensión se pide unos minutos antes de que venza el plazo vigente; la última queda en updated_at.
    for (let k = 0; k < window.extensions; k++) {
      const due = t + (window.ttl + k * RESERVATION_EXTENSION_MINUTES) * MIN_MS;
      const askedAt = due - randInt(2, 12) * MIN_MS;
      if (askedAt < NOW) row.updated_at = iso(Math.max(Date.parse(row.updated_at) + MIN_MS, askedAt));
    }

    // El cliente pasa por caja dentro del plazo, cancela poco después de apartar o deja que venza.
    let at;
    if (outcome === 'CONFIRMADA') {
      const latest = Math.max(4, Math.floor(window.minutes * 0.9));
      at = t + Math.min(latest, 3 + Math.floor(Math.pow(rand(), 1.6) * latest)) * MIN_MS;
    } else if (outcome === 'CANCELADA') {
      at = t + randInt(1, Math.min(20, window.minutes - 1)) * MIN_MS;
    } else if (outcome === 'EXPIRADA') {
      at = expiresAt + randInt(0, 59) * 1000;
    } else {
      return row;
    }
    at = Math.max(at, Date.parse(row.updated_at) + MIN_MS);
    schedule(at, () => {
      if (at >= NOW) return;
      if (outcome === 'CONFIRMADA') {
        const cashier = pick(cashiers);
        for (const { lot, q } of lines) {
          const before = { disp: lot.disp, res: lot.res };
          lot.res -= q;
          move(lot, 'VENTA', q, before, { disp: lot.disp, res: lot.res },
            { motivo: 'Venta confirmada desde reserva', actor: cashier.id, reserva: reservaId, at });
        }
      } else {
        for (const { lot, q } of lines) {
          const before = { disp: lot.disp, res: lot.res };
          lot.disp += q;
          lot.res -= q;
          move(lot, 'LIBERACION', q, before, { disp: lot.disp, res: lot.res }, {
            motivo: outcome === 'EXPIRADA' ? 'Liberación automática por expiración de reserva' : 'Reserva cancelada por el cliente',
            actor: outcome === 'CANCELADA' ? user.id : null, reserva: reservaId, at
          });
        }
      }
      row.estado = outcome;
      row.updated_at = iso(at);
    });
    return row;
  };

  for (const event of timeline) {
    const { lot, t } = event;
    runScheduledUntil(t);
    if (event.kind === 'ingreso') {
      lot.received = true;
      lot.disp = lot.ingresada;
      move(lot, 'INGRESO', lot.ingresada, { disp: 0, res: 0 }, { disp: lot.disp, res: 0 },
        { origen: null, destino: 'BODEGA', motivo: 'Ingreso de lote a bodega', actor: pick(warehouse).id, at: t,
          metadata: { origen: 'seed', costoUnitario: lot.costo } });
    } else if (event.kind === 'traslado') {
      if (lot.expired || lot.disp + lot.res === 0) continue;
      const state = { disp: lot.disp, res: lot.res };
      move(lot, 'TRASLADO', 0, state, state, { origen: 'BODEGA', destino: 'PERCHA', motivo: 'Reposición de percha', actor: pick(warehouse).id, at: t });
      lot.ubicacion = 'PERCHA';
    } else if (event.kind === 'merma') {
      if (lot.expired || lot.disp < 1) continue;
      const q = Math.min(lot.disp, randInt(1, 6));
      const before = { disp: lot.disp, res: lot.res };
      lot.disp -= q;
      // Igual que registerWasteWithAudit: una merma que deja el lote en cero lo marca MERMA.
      if (lot.disp + lot.res === 0) lot.writtenOff = true;
      const actor = pick(warehouse).id;
      const movement = move(lot, 'MERMA', q, before, { disp: lot.disp, res: lot.res }, { motivo: pick(MERMA_REASONS), actor, at: t });
      wastes.push({ id: uuid(), lote_id: lot.id, movimiento_id: movement.id, cantidad: q,
        razon: movement.motivo, costo_unitario: lot.costo,
        costo_total: Math.round(lot.costo * q * 10000) / 10000, registrada_por: actor, created_at: iso(t) });
    } else if (event.kind === 'vencimiento') {
      lot.expired = true;
      if (lot.disp + lot.res === 0) continue;
      const state = { disp: lot.disp, res: lot.res };
      move(lot, 'VENCIMIENTO', 0, state, state, { motivo: 'Cambio automático de estado por fecha de caducidad', at: t });
    } else if (event.kind === 'retiro') {
      if (lot.disp < 1) continue;
      const q = lot.disp;
      const before = { disp: lot.disp, res: lot.res };
      lot.disp = 0;
      if (lot.res === 0) lot.writtenOff = true;
      const actor = pick(warehouse).id;
      const movement = move(lot, 'MERMA', q, before, { disp: 0, res: lot.res }, { motivo: EXPIRED_WASTE_REASON, actor, at: t });
      wastes.push({ id: uuid(), lote_id: lot.id, movimiento_id: movement.id, cantidad: q, razon: EXPIRED_WASTE_REASON,
        costo_unitario: lot.costo, costo_total: Math.round(lot.costo * q * 10000) / 10000,
        registrada_por: actor, created_at: iso(t) });
    } else if (event.kind === 'reserva') {
      const r = rand();
      placeReservation(t, r < 0.72 ? 'CONFIRMADA' : r < 0.88 ? 'EXPIRADA' : 'CANCELADA');
    }
  }

  runScheduledUntil(NOW);

  // Reservas vigentes en este momento (pendientes de retiro en caja), todas con tiempo restante.
  const pendingCount = Math.round(35 * SCALE);
  for (let i = 0; i < pendingCount; i++) {
    const window = reservationWindow();
    const age = randInt(0, Math.max(1, window.minutes - 10));
    placeReservation(NOW - age * MIN_MS - randInt(0, 59) * 1000, 'PENDIENTE', { window });
  }
  // La cuenta cliente@ queda con dos reservas para probar: una recién hecha y otra ya extendida una vez.
  const demoClient = clients.find(c => c.email === `cliente@${DEMO_EMAIL_DOMAIN}`);
  if (demoClient) {
    const base = RESERVATION_TTL_MINUTES;
    placeReservation(NOW - 5 * MIN_MS, 'PENDIENTE', { user: demoClient, window: { ttl: base, extensions: 0, minutes: base } });
    placeReservation(NOW - 40 * MIN_MS, 'PENDIENTE', {
      user: demoClient, window: { ttl: base, extensions: 1, minutes: base + RESERVATION_EXTENSION_MINUTES }
    });
  }

  return { movements, wastes, reservations, details };
}

function finalizeLots(lots) {
  for (const lot of lots) {
    if (lot.writtenOff) lot.estado = 'MERMA';
    else if (lot.caducidad <= TODAY) lot.estado = lot.disp + lot.res > 0 ? 'VENCIDO' : 'AGOTADO';
    else lot.estado = lot.disp + lot.res > 0 ? 'ACTIVO' : 'AGOTADO';
  }
  // Lotes no perecibles con stock que entran en ventana de caducidad cercana,
  // para que el tablero de alertas y las promociones IA tengan casos reales.
  const candidates = lots.filter(l => l.estado === 'ACTIVO' && l.disp >= 6 && l.res === 0
    && !CATEGORY_INFO[l.product.categoria].perishable && l.caducidad - TODAY > 30 * DAY_MS);
  const target = Math.min(candidates.length, Math.round(80 * Math.min(SCALE, 2)));
  for (let i = 0; i < target; i++) {
    const j = i + Math.floor(rand() * (candidates.length - i));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    candidates[i].caducidad = TODAY + randInt(1, 14) * DAY_MS;
  }
}

// ---------------------------------------------------------------------------
// Alertas y promociones
// ---------------------------------------------------------------------------
const PROMO_PHRASES = [
  p => `¡Aprovecha! ${p} con precio especial por pocos días`,
  p => `Llévate ${p} hoy y ahorra en tu compra`,
  p => `Oferta relámpago: ${p} a precio de liquidación`,
  p => `${p}: ¡últimas unidades con descuento!`,
  p => `Precio Karen: ${p} más barato solo esta semana`,
  p => `Ideal para hoy: ${p} con descuento inmediato`
];
const REJECT_REASONS = ['El descuento supera el margen permitido para esta categoría.',
  'La frase promocional no cumple la guía de comunicación.',
  'Se prefiere trasladar el lote a otra sucursal.', 'El proveedor aceptó la devolución del lote.'];

function buildAlertsAndPromotions(lots, users) {
  const admins = users.filter(u => u.rol === 'ADMIN');
  const alerts = [];
  const promotions = [];
  const levelFor = days => (days < 7 ? 'ROJO' : 'AMARILLO');
  const promo = (lot, nivel, estado, activa, createdAt) => {
    const [min, max] = nivel === 'ROJO' ? [20, 50] : [5, 30];
    const descuento = randInt(min, max);
    const row = {
      id: uuid(), lote_id: lot.id, descuento_porcentaje: descuento,
      frase_promocional: pick(PROMO_PHRASES)(lot.product.nombre),
      razon_ia: `Lote ${lot.numero_lote} con ${lot.disp} unidades y caducidad el ${dateOnly(lot.caducidad)}. `
        + `Nivel ${nivel}: se sugiere ${descuento}% para acelerar la rotación FEFO y reducir merma.`,
      activa, estado, modelo_ia: process.env.GEMINI_MODEL || 'gemini-3.8-flash', prompt_version: 'v4',
      cache_key: `seed:${lot.id}:${estado}`, cache_hit: false, created_at: iso(createdAt),
      aprobada_por: null, aprobada_at: null, rechazada_por: null, rechazada_at: null, motivo_rechazo: null
    };
    // La aprobación compara esta clave con el lote y el precio actuales: un borrador sin cambios desde
    // su generación lleva la clave real para que el ADMIN pueda publicarlo desde la bodega.
    if (estado === 'PENDIENTE_APROBACION') {
      row.cache_key = buildPromotionCacheKey({
        loteId: lot.id, fechaCaducidad: dateOnly(lot.caducidad), cantidadDisponible: lot.disp,
        precioVenta: lot.product.pvp, promptVersion: row.prompt_version, modelName: row.modelo_ia
      });
    }
    if (estado === 'APROBADA') {
      row.aprobada_por = pick(admins).id;
      row.aprobada_at = iso(Math.min(NOW - MIN_MS, createdAt + randInt(10, 240) * MIN_MS));
    } else if (estado === 'RECHAZADA') {
      row.rechazada_por = pick(admins).id;
      row.rechazada_at = iso(Math.min(NOW - MIN_MS, createdAt + randInt(10, 240) * MIN_MS));
      row.motivo_rechazo = pick(REJECT_REASONS);
    }
    promotions.push(row);
  };

  for (const lot of lots) {
    const days = Math.round((lot.caducidad - TODAY) / DAY_MS);
    if (lot.estado === 'ACTIVO' && days < 15) {
      const nivel = levelFor(days);
      const createdAt = Math.max(lot.ingreso, NOW - randInt(1, 72) * 3600000);
      alerts.push({ id: uuid(), lote_id: lot.id, dias_para_vencer: days, nivel, atendida: chance(0.25), created_at: iso(createdAt) });
      if (lot.disp < 1) continue;
      const r = rand();
      if (r < 0.45) promo(lot, nivel, 'APROBADA', true, createdAt + 5 * MIN_MS);
      else if (r < 0.75) promo(lot, nivel, 'PENDIENTE_APROBACION', false, createdAt + 5 * MIN_MS);
      else if (r < 0.85) promo(lot, nivel, 'RECHAZADA', false, createdAt + 5 * MIN_MS);
    } else if (lot.caducidad <= TODAY && lot.caducidad > TODAY - HISTORY_DAYS * DAY_MS && chance(0.6)) {
      const createdAt = lot.caducidad - randInt(3, 13) * DAY_MS;
      if (createdAt <= lot.ingreso) continue;
      const days0 = Math.round((lot.caducidad - createdAt) / DAY_MS);
      const nivel = levelFor(days0);
      alerts.push({ id: uuid(), lote_id: lot.id, dias_para_vencer: days0, nivel, atendida: true, created_at: iso(createdAt) });
      if (chance(0.4)) promo(lot, nivel, 'APROBADA', false, createdAt + 30 * MIN_MS);
    }
  }
  return { alerts, promotions };
}

// Límites que el ADMIN fija a cada oferta aprobada. Las vigentes terminan entre unas horas y 7 días
// después del seed (nunca después de que caduque su lote); un 15 % terminó en los últimos 3 días para
// probar ofertas vencidas. Las reservas hechas sobre el lote en oferta mientras estaba vigente se
// enlazan con ella (promocion_id, precio con descuento) y una parte de las ofertas con stock propio
// queda agotada justo con esas reservas.
const OFFER_PAST_DAYS = 3;
const OFFER_FUTURE_DAYS = 7;

function applyOfferLimits(promotions, lots, sim) {
  const lotById = new Map(lots.map(l => [l.id, l]));
  const reservationById = new Map(sim.reservations.map(r => [r.id, r]));
  const live = promotions.filter(p => p.estado === 'APROBADA' && p.activa);
  const linked = { offers: 0, lines: 0, soldOut: 0, ended: 0 };

  for (const promo of live) {
    const lot = lotById.get(promo.lote_id);
    const approvedAt = Date.parse(promo.aprobada_at);
    const lotEnd = lot.caducidad; // medianoche del día de caducidad: desde ahí el lote ya no se vende
    if (chance(0.15)) {
      promo.vigente_hasta = iso(Math.max(approvedAt + 30 * MIN_MS, NOW - randInt(1, OFFER_PAST_DAYS * 24) * 3600000));
      if (Date.parse(promo.vigente_hasta) >= NOW) promo.vigente_hasta = iso(NOW - MIN_MS);
      linked.ended++;
    } else if (chance(0.8)) {
      const end = NOW + randInt(2, OFFER_FUTURE_DAYS * 24) * 3600000;
      promo.vigente_hasta = iso(Math.min(end, lotEnd - MIN_MS));
    } else {
      promo.vigente_hasta = null; // hasta que caduque el lote
    }
    const until = promo.vigente_hasta ? Date.parse(promo.vigente_hasta) : NOW;

    // Reservas del lote tomadas mientras la oferta estaba vigente: llevan el descuento.
    const lines = sim.details.filter(d => {
      if (d.lote_id !== lot.id) return false;
      const reservation = reservationById.get(d.reserva_id);
      const t = Date.parse(reservation.created_at);
      return t >= approvedAt && t < until;
    });
    let committed = 0;
    for (const line of lines) {
      const reservation = reservationById.get(line.reserva_id);
      const base = priceAt(lot.product, Date.parse(reservation.created_at));
      line.promocion_id = promo.id;
      line.precio_unitario = Number((base * (1 - promo.descuento_porcentaje / 100)).toFixed(2));
      if (reservation.estado === 'PENDIENTE' || reservation.estado === 'CONFIRMADA') committed += line.cantidad;
    }
    if (lines.length) { linked.offers++; linked.lines += lines.length; }

    // Stock de oferta: nunca menos de lo ya comprometido ni más de lo que hay en el lote.
    if (chance(0.6)) {
      const soldOut = committed > 0 && chance(0.4);
      const max = committed + lot.disp;
      promo.stock_oferta = soldOut ? committed : Math.max(1, Math.min(max, committed + randInt(2, 12)));
      if (soldOut) linked.soldOut++;
    }
    if (chance(0.6)) {
      const cap = promo.stock_oferta || Math.max(1, lot.disp);
      promo.limite_por_pedido = Math.min(cap, randInt(1, 4));
    }
  }
  return linked;
}

// ---------------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------------
async function cleanPreviousSeed(client) {
  await client.query(`CREATE TEMP TABLE seed_users ON COMMIT DROP AS
    SELECT id FROM usuarios WHERE email LIKE '%@${DEMO_EMAIL_DOMAIN}'`);
  await client.query(`CREATE TEMP TABLE seed_lots ON COMMIT DROP AS
    SELECT id FROM lotes WHERE numero_lote LIKE '${LOT_PREFIX}%'`);
  // Antes de borrar usuarios y lotes: sus claves foráneas dejarían el historial sin actor ni lote.
  await client.query(`DELETE FROM productos_precio_historial WHERE actor_id IN (SELECT id FROM seed_users)
    OR lote_id IN (SELECT id FROM seed_lots)`);
  await client.query(`CREATE TEMP TABLE seed_reservations ON COMMIT DROP AS
    SELECT id FROM reservas WHERE usuario_id IN (SELECT id FROM seed_users)
    UNION SELECT reserva_id FROM reserva_detalles WHERE lote_id IN (SELECT id FROM seed_lots)`);
  await client.query(`DELETE FROM mermas WHERE lote_id IN (SELECT id FROM seed_lots)
    OR registrada_por IN (SELECT id FROM seed_users)`);
  await client.query(`DELETE FROM inventario_movimientos WHERE lote_id IN (SELECT id FROM seed_lots)
    OR reserva_id IN (SELECT id FROM seed_reservations) OR actor_id IN (SELECT id FROM seed_users)`);
  await client.query('DELETE FROM reservas WHERE id IN (SELECT id FROM seed_reservations)');
  await client.query('DELETE FROM lotes WHERE id IN (SELECT id FROM seed_lots)');
  await client.query('DELETE FROM usuarios WHERE id IN (SELECT id FROM seed_users)');
}

// La base del portal solo guarda clientes: se copian con los mismos ids para que el cliente
// autenticado en el portal sea el mismo que figura en las reservas de la tienda.
async function seedPortalClients(portalPool, clients) {
  await runMigrations(portalPool, { targets: ['portal'] });
  const client = await portalPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM usuarios WHERE email LIKE '%@${DEMO_EMAIL_DOMAIN}'`);
    await bulkInsert(client, 'usuarios', [
      ['id', 'uuid'], ['nombre', 'text'], ['email', 'text'], ['rol', 'text', 'rol_usuario'],
      ['password_hash', 'text'], ['created_at', 'timestamptz']
    ], clients);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function upsertCatalog(client, catalog) {
  const categoryIds = new Map();
  for (const nombre of catalog.categorias) {
    const res = await client.query(`
      INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2)
      ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion
      RETURNING id`, [nombre, CATEGORY_INFO[nombre].desc]);
    categoryIds.set(nombre, res.rows[0].id);
  }
  for (const product of catalog.productos) {
    const descripcion = [product.marca, product.contenido].filter(Boolean).join(' · ') || null;
    const res = await client.query(`
      INSERT INTO productos (categoria_id, codigo_barras, nombre, descripcion, precio_venta,
                             impuesto_porcentaje, min_stock_alerta, imagen_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (codigo_barras) DO UPDATE SET
        categoria_id = EXCLUDED.categoria_id, nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion,
        precio_venta = EXCLUDED.precio_venta, impuesto_porcentaje = EXCLUDED.impuesto_porcentaje,
        min_stock_alerta = EXCLUDED.min_stock_alerta, imagen_url = EXCLUDED.imagen_url,
        created_at = EXCLUDED.created_at, updated_at = CURRENT_TIMESTAMP
      RETURNING id`,
    [categoryIds.get(product.categoria), product.codigoBarras, product.nombre, descripcion, product.pvp,
      product.iva, product.pvp < 2 ? randInt(20, 40) : randInt(8, 20), product.imagenUrl, iso(product.createdAt)]);
    product.id = res.rows[0].id;
  }
}

async function main() {
  const started = Date.now();
  const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../seed/catalogo-ecuador.json'), 'utf8'));
  const products = catalog.productos;
  console.log(`🌱 Seed Ecosistema Karen — ${products.length} productos, escala x${SCALE}`);

  console.log(SKIP_IMAGES ? '🖼️  Imágenes: se usará la URL remota' : '🖼️  Descargando imágenes de productos...');
  const images = await resolveImages(products);
  console.log(`   ${images.local} locales, ${images.remote} remotas`);

  const pool = getPool();
  await runMigrations(pool);
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const users = buildUsers(passwordHash);
    const lots = buildLots(products);
    const priceChanges = buildPriceChanges(products, lots, users);
    const sim = simulate({ products, lots, users });
    finalizeLots(lots);
    const { alerts, promotions } = buildAlertsAndPromotions(lots, users);
    const offerStats = applyOfferLimits(promotions, lots, sim);

    await client.query('BEGIN');
    await cleanPreviousSeed(client);
    await upsertCatalog(client, catalog);

    await bulkInsert(client, 'usuarios', [
      ['id', 'uuid'], ['nombre', 'text'], ['email', 'text'], ['rol', 'text', 'rol_usuario'],
      ['password_hash', 'text'], ['created_at', 'timestamptz']
    ], users);
    await bulkInsert(client, 'lotes', [
      ['id', 'uuid'], ['producto_id', 'uuid'], ['numero_lote', 'text'], ['fecha_elaboracion', 'date'],
      ['fecha_caducidad', 'date'], ['costo_unitario', 'numeric'], ['cantidad_ingresada', 'int'],
      ['cantidad_disponible', 'int'], ['cantidad_reservada', 'int'], ['ubicacion', 'text', 'ubicacion_lote'],
      ['estado', 'text', 'estado_lote'], ['created_at', 'timestamptz'], ['updated_at', 'timestamptz']
    ], lots.map(l => ({
      id: l.id, producto_id: l.product.id, numero_lote: l.numero_lote, fecha_elaboracion: dateOnly(l.elaboracion),
      fecha_caducidad: dateOnly(l.caducidad), costo_unitario: l.costo, cantidad_ingresada: l.ingresada,
      cantidad_disponible: l.disp, cantidad_reservada: l.res, ubicacion: l.ubicacion, estado: l.estado,
      created_at: iso(l.ingreso), updated_at: iso(Math.min(NOW, Math.max(l.ingreso, l.caducidad)))
    })));
    // Las ofertas van antes que las reservas: sus líneas con descuento las referencian.
    await bulkInsert(client, 'promociones_ia', [
      ['id', 'uuid'], ['lote_id', 'uuid'], ['descuento_porcentaje', 'numeric'], ['frase_promocional', 'text'],
      ['razon_ia', 'text'], ['activa', 'boolean'], ['estado', 'text', 'estado_promocion'], ['modelo_ia', 'text'],
      ['prompt_version', 'text'], ['cache_key', 'text'], ['cache_hit', 'boolean'], ['created_at', 'timestamptz'],
      ['aprobada_por', 'uuid'], ['aprobada_at', 'timestamptz'], ['rechazada_por', 'uuid'],
      ['rechazada_at', 'timestamptz'], ['motivo_rechazo', 'text'], ['limite_por_pedido', 'int'],
      ['stock_oferta', 'int'], ['vigente_hasta', 'timestamptz']
    ], promotions.map(p => ({ limite_por_pedido: null, stock_oferta: null, vigente_hasta: null, ...p })));
    await bulkInsert(client, 'reservas', [
      ['id', 'uuid'], ['usuario_id', 'uuid'], ['cliente_nombre', 'text'], ['codigo_retiro', 'text'],
      ['estado', 'text', 'estado_reserva'], ['fecha_expiracion', 'timestamptz'], ['created_at', 'timestamptz'],
      ['updated_at', 'timestamptz']
    ], sim.reservations);
    await bulkInsert(client, 'reserva_detalles', [
      ['id', 'uuid'], ['reserva_id', 'uuid'], ['lote_id', 'uuid'], ['cantidad', 'int'], ['precio_unitario', 'numeric'],
      ['promocion_id', 'uuid']
    ], sim.details);
    await bulkInsert(client, 'inventario_movimientos', [
      ['id', 'uuid'], ['lote_id', 'uuid'], ['tipo', 'text'], ['cantidad', 'int'],
      ['disponible_antes', 'int'], ['disponible_despues', 'int'], ['reservada_antes', 'int'], ['reservada_despues', 'int'],
      ['ubicacion_origen', 'text', 'ubicacion_lote'], ['ubicacion_destino', 'text', 'ubicacion_lote'],
      ['motivo', 'text'], ['actor_id', 'uuid'], ['reserva_id', 'uuid'], ['metadata', 'jsonb'], ['created_at', 'timestamptz']
    ], sim.movements);
    await bulkInsert(client, 'mermas', [
      ['id', 'uuid'], ['lote_id', 'uuid'], ['movimiento_id', 'uuid'], ['cantidad', 'int'], ['razon', 'text'],
      ['costo_unitario', 'numeric'], ['costo_total', 'numeric'], ['registrada_por', 'uuid'], ['created_at', 'timestamptz']
    ], sim.wastes);
    await bulkInsert(client, 'alertas_caducidad', [
      ['id', 'uuid'], ['lote_id', 'uuid'], ['dias_para_vencer', 'int'], ['nivel', 'text', 'nivel_alerta'],
      ['atendida', 'boolean'], ['created_at', 'timestamptz']
    ], alerts);
    await bulkInsert(client, 'productos_precio_historial', [
      ['producto_id', 'uuid'], ['precio_anterior', 'numeric'], ['precio_nuevo', 'numeric'], ['origen', 'text'],
      ['lote_id', 'uuid'], ['actor_id', 'uuid'], ['created_at', 'timestamptz']
    ], priceChanges.map(change => ({
      producto_id: change.product.id, precio_anterior: change.anterior, precio_nuevo: change.nuevo, origen: change.origen,
      lote_id: change.lot ? change.lot.id : null, actor_id: change.actor.id, created_at: iso(change.t)
    })));
    await client.query('COMMIT');

    const separatePortalDb = JSON.stringify(connectionSettings('portal')) !== JSON.stringify(connectionSettings('store'));
    if (separatePortalDb) {
      const portalPool = getPool('portal');
      await seedPortalClients(portalPool, users.filter(u => u.rol === 'CLIENTE'));
      console.log(`👥 ${users.filter(u => u.rol === 'CLIENTE').length} clientes demo copiados a la base del portal`);
    }

    const byState =(list, key) => list.reduce((acc, x) => { acc[x[key]] = (acc[x[key]] || 0) + 1; return acc; }, {});
    const confirmed = new Set(sim.reservations.filter(r => r.estado === 'CONFIRMADA').map(r => r.id));
    const revenue = sim.details.reduce((sum, d) => (confirmed.has(d.reserva_id) ? sum + d.cantidad * d.precio_unitario : sum), 0);
    console.log('\n✅ Seed completado en', ((Date.now() - started) / 1000).toFixed(1), 's');
    console.table({
      categorias: catalog.categorias.length,
      productos: products.length,
      usuarios: users.length,
      lotes: lots.length,
      reservas: sim.reservations.length,
      reserva_detalles: sim.details.length,
      movimientos: sim.movements.length,
      mermas: sim.wastes.length,
      alertas: alerts.length,
      promociones: promotions.length,
      cambios_pvp: priceChanges.length,
      productos_nuevos: products.filter(p => p.createdAt > NOW - NEW_PRODUCT_DAYS * DAY_MS).length
    });
    console.log('Lotes por estado:', byState(lots, 'estado'));
    console.log('Reservas por estado:', byState(sim.reservations, 'estado'));
    console.log('Promociones por estado:', byState(promotions, 'estado'));
    console.log(`Ofertas con límites: ${offerStats.ended} vencidas, ${offerStats.soldOut} agotadas, `
      + `${offerStats.lines} líneas de reserva en ${offerStats.offers} ofertas`);
    console.log(`Ventas confirmadas simuladas: $${round2(revenue).toLocaleString('es-EC')}`);
    console.log(`\n🔑 Accesos demo (contraseña: ${DEMO_PASSWORD}):`);
    console.log(`   admin@${DEMO_EMAIL_DOMAIN} · bodega@${DEMO_EMAIL_DOMAIN} · percha@${DEMO_EMAIL_DOMAIN} · cliente@${DEMO_EMAIL_DOMAIN}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

main().catch(error => {
  console.error('❌ Error ejecutando el seed:', error);
  process.exit(1);
});
