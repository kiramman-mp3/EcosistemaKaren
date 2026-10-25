/**
 * Lee un monto escrito en la app ("2.75", "2,75", " 3 "): número con dos decimales, o null si está
 * vacío, no es un número, es cero o negativo, o supera 1.000.000 (el mismo límite del backend).
 */
export function parsePrice(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const value = Math.round(Number(trimmed) * 100) / 100;
  return value > 0 && value <= 1_000_000 ? value : null;
}

/**
 * Nuevo PVP que se enviará con el lote: undefined si el campo está vacío o repite el precio actual
 * (no hay cambio que confirmar), null si lo escrito no es un monto válido.
 */
export function newPriceFrom(text: string, currentPrice: number): number | null | undefined {
  if (!text.trim()) return undefined;
  const value = parsePrice(text);
  if (value === null) return null;
  return value === Math.round(currentPrice * 100) / 100 ? undefined : value;
}
