import type { BackendReservation } from '../api/client';
import type { ReservationPass } from '../types';

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

export function reservationToPass(
  reservation: BackendReservation,
  customerName: string,
  now = Date.now()
): ReservationPass {
  const remainingSeconds = secondsUntil(reservation.fechaExpiracion, now);
  return {
    code: reservation.codigoRetiro,
    status: 'ACTIVA',
    initialSeconds: remainingSeconds,
    remainingSeconds,
    customerName,
    storeLocation: 'Sucursal Matriz - Caja SIACI',
    items: reservation.detalles.map(detail => ({
      productName: `Producto reservado · lote ${detail.loteId.slice(0, 8)}`,
      quantity: Number(detail.cantidad),
      price: Number(detail.precioUnitario),
      lotCode: detail.loteId,
    })),
    total: reservation.detalles.reduce(
      (total, detail) => total + Number(detail.cantidad) * Number(detail.precioUnitario), 0
    ),
  };
}
