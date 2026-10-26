import type { BackendReservation } from '../api/client';
import type { ReservationPass } from '../types';
import { STORE_INFO } from '../config/storeInfo';
import { canExtendReservation } from './extension';

export function secondsUntil(expiration: string, now = Date.now()): number {
  const timestamp = new Date(expiration).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.ceil((timestamp - now) / 1000));
}

export function selectActiveReservation(
  reservations: BackendReservation[],
  now = Date.now()
): BackendReservation | null {
  return reservations.find(reservation =>
    reservation.estado === 'PENDIENTE' && secondsUntil(reservation.fechaExpiracion, now) > 0
  ) || null;
}

/** Duración total de la reserva (de que se creó a que vence), para dibujar la barra de tiempo. */
function totalSeconds(reservation: BackendReservation): number | undefined {
  if (!reservation.created_at) return undefined;
  const seconds = Math.round((new Date(reservation.fechaExpiracion).getTime() - new Date(reservation.created_at).getTime()) / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

export function reservationToPass(reservation: BackendReservation, now = Date.now()): ReservationPass {
  return {
    initialSeconds: totalSeconds(reservation),
    id: reservation.id,
    canExtend: canExtendReservation(reservation, now),
    // Solo las reservas aceptadas por la tienda (PENDIENTE) llegan aquí, y ésas siempre traen código.
    code: reservation.codigoRetiro ?? '',
    status: reservation.estado,
    remainingSeconds: secondsUntil(reservation.fechaExpiracion, now),
    storeLocation: STORE_INFO.tradeName,
    items: reservation.detalles.map(detail => ({
      productName: detail.productoNombre || `Producto reservado · lote ${detail.loteId.slice(0, 8)}`,
      quantity: Number(detail.cantidad),
      price: Number(detail.precioUnitario),
    })),
    total: reservation.detalles.reduce(
      (total, detail) => total + Number(detail.cantidad) * Number(detail.precioUnitario), 0
    ),
  };
}
