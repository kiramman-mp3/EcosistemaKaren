import { newPriceFrom, parsePrice } from './price';

describe('parsePrice', () => {
  it('acepta punto o coma y redondea a centavos', () => {
    expect(parsePrice('2.75')).toBe(2.75);
    expect(parsePrice(' 2,5 ')).toBe(2.5);
    expect(parsePrice('3')).toBe(3);
    expect(parsePrice('1.239')).toBe(1.24);
  });

  it('rechaza vacíos, ceros, negativos, texto y montos fuera de rango', () => {
    for (const text of ['', '0', '0.00', '-1', 'abc', '1.2.3', '1000001']) {
      expect(parsePrice(text)).toBeNull();
    }
  });
});

describe('newPriceFrom', () => {
  it('no cambia nada si el campo está vacío o repite el PVP actual', () => {
    expect(newPriceFrom('', 2.5)).toBeUndefined();
    expect(newPriceFrom('2.50', 2.5)).toBeUndefined();
  });

  it('devuelve el nuevo PVP, o null si no es un monto válido', () => {
    expect(newPriceFrom('2.75', 2.5)).toBe(2.75);
    expect(newPriceFrom('dos', 2.5)).toBeNull();
  });
});
