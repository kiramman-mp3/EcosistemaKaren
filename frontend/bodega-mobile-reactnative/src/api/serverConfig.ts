/**
 * Dirección fija del backend en el homelab (Tailscale Funnel, ADR-004). Está en el código: la app no
 * tiene pantalla ni almacenamiento para cambiarla, así que un teléfono solo habla con este servidor.
 */
export const HOMELAB_API_URL = 'https://servidor-homelab.tail13541c.ts.net:10000/api/v1';

const resolveServerUrl = (): string => {
  // Solo en desarrollo (Metro): `node start.js` apunta la app al backend local con EXPO_PUBLIC_API_URL. Un
  // build de producción (__DEV__ falso) ignora la variable, aunque haya un .env con otra dirección.
  // Expo solo inlinea la variable si se lee literalmente como process.env.EXPO_PUBLIC_API_URL.
  const devUrl = process.env.EXPO_PUBLIC_API_URL;
  if (__DEV__ && devUrl) return devUrl.replace(/\/$/, '');
  return HOMELAB_API_URL;
};

const SERVER_URL = resolveServerUrl();

export const getServerUrl = (): string => SERVER_URL;
