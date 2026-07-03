export declare const SUPPORTED_TRANSLATION_LANGUAGES: readonly ["en", "am", "ar", "om", "so"];
export type SupportedTranslationLanguage = (typeof SUPPORTED_TRANSLATION_LANGUAGES)[number];
export declare class TranslateTextDto {
    text: string;
    sourceLanguage?: SupportedTranslationLanguage;
    targetLanguage: SupportedTranslationLanguage;
    forceRefresh?: boolean;
}
export declare class TranslateBatchItemDto {
    text: string;
    key?: string;
}
export declare class TranslateBatchDto {
    items: TranslateBatchItemDto[];
    sourceLanguage?: SupportedTranslationLanguage;
    targetLanguage: SupportedTranslationLanguage;
    forceRefresh?: boolean;
}
