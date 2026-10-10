import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'karen.staff.token';
const USER_KEY = 'karen.staff.user';

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
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function loadSession(): Promise<{ token: string; user: StoredStaffUser } | null> {
  const [token, rawUser] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
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
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
