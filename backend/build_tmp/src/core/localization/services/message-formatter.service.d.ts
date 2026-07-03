import { TranslationParams } from '../interfaces/localization.interface';
export declare class MessageFormatter {
    format(template: string, params?: TranslationParams): string;
    hasUnresolvedParams(template: string): boolean;
    extractParams(template: string): string[];
    buildKey(...parts: string[]): string;
}
