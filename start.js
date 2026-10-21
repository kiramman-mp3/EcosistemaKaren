#!/usr/bin/env node
/**
 * Levanta todo el ecosistema en desarrollo con un solo comando.
 *
 *   node start.js                 # deps + .env + PostgreSQL + seed (si está vacía) + backend + portal web + ambos Expo
 *   node start.js --mobile=portal # solo el Expo del portal mobile (también: bodega, all, none)
 *   node start.js --no-mobile     # sin Expo (equivale a --mobile=none)
 *   node start.js --setup         # solo prepara (deps, .env, base de datos) y termina
 *   node start.js --no-seed       # no siembra datos aunque la base esté vacía
 *   node start.js --skip-images   # el seed no descarga imágenes de productos
 *   node start.js --down          # detiene PostgreSQL y pgAdmin
 *
 * Solo usa módulos nativos de Node (>= 20). Ctrl+C detiene backend y frontends;
 * los contenedores de Docker se dejan corriendo (usar --down para pararlos).
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const os = require('os');

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

const children = [];
const log = (msg) => console.log(`\x1b[36m[start]\x1b[0m ${msg}`);
const fail = (msg) => { console.error(`\x1b[31m[start] ${msg}\x1b[0m`); process.exit(1); };
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function run(cmd, cmdArgs, cwd, opts = {}) {
  return spawnSync(cmd, cmdArgs, { cwd, shell: IS_WIN && cmd === 'npm', encoding: 'utf8', stdio: opts.capture ? 'pipe' : 'inherit' });
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
  log('docker compose up -d');
  if (run('docker', ['compose', 'up', '-d'], BACKEND).status !== 0) fail('docker compose up falló');
  for (let i = 0; i < 60; i++) {
    const out = run('docker', ['compose', 'ps', 'postgres', '--format', '{{.Health}}'], BACKEND, { capture: true });
    if ((out.stdout || '').trim() === 'healthy') return log('PostgreSQL healthy');
    await sleep(3000);
  }
  fail('PostgreSQL no llegó a healthy');
}

function databaseIsEmpty() {
  const env = readEnv(path.join(BACKEND, '.env'));
  const out = run('docker', ['compose', 'exec', '-T', 'postgres', 'psql',
    '-U', env.DB_USER || 'karen_user', '-d', env.DB_NAME || 'ecosistema_karen',
    '-tAc', 'SELECT count(*) FROM productos'], BACKEND, { capture: true });
  return out.status !== 0 || Number((out.stdout || '').trim()) === 0;
}

function seedIfNeeded() {
  if (args['no-seed']) return;
  if (!databaseIsEmpty()) return log('La base ya tiene datos; se omite el seed');
  log('Base vacía: sembrando datos de demostración (puede tardar ~2 min)');
  const seedArgs = ['run', 'db:seed'].concat(args['skip-images'] ? ['--', '--skip-images'] : []);
  if (run('npm', seedArgs, BACKEND).status !== 0) fail('El seed falló');
}

function start(name, color, cwd, cmd, cmdArgs, { interactive = true } = {}) {
  const child = spawn(cmd, cmdArgs, { cwd, shell: IS_WIN && cmd === 'npm', stdio: [interactive ? 'inherit' : 'ignore', 'pipe', 'pipe'] });
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
    return process.exit(run('docker', ['compose', 'down'], BACKEND).status || 0);
  }

  const [major] = process.versions.node.split('.').map(Number);
  if (major < 20) fail(`Se requiere Node >= 20 (actual ${process.versions.node})`);

  ensureEnvFile();
  installDependencies();
  await ensureDatabase();
  seedIfNeeded();
  if (args.setup) return log('Entorno listo.');

  const port = Number(readEnv(path.join(BACKEND, '.env')).PORT) || 4000;
  start('backend', '32', BACKEND, 'npm', ['start']);
  if (!(await waitForBackend(port))) log(`El backend no respondió en :${port}; revisa sus logs`);
  start('web', '35', path.join(FRONT, 'portal-web-react'), 'npm', ['run', 'dev']);

  const mobile = args['no-mobile'] ? 'none' : (args.mobile === undefined || args.mobile === true ? 'all' : args.mobile);
  // Puertos fijos y sin stdin: dos Expo no pueden compartir el 8081 ni el teclado de esta terminal.
  if (mobile === 'portal' || mobile === 'all') start('portal-mobile', '33', PROJECTS[2], 'npm', ['start', '--', '--port', '8081'], { interactive: false });
  if (mobile === 'bodega' || mobile === 'all') start('bodega-mobile', '34', PROJECTS[3], 'npm', ['start', '--', '--port', '8082'], { interactive: false });
  if (mobile !== 'none') {
    // Sin stdin Expo no imprime el QR; se muestra la URL para pegarla en Expo Go ("Enter URL manually").
    const lan = Object.entries(os.networkInterfaces())
      .filter(([name]) => !/vEthernet|WSL|VirtualBox|VMware|Docker|Hyper-V/i.test(name))
      .flatMap(([, list]) => list)
      .find(i => i.family === 'IPv4' && !i.internal);
    const host = lan ? lan.address : 'localhost';
    if (mobile === 'portal' || mobile === 'all') log(`Expo portal: exp://${host}:8081`);
    if (mobile === 'bodega' || mobile === 'all') log(`Expo bodega: exp://${host}:8082`);
  }

  log('Todo en marcha. Ctrl+C para detener. Accesos demo: admin|bodega|percha|cliente@demo.karen.ec / Karen2026*');
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stopAll(); process.exit(0); });
process.on('exit', stopAll);
main().catch(err => fail(err.stack || String(err)));
