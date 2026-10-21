import { colors } from './tokens';

export type Tone = 'limon' | 'naranja' | 'guayaba' | 'aguacate' | 'karen';

const RULES: [RegExp, Tone][] = [
  [/l[aá]cteo|cereal|pasta|harina|aceite|margarina/i, 'limon'],
  [/panader|enlatado|caf[eé]|cocoa|seco|semilla/i, 'naranja'],
  [/embutido|carne|galleta|snack|confiter|chocolate|az[uú]car|endulzante/i, 'guayaba'],
  [/salsa|untable|condimento|vino|licor/i, 'karen'],
];

/** Cada categoría toma un color de pasillo; las que no encajan quedan en aguacate. */
export function categoryTone(category?: string | null): Tone {
  if (!category) return 'limon';
  return RULES.find(([pattern]) => pattern.test(category))?.[1] ?? 'aguacate';
}

/** Fondo suave de la foto del producto. */
export function toneTint(tone: Tone): string {
  switch (tone) {
    case 'naranja': return colors.naranjaTint;
    case 'guayaba': return colors.guayabaTint;
    case 'aguacate': return colors.freshTint;
    case 'karen': return colors.karenTint;
    default: return colors.stickerTint;
  }
}

/** Bloque de color del pasillo y el color de texto que contrasta con él. */
export function toneSolid(tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'naranja': return { bg: colors.naranja, fg: colors.mora };
    case 'guayaba': return { bg: colors.guayaba, fg: colors.mora };
    case 'aguacate': return { bg: '#0E7A43', fg: '#FFFFFF' };
    case 'karen': return { bg: colors.karen, fg: '#FFFFFF' };
    default: return { bg: colors.sticker, fg: colors.mora };
  }
}
