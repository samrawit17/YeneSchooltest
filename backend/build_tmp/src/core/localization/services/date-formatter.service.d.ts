import { Language } from '../interfaces/localization.interface';
interface LocaleDateFormat {
    short: Intl.DateTimeFormatOptions;
    medium: Intl.DateTimeFormatOptions;
    long: Intl.DateTimeFormatOptions;
    time: Intl.DateTimeFormatOptions;
    datetime: Intl.DateTimeFormatOptions;
}
type CalendarSystem = 'gregorian' | 'ethiopian';
export declare class DateFormatter {
    private readonly localeMap;
    format(date: Date | string | number, formatType?: keyof LocaleDateFormat, locale?: Language, calendar?: CalendarSystem): string;
    formatRelative(date: Date, locale?: Language): string;
}
export {};
