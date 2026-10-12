import type { BackendReservation } from '../api/client';
import { reservationToPass, secondsUntil, selectActiveReservation } from './recovery';

const NOW = Date.parse('2026-10-09T12:00:00.000Z');
const active: BackendReservation = {
  id: 'res-1', usuarioId: 'user-1', codigoRetiro: 'KR-MOB123', estado: 'PENDIENTE',
  fechaExpiracion: '2026-10-09T12:05:00.000Z',
  detalles: [{ loteId: 'lot-mobile-1', cantidad: 3, precioUnitario: 2 }],
};

describe('recuperación móvil de reservas', () => {
  test('ignora reservas canceladas o vencidas y conserva una activa', () => {
    expect(selectActiveReservation([
      { ...active, id: 'cancelled', estado: 'CANCELADA' }, active,
    ], NOW)?.id).toBe('res-1');
    expect(secondsUntil(active.fechaExpiracion, NOW)).toBe(300);
  });

  test('reconstruye el pase usando el precio y cantidad persistidos', () => {
    const pass = reservationToPass(active, NOW);
    expect(pass.code).toBe('KR-MOB123');
    expect(pass.total).toBe(6);
    expect(pass.items[0].quantity).toBe(3);
  });
});
