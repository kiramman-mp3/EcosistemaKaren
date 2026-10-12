// Fechas de negocio (elaboración y caducidad) son días calendario, sin hora ni zona.
// Se interpretan siempre en la zona horaria del negocio (process.env.TZ, configurada
// al arrancar con BUSINESS_TIMEZONE) y viajan por la API como 'AAAA-MM-DD'.

const DEFAULT_BUSINESS_TIMEZONE = 'America/Guayaquil';
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function businessTimezone(env = process.env) {
  return env.BUSINESS_TIMEZONE || DEFAULT_BUSINESS_TIMEZONE;
}

/** Fija la zona horaria del proceso para que los getters locales usen el día del negocio. */
function applyBusinessTimezone(env = process.env) {
  process.env.TZ = businessTimezone(env);
  return process.env.TZ;
}

/** Convierte 'AAAA-MM-DD', Date o ISO a un Date a medianoche local; null si no es válido. */
function parseBusinessDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const text = String(value).trim();
  const match = DATE_ONLY.exec(text);
  if (match) {
    const [, y, m, d] = match.map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parseBusinessDate(parsed);
}

/** 'AAAA-MM-DD' del día local del valor dado. */
function toDateOnly(value) {
  const date = parseBusinessDate(value);
  if (!date) return null;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Días calendario desde hoy (zona del negocio) hasta la fecha; negativo si ya pasó. */
function daysUntil(value, reference = new Date()) {
  const target = parseBusinessDate(value);
  const today = parseBusinessDate(reference);
  if (!target || !today) return NaN;
  // Math.round absorbe el cambio de 23/25 horas de un horario de verano.
  return Math.round((target - today) / DAY_MS);
}

module.exports = {
  DEFAULT_BUSINESS_TIMEZONE,
  businessTimezone,
  applyBusinessTimezone,
  parseBusinessDate,
  toDateOnly,
  daysUntil,
};
