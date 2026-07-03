import { Language } from '../interfaces/localization.interface';
export declare class NumberFormatter {
    private readonly localeMap;
    format(value: number, locale?: Language): string;
    formatCurrency(value: number, currency?: string, locale?: Language): string;
    formatPercent(value: number, locale?: Language): string;
    formatOrdinal(value: number, locale?: Language): string;
}
