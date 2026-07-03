import { Language, TranslationParams } from './localization.interface';

export interface TranslationEntry {
  key: string;
  value: string;
  locale: Language;
  domain: string;
  description?: string;
}

export interface TranslationDomain {
  [key: string]: string | TranslationDomain;
}

export interface TranslationStore {
  [locale: string]: {
    [domain: string]: TranslationDomain;
  };
}

export interface TranslationLoader {
  load(locale: Language, domain: string): Promise<TranslationDomain | null>;
  loadAll(locale: Language): Promise<TranslationDomain>;
  getSupportedLocales(): Promise<Language[]>;
}

export interface TranslationCache {
  get(locale: Language, domain: string, key: string): Promise<string | null>;
  set(locale: Language, domain: string, key: string, value: string): Promise<void>;
  clear(locale?: Language, domain?: string): Promise<void>;
}

export interface FallbackStrategy {
  resolve(
    locale: Language,
    domain: string,
    key: string,
    params?: TranslationParams,
  ): Promise<string>;
  getAvailableLocales(locale: Language): Language[];
}
