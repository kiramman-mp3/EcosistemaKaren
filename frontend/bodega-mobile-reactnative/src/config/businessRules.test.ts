import { classifyExpiryDays, EXPIRY_THRESHOLDS_DAYS } from './businessRules';

describe('umbrales de caducidad de bodega', () => {
  test('mantiene límites inequívocos y compartidos', () => {
    expect(EXPIRY_THRESHOLDS_DAYS).toEqual({ RED: 7, YELLOW: 15 });
    expect(classifyExpiryDays(0)).toBe('VENCIDO');
    expect(classifyExpiryDays(1)).toBe('ROJO');
    expect(classifyExpiryDays(6)).toBe('ROJO');
    expect(classifyExpiryDays(7)).toBe('AMARILLO');
    expect(classifyExpiryDays(14)).toBe('AMARILLO');
    expect(classifyExpiryDays(15)).toBe('NORMAL');
  });
});
