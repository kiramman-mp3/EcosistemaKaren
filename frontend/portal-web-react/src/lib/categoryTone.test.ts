import { describe, expect, it } from 'vitest';
import { categoryTone } from './categoryTone';

describe('categoryTone', () => {
  it('asigna un color de pasillo según la categoría', () => {
    expect(categoryTone('Lácteos y Derivados')).toBe('limon');
    expect(categoryTone('Panadería y Tortillas')).toBe('naranja');
    expect(categoryTone('Galletas y Snacks')).toBe('guayaba');
    expect(categoryTone('Salsas, Untables y Condimentos')).toBe('karen');
  });

  it('usa aguacate para las categorías sin regla y limón si no hay categoría', () => {
    expect(categoryTone('Limpieza y Hogar')).toBe('aguacate');
    expect(categoryTone(undefined)).toBe('limon');
  });
});
