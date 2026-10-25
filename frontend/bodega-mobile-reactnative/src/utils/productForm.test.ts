import { formFromProduct, parseProductForm } from './productForm';

const valid = { categoriaId: 'cat-1', nombre: ' Leche Vita 1 L ', descripcion: ' ', precioVenta: '1,25', impuestoPorcentaje: '15', minStockAlerta: '10' };

describe('parseProductForm', () => {
  it('limpia los textos y convierte los números (acepta coma decimal)', () => {
    expect(parseProductForm(valid)).toEqual({
      values: { categoriaId: 'cat-1', nombre: 'Leche Vita 1 L', descripcion: undefined, precioVenta: 1.25, impuestoPorcentaje: 15, minStockAlerta: 10 },
    });
  });

  it('señala el primer dato que no sirve', () => {
    const error = (extra: object) => (parseProductForm({ ...valid, ...extra }) as { error: string }).error;
    expect(error({ categoriaId: '' })).toMatch(/pasillo/);
    expect(error({ nombre: 'ab' })).toMatch(/nombre/);
    expect(error({ precioVenta: '0' })).toMatch(/PVP/);
    expect(error({ precioVenta: 'abc' })).toMatch(/PVP/);
    expect(error({ impuestoPorcentaje: '101' })).toMatch(/IVA/);
    expect(error({ minStockAlerta: '' })).toMatch(/stock mínimo/);
    expect(error({ minStockAlerta: '2.5' })).toMatch(/stock mínimo/);
    expect(error({ minStockAlerta: '-1' })).toMatch(/stock mínimo/);
  });
});

describe('formFromProduct', () => {
  it('carga los datos actuales del producto como texto editable', () => {
    expect(formFromProduct({ categoriaId: 'c', nombre: 'Queso', descripcion: null, precioVenta: '1.95', impuestoPorcentaje: 0, minStockAlerta: 10 }))
      .toEqual({ categoriaId: 'c', nombre: 'Queso', descripcion: '', precioVenta: '1.95', impuestoPorcentaje: '0', minStockAlerta: '10' });
  });
});
