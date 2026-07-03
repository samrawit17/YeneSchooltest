export declare const SUPPORTED_LANGUAGES: readonly ["en", "am", "om", "so", "ar"];
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export declare const DEFAULT_LANGUAGE: Language;
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
export declare const LANGUAGE_OPTIONS: Record<Language, LanguageOption>;
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
