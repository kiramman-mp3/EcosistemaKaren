/** Saludo según la hora en Guayaquil (UTC-5, sin horario de verano), calculada sin depender de Intl. */
export function greetingFor(now: Date = new Date()): string {
  const hour = (now.getUTCHours() - 5 + 24) % 24;
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
