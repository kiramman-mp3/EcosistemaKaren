// Sistema "Fleje" de Supermercado Karen (el mismo del portal web y de la app de bodega):
// la etiqueta de precio de percha es la señal fuerte de cada producto.
type NivelAlerta = 'VENCIDO' | 'ROJO' | 'AMARILLO' | 'NORMAL';

export const colors = {
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
} as const;

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
export function levelColors(nivel: NivelAlerta | string) {
  switch (nivel) {
    case 'VENCIDO':
      return { band: colors.ink, tint: colors.aisle, text: colors.ink, label: 'Vencido' };
    case 'ROJO':
      return { band: colors.karen, tint: colors.karenTint, text: colors.karenDeep, label: 'Crítico' };
    case 'AMARILLO':
      return { band: colors.sticker, tint: colors.stickerTint, text: colors.ink, label: 'Preventivo' };
    default:
      return { band: colors.fresh, tint: colors.freshTint, text: colors.fresh, label: 'En fecha' };
  }
}
