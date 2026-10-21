// Sistema "El pasillo de Karen" (misma identidad que el portal de clientes), ajustado a bodega:
// alto contraste para luz de bodega, objetivos táctiles grandes y el color del
// nivel FEFO como la única señal fuerte de cada lote.
import type { NivelAlerta } from '../types';

export const lightColors = {
  karen: '#D52B1E',
  karenDeep: '#A81E14',
  karenTint: '#FDE6E3',
  karenText: '#C42418',
  ink: '#2A1D14',
  inkSoft: '#54443A',
  inkMuted: '#6E5E50',
  inkFaint: '#9A8A76',
  sticker: '#FFD400',
  stickerDeep: '#E0B800',
  stickerTint: '#FFF3B8',
  naranja: '#FF7A1A',
  naranjaTint: '#FFE6D1',
  guayaba: '#FF9EB5',
  guayabaTint: '#FFE3EA',
  mora: '#2A1D14',
  shadow: '#2A1D14',
  aisle: '#FBF6EC',
  rule: '#EADFCB',
  ruleStrong: '#D4C4A8',
  fresh: '#0E7A43',
  freshTint: '#DDF5E6',
  white: '#FFFFFF',
  logoPlate: 'transparent',
  card: '#FFFFFF',
  cardBorder: '#EADFCB',
} as const;

export const darkColors = {
  karen: '#D52B1E',
  karenDeep: '#FF8A80',
  karenTint: '#4A1620',
  karenText: '#FF6B5E',
  ink: '#FBF6EC',
  inkSoft: '#E6DAC6',
  inkMuted: '#BFAF99',
  inkFaint: '#9A8A76',
  sticker: '#FFD400',
  stickerDeep: '#E0B800',
  stickerTint: '#4A3A00',
  naranja: '#FF7A1A',
  naranjaTint: '#4A2508',
  guayaba: '#FF9EB5',
  guayabaTint: '#4A1A2A',
  mora: '#2A1D14',
  shadow: '#0D0A07',
  aisle: '#1C1612',
  rule: '#44382D',
  ruleStrong: '#5C4C3C',
  fresh: '#34D388',
  freshTint: '#0B3A24',
  white: '#2A1D14',
  logoPlate: '#FFFFFF',
  card: '#2A1D14',
  cardBorder: '#44382D',
} as const;

export type ThemeMode = 'light' | 'dark';

export function getThemeColors(mode: ThemeMode) {
  return mode === 'dark' ? darkColors : lightColors;
}

// El modo activo vive a nivel de módulo: ThemeProvider lo fija durante el render, antes de que
// los hijos lean colors o styles. Así los StyleSheet creados con themed cambian de color
// al alternar el tema sin reescribir cada componente.
let activeMode: ThemeMode = 'light';

export function setThemeMode(mode: ThemeMode) {
  activeMode = mode;
}

/** Colores del tema activo; se lee en cada acceso, por eso no se puede desestructurar a nivel de módulo. */
export const colors = new Proxy({} as typeof lightColors, {
  get: (_target, key) => getThemeColors(activeMode)[key as keyof typeof lightColors],
});

/** StyleSheet que se vuelve a crear (y se guarda) una vez por modo de tema. */
export function themed<T extends object>(factory: () => T): T {
  const cache: Partial<Record<ThemeMode, T>> = {};
  return new Proxy({} as T, {
    get: (_target, key) => {
      const sheet = (cache[activeMode] ??= factory());
      return sheet[key as keyof T];
    },
  });
}

export const fonts = {
  body: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  semibold: 'Nunito_700Bold',
  bold: 'Nunito_700Bold',
  tag: 'BricolageGrotesque_800ExtraBold',
  tagSemibold: 'BricolageGrotesque_600SemiBold',
  hand: 'Caveat_700Bold',
  stamp: 'Doto_900Black',
} as const;

// Radios por rol: botones en píldora, pegatinas y fotos más redondeadas que antes.
export const radius = { tag: 14, photo: 20, block: 28, pill: 999 } as const;

/** Color del nivel FEFO: la banda lateral de cada lote. Es regla de negocio, no decoración. */
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
