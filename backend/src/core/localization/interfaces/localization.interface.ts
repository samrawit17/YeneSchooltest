export const SUPPORTED_LANGUAGES = ['en', 'am', 'om', 'so', 'ar'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';

export interface TranslationParams {
  [key: string]: string | number | boolean | undefined | null;
}

export interface TranslateOptions {
  locale?: Language;
  params?: TranslationParams;
  defaultValue?: string;
  fallbackLocale?: Language;
}

export interface TranslatedMessage {
  key: string;
  message: string;
  locale: Language;
  params?: TranslationParams;
}

export interface LocalizedResponse {
  success: boolean;
  data?: unknown;
  message?: string;
  key?: string;
  locale: Language;
}

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGE_OPTIONS: Record<Language, LanguageOption> = {
  en: { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  am: { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr' },
  om: { code: 'om', name: 'Afaan Oromo', nativeName: 'Afaan Oromoo', dir: 'ltr' },
  so: { code: 'so', name: 'Somali', nativeName: 'Soomaali', dir: 'ltr' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
};

export interface LocaleRequest {
  locale: Language;
  schoolId?: string;
  userId?: string;
}

export interface PluralizationRules {
  [key: string]: {
    one?: string;
    other: string;
    zero?: string;
    two?: string;
    few?: string;
    many?: string;
  };
}
