import { formatMinutes } from '../config/reservationRules';
import { canExtendReservation } from './extension';

const NOW = Date.parse('2026-10-09T12:00:00.000Z');
const at = (minutes: number) => new Date(NOW + minutes * 60000).toISOString();
const reservation = (overrides: object = {}) => ({
  estado: 'PENDIENTE' as const, created_at: at(-10), fechaExpiracion: at(20), ...overrides,
});

describe('canExtendReservation', () => {
  test('permite extender una reserva por retirar mientras quepa otra media hora', () => {
    expect(canExtendReservation(reservation(), NOW)).toBe(true);
  });

  test('deja de ofrecerlo al llegar a las 4 horas en total', () => {
    // Creada hace 10 min: vence a las 4 h justas -> ya no cabe otra extensión.
    expect(canExtendReservation(reservation({ fechaExpiracion: at(230) }), NOW)).toBe(false);
    // 30 min antes del tope todavía cabe.
    expect(canExtendReservation(reservation({ fechaExpiracion: at(200) }), NOW)).toBe(true);
  });

  test('no aplica a reservas que no están por retirar o ya vencieron', () => {
    for (const estado of ['PENDIENTE_SYNC', 'CONFIRMADA', 'EXPIRADA', 'CANCELADA', 'RECHAZADA'] as const) {
      expect(canExtendReservation(reservation({ estado }), NOW)).toBe(false);
    }
    expect(canExtendReservation(reservation({ fechaExpiracion: at(-1) }), NOW)).toBe(false);
  });

  test('sin fecha de creación se deja intentar: la tienda decide', () => {
    expect(canExtendReservation(reservation({ created_at: undefined }), NOW)).toBe(true);
  });
});

describe('formatMinutes', () => {
  test('escribe las duraciones en palabras', () => {
    expect(formatMinutes(30)).toBe('30 minutos');
    expect(formatMinutes(60)).toBe('1 hora');
    expect(formatMinutes(90)).toBe('1 hora y media');
    expect(formatMinutes(240)).toBe('4 horas');
  });
});
