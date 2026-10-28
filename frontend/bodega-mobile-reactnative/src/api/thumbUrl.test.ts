import { thumbUrl } from './thumbUrl';

const PHOTO = 'http://192.168.1.20:4001/api/v1/media/productos/7861001234567-ab12cd34ef.jpg';

describe('thumbUrl', () => {
  it('añade el ancho a la URL de una foto del backend', () => {
    expect(thumbUrl(PHOTO, 320)).toBe(`${PHOTO}?w=320`);
    expect(thumbUrl(`${PHOTO}?v=1`, 160)).toBe(`${PHOTO}?v=1&w=160`);
  });

  it('no toca imágenes que no son del backend ni valores vacíos', () => {
    expect(thumbUrl('https://cdn.example/a.jpg', 320)).toBe('https://cdn.example/a.jpg');
    expect(thumbUrl('file:///data/user/0/foto.jpg', 320)).toBe('file:///data/user/0/foto.jpg');
    expect(thumbUrl(null, 320)).toBeNull();
    expect(thumbUrl('', 320)).toBe('');
  });
});
