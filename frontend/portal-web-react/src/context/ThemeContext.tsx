import React, { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { prefersReducedMotion } from '../hooks/useReducedMotion';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  /** Con `origin` el cambio se revela en círculo desde ese punto (View Transitions). */
  toggleTheme: (origin?: { x: number; y: number }) => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'karen_theme';

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown };

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = (origin?: { x: number; y: number }) => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    const doc = document as ViewTransitionDocument;
    if (!doc.startViewTransition || prefersReducedMotion()) {
      setThemeState(next);
      return;
    }
    const root = document.documentElement;
    root.style.setProperty('--vt-x', `${origin?.x ?? window.innerWidth}px`);
    root.style.setProperty('--vt-y', `${origin?.y ?? 0}px`);
    doc.startViewTransition(() => {
      // El navegador captura el estado nuevo al terminar este callback: el DOM debe estar ya actualizado.
      flushSync(() => setThemeState(next));
      root.classList.toggle('dark', next === 'dark');
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
