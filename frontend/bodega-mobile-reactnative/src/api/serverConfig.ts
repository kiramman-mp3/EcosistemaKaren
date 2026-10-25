import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEY = 'karen.serverUrl';

/** Puerto de store-api; el de portal-api (4001) lo usa el portal móvil. */
export const DEFAULT_PORT = 4000;

/**
 * Permite elegir el servidor desde la app (p. ej. al cambiar de wifi sin recompilar). Se activa al
 * compilar con EXPO_PUBLIC_SERVER_CONFIG=1; en un build de tienda queda fijo en EXPO_PUBLIC_API_URL.
 */
export const SERVER_CONFIG_ENABLED = process.env.EXPO_PUBLIC_SERVER_CONFIG === '1';

const defaultServerUrl = (): string => {
  // Expo solo inlinea la variable si se lee literalmente como process.env.EXPO_PUBLIC_API_URL.
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  if (Platform.OS === 'android') return `http://10.0.2.2:${DEFAULT_PORT}/api/v1`;
  return `http://localhost:${DEFAULT_PORT}/api/v1`;
};

export const DEFAULT_SERVER_URL = defaultServerUrl();

let currentUrl = DEFAULT_SERVER_URL;
const listeners = new Set<(url: string) => void>();

export const getServerUrl = (): string => currentUrl;

export function onServerUrlChange(listener: (url: string) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function setCurrent(url: string) {
  if (url === currentUrl) return;
  currentUrl = url;
  listeners.forEach(listener => listener(url));
}

// expo-secure-store no existe en web: allí se usa localStorage (la dirección no es un secreto).
async function readStored(): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') return await SecureStore.getItemAsync(STORAGE_KEY);
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

async function writeStored(value: string | null): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      if (value === null) await SecureStore.deleteItemAsync(STORAGE_KEY);
      else await SecureStore.setItemAsync(STORAGE_KEY, value);
      return;
    }
    if (value === null) globalThis.localStorage?.removeItem(STORAGE_KEY);
    else globalThis.localStorage?.setItem(STORAGE_KEY, value);
  } catch {
    // Sin almacenamiento la dirección vale solo hasta cerrar la app.
  }
}

/** Carga la dirección guardada. Debe resolverse antes de la primera petición. */
export async function loadServerUrl(): Promise<string> {
  if (SERVER_CONFIG_ENABLED) {
    const stored = await readStored();
    if (stored) setCurrent(stored);
  }
  return currentUrl;
}

/** Guarda la dirección elegida; `null` vuelve a la de compilación. */
export async function saveServerUrl(url: string | null): Promise<string> {
  await writeStored(url);
  setCurrent(url ?? DEFAULT_SERVER_URL);
  return currentUrl;
}
