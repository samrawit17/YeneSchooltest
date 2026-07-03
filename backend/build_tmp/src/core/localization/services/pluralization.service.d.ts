import { Language } from '../interfaces/localization.interface';
export declare class PluralizationService {
    private readonly pluralRules;
    pluralize(locale: Language, count: number, forms: Record<string, string>): string;
    resolveKey(locale: Language, count: number, baseKey: string, translator: (key: string) => string): string;
}
