import { describe, expect, it } from 'vitest';
import type { BackendReservation } from '../api/client';
import { reservationToPass, secondsUntil, selectActiveReservation } from './recovery';

const NOW = Date.parse('2026-10-09T12:00:00.000Z');

function reservation(overrides: Partial<BackendReservation> = {}): BackendReservation {
  return {
    id: 'reservation-1', usuarioId: 'user-1', codigoRetiro: 'KR-ABC123',
    estado: 'PENDIENTE', fechaExpiracion: '2026-10-09T12:10:00.000Z',
    detalles: [{ loteId: 'lot-123456789', cantidad: 2, precioUnitario: 1.5 }],
    ...overrides,
  };
}

describe('recuperación de reservas', () => {
  it('selecciona únicamente una reserva pendiente no vencida', () => {
    const expired = reservation({ id: 'expired', fechaExpiracion: '2026-10-09T11:59:00.000Z' });
    const active = reservation({ id: 'active' });
    expect(selectActiveReservation([expired, active], NOW)?.id).toBe('active');
    expect(secondsUntil(active.fechaExpiracion, NOW)).toBe(600);
  });

  it('reconstruye total, artículos y contador desde datos del backend', () => {
    const pass = reservationToPass(reservation(), 'Ana', NOW);
    expect(pass.code).toBe('KR-ABC123');
    expect(pass.remainingSeconds).toBe(600);
    expect(pass.total).toBe(3);
    expect(pass.items[0].lotCode).toBe('lot-123456789');
  });
});
