import { CONTENT_MAX_WIDTH, cellWidth, layoutFor } from './layout';

describe('layoutFor', () => {
  test('teléfono: dos columnas de productos y una de ofertas', () => {
    const phone = layoutFor(360);
    expect(phone).toMatchObject({ isTablet: false, isWide: false, gutter: 16, productColumns: 2, offerColumns: 1, aisleColumns: 2, reservationColumns: 1 });
    expect(layoutFor(599).isTablet).toBe(false);
  });

  test('tableta vertical: más columnas', () => {
    const tablet = layoutFor(800);
    expect(tablet).toMatchObject({ isTablet: true, isWide: false, gutter: 24, offerColumns: 2, aisleColumns: 3, reservationColumns: 1 });
    expect(tablet.productColumns).toBe(4);
    expect(layoutFor(600).isTablet).toBe(true);
  });

  test('tableta grande o apaisada: hasta cinco columnas y contenido acotado', () => {
    const wide = layoutFor(1366);
    expect(wide).toMatchObject({ isWide: true, offerColumns: 3, aisleColumns: 4, reservationColumns: 2, productColumns: 5 });
    expect(wide.contentWidth).toBe(CONTENT_MAX_WIDTH);
    expect(layoutFor(1024).contentWidth).toBe(1024);
  });

  test('las columnas de productos nunca bajan de dos ni pasan de cinco', () => {
    for (const width of [0, 280, 320, 480, 700, 900, 1180, 2000]) {
      const { productColumns } = layoutFor(width);
      expect(productColumns).toBeGreaterThanOrEqual(2);
      expect(productColumns).toBeLessThanOrEqual(5);
    }
  });
});

describe('cellWidth', () => {
  test('reparte el ancho entre las columnas descontando los espacios', () => {
    expect(cellWidth(700, 3, 10)).toBe(226);
    expect(cellWidth(300, 1, 10)).toBe(300);
  });
});
