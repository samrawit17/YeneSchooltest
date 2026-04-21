import { toEthiopian, toGregorian } from 'ethiopian-calendar-new';

/**
 * Ethiopian month names
 */
export const ETHIOPIAN_MONTH_NAMES = [
    'Meskerem',
    'Tikemet',
    'Hidar',
    'Tahsas',
    'Ter',
    'Yekatit',
    'Megabit',
    'Miyazia',
    'Ginbot',
    'Sene',
    'Hamle',
    'Nehase',
    'Pagume',
] as const;

/**
 * Convert a Gregorian date to Ethiopian date
 */
export function convertToEthiopian(date: Date | string): { year: number; month: number; day: number; monthName: string } {
    const d = typeof date === 'string' ? new Date(date) : date;
    const result = toEthiopian(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return {
        year: result.year,
        month: result.month,
        day: result.day,
        monthName: ETHIOPIAN_MONTH_NAMES[result.month - 1] || '',
    };
}

/**
 * Convert an Ethiopian date to Gregorian date
 */
export function convertEthiopianToGregorian(etYear: number, etMonth: number, etDay: number): Date {
    const result = toGregorian(etYear, etMonth, etDay);
    // Note: JavaScript months are 0-indexed (0-11)
    return new Date(result.year, result.month - 1, result.day);
}

/**
 * Format a date in Ethiopian calendar
 */
export function formatEthiopianDate(date: Date | string): string {
    const ethiopianDate = convertToEthiopian(date);
    return `${ethiopianDate.monthName} ${ethiopianDate.day}, ${ethiopianDate.year} E.C.`;
}

/**
 * Format a date based on calendar type
 */
export function formatDateByCalendarType(date: Date | string, calendarType: 'GREGORIAN' | 'ETHIOPIAN'): string {
    if (calendarType === 'ETHIOPIAN') {
        return formatEthiopianDate(date);
    }

    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Get Ethiopian year from a date
 */
export function getEthiopianYear(date: Date | string): number {
    const ethiopianDate = convertToEthiopian(date);
    return ethiopianDate.year;
}

/**
 * Get the current Ethiopian year
 * Note: This is calculated locally. For production, consider fetching from backend API.
 */
export function getCurrentEthiopianYear(): number {
    return getEthiopianYear(new Date());
}

/**
 * Check if Ethiopian new year period (around September 11)
 */
export function isEthiopianNewYearPeriod(date: Date): boolean {
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    // Ethiopian new year (Enkutatash) is around September 11
    return (month === 9 && day >= 11) || (month === 9 && day <= 12);
}

/**
 * Calendar type enum
 */
export type CalendarType = 'GREGORIAN' | 'ETHIOPIAN';

const DEFAULT_GREGORIAN_LOCALE = 'en-US';

/**
 * Get calendar type display name
 */
export function getCalendarTypeDisplayName(calendarType: CalendarType): string {
    return calendarType === 'ETHIOPIAN' ? 'Ethiopian Calendar' : 'Gregorian Calendar';
}

/**
 * Format a date-time based on calendar type.
 * Ethiopian mode keeps time in Gregorian clock while switching date representation.
 */
export function formatDateTimeByCalendarType(
    date: Date | string,
    calendarType: CalendarType,
    locale: string = DEFAULT_GREGORIAN_LOCALE,
): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const timePart = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const datePart = formatDateByCalendarType(d, calendarType);
    return `${datePart} ${timePart}`;
}

export function normalizeCalendarType(value: unknown): CalendarType {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN';
}
