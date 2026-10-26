import { maxPerOrderText, offerCartCap, offerEndText, offerEnded, offerUnitsAvailable } from './offerRules';

const NOW = new Date(2026, 9, 25, 10, 0).getTime(); // 25 oct 2026, 10:00 hora local
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();

describe('unidades y tope del carrito', () => {
  it('sin límites vale todo el lote', () => {
    expect(offerUnitsAvailable({ lotAvailable: 12 })).toBe(12);
    expect(offerCartCap({ lotAvailable: 12, limitePorPedido: null, unidadesRestantes: null })).toBe(12);
  });

  it('el tope es el menor entre el lote, lo que queda de la oferta y el límite por pedido', () => {
    expect(offerUnitsAvailable({ lotAvailable: 12, unidadesRestantes: 3 })).toBe(3);
    expect(offerCartCap({ lotAvailable: 12, limitePorPedido: 2, unidadesRestantes: 3 })).toBe(2);
    expect(offerCartCap({ lotAvailable: 12, limitePorPedido: 2, unidadesRestantes: 1 })).toBe(1);
    expect(offerCartCap({ lotAvailable: 1, limitePorPedido: 4, unidadesRestantes: 3 })).toBe(1);
    expect(offerUnitsAvailable({ lotAvailable: 5, unidadesRestantes: 0 })).toBe(0);
  });
});

describe('fin de la oferta', () => {
  it('sabe si la oferta terminó', () => {
    expect(offerEnded(null, NOW)).toBe(false);
    expect(offerEnded(at(25, 9, 59), NOW)).toBe(true);
    expect(offerEnded(at(25, 10, 1), NOW)).toBe(false);
    expect(offerEnded('no-es-fecha', NOW)).toBe(true);
  });

  it('dice la hora real de fin en palabras', () => {
    expect(offerEndText(at(25, 21), NOW)).toBe('Termina hoy a las 21:00');
    expect(offerEndText(at(26, 9, 30), NOW)).toBe('Termina mañana a las 09:30');
    expect(offerEndText(at(31, 21), NOW)).toBe('Termina el 31 oct a las 21:00');
    expect(offerEndText(null, NOW)).toBeNull();
    expect(offerEndText(at(25, 9), NOW)).toBeNull();
  });

  it('describe el límite por pedido', () => {
    expect(maxPerOrderText(2)).toBe('Máx. 2 por pedido');
    expect(maxPerOrderText(null)).toBeNull();
  });
});
