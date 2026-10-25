import { STORE_INFO, whatsappLink } from './storeInfo';

// RUC de persona natural: cédula válida (módulo 10) seguida de un establecimiento distinto de 000.
function isNaturalPersonRuc(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc) || ruc.endsWith('000')) return false;
  const digits = ruc.slice(0, 10).split('').map(Number);
  const province = digits[0] * 10 + digits[1];
  if (province < 1 || (province > 24 && province !== 30) || digits[2] >= 6) return false;
  const sum = digits.slice(0, 9).reduce((total, digit, i) => {
    const product = digit * (i % 2 === 0 ? 2 : 1);
    return total + (product > 9 ? product - 9 : product);
  }, 0);
  return (10 - (sum % 10)) % 10 === digits[9];
}

describe('datos de la tienda', () => {
  it('usa un RUC válido y no el de la demostración', () => {
    expect(STORE_INFO.ruc).not.toBe('0992345678001');
    expect(isNaturalPersonRuc(STORE_INFO.ruc)).toBe(true);
  });

  it('no conserva la dirección ni la razón social de ejemplo', () => {
    const texts = [STORE_INFO.legalName, STORE_INFO.tradeName, STORE_INFO.address, STORE_INFO.city].join(' ');
    expect(texts).not.toMatch(/Guayaquil|Av\. Principal|S\.A\.|Sucursal/);
  });

  it('arma el enlace de WhatsApp con el mensaje codificado', () => {
    expect(whatsappLink('Hola, ¿abren hoy?')).toBe(
      `https://wa.me/${STORE_INFO.whatsapp.number}?text=Hola%2C%20%C2%BFabren%20hoy%3F`,
    );
  });
});
