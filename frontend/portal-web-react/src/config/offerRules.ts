// Límites reales de una oferta, tal como los fija el ADMIN en la tienda: unidades por pedido, unidades
// con descuento que quedan y fecha y hora de fin (null = sin tope). El portal los usa para guiar al
// cliente; la tienda decide al reservar y rechaza lo que no cabe.

export interface OfferLimits {
  lotAvailable: number;
  limitePorPedido?: number | null;
  unidadesRestantes?: number | null;
}

/** Unidades con descuento que se pueden ofrecer ahora: lo que hay en el lote y lo que queda de la oferta. */
export function offerUnitsAvailable({ lotAvailable, unidadesRestantes }: OfferLimits): number {
  const lot = Math.max(0, lotAvailable);
  return unidadesRestantes == null ? lot : Math.min(lot, Math.max(0, unidadesRestantes));
}

/** Máximo que el carrito deja poner de la oferta en un pedido. */
export function offerCartCap(limits: OfferLimits): number {
  const units = offerUnitsAvailable(limits);
  return limits.limitePorPedido ? Math.min(units, limits.limitePorPedido) : units;
}

/** La oferta ya terminó (o la fecha no es válida y no conviene ofrecerla). */
export function offerEnded(endsAt: string | null | undefined, now = Date.now()): boolean {
  if (!endsAt) return false;
  const end = new Date(endsAt).getTime();
  return !Number.isFinite(end) || end <= now;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAY_MS = 86_400_000;

/** "Termina hoy a las 21:00", "Termina mañana a las 09:30" o "Termina el 31 oct a las 21:00" (hora local). */
export function offerEndText(endsAt: string | null | undefined, now = Date.now()): string | null {
  if (!endsAt || offerEnded(endsAt, now)) return null;
  const end = new Date(endsAt);
  const time = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.floor((new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() - startOfToday) / DAY_MS);
  if (days === 0) return `Termina hoy a las ${time}`;
  if (days === 1) return `Termina mañana a las ${time}`;
  return `Termina el ${end.getDate()} ${MONTHS[end.getMonth()]} a las ${time}`;
}

export function maxPerOrderText(limit: number | null | undefined): string | null {
  return limit ? `Máx. ${limit} por pedido` : null;
}
