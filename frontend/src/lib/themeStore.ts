import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme, userId?: string | null) => void;
  resolvedTheme: 'light' | 'dark';
  initializeTheme: (userId?: string | null) => void;
}

const isClient = typeof window !== 'undefined';
const DEFAULT_THEME: Theme = 'light';
const GUEST_THEME_KEY = 'theme-storage';

const getSystemTheme = (): 'light' | 'dark' => {
  if (!isClient) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const parseTheme = (raw: string | null): Theme | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { theme?: Theme; state?: { theme?: Theme } };
    const theme = parsed.theme ?? parsed.state?.theme;
    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      return theme;
    }
  } catch {
    return null;
  }

  if (['light', 'dark', 'system'].includes(raw)) {
    return raw as Theme;
  }

  return null;
};

const getCurrentUserId = () => {
  if (!isClient) return null;

  const sources = [localStorage, sessionStorage];
  for (const storage of sources) {
    const rawUser = storage.getItem('user');
    if (!rawUser) continue;

    try {
      const user = JSON.parse(rawUser) as { id?: string };
      if (user.id) return user.id;
    } catch {
      continue;
    }
  }

  return null;
};

const getScopedThemeKey = (explicitUserId?: string | null) => {
  const userId = explicitUserId ?? getCurrentUserId();
  return userId ? `theme-storage:${userId}` : GUEST_THEME_KEY;
};

const applyResolvedTheme = (resolvedTheme: 'light' | 'dark') => {
  if (!isClient) return;

  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
};

const readStoredTheme = (userId?: string | null): Theme => {
  if (!isClient) return DEFAULT_THEME;

  const effectiveUserId = userId ?? getCurrentUserId();
  const scopedTheme = parseTheme(localStorage.getItem(getScopedThemeKey(effectiveUserId)));
  if (scopedTheme) return scopedTheme;

  if (!effectiveUserId) {
    const guestTheme = parseTheme(localStorage.getItem(GUEST_THEME_KEY));
    if (guestTheme) return guestTheme;
  }

  return DEFAULT_THEME;
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: DEFAULT_THEME,
  resolvedTheme: 'light',

  setTheme: (theme, userId) => {
    const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
    set({ theme, resolvedTheme });

    if (isClient) {
      localStorage.setItem(getScopedThemeKey(userId), JSON.stringify({ theme }));
    }

    applyResolvedTheme(resolvedTheme);
  },

  initializeTheme: (userId) => {
    const theme = readStoredTheme(userId);
    const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
    set({ theme, resolvedTheme });
    applyResolvedTheme(resolvedTheme);
  },
}));
