'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyTheme, readThemePreference, storeThemePreference, type ThemePreference } from '@/lib/theme';

interface ThemeState {
  preference: ThemePreference;
  systemDark: boolean;
}

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setState({ preference: readThemePreference(), systemDark: media.matches });
    const onChange = (event: MediaQueryListEvent) =>
      setState((current) => (current ? { ...current, systemDark: event.matches } : current));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (state) {
      applyTheme(state.preference === 'dark' || (state.preference === 'system' && state.systemDark));
    }
  }, [state]);

  const setPreference = useCallback((value: ThemePreference) => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 350);
    storeThemePreference(value);
    setState((current) => ({ preference: value, systemDark: current?.systemDark ?? false }));
  }, []);

  const value = useMemo(
    () => ({ preference: state?.preference ?? 'system', setPreference }),
    [state?.preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
