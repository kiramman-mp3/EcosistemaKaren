import { daysUntil, formatDate, parseBusinessDate, toDateOnly } from './dates';

describe('fechas de lote', () => {
  it('interpreta AAAA-MM-DD como medianoche local, no UTC', () => {
    const date = parseBusinessDate('2026-10-13')!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 13, 0]);
    expect(parseBusinessDate('2026-02-30')).toBeNull();
  });

  it('cuenta días calendario sin importar la hora actual', () => {
    expect(daysUntil('2026-10-13', new Date(2026, 9, 12, 23, 30))).toBe(1);
    expect(daysUntil('2026-10-12', new Date(2026, 9, 12, 8, 0))).toBe(0);
    expect(daysUntil('2026-10-10', new Date(2026, 9, 12, 8, 0))).toBe(-2);
  });

  it('formatea en español y conserva el día', () => {
    expect(formatDate('2026-10-13')).toBe('13 oct 2026');
    expect(toDateOnly(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
