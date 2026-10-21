import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemeMode, getThemeColors, lightColors, darkColors } from './tokens';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: typeof lightColors | typeof darkColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = 'karen.bodega.theme';

async function getStoredTheme(): Promise<ThemeMode | null> {
  try {
    if (Platform.OS === 'web') {
      return (globalThis.localStorage?.getItem(THEME_STORAGE_KEY) as ThemeMode) || null;
    }
    const val = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    return (val as ThemeMode) || null;
  } catch {
    return null;
  }
}

async function saveTheme(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, mode);
      return;
    }
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    void getStoredTheme().then(stored => {
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored);
      }
    });
  }, []);

  const toggleTheme = () => {
    setThemeState(prev => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      void saveTheme(next);
      return next;
    });
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    void saveTheme(mode);
  };

  const colors = getThemeColors(theme);
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
