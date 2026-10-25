import { STORE_INFO } from './storeInfo';
import { TERMS_CLAUSES, TERMS_TABS, clausesFor } from './terms';

describe('términos y condiciones', () => {
  test('cada pestaña muestra sus cláusulas y "Todas" las muestra todas', () => {
    expect(clausesFor('todos')).toHaveLength(TERMS_CLAUSES.length);
    expect(clausesFor('reservas').map(c => c.category)).toEqual(['reservas']);
    expect(clausesFor('pagos')).toHaveLength(3);
    for (const tab of TERMS_TABS.filter(tab => tab.id !== 'todos')) {
      expect(clausesFor(tab.id).length).toBeGreaterThan(0);
    }
  });

  test('las reglas de reserva coinciden con las que valida la tienda', () => {
    const [reservas] = clausesFor('reservas');
    expect(reservas.intro).toContain('entre 30 minutos y 2 horas');
    expect(reservas.bullets.join(' ')).toContain('30 minutos');
    expect(reservas.bullets.join(' ')).toContain('4 horas');
  });

  test('citan los datos reales de la tienda', () => {
    const privacidad = clausesFor('privacidad')[0];
    expect(privacidad.intro).toContain(STORE_INFO.ruc);
    expect(privacidad.bullets.join(' ')).toContain(STORE_INFO.privacyEmail);
  });
});
