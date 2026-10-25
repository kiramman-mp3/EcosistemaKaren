import { formatBytes, resizeTarget, UPLOAD_MAX_SIDE } from './photo';

describe('resizeTarget', () => {
  it('reduce por el lado largo y deja que el otro siga la proporción', () => {
    expect(resizeTarget(4000, 3000)).toEqual({ width: UPLOAD_MAX_SIDE });
    expect(resizeTarget(3000, 4000)).toEqual({ height: UPLOAD_MAX_SIDE });
    expect(resizeTarget(4000, 4000)).toEqual({ width: UPLOAD_MAX_SIDE });
  });

  it('no agranda una foto que ya cabe', () => {
    expect(resizeTarget(1280, 720)).toBeNull();
    expect(resizeTarget(640, 480)).toBeNull();
  });

  it('con medidas desconocidas o inválidas no redimensiona (solo se recomprime)', () => {
    for (const [w, h] of [[0, 0], [0, 3000], [4000, 0], [NaN, 100], [-1, -1]]) {
      expect(resizeTarget(w, h)).toBeNull();
    }
  });

  it('respeta un lado máximo distinto', () => {
    expect(resizeTarget(2000, 1000, 800)).toEqual({ width: 800 });
  });
});

describe('formatBytes', () => {
  it('muestra bytes, KB y MB legibles', () => {
    expect(formatBytes(800)).toBe('800 B');
    expect(formatBytes(156 * 1024)).toBe('156 KB');
    expect(formatBytes(10.4 * 1024 * 1024)).toBe('10,4 MB');
    expect(formatBytes(-5)).toBe('—');
    expect(formatBytes(NaN)).toBe('—');
  });
});
