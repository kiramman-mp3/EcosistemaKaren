import { bestSellerIds, isNewProduct } from './catalogRules';

const NOW = new Date('2026-10-25T12:00:00Z').getTime();
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

describe('isNewProduct', () => {
  it('marca como nuevo lo dado de alta hace 14 días o menos', () => {
    expect(isNewProduct(daysAgo(0.5), NOW)).toBe(true);
    expect(isNewProduct(daysAgo(14), NOW)).toBe(true);
    expect(isNewProduct(daysAgo(14.01), NOW)).toBe(false);
  });

  it('no marca productos sin fecha, con fecha inválida o futura', () => {
    expect(isNewProduct(undefined, NOW)).toBe(false);
    expect(isNewProduct('no-es-fecha', NOW)).toBe(false);
    expect(isNewProduct(daysAgo(-1), NOW)).toBe(false);
  });
});

describe('bestSellerIds', () => {
  const catalog = (sales: number[]) => sales.map((soldLast30d, i) => ({ id: `p${i}`, soldLast30d }));

  it('toma el 10 % superior del catálogo', () => {
    const products = catalog([50, 40, 30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1]);
    expect([...bestSellerIds(products)]).toEqual(['p0', 'p1']);
  });

  it('nunca marca productos sin ventas, aunque falten productos para llenar el cupo', () => {
    const products = catalog([0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect([...bestSellerIds(products)]).toEqual(['p2']);
    expect(bestSellerIds(catalog([0, 0, 0])).size).toBe(0);
    expect(bestSellerIds([{ id: 'x' }]).size).toBe(0);
  });

  it('un empate en el corte entra completo', () => {
    const products = catalog([9, 5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect([...bestSellerIds(products)].sort()).toEqual(['p0', 'p1', 'p2']);
  });
});
