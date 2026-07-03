import { Language } from '../interfaces/localization.interface';
import { TranslationCache } from '../interfaces/translation.interface';
export declare class InMemoryTranslationCache implements TranslationCache {
    private readonly logger;
    private readonly store;
    private hits;
    private misses;
    private key;
    get(locale: Language, domain: string, key: string): Promise<string | null>;
    set(locale: Language, domain: string, key: string, value: string): Promise<void>;
    clear(locale?: Language, domain?: string): Promise<void>;
    getStats(): {
        size: number;
        hits: number;
        misses: number;
        hitRate: number;
    };
}
