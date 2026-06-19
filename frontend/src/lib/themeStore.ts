import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme, userId?: string | null) => void;
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

const getCurrentUserId = (): string | null => {
  if (!isClient) return null;

  const sources = [localStorage, sessionStorage] as const;
  for (const storage of sources) {
    try {
      const rawUser = storage.getItem('user');
      if (!rawUser) continue;
      const user = JSON.parse(rawUser) as { id?: string };
      if (user.id) return user.id;
    } catch {
      continue;
    }
  }

  return null;
};

const getScopedThemeKey = (userId?: string | null): string => {
  const uid = userId ?? getCurrentUserId();
  return uid ? `theme-storage:${uid}` : GUEST_THEME_KEY;
};

const readStoredTheme = (userId?: string | null): Theme => {
  if (!isClient) return DEFAULT_THEME;

  const uid = userId ?? getCurrentUserId();
  const scoped = parseTheme(localStorage.getItem(getScopedThemeKey(uid)));
  if (scoped) return scoped;

  if (!uid) {
    const guest = parseTheme(localStorage.getItem(GUEST_THEME_KEY));
    if (guest) return guest;
  }

  return DEFAULT_THEME;
};

export const useThemeStore = create<ThemeState>()(
  devtools(
    (set) => ({
      theme: DEFAULT_THEME,
      resolvedTheme: 'light',

      setTheme: (theme, userId) => {
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
        set({ theme, resolvedTheme });

        if (isClient) {
          localStorage.setItem(getScopedThemeKey(userId), JSON.stringify({ theme }));
        }
      },

      initializeTheme: (userId) => {
        const theme = readStoredTheme(userId);
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
        set({ theme, resolvedTheme });
      },
    }),
    { name: 'theme-store' },
  ),
);
