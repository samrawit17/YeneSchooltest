import { create } from 'zustand';

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
    if (language && ['am', 'ar', 'en', 'om', 'so'].includes(language)) {
      return language;
    }
  } catch (error) {
    console.warn('Failed to parse language preference:', error);
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

const getScopedLanguageKey = () => {
  const userId = getCurrentUserId();
  return userId ? `language-storage:${userId}` : GUEST_LANGUAGE_KEY;
};

const applyDocumentLanguage = (language: AppLanguage) => {
  if (!isClient) return;

  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
};

const readStoredLanguage = (): AppLanguage => {
  if (!isClient) return DEFAULT_LANGUAGE;

  const scopedLanguage = parseLanguage(localStorage.getItem(getScopedLanguageKey()));
  if (scopedLanguage) return scopedLanguage;

  const guestLanguage = parseLanguage(localStorage.getItem(GUEST_LANGUAGE_KEY));
  if (guestLanguage) return guestLanguage;

  return DEFAULT_LANGUAGE;
};

export const useLanguageStore = create<LanguageState>((set) => ({
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
}));
