import { describe, expect, it } from 'vitest';
import { RESERVATION_RANGE_TEXT, formatMinutes } from './reservationRules';

describe('reglas de reserva', () => {
  it('escribe las duraciones como las diría una persona', () => {
    expect(formatMinutes(30)).toBe('30 minutos');
    expect(formatMinutes(60)).toBe('1 hora');
    expect(formatMinutes(90)).toBe('1 hora y media');
    expect(formatMinutes(120)).toBe('2 horas');
    expect(formatMinutes(240)).toBe('4 horas');
    expect(formatMinutes(75)).toBe('1 hora y 15 minutos');
  });

  it('resume el rango que se puede elegir al apartar', () => {
    expect(RESERVATION_RANGE_TEXT).toBe('entre 30 minutos y 2 horas');
  });
});
