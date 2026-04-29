import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AppLanguage = 'am' | 'ar' | 'en' | 'om' | 'so';

interface LanguageState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  initializeLanguage: () => void;
}

const isClient = typeof window !== 'undefined';

const applyDocumentLanguage = (language: AppLanguage) => {
  if (!isClient) return;

  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => {
        set({ language });
        applyDocumentLanguage(language);
      },
      initializeLanguage: () => {
        if (!isClient) return;

        const stored = localStorage.getItem('language-storage');

        if (stored) {
          try {
            const parsed = JSON.parse(stored) as { state?: { language?: AppLanguage } };
            const language = parsed.state?.language ?? 'en';
            set({ language });
            applyDocumentLanguage(language);
            return;
          } catch (error) {
            console.warn('Failed to parse language preference:', error);
          }
        }

        applyDocumentLanguage('en');
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() =>
        isClient
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);
