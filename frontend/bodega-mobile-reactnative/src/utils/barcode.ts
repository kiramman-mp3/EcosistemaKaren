const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

export function normalizeBarcode(value: string): string {
  return String(value || '').trim().replace(/\s+/g, '');
}

export function isValidGtin(value: string): boolean {
  const code = normalizeBarcode(value);
  if (!/^\d+$/.test(code) || !GTIN_LENGTHS.has(code.length)) return false;

  const body = code.slice(0, -1);
  const expected = Number(code[code.length - 1]);
  let sum = 0;
  for (let index = body.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += Number(body[index]) * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === expected;
}

export function validateScannedBarcode(value: string): 'empty' | 'invalid' | 'valid' {
  const code = normalizeBarcode(value);
  if (!code) return 'empty';
  return isValidGtin(code) ? 'valid' : 'invalid';
}
