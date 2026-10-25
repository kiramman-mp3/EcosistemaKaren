#!/usr/bin/env node
/**
 * Levanta todo el ecosistema en desarrollo con un solo comando.
 *
 *   node start.js                 # deps + .env + PostgreSQL + seed (si está vacía) + backend + portal web + ambos Expo
 *   node start.js --mobile=portal # solo el Expo del portal mobile (también: bodega, all, none)
 *   node start.js --no-mobile     # sin Expo (equivale a --mobile=none)
 *   node start.js --setup         # solo prepara (deps, .env, base de datos) y termina
 *   node start.js --api-url=URL   # URL del backend para las apps móviles (por defecto, la IP de la red local)
 *   node start.js --no-seed       # no siembra datos aunque la base esté vacía
 *   node start.js --skip-images   # el seed no descarga imágenes de productos
 *   node start.js --split         # backend separado (ADR-003): store-api + portal-api, cada uno con su base
 *                                 # (--api-url = portal móvil, --store-api-url = bodega móvil)
 *   node start.js --down          # detiene PostgreSQL (y la base del portal) y pgAdmin
 *
 * Solo usa módulos nativos de Node (>= 20). Ctrl+C detiene backend y frontends;
 * los contenedores de Docker se dejan corriendo (usar --down para pararlos).
 * Cada Expo se abre en su propia terminal (Windows/macOS) para mostrar el QR; se cierran a mano.
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const os = require('os');
const { isWeakKey, withServiceKey, buildSplitEnv, mobileApiUrls, deprecatedEnvVars } = require('./dev/splitEnv');

const ROOT = __dirname;
const BACKEND = path.join(ROOT, 'backend');
const FRONT = path.join(ROOT, 'frontend');
const PROJECTS = [
  BACKEND,
  path.join(FRONT, 'portal-web-react'),
  path.join(FRONT, 'portal-mobile-reactnative'),
  path.join(FRONT, 'bodega-mobile-reactnative'),
];
const IS_WIN = process.platform === 'win32';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  return [key, value === undefined ? true : value];
}));

const SPLIT = Boolean(args.split);
const children = [];
const log = (msg) => console.log(`\x1b[36m[start]\x1b[0m ${msg}`);
const fail = (msg) => { console.error(`\x1b[31m[start] ${msg}\x1b[0m`); process.exit(1); };
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function run(cmd, cmdArgs, cwd, opts = {}) {
  return spawnSync(cmd, cmdArgs, {
    cwd, shell: IS_WIN && cmd === 'npm', encoding: 'utf8', stdio: opts.capture ? 'pipe' : 'inherit',
    env: opts.env ? { ...process.env, ...opts.env } : process.env
  });
}

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith('#') && line.includes('='))
    .map(line => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]));
}

function ensureEnvFile() {
  const envFile = path.join(BACKEND, '.env');
  if (fs.existsSync(envFile)) return log('backend/.env ya existe');
  const secret = crypto.randomBytes(48).toString('hex');
  const example = fs.readFileSync(path.join(BACKEND, '.env.example'), 'utf8');
  fs.writeFileSync(envFile, example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`));
  log('backend/.env creado con un JWT_SECRET aleatorio');
}

// Clave compartida entre store-api y portal-api. Si .env no tiene una válida se genera y se guarda.
function serviceKey() {
  const envFile = path.join(BACKEND, '.env');
  const current = readEnv(envFile).STORE_SERVICE_KEY;
  if (!isWeakKey(current)) return current;
  const key = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(envFile, withServiceKey(fs.readFileSync(envFile, 'utf8'), key));
  log('backend/.env: se generó STORE_SERVICE_KEY para el canal tienda ↔ portal');
  return key;
}

function installDependencies() {
  for (const dir of PROJECTS) {
    const name = path.relative(ROOT, dir);
    if (fs.existsSync(path.join(dir, 'node_modules'))) { log(`${name}: dependencias ya instaladas`); continue; }
    log(`${name}: npm ci`);
    if (run('npm', ['ci'], dir).status !== 0) fail(`npm ci falló en ${name}`);
  }
}

function dockerRunning() {
  return run('docker', ['info'], ROOT, { capture: true }).status === 0;
}

async function ensureDocker() {
  if (run('docker', ['--version'], ROOT, { capture: true }).status !== 0) fail('Docker no está instalado');
  if (dockerRunning()) return;
  if (IS_WIN) {
    const exe = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'Docker Desktop.exe');
    const alt = path.join(process.env.ProgramFiles || '', 'Docker', 'Docker', 'Docker Desktop.exe');
    const found = [exe, alt].find(p => fs.existsSync(p));
    if (found) {
      log('Iniciando Docker Desktop...');
      spawn(found, [], { detached: true, stdio: 'ignore' }).unref();
    }
  }
  for (let i = 0; i < 60; i++) {
    if (dockerRunning()) return;
    if (i === 0) log('Esperando al daemon de Docker...');
    await sleep(5000);
  }
  fail('El daemon de Docker no respondió; inícialo manualmente y reintenta');
}

async function ensureDatabase() {
  await ensureDocker();
  const composeArgs = SPLIT ? ['compose', '--profile', 'split', 'up', '-d'] : ['compose', 'up', '-d'];
  log(`docker ${composeArgs.join(' ')}`);
  if (run('docker', composeArgs, BACKEND).status !== 0) fail('docker compose up falló');
  for (const service of SPLIT ? ['postgres', 'postgres_portal'] : ['postgres']) {
    let healthy = false;
    for (let i = 0; i < 60 && !healthy; i++) {
      const out = run('docker', ['compose', '--profile', 'split', 'ps', service, '--format', '{{.Health}}'], BACKEND, { capture: true });
      healthy = (out.stdout || '').trim() === 'healthy';
      if (!healthy) await sleep(3000);
    }
    if (!healthy) fail(`${service} no llegó a healthy`);
    log(`${service} healthy`);
  }
}

function databaseIsEmpty() {
  const env = readEnv(path.join(BACKEND, '.env'));
  const out = run('docker', ['compose', 'exec', '-T', 'postgres', 'psql',
    '-U', env.DB_USER || 'karen_user', '-d', env.DB_NAME || 'ecosistema_karen',
    '-tAc', 'SELECT count(*) FROM productos'], BACKEND, { capture: true });
  return out.status !== 0 || Number((out.stdout || '').trim()) === 0;
}

// En modo separado los clientes demo también deben existir en la base del portal para poder iniciar sesión.
function portalDatabaseIsEmpty(portalDb) {
  const out = run('docker', ['compose', '--profile', 'split', 'exec', '-T', 'postgres_portal', 'psql',
    '-U', portalDb.PORTAL_DB_USER, '-d', portalDb.PORTAL_DB_NAME,
    '-tAc', 'SELECT count(*) FROM usuarios'], BACKEND, { capture: true });
  return out.status !== 0 || Number((out.stdout || '').trim()) === 0;
}

function seedIfNeeded(split) {
  if (args['no-seed']) return;
  const storeEmpty = databaseIsEmpty();
  const portalEmpty = Boolean(split) && portalDatabaseIsEmpty(split.portalDb);
  if (!storeEmpty && !portalEmpty) return log('Las bases ya tienen datos; se omite el seed');
  log(storeEmpty
    ? 'Base vacía: sembrando datos de demostración (puede tardar ~2 min)'
    : 'La base del portal está vacía: se vuelve a sembrar para copiar los clientes demo (puede tardar ~2 min)');
  const seedArgs = ['run', 'db:seed'].concat(args['skip-images'] ? ['--', '--skip-images'] : []);
  if (run('npm', seedArgs, BACKEND, { env: split ? split.portalDb : undefined }).status !== 0) fail('El seed falló');
}

function start(name, color, cwd, cmd, cmdArgs, { interactive = true, env = {} } = {}) {
  const child = spawn(cmd, cmdArgs, { cwd, env: { ...process.env, ...env }, shell: IS_WIN && cmd === 'npm', stdio: [interactive ? 'inherit' : 'ignore', 'pipe', 'pipe'] });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  for (const stream of [child.stdout, child.stderr]) {
    let pending = '';
    stream.on('data', chunk => {
      const lines = (pending + chunk).split(/\r?\n/);
      pending = lines.pop();
      lines.forEach(line => console.log(prefix + line));
    });
  }
  child.on('exit', code => log(`${name} terminó (código ${code})`));
  children.push(child);
}

// Abre el comando en una terminal propia (con TTY, así Expo imprime el QR). Devuelve false si no hay forma de hacerlo.
function openTerminal(title, cwd, command, env = {}) {
  let child;
  if (IS_WIN) {
    // cmd.exe hereda el entorno del proceso que lo lanza, y Expo lee de ahí EXPO_PUBLIC_*.
    child = spawn('cmd.exe', ['/c', 'start', `"${title}"`, '/D', `"${cwd}"`, 'cmd', '/k', `"${command}"`],
      { windowsVerbatimArguments: true, detached: true, stdio: 'ignore', env: { ...process.env, ...env } });
  } else if (process.platform === 'darwin') {
    // Terminal.app no hereda el entorno: se exporta dentro del propio comando.
    const exports = Object.entries(env).map(([key, value]) => `export ${key}='${value}' && `).join('');
    const script = `tell application "Terminal" to do script "cd '${cwd}' && ${exports}${command}"`;
    child = spawn('osascript', ['-e', script, '-e', 'tell application "Terminal" to activate'], { detached: true, stdio: 'ignore' });
  } else {
    return false;
  }
  child.on('error', () => {});
  child.unref();
  return true;
}

// IP de la PC en la red local (ignora adaptadores virtuales de WSL, Docker, VirtualBox...).
function lanAddress() {
  const lan = Object.entries(os.networkInterfaces())
    .filter(([name]) => !/vEthernet|WSL|VirtualBox|VMware|Docker|Hyper-V/i.test(name))
    .flatMap(([, list]) => list)
    .find(i => i.family === 'IPv4' && !i.internal);
  return lan ? lan.address : null;
}

// Un teléfono no alcanza "localhost" de la PC: las apps móviles necesitan la IP de la red local.
// Prioridad: --api-url, luego EXPO_PUBLIC_API_URL ya definida, luego la IP detectada ahora.
function mobileApiUrl(port) {
  if (typeof args['api-url'] === 'string') return args['api-url'].replace(/\/$/, '');
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = lanAddress();
  return host ? `http://${host}:${port}/api/v1` : null;
}

function stopAll() {
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    if (IS_WIN) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
}

function waitForBackend(port) {
  return new Promise(resolve => {
    const deadline = Date.now() + 60000;
    const tick = () => {
      http.get({ host: 'localhost', port, path: '/api/v1/products' }, res => { res.resume(); resolve(true); })
        .on('error', () => (Date.now() > deadline ? resolve(false) : setTimeout(tick, 1000)));
    };
    tick();
  });
}

async function main() {
  if (args.down) {
    await ensureDocker();
    return process.exit(run('docker', ['compose', '--profile', 'split', 'down'], BACKEND).status || 0);
  }

  const [major] = process.versions.node.split('.').map(Number);
  if (major < 20) fail(`Se requiere Node >= 20 (actual ${process.versions.node})`);

  ensureEnvFile();
  installDependencies();
  const backendEnv = readEnv(path.join(BACKEND, '.env'));
  for (const { name, reason } of deprecatedEnvVars(backendEnv)) log(`aviso: backend/.env define ${name}, que ${reason}. Puede borrarla.`);
  const split = SPLIT ? buildSplitEnv({ env: backendEnv, serviceKey: serviceKey() }) : null;
  await ensureDatabase();
  seedIfNeeded(split);
  if (args.setup) return log('Entorno listo.');

  let port = Number(backendEnv.PORT) || 4000;
  if (split) {
    // El portal primero: la tienda le envía latido y catálogo y le pide comandos apenas arranca.
    port = split.storePort;
    start('portal-api', '36', BACKEND, 'npm', ['run', 'start:portal'], { env: split.portal });
    if (!(await waitForBackend(split.portalPort))) log(`portal-api no respondió en :${split.portalPort}; revisa sus logs`);
    start('store-api', '32', BACKEND, 'npm', ['run', 'start:store'], { env: split.store });
  } else {
    start('backend', '32', BACKEND, 'npm', ['start']);
  }
  if (!(await waitForBackend(port))) log(`El backend no respondió en :${port}; revisa sus logs`);
  start('web', '35', path.join(FRONT, 'portal-web-react'), 'npm', ['run', 'dev'], { env: split ? split.web : {} });

  const mobile = args['no-mobile'] ? 'none' : (args.mobile === undefined || args.mobile === true ? 'all' : args.mobile);
  // Cada Expo va en su propia terminal para que muestre el QR; puertos fijos porque no pueden compartir el 8081.
  const expos = [
    ['portal', 'portal-mobile', '33', PROJECTS[2], 8081],
    ['bodega', 'bodega-mobile', '34', PROJECTS[3], 8082],
  ].filter(([key]) => mobile === key || mobile === 'all');
  const inline = [];
  // Cada app móvil apunta a su backend: con uno solo es el mismo; en modo separado, portal-api o store-api.
  let apiUrls = {};
  if (split) {
    apiUrls = mobileApiUrls({ args, lanHost: lanAddress(), storePort: split.storePort, portalPort: split.portalPort });
  } else if (expos.length) {
    const url = mobileApiUrl(port);
    apiUrls = { portal: url, bodega: url };
  }
  const expoEnvFor = (key) => (apiUrls[key] ? { EXPO_PUBLIC_API_URL: apiUrls[key] } : {});
  for (const [key, name] of expos) {
    if (apiUrls[key]) log(`${name} → backend en ${apiUrls[key]} (el teléfono debe estar en la misma red Wi-Fi)`);
    else log(`${name}: no se detectó la IP de la red local; usará localhost (solo sirve en emulador).`);
  }
  for (const expo of expos) {
    const [key, name, , cwd, expoPort] = expo;
    if (openTerminal(name, cwd, `npm start -- --port ${expoPort}`, expoEnvFor(key))) log(`${name}: Expo abierto en otra terminal`);
    else inline.push(expo);
  }
  // Sin terminal externa (p. ej. Linux) Expo corre aquí sin stdin y no imprime el QR; se muestra la URL para pegarla en Expo Go ("Enter URL manually").
  for (const [key, name, color, cwd, expoPort] of inline) start(name, color, cwd, 'npm', ['start', '--', '--port', String(expoPort)], { interactive: false, env: expoEnvFor(key) });
  if (inline.length) {
    const host = lanAddress() || 'localhost';
    for (const [, name, , , expoPort] of inline) log(`${name}: exp://${host}:${expoPort}`);
  }

  log('Todo en marcha. Ctrl+C para detener. Accesos demo: admin|bodega|percha|cliente@demo.karen.ec / Karen2026*');
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stopAll(); process.exit(0); });
process.on('exit', stopAll);
main().catch(err => fail(err.stack || String(err)));
