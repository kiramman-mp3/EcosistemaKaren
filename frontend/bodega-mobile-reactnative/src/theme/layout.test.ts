import { layoutFor } from './layout';

describe('layoutFor', () => {
  test('teléfono: una columna y margen de 16', () => {
    expect(layoutFor(375)).toEqual({ width: 375, isTablet: false, gutter: 16, listColumns: 1 });
    expect(layoutFor(599).isTablet).toBe(false);
  });

  test('tableta vertical: margen mayor, una columna', () => {
    expect(layoutFor(768)).toMatchObject({ isTablet: true, gutter: 24, listColumns: 1 });
    expect(layoutFor(600).isTablet).toBe(true);
  });

  test('tableta apaisada: listas de dos columnas', () => {
    expect(layoutFor(1024)).toMatchObject({ isTablet: true, listColumns: 2 });
    expect(layoutFor(839).listColumns).toBe(1);
    expect(layoutFor(840).listColumns).toBe(2);
  });
});
