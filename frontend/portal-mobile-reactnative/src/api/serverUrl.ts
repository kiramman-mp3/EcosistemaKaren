const API_PATH = '/api/v1';
const URL_PATTERN = /^(https?):\/\/([A-Za-z0-9.-]+)(?::(\d{1,5}))?(\/[^?#\s]*)?$/i;

/**
 * Convierte lo que escribe la persona ("192.168.1.20", "192.168.1.20:4001", "http://tienda.local",
 * "https://api.karen.com/api/v1") en la URL base de la API, o null si no es una dirección válida.
 * Sin esquema se asume http (red local); sin puerto, en http se usa `defaultPort`.
 */
export function normalizeServerUrl(input: string, defaultPort: number): string | null {
  const text = input.trim();
  if (!text) return null;
  const match = URL_PATTERN.exec(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`);
  if (!match) return null;

  const scheme = match[1].toLowerCase();
  const host = match[2].toLowerCase();
  if (host.startsWith('.') || host.endsWith('.') || host.includes('..')) return null;

  let port = match[3] ? Number(match[3]) : undefined;
  if (port !== undefined && (port < 1 || port > 65535)) return null;
  if (port === undefined && scheme === 'http') port = defaultPort;

  const path = (match[4] ?? '').replace(/\/+$/, '');
  if (path !== '' && path !== API_PATH) return null;

  return `${scheme}://${host}${port !== undefined ? `:${port}` : ''}${API_PATH}`;
}

/** Dirección corta para mostrar: sin esquema ni /api/v1. */
export function describeServerUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/api\/v1$/, '');
}
