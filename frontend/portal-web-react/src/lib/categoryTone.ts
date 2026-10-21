export type Tone = 'limon' | 'naranja' | 'guayaba' | 'aguacate' | 'karen';

const RULES: [RegExp, Tone][] = [
  [/l[aá]cteo|cereal|pasta|harina|aceite|margarina/i, 'limon'],
  [/panader|enlatado|caf[eé]|cocoa|seco|semilla/i, 'naranja'],
  [/embutido|carne|galleta|snack|confiter|chocolate|az[uú]car|endulzante/i, 'guayaba'],
  [/salsa|untable|condimento|vino|licor/i, 'karen'],
];

/** Cada categoría toma un color de pasillo; las que no encajan quedan en aguacate. */
export function categoryTone(category?: string): Tone {
  if (!category) return 'limon';
  return RULES.find(([pattern]) => pattern.test(category))?.[1] ?? 'aguacate';
}

/** Fondo de color de la foto del producto. */
export const TONE_BG: Record<Tone, string> = {
  limon: 'bg-limon-tint',
  naranja: 'bg-naranja-tint',
  guayaba: 'bg-guayaba-tint',
  aguacate: 'bg-aguacate-tint',
  karen: 'bg-karen-tint',
};

/** Color sólido del mismo pasillo (bloques de categoría y pegatinas). */
export const TONE_SOLID: Record<Tone, string> = {
  limon: 'bg-limon text-mora',
  naranja: 'bg-naranja text-mora',
  guayaba: 'bg-guayaba text-mora',
  aguacate: 'bg-aguacate text-white',
  karen: 'bg-karen text-white',
};
