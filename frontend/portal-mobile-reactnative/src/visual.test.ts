import { greetingFor } from './utils/greeting';
import { categoryTone, toneSolid } from './theme/categoryTone';
import { setThemeMode, colors, themed } from './theme/tokens';

describe('greetingFor', () => {
  it('usa la hora de Guayaquil (UTC-5)', () => {
    expect(greetingFor(new Date('2026-10-20T14:00:00Z'))).toBe('Buenos días');
    expect(greetingFor(new Date('2026-10-20T20:00:00Z'))).toBe('Buenas tardes');
    expect(greetingFor(new Date('2026-10-21T03:00:00Z'))).toBe('Buenas noches');
  });
});

describe('categoryTone', () => {
  it('asigna un color de pasillo según la categoría', () => {
    expect(categoryTone('Lácteos y Derivados')).toBe('limon');
    expect(categoryTone('Panadería y Tortillas')).toBe('naranja');
    expect(categoryTone('Galletas y Snacks')).toBe('guayaba');
    expect(categoryTone('Limpieza y Hogar')).toBe('aguacate');
    expect(categoryTone(null)).toBe('limon');
  });

  it('devuelve texto con contraste sobre el bloque de color', () => {
    expect(toneSolid('aguacate').fg).toBe('#FFFFFF');
    expect(toneSolid('limon').fg).toBe(colors.mora);
  });
});

describe('themed', () => {
  afterEach(() => setThemeMode('light'));

  it('vuelve a crear los estilos al cambiar el modo de tema', () => {
    const factory = jest.fn(() => ({ page: { backgroundColor: colors.aisle } }));
    const styles = themed(factory);

    setThemeMode('light');
    expect(styles.page.backgroundColor).toBe('#F6F1FB');
    expect(styles.page.backgroundColor).toBe('#F6F1FB');
    expect(factory).toHaveBeenCalledTimes(1);

    setThemeMode('dark');
    expect(styles.page.backgroundColor).toBe('#1B0B2E');
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
