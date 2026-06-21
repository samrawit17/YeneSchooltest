import { toEthiopian, toGregorian } from 'ethiopian-calendar-new';
import type { AppLanguage } from '@/lib/languageStore';

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

export const ETHIOPIAN_MONTH_NAMES_BY_LANGUAGE: Record<AppLanguage, readonly string[]> = {
    en: ETHIOPIAN_MONTH_NAMES,
    am: [
        'መስከረም',
        'ጥቅምት',
        'ኅዳር',
        'ታኅሣሥ',
        'ጥር',
        'የካቲት',
        'መጋቢት',
        'ሚያዝያ',
        'ግንቦት',
        'ሰኔ',
        'ሐምሌ',
        'ነሐሴ',
        'ጳጉሜ',
    ],
    om: [
        'Fuulbaana',
        'Onkololeessa',
        'Sadaasa',
        'Muddee',
        'Amajjii',
        'Guraandhala',
        'Bitooteessa',
        'Eebila',
        'Caamsaa',
        'Waxabajjii',
        'Adooleessa',
        'Hagayya',
        'Qaammee',
    ],
    ar: ETHIOPIAN_MONTH_NAMES,
    so: ETHIOPIAN_MONTH_NAMES,
};

const ETHIOPIAN_ERA_LABELS: Record<AppLanguage, string> = {
    am: 'ዓ.ም.',
    ar: 'E.C.',
    en: 'E.C.',
    om: 'W.I.',
    so: 'E.C.',
};

export function getLocalizedEthiopianMonthName(month: number, language: AppLanguage = 'en'): string {
    return ETHIOPIAN_MONTH_NAMES_BY_LANGUAGE[language]?.[month - 1] || ETHIOPIAN_MONTH_NAMES[month - 1] || '';
}

export function getLocalizedEthiopianEraLabel(language: AppLanguage = 'en'): string {
    return ETHIOPIAN_ERA_LABELS[language] || ETHIOPIAN_ERA_LABELS.en;
}

/**
 * Convert a Gregorian date to Ethiopian date
 */
export function convertToEthiopian(date: Date | string | undefined | null): { year: number; month: number; day: number; monthName: string } {
    if (!date) date = new Date();
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
export function formatEthiopianDate(date: Date | string, language: AppLanguage = 'en'): string {
    const ethiopianDate = convertToEthiopian(date);
    return `${getLocalizedEthiopianMonthName(ethiopianDate.month, language)} ${ethiopianDate.day}, ${ethiopianDate.year} ${getLocalizedEthiopianEraLabel(language)}`;
}

export function formatEthiopianMonthYear(date: Date | string, language: AppLanguage = 'en'): string {
    const ethiopianDate = convertToEthiopian(date);
    return `${getLocalizedEthiopianMonthName(ethiopianDate.month, language)} ${ethiopianDate.year} ${getLocalizedEthiopianEraLabel(language)}`;
}

/**
 * Format a date based on calendar type
 */
export function formatDateByCalendarType(
    date: Date | string,
    calendarType: 'GREGORIAN' | 'ETHIOPIAN',
    language: AppLanguage = 'en',
): string {
    if (calendarType === 'ETHIOPIAN') {
        return formatEthiopianDate(date, language);
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

export function normalizeTimeValue(value?: string): { hour: string; minute: string } {
    const match = value?.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return { hour: '08', minute: '00' };

    const hour = Math.min(23, Math.max(0, Number(match[1])));
    const minute = Math.min(59, Math.max(0, Number(match[2])));

    return {
        hour: String(hour).padStart(2, '0'),
        minute: String(minute).padStart(2, '0'),
    };
}

export function getEthiopianClockParts(value?: string): {
    hour12: number;
    minute: string;
    period: 'morning' | 'afternoon' | 'evening' | 'night';
} {
    const { hour, minute } = normalizeTimeValue(value);
    const ethHour24 = (Number(hour) - 6 + 24) % 24;
    const hour12 = ethHour24 % 12 || 12;

    let period: 'morning' | 'afternoon' | 'evening' | 'night';
    if (ethHour24 < 6) period = 'morning';
    else if (ethHour24 < 12) period = 'afternoon';
    else if (ethHour24 < 18) period = 'evening';
    else period = 'night';

    return {
        hour12,
        minute,
        period,
    };
}

export function formatTimeByCalendarType(
    value?: string,
    calendarType: CalendarType = 'ETHIOPIAN',
    options: { includePeriodName?: boolean } = {},
): string {
    const { hour, minute } = normalizeTimeValue(value);

    if (calendarType === 'ETHIOPIAN') {
        const eth = getEthiopianClockParts(`${hour}:${minute}`);
        return `${eth.hour12}:${eth.minute}${options.includePeriodName ? ` (${eth.period})` : ''}`;
    }

    const hourNumber = Number(hour);
    const period = hourNumber >= 12 ? 'PM' : 'AM';
    const hour12 = hourNumber % 12 || 12;
    return `${hour12}:${minute} ${period}`;
}

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
    date: Date | string | null | undefined,
    calendarType: CalendarType,
    locale: string = DEFAULT_GREGORIAN_LOCALE,
): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const timePart = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const datePart = formatDateByCalendarType(d, calendarType);
    return `${datePart} ${timePart}`;
}

export function normalizeCalendarType(value: unknown): CalendarType {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN';
}
