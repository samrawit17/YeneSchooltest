import api from "./core";

export type AppTranslationLanguage = "am" | "ar" | "en" | "om" | "so";
export type TranslationProvider = "azure" | "google" | "disabled";

export interface TranslateTextRequest {
  text: string;
  sourceLanguage?: AppTranslationLanguage;
  targetLanguage: AppTranslationLanguage;
  forceRefresh?: boolean;
}

export interface TranslationResult {
  translatedText: string;
  provider: TranslationProvider;
  sourceLanguage: string;
  targetLanguage: AppTranslationLanguage;
  fromCache: boolean;
  translated: boolean;
  reason?:
    | "disabled"
    | "same_language"
    | "unsupported_language"
    | "protected_text"
    | "provider_error";
}

export interface TranslationConfig {
  provider: TranslationProvider;
  enabled: boolean;
  supportedLanguages: AppTranslationLanguage[];
}

export const translationAPI = {
  getConfig: () => api.get<TranslationConfig>("/translations/config"),
  translate: (data: TranslateTextRequest) =>
    api.post<TranslationResult>("/translations", data),
  translateBatch: (data: {
    items: Array<{ key?: string; text: string }>;
    sourceLanguage?: AppTranslationLanguage;
    targetLanguage: AppTranslationLanguage;
    forceRefresh?: boolean;
  }) => api.post<{ results: Array<TranslationResult & { key?: string }> }>("/translations/batch", data),
};
