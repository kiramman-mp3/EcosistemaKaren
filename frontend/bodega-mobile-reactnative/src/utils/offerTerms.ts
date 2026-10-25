import { formatDateTime, toDateOnly, addDays } from './dates';

// Límites de una oferta que fija el ADMIN al revisar el borrador. Los tres son opcionales: vacío
// significa "sin tope" (todo el lote, hasta que caduque). La tienda vuelve a validarlos al guardar,
// al publicar y en cada reserva; aquí solo se evita enviar algo que seguro se rechaza.

export interface OfferTermsInput {
  limit: string;
  stock: string;
  endDate: string; // AAAA-MM-DD, hora local
  endTime: string; // HH:MM
}

export interface OfferTerms {
  limitePorPedido: number | null;
  stockOferta: number | null;
  vigenteHasta: string | null; // ISO 8601
}

const MAX_UNITS = 100_000;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Unidades escritas: null si está vacío, NaN si no es un entero entre 1 y 100.000. */
export function parseUnits(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return NaN;
  const value = Number(trimmed);
  return value >= 1 && value <= MAX_UNITS ? value : NaN;
}

/** Fecha y hora de fin en hora local: null si ambos están vacíos, 'invalid' si no forman una fecha real. */
export function parseEndsAt(date: string, time: string): Date | null | 'invalid' {
  const d = date.trim();
  const t = time.trim();
  if (!d && !t) return null;
  const dm = DATE.exec(d);
  const tm = TIME.exec(t || '23:59');
  if (!dm || !tm) return 'invalid';
  const [y, m, day] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const value = new Date(y, m - 1, day, Number(tm[1]), Number(tm[2]));
  if (value.getFullYear() !== y || value.getMonth() !== m - 1 || value.getDate() !== day) return 'invalid';
  return value;
}

/** Campos del formulario a partir de lo guardado en la oferta. */
export function termsToInput(offer: Partial<OfferTerms>): OfferTermsInput {
  const ends = offer.vigenteHasta ? new Date(offer.vigenteHasta) : null;
  const valid = ends && !Number.isNaN(ends.getTime());
  return {
    limit: offer.limitePorPedido ? String(offer.limitePorPedido) : '',
    stock: offer.stockOferta ? String(offer.stockOferta) : '',
    endDate: valid ? toDateOnly(ends) : '',
    endTime: valid ? `${String(ends.getHours()).padStart(2, '0')}:${String(ends.getMinutes()).padStart(2, '0')}` : '',
  };
}

/**
 * Valida el formulario contra el lote. Devuelve los límites listos para la API o el error que verá
 * el administrador.
 */
export function validateOfferTerms(
  input: OfferTermsInput,
  available: number | null | undefined,
  now = new Date(),
): { terms: OfferTerms } | { error: string } {
  const limit = parseUnits(input.limit);
  const stock = parseUnits(input.stock);
  const ends = parseEndsAt(input.endDate, input.endTime);
  if (Number.isNaN(limit)) return { error: 'El límite por pedido debe ser un número entero mayor que 0.' };
  if (Number.isNaN(stock)) return { error: 'El stock de oferta debe ser un número entero mayor que 0.' };
  if (limit !== null && stock !== null && limit > stock) {
    return { error: 'El límite por pedido no puede superar el stock de oferta.' };
  }
  if (stock !== null && available != null && stock > available) {
    return { error: `El stock de oferta no puede superar las ${available} unidades libres del lote.` };
  }
  if (ends === 'invalid') return { error: 'Escribe la fecha como AAAA-MM-DD y la hora como HH:MM.' };
  if (ends && ends.getTime() <= now.getTime()) return { error: 'La fecha y hora de fin debe ser futura.' };
  return { terms: { limitePorPedido: limit, stockOferta: stock, vigenteHasta: ends ? ends.toISOString() : null } };
}

export function sameTerms(a: OfferTerms, b: Partial<OfferTerms>): boolean {
  const ends = (value?: string | null) => (value ? new Date(value).getTime() : null);
  return a.limitePorPedido === (b.limitePorPedido ?? null)
    && a.stockOferta === (b.stockOferta ?? null)
    && ends(a.vigenteHasta) === ends(b.vigenteHasta);
}

export type EndPreset = 'hoy' | 'manana' | '3d' | '7d';

export const END_PRESETS: { id: EndPreset; label: string }[] = [
  { id: 'hoy', label: 'Hoy 21:00' },
  { id: 'manana', label: 'Mañana 21:00' },
  { id: '3d', label: 'En 3 días' },
  { id: '7d', label: 'En 7 días' },
];

/** Atajos de fecha y hora de fin; siempre a las 21:00, la hora de cierre de la tienda. */
export function presetEnd(preset: EndPreset, now = new Date()): { endDate: string; endTime: string } {
  const days = { hoy: 0, manana: 1, '3d': 3, '7d': 7 }[preset];
  return { endDate: toDateOnly(addDays(now, days)), endTime: '21:00' };
}

/** Resumen corto de los límites para la tarjeta y la vista de una oferta publicada. */
export function describeOfferTerms(offer: Partial<OfferTerms> & { unidadesRestantes?: number | null }): string[] {
  const parts: string[] = [];
  if (offer.limitePorPedido) parts.push(`Máx. ${offer.limitePorPedido} por pedido`);
  if (offer.stockOferta) {
    parts.push(offer.unidadesRestantes != null
      ? `${offer.unidadesRestantes} de ${offer.stockOferta} con descuento`
      : `${offer.stockOferta} con descuento`);
  }
  if (offer.vigenteHasta) parts.push(`Hasta ${formatDateTime(offer.vigenteHasta)}`);
  return parts;
}
