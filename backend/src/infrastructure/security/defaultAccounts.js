const bcrypt = require('bcryptjs');

// Cuentas y contraseñas de demostración que existen en el repositorio (init-db/dev, seed.js y el
// repositorio en memoria). En producción ninguna debe existir con su contraseña conocida.
const KNOWN_DEMO_PASSWORDS = ['demo123', 'Karen2026*'];
const DEMO_EMAIL_PATTERNS = ['%@karen.com', '%@demo.karen.ec'];

/**
 * Cuentas de demostración que todavía aceptan una contraseña conocida. Una cuenta con ese correo
 * pero con otra contraseña (ya cambiada) no cuenta. Devuelve [{ email, rol }].
 */
async function findDefaultAccounts(pool, { passwords = KNOWN_DEMO_PASSWORDS, patterns = DEMO_EMAIL_PATTERNS } = {}) {
  const res = await pool.query(
    'SELECT email, rol, password_hash AS "passwordHash" FROM usuarios WHERE email LIKE ANY($1::text[]) LIMIT 50',
    [patterns]
  );
  const found = [];
  for (const row of res.rows) {
    for (const password of passwords) {
      if (await bcrypt.compare(password, row.passwordHash)) {
        found.push({ email: row.email, rol: row.rol });
        break;
      }
    }
  }
  return found;
}

/** Lanza un error si en producción existe alguna cuenta de demostración con su contraseña conocida. */
async function assertNoDefaultAccounts(pool, env = process.env) {
  if (env.NODE_ENV !== 'production' || !pool) return;
  const accounts = await findDefaultAccounts(pool);
  if (accounts.length === 0) return;
  const list = accounts.slice(0, 5).map(account => `${account.email} (${account.rol})`).join(', ');
  throw new Error(
    `Hay ${accounts.length} cuenta(s) de demostración con una contraseña conocida (${list}). ` +
    'Elimínelas o cambie su contraseña antes de iniciar en producción (npm run user:create -- --reset).'
  );
}

module.exports = { findDefaultAccounts, assertNoDefaultAccounts, KNOWN_DEMO_PASSWORDS };
