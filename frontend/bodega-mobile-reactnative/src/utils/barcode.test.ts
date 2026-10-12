import { isValidGtin, normalizeBarcode, validateScannedBarcode } from './barcode';

describe('validación de códigos GTIN/EAN', () => {
  it('acepta el EAN-13 leído por la cámara y normaliza espacios', () => {
    expect(normalizeBarcode(' 7862108 350431\n')).toBe('7862108350431');
    expect(isValidGtin('7862108350431')).toBe(true);
  });

  it('rechaza longitudes y dígitos verificadores incorrectos', () => {
    expect(validateScannedBarcode('7862108350430')).toBe('invalid');
    expect(validateScannedBarcode('1234')).toBe('invalid');
    expect(validateScannedBarcode('')).toBe('empty');
  });

  it('acepta los códigos corregidos de los productos demo', () => {
    expect(isValidGtin('7861000100014')).toBe(true);
    expect(isValidGtin('786999900018')).toBe(true);
    expect(isValidGtin('7861234567898')).toBe(true);
  });
});
