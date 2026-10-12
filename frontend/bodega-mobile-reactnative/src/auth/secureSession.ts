import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'karen.staff.token';
const USER_KEY = 'karen.staff.user';

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof globalThis.sessionStorage === 'undefined') return null;
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  getWebStorage()?.setItem(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS !== 'web') return SecureStore.getItemAsync(key);
  return getWebStorage()?.getItem(key) ?? null;
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  getWebStorage()?.removeItem(key);
}

export interface StoredStaffUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

function isExpired(token: string): boolean {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(globalThis.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export async function saveSession(token: string, user: StoredStaffUser) {
  await Promise.all([
    setItem(TOKEN_KEY, token),
    setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function loadSession(): Promise<{ token: string; user: StoredStaffUser } | null> {
  const [token, rawUser] = await Promise.all([
    getItem(TOKEN_KEY),
    getItem(USER_KEY),
  ]);
  if (!token || !rawUser || isExpired(token)) {
    await clearSession();
    return null;
  }
  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await Promise.all([
    deleteItem(TOKEN_KEY),
    deleteItem(USER_KEY),
  ]);
}
