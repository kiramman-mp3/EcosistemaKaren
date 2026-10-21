// Sistema "Fleje" (misma identidad que el portal de clientes), ajustado a bodega:
// alto contraste para luz de bodega, objetivos táctiles grandes y el color del
// nivel FEFO como la única señal fuerte de cada lote.
import type { NivelAlerta } from '../types';

export const lightColors = {
  karen: '#D52B1E',
  karenDeep: '#A81E14',
  karenTint: '#FBE9E7',
  ink: '#13284B',
  inkSoft: '#3B4A66',
  inkMuted: '#5E6B82',
  inkFaint: '#8C96A8',
  sticker: '#FFD400',
  stickerDeep: '#C9A400',
  stickerTint: '#FFF6C7',
  aisle: '#EFF1F4',
  rule: '#D9DDE3',
  ruleStrong: '#C5CBD4',
  fresh: '#12805C',
  freshTint: '#E3F3EC',
  white: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#D9DDE3',
} as const;

export const darkColors = {
  karen: '#EF4444',
  karenDeep: '#DC2626',
  karenTint: '#3B1515',
  ink: '#F8FAFC',
  inkSoft: '#CBD5E1',
  inkMuted: '#94A3B8',
  inkFaint: '#64748B',
  sticker: '#FBBF24',
  stickerDeep: '#D97706',
  stickerTint: '#452A05',
  aisle: '#0B1120',
  rule: '#1E293B',
  ruleStrong: '#334155',
  fresh: '#10B981',
  freshTint: '#063928',
  white: '#1E293B',
  card: '#1E293B',
  cardBorder: '#334155',
} as const;

export type ThemeMode = 'light' | 'dark';

export const colors = lightColors;

export function getThemeColors(mode: ThemeMode) {
  return mode === 'dark' ? darkColors : lightColors;
}

export const fonts = {
  body: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  tag: 'ArchivoNarrow_700Bold',
  tagSemibold: 'ArchivoNarrow_600SemiBold',
  stamp: 'Doto_900Black',
} as const;

export const radius = { tag: 6, pill: 999 } as const;

/** Color del nivel FEFO: la banda lateral de cada lote. */
export function levelColors(nivel: NivelAlerta | string, mode: ThemeMode = 'light') {
  const c = getThemeColors(mode);
  switch (nivel) {
    case 'VENCIDO':
      return { band: mode === 'dark' ? '#94A3B8' : c.ink, tint: c.aisle, text: c.ink, label: 'Vencido' };
    case 'ROJO':
      return { band: c.karen, tint: c.karenTint, text: mode === 'dark' ? '#FCA5A5' : c.karenDeep, label: 'Crítico' };
    case 'AMARILLO':
      return { band: c.sticker, tint: c.stickerTint, text: mode === 'dark' ? '#FDE68A' : c.ink, label: 'Preventivo' };
    default:
      return { band: c.fresh, tint: c.freshTint, text: mode === 'dark' ? '#6EE7B7' : c.fresh, label: 'En fecha' };
  }
}
