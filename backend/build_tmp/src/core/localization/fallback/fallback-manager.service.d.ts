import { Language, TranslationParams } from '../interfaces/localization.interface';
import { FallbackStrategy } from '../interfaces/translation.interface';
export declare class FallbackManager implements FallbackStrategy {
    private readonly logger;
    private readonly fallbackChain;
    constructor();
    resolve(locale: Language, _domain: string, key: string, _params?: TranslationParams): Promise<string>;
    getAvailableLocales(locale: Language): Language[];
    getFallbackChain(locale: Language): Language[];
}
