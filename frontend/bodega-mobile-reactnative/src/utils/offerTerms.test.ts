import {
  describeOfferTerms, parseEndsAt, parseUnits, presetEnd, sameTerms, termsToInput, validateOfferTerms,
} from './offerTerms';

const NOW = new Date(2026, 9, 25, 10, 0); // 25 oct 2026, 10:00 hora local
const empty = { limit: '', stock: '', endDate: '', endTime: '' };

describe('parseUnits', () => {
  it('lee enteros positivos y deja vacío como sin tope', () => {
    expect(parseUnits(' 3 ')).toBe(3);
    expect(parseUnits('')).toBeNull();
    expect(parseUnits('0')).toBeNaN();
    expect(parseUnits('2.5')).toBeNaN();
    expect(parseUnits('abc')).toBeNaN();
  });
});

describe('parseEndsAt', () => {
  it('arma la fecha y hora local, y sin hora toma el final del día', () => {
    expect(parseEndsAt('2026-10-26', '21:00')).toEqual(new Date(2026, 9, 26, 21, 0));
    expect(parseEndsAt('2026-10-26', '')).toEqual(new Date(2026, 9, 26, 23, 59));
    expect(parseEndsAt('', '')).toBeNull();
  });

  it('rechaza fechas que no existen u horas mal escritas', () => {
    expect(parseEndsAt('2026-02-30', '10:00')).toBe('invalid');
    expect(parseEndsAt('26/10/2026', '10:00')).toBe('invalid');
    expect(parseEndsAt('2026-10-26', '25:00')).toBe('invalid');
    expect(parseEndsAt('', '10:00')).toBe('invalid');
  });
});

describe('validateOfferTerms', () => {
  it('sin nada escrito la oferta no tiene topes', () => {
    expect(validateOfferTerms(empty, 10, NOW)).toEqual({ terms: { limitePorPedido: null, stockOferta: null, vigenteHasta: null } });
  });

  it('devuelve los límites listos para la API', () => {
    const result = validateOfferTerms({ limit: '2', stock: '3', endDate: '2026-10-26', endTime: '21:00' }, 10, NOW);
    expect(result).toEqual({ terms: { limitePorPedido: 2, stockOferta: 3, vigenteHasta: new Date(2026, 9, 26, 21, 0).toISOString() } });
  });

  it('aplica las mismas reglas que la tienda', () => {
    expect(validateOfferTerms({ ...empty, limit: '4', stock: '3' }, 10, NOW)).toEqual({ error: expect.stringMatching(/no puede superar el stock/) });
    expect(validateOfferTerms({ ...empty, stock: '11' }, 10, NOW)).toEqual({ error: expect.stringMatching(/10 unidades libres/) });
    expect(validateOfferTerms({ ...empty, endDate: '2026-10-25', endTime: '09:59' }, 10, NOW)).toEqual({ error: expect.stringMatching(/futura/) });
    expect(validateOfferTerms({ ...empty, limit: '0' }, 10, NOW)).toEqual({ error: expect.stringMatching(/límite por pedido/) });
    expect(validateOfferTerms({ ...empty, endDate: 'mañana' }, 10, NOW)).toEqual({ error: expect.stringMatching(/AAAA-MM-DD/) });
  });
});

describe('formulario y resumen', () => {
  it('lo guardado vuelve al formulario y se reconoce sin cambios', () => {
    const saved = { limitePorPedido: 2, stockOferta: 3, vigenteHasta: new Date(2026, 9, 26, 21, 0).toISOString() };
    const input = termsToInput(saved);
    expect(input).toEqual({ limit: '2', stock: '3', endDate: '2026-10-26', endTime: '21:00' });
    const parsed = validateOfferTerms(input, 10, NOW);
    expect('terms' in parsed && sameTerms(parsed.terms, saved)).toBe(true);
    expect('terms' in parsed && sameTerms(parsed.terms, { ...saved, stockOferta: 4 })).toBe(false);
  });

  it('los atajos terminan a las 21:00 del día elegido', () => {
    expect(presetEnd('hoy', NOW)).toEqual({ endDate: '2026-10-25', endTime: '21:00' });
    expect(presetEnd('7d', NOW)).toEqual({ endDate: '2026-11-01', endTime: '21:00' });
  });

  it('resume los límites que tiene la oferta', () => {
    expect(describeOfferTerms({})).toEqual([]);
    expect(describeOfferTerms({ limitePorPedido: 2, stockOferta: 3, unidadesRestantes: 1, vigenteHasta: new Date(2026, 9, 26, 21, 0).toISOString() }))
      .toEqual(['Máx. 2 por pedido', '1 de 3 con descuento', 'Hasta 26 oct 2026, 21:00']);
  });
});
