import { describeServerUrl, normalizeServerUrl } from './serverUrl';

describe('normalizeServerUrl', () => {
  it('completa esquema, puerto y /api/v1 a partir de una IP', () => {
    expect(normalizeServerUrl('192.168.1.20', 4001)).toBe('http://192.168.1.20:4001/api/v1');
    expect(normalizeServerUrl('  192.168.1.20  ', 4001)).toBe('http://192.168.1.20:4001/api/v1');
  });

  it('respeta el puerto escrito y los nombres de host', () => {
    expect(normalizeServerUrl('10.0.0.5:4000', 4001)).toBe('http://10.0.0.5:4000/api/v1');
    expect(normalizeServerUrl('tienda.local', 4001)).toBe('http://tienda.local:4001/api/v1');
    expect(normalizeServerUrl('TIENDA.Local:80', 4001)).toBe('http://tienda.local:80/api/v1');
  });

  it('acepta URLs completas y no añade puerto a https', () => {
    expect(normalizeServerUrl('https://api.karen.com', 4001)).toBe('https://api.karen.com/api/v1');
    expect(normalizeServerUrl('https://api.karen.com/api/v1/', 4001)).toBe('https://api.karen.com/api/v1');
    expect(normalizeServerUrl('http://192.168.1.20:4001/api/v1', 4001)).toBe('http://192.168.1.20:4001/api/v1');
    expect(normalizeServerUrl('https://api.karen.com:8443', 4001)).toBe('https://api.karen.com:8443/api/v1');
  });

  it('rechaza entradas que no son una dirección', () => {
    for (const value of ['', '   ', 'ftp://192.168.1.20', 'http://', '192.168.1.20:99999', '192.168.1.20:0', 'a b', 'http://host/otra/ruta', 'host..local', '.host', 'http://host?x=1']) {
      expect(normalizeServerUrl(value, 4001)).toBeNull();
    }
  });
});

describe('describeServerUrl', () => {
  it('muestra solo host y puerto', () => {
    expect(describeServerUrl('http://192.168.1.20:4001/api/v1')).toBe('192.168.1.20:4001');
    expect(describeServerUrl('https://api.karen.com/api/v1')).toBe('api.karen.com');
  });
});
