import type { BackendReservation } from '../api/client';
import { RESERVATION_EXTENSION_MINUTES, RESERVATION_MAX_TOTAL_MINUTES } from '../config/reservationRules';

/**
 * ¿Se puede sumar otra extensión? Solo a una reserva por retirar que no venció y sin pasar de 4 horas en total
 * desde que se creó. Sin fecha de creación se deja intentar: la tienda decide.
 */
export function canExtendReservation(
  reservation: Pick<BackendReservation, 'estado' | 'fechaExpiracion' | 'created_at'>,
  now = Date.now()
): boolean {
  if (reservation.estado !== 'PENDIENTE') return false;
  const expiration = new Date(reservation.fechaExpiracion).getTime();
  if (!Number.isFinite(expiration) || expiration <= now) return false;
  if (!reservation.created_at) return true;
  const created = new Date(reservation.created_at).getTime();
  if (!Number.isFinite(created)) return true;
  return expiration + RESERVATION_EXTENSION_MINUTES * 60000 <= created + RESERVATION_MAX_TOTAL_MINUTES * 60000;
}
