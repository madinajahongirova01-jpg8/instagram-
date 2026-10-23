export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const THEME_STORAGE_KEY = 'theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function readThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

export function storeThemePreference(value: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    return;
  }
}

export function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
}

export const themeInitScript = `(function(){var p='system';try{var s=window.localStorage.getItem('${THEME_STORAGE_KEY}');if(s==='light'||s==='dark'||s==='system'){p=s}}catch(e){}var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}})();`;
