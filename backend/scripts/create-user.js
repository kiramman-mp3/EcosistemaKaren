/**
 * Crea (o restablece la contraseña de) una cuenta. Es la forma de dar de alta al personal de la
 * tienda (BODEGUERO, PERCHERO, ADMIN), que no puede registrarse por la API pública.
 *
 *   npm run user:create -- --rol=ADMIN --email=ana@tienda.com --nombre="Ana Pérez"
 *   npm run user:create -- --rol=BODEGUERO --email=luis@tienda.com --nombre="Luis Mora" --reset
 *
 * La contraseña se toma de KAREN_NEW_PASSWORD o se pide por consola sin mostrarla; nunca se imprime.
 * Las cuentas del personal se crean en la base de la tienda (DB_*) y las de clientes (--rol=CLIENTE)
 * en la del portal (PORTAL_DB_*), salvo que se indique --servicio=tienda|portal.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const schemas = require('../src/infrastructure/http/validation/requestSchemas');

const ROLES = ['ADMIN', 'BODEGUERO', 'PERCHERO', 'CLIENTE'];

/** Valida los datos y crea la cuenta. Con `reset` actualiza la contraseña de una cuenta existente. */
async function createUser({ pool, nombre, email, rol, password, reset = false, rounds = Number(process.env.BCRYPT_ROUNDS) || 12 }) {
  const role = String(rol || '').toUpperCase();
  if (!ROLES.includes(role)) throw new Error(`El rol debe ser uno de: ${ROLES.join(', ')}.`);

  const parsed = schemas.registerBody.safeParse({ nombre, email, password });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(issue => `${issue.path.join('.') || 'datos'}: ${issue.message}`).join('\n'));
  }
  const data = parsed.data;
  const passwordHash = await bcrypt.hash(data.password, rounds);

  const existing = await pool.query('SELECT id, rol FROM usuarios WHERE email = $1', [data.email]);
  if (existing.rows.length > 0) {
    if (!reset) throw new Error(`Ya existe una cuenta con el correo ${data.email}. Use --reset para cambiar su contraseña.`);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [passwordHash, existing.rows[0].id]);
    return { id: existing.rows[0].id, email: data.email, rol: existing.rows[0].rol, accion: 'contraseña restablecida' };
  }

  const created = await pool.query(
    'INSERT INTO usuarios (nombre, email, rol, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    [data.nombre, data.email, role, passwordHash]
  );
  return { id: created.rows[0].id, email: data.email, rol: role, accion: 'cuenta creada' };
}

function parseArgs(argv) {
  return Object.fromEntries(argv.map(arg => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : true];
  }));
}

// Lee una línea sin mostrarla (contraseña). Sin terminal interactiva lee la primera línea de stdin.
function promptHidden(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    const { stdin } = process;
    if (!stdin.isTTY) {
      let buffer = '';
      stdin.setEncoding('utf8');
      stdin.on('data', chunk => { buffer += chunk; });
      stdin.on('end', () => resolve(buffer.split(/\r?\n/)[0]));
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (char) => {
      if (char === '\r' || char === '\n' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (char === '\u0003') {
        process.exit(130);
      } else if (char === '\u007f' || char === '\b') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rol = String(args.rol || '').toUpperCase();
  const service = args.servicio || (rol === 'CLIENTE' ? 'portal' : 'tienda');
  if (!['tienda', 'portal'].includes(service)) throw new Error('--servicio debe ser tienda o portal.');
  if (!args.email || !args.nombre || !rol) {
    throw new Error('Uso: npm run user:create -- --rol=ADMIN|BODEGUERO|PERCHERO|CLIENTE --email=correo --nombre="Nombre" [--reset] [--servicio=tienda|portal]');
  }

  const password = process.env.KAREN_NEW_PASSWORD || await promptHidden('Contraseña (mínimo 8 caracteres): ');
  const { getPool, closePool } = require('../src/infrastructure/db/postgres');
  const pool = getPool(service === 'portal' ? 'portal' : 'store');
  try {
    const result = await createUser({ pool, nombre: args.nombre, email: args.email, rol, password, reset: Boolean(args.reset) });
    console.log(`✔ ${result.accion}: ${result.email} (${result.rol}) en la base de ${service}`);
  } finally {
    await closePool();
  }
}

module.exports = { createUser };

if (require.main === module) {
  main().catch(error => {
    console.error(`✖ ${error.message}`);
    process.exit(1);
  });
}
