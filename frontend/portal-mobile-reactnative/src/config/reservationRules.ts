// Reglas de reserva que valida la tienda (BusinessRules.js). El servidor decide: estos valores solo guían
// la interfaz y los textos, para que nunca prometan algo distinto de lo que se aplica.
export const RESERVATION_DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;
export const DEFAULT_RESERVATION_MINUTES = RESERVATION_DURATION_OPTIONS[0];
export const RESERVATION_EXTENSION_MINUTES = 30;
export const RESERVATION_MAX_TOTAL_MINUTES = 240;

/** "30 minutos", "1 hora", "1 hora y media", "2 horas"... */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hoursText = hours === 1 ? '1 hora' : `${hours} horas`;
  if (rest === 0) return hoursText;
  return rest === 30 ? `${hoursText} y media` : `${hoursText} y ${rest} minutos`;
}

const MIN = RESERVATION_DURATION_OPTIONS[0];
const MAX = RESERVATION_DURATION_OPTIONS[RESERVATION_DURATION_OPTIONS.length - 1];

/** Resumen corto de la regla, para textos de ayuda: "entre 30 minutos y 2 horas". */
export const RESERVATION_RANGE_TEXT = `entre ${formatMinutes(MIN)} y ${formatMinutes(MAX)}`;
