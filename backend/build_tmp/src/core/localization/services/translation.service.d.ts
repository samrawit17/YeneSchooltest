import { Language, TranslationParams, TranslatedMessage } from '../interfaces/localization.interface';
import { FileTranslationLoader } from '../loaders/file-loader.service';
import { InMemoryTranslationCache } from '../cache/translation-cache.service';
import { FallbackManager } from '../fallback/fallback-manager.service';
import { MessageFormatter } from './message-formatter.service';
export declare class TranslationService {
    private readonly loader;
    private readonly cache;
    private readonly fallback;
    private readonly formatter;
    private readonly logger;
    constructor(loader: FileTranslationLoader, cache: InMemoryTranslationCache, fallback: FallbackManager, formatter: MessageFormatter);
    translate(key: string, locale?: Language, params?: TranslationParams): Promise<string>;
    translateMessage(key: string, locale?: Language, params?: TranslationParams): Promise<TranslatedMessage>;
    translateBatch(items: Array<{
        key: string;
        params?: TranslationParams;
    }>, locale?: Language): Promise<TranslatedMessage[]>;
    private lookupWithFallback;
    private lookupSingle;
    private resolveKeyPath;
    private parseKey;
    refreshCache(locale?: Language, domain?: string): Promise<void>;
}
