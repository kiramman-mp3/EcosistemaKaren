// Las fechas de lote llegan del backend como 'AAAA-MM-DD' (día calendario).
// new Date('AAAA-MM-DD') las interpreta como UTC y en Ecuador las mueve al día
// anterior, así que se construyen siempre como medianoche local.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function parseBusinessDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const match = DATE_ONLY.exec(value.trim());
  if (match && value.trim().length === 10) {
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parseBusinessDate(parsed);
}

/** Días calendario hasta la fecha (0 = hoy, negativo = vencido). NaN si no es válida. */
export function daysUntil(value: string | Date | null | undefined, reference = new Date()): number {
  const target = parseBusinessDate(value);
  const today = parseBusinessDate(reference);
  if (!target || !today) return NaN;
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function toDateOnly(value: Date): string {
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${mm}-${dd}`;
}

export function addDays(value: Date, days: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);
}

/** 13 oct 2026 */
export function formatDate(value: string | Date | null | undefined): string {
  const date = parseBusinessDate(value);
  if (!date) return '—';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** 13 oct 2026, 21:05 — para marcas de tiempo (movimientos, expiración de reservas). */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hh}:${mi}`;
}

/** 21:05 */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
