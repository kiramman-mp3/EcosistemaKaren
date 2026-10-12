export const EXPIRY_THRESHOLDS_DAYS = Object.freeze({
  RED: 7,
  YELLOW: 15,
});

export type ExpiryLevel = 'VENCIDO' | 'ROJO' | 'AMARILLO' | 'NORMAL';

export function classifyExpiryDays(days: number): ExpiryLevel {
  if (!Number.isFinite(days)) return 'NORMAL';
  if (days <= 0) return 'VENCIDO';
  if (days < EXPIRY_THRESHOLDS_DAYS.RED) return 'ROJO';
  if (days < EXPIRY_THRESHOLDS_DAYS.YELLOW) return 'AMARILLO';
  return 'NORMAL';
}
