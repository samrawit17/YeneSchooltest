import { Language } from '../interfaces/localization.interface';
import { TranslationDomain, TranslationLoader } from '../interfaces/translation.interface';
export declare class FileTranslationLoader implements TranslationLoader {
    private readonly logger;
    private readonly translationsDir;
    private readonly cache;
    constructor();
    load(locale: Language, domain: string): Promise<TranslationDomain | null>;
    loadAll(locale: Language): Promise<TranslationDomain>;
    getSupportedLocales(): Promise<Language[]>;
    clearCache(locale?: string, domain?: string): void;
}
