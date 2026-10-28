import { describe, expect, it } from 'vitest';
import { isMediaUrl, thumbSrcSet, thumbUrl } from './mediaUrl';

const PHOTO = '/api/v1/media/productos/7861001234567.jpg';

describe('mediaUrl', () => {
  it('reconoce solo las fotos servidas por el backend', () => {
    expect(isMediaUrl(PHOTO)).toBe(true);
    expect(isMediaUrl('/yogurt.jpg')).toBe(false);
    expect(isMediaUrl('https://cdn.example/a.jpg')).toBe(false);
    expect(isMediaUrl('data:image/svg+xml;utf8,%3Csvg%3E')).toBe(false);
  });

  it('añade el ancho a la URL de una foto del backend', () => {
    expect(thumbUrl(PHOTO, 320)).toBe(`${PHOTO}?w=320`);
    expect(thumbUrl(`${PHOTO}?v=abc`, 160)).toBe(`${PHOTO}?v=abc&w=160`);
  });

  it('no toca las imágenes que no son del backend', () => {
    expect(thumbUrl('/yogurt.jpg', 320)).toBe('/yogurt.jpg');
    expect(thumbUrl('https://cdn.example/a.jpg', 320)).toBe('https://cdn.example/a.jpg');
  });

  it('arma el srcset con los tres anchos y lo omite para imágenes externas', () => {
    expect(thumbSrcSet(PHOTO)).toBe(`${PHOTO}?w=160 160w, ${PHOTO}?w=320 320w, ${PHOTO}?w=640 640w`);
    expect(thumbSrcSet('/yogurt.jpg')).toBeUndefined();
  });
});
