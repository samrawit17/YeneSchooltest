import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type AppLanguage = 'am' | 'ar' | 'en' | 'om' | 'so';

interface LanguageState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  initializeLanguage: () => void;
}

const isClient = typeof window !== 'undefined';
const DEFAULT_LANGUAGE: AppLanguage = 'en';
const GUEST_LANGUAGE_KEY = 'language-storage';

const parseLanguage = (raw: string | null): AppLanguage | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { language?: AppLanguage; state?: { language?: AppLanguage } };
    const language = parsed.language ?? parsed.state?.language;
    if (language && (['am', 'ar', 'en', 'om', 'so'] as AppLanguage[]).includes(language)) {
      return language;
    }
  } catch {
    return null;
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

const getScopedLanguageKey = (): string => {
  const userId = getCurrentUserId();
  return userId ? `language-storage:${userId}` : GUEST_LANGUAGE_KEY;
};

const applyDocumentLanguage = (language: AppLanguage): void => {
  if (!isClient) return;

  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
};

const readStoredLanguage = (): AppLanguage => {
  if (!isClient) return DEFAULT_LANGUAGE;

  const scoped = parseLanguage(localStorage.getItem(getScopedLanguageKey()));
  if (scoped) return scoped;

  const guest = parseLanguage(localStorage.getItem(GUEST_LANGUAGE_KEY));
  if (guest) return guest;

  return DEFAULT_LANGUAGE;
};

export const useLanguageStore = create<LanguageState>()(
  devtools(
    (set) => ({
      language: DEFAULT_LANGUAGE,

      setLanguage: (language) => {
        set({ language });

        if (isClient) {
          localStorage.setItem(getScopedLanguageKey(), JSON.stringify({ language }));
        }

        applyDocumentLanguage(language);
      },

      initializeLanguage: () => {
        const language = readStoredLanguage();
        set({ language });
        applyDocumentLanguage(language);
      },
    }),
    { name: 'language-store' },
  ),
);
