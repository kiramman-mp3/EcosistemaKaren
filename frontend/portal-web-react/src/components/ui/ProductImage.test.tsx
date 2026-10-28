import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductImage } from './Tag';

const PHOTO = '/api/v1/media/productos/7861001234567.jpg';

describe('ProductImage', () => {
  it('pide miniaturas con srcset y decodifica sin bloquear el hilo principal', () => {
    render(<ProductImage src={PHOTO} alt="Yogurt" />);
    const img = screen.getByAltText('Yogurt');

    expect(img.getAttribute('src')).toBe(`${PHOTO}?w=320`);
    expect(img.getAttribute('srcset')).toBe(`${PHOTO}?w=160 160w, ${PHOTO}?w=320 320w, ${PHOTO}?w=640 640w`);
    expect(img.getAttribute('sizes')).toContain('50vw');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.hasAttribute('fetchpriority')).toBe(false);
  });

  it('usa el sizes que se le indica', () => {
    render(<ProductImage src={PHOTO} alt="Yogurt" sizes="64px" />);
    expect(screen.getByAltText('Yogurt').getAttribute('sizes')).toBe('64px');
  });

  it('una foto prioritaria se descarga ya y con prioridad alta', () => {
    render(<ProductImage src={PHOTO} alt="Yogurt" priority />);
    const img = screen.getByAltText('Yogurt');

    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('no inventa miniaturas para imágenes que no son del backend', () => {
    render(<ProductImage src="/yogurt.jpg" alt="Yogurt" />);
    const img = screen.getByAltText('Yogurt');

    expect(img.getAttribute('src')).toBe('/yogurt.jpg');
    expect(img.hasAttribute('srcset')).toBe(false);
    expect(img.hasAttribute('sizes')).toBe(false);
  });
});
