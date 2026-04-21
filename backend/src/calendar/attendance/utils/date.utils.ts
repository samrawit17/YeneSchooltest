/**
 * Date utility functions for timezone-aware date handling
 * Handles the Africa/Addis_Ababa timezone (UTC+3) properly
 */

/**
 * Default school timezone (Addis Ababa, Ethiopia - EAT)
 */
export const DEFAULT_TIMEZONE = 'Africa/Addis_Ababa';

/**
 * Ethiopian month names
 */
export const ETHIOPIAN_MONTHS = [
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
];

/**
 * Get Ethiopian date from a Gregorian date
 * Ethiopian calendar is ~7-8 years behind Gregorian and has 13 months
 */
export function getEthiopianDate(gregorianDate: Date): {
  year: number;
  month: number;
  day: number;
  monthName: string;
} {
  const date = new Date(gregorianDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const gregorianYear = date.getFullYear();

  // Ethiopian new year is around September 11 (or 12 in leap years)
  // Calculate Ethiopian year
  let ethiopianYear: number;
  if (month >= 9) {
    // After September, Ethiopian year is current Gregorian year - 8
    ethiopianYear = gregorianYear - 8;
  } else {
    // Before September, Ethiopian year is current Gregorian year - 9
    ethiopianYear = gregorianYear - 9;
  }

  // Calculate Ethiopian day of year
  const getDayOfYear = (m: number, d: number): number => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = 0;
    for (let i = 0; i < m - 1; i++) {
      dayOfYear += daysInMonth[i];
    }
    return dayOfYear + d;
  };

  const dayOfYear = getDayOfYear(month, day);
  const ethiopianDayOfYear = dayOfYear + (month >= 9 ? 0 : -1); // Adjust for Ethiopian year start

  // Convert to Ethiopian calendar
  // Ethiopian year has 13 months: 12 months of 30 days + 1 month of 5/6 days
  let ethiopianMonth: number;
  let ethiopianDay: number;

  if (dayOfYear >= 255) {
    // After September 11 (approximately)
    const adjustedDay = dayOfYear - 254;
    ethiopianMonth = Math.ceil(adjustedDay / 30);
    ethiopianDay = adjustedDay - (ethiopianMonth - 1) * 30;
    if (ethiopianMonth > 13) {
      ethiopianMonth = 13;
      ethiopianDay = adjustedDay - 360 + 30;
    }
  } else {
    // In the first part of Ethiopian year (before September 11 Gregorian)
    const adjustedDay = dayOfYear + 111; // Days from Ethiopian new year to current date
    ethiopianMonth = Math.ceil(adjustedDay / 30);
    ethiopianDay = adjustedDay - (ethiopianMonth - 1) * 30;
  }

  // Handle edge cases
  if (ethiopianMonth < 1) ethiopianMonth = 1;
  if (ethiopianDay < 1) ethiopianDay = 1;
  if (ethiopianMonth > 13) ethiopianMonth = 13;

  return {
    year: ethiopianYear,
    month: ethiopianMonth,
    day: ethiopianDay,
    monthName: ETHIOPIAN_MONTHS[ethiopianMonth - 1] || '',
  };
}

/**
 * Format a date as Ethiopian calendar string
 */
export function formatEthiopianDate(gregorianDate: Date): string {
  const ethiopian = getEthiopianDate(gregorianDate);
  return `${ethiopian.monthName} ${ethiopian.day}, ${ethiopian.year} E.C.`;
}

/**
 * Get Ethiopian year from Gregorian date
 */
export function getEthiopianYear(gregorianDate: Date): number {
  const ethiopian = getEthiopianDate(gregorianDate);
  return ethiopian.year;
}

/**
 * Get the start of day in UTC based on the local date string
 * This ensures that dates are handled correctly regardless of server timezone
 *
 * @param dateString - ISO date string (YYYY-MM-DD) or Date object
 * @param timezone - Optional timezone (defaults to Africa/Addis_Ababa)
 * @returns Date object representing start of day in UTC
 */
export function getStartOfDay(
  dateString: string | Date,
  timezone: string = DEFAULT_TIMEZONE,
): Date {
  if (typeof dateString === 'string') {
    // Parse the date string and treat it as the start of day in the specified timezone
    // Then convert to UTC
    const [year, month, day] = dateString.split('-').map(Number);

    // Create date in local timezone concept, then adjust
    // For EAT (UTC+3), we need to subtract 3 hours to get UTC start of day
    // But since we want "2026-03-07 00:00 EAT" in UTC, that's "2026-03-06 21:00 UTC"
    const offset = getTimezoneOffset(timezone);
    const localDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    // Adjust for timezone offset
    // The date provided is in local time (e.g., EAT), so we subtract the offset
    // to get the equivalent UTC time
    return new Date(localDate.getTime() - offset * 60 * 60 * 1000);
  }

  // For Date objects, extract the date parts and create UTC date
  const year = dateString.getFullYear();
  const month = dateString.getMonth();
  const day = dateString.getDate();

  const offset = getTimezoneOffset(timezone);
  const localDate = new Date(Date.UTC(year, month, day, 0, 0, 0));
  return new Date(localDate.getTime() - offset * 60 * 60 * 1000);
}

/**
 * Get the end of day in UTC based on the local date string
 *
 * @param dateString - ISO date string (YYYY-MM-DD) or Date object
 * @param timezone - Optional timezone (defaults to Africa/Addis_Ababa)
 * @returns Date object representing end of day in UTC
 */
export function getEndOfDay(
  dateString: string | Date,
  timezone: string = DEFAULT_TIMEZONE,
): Date {
  if (typeof dateString === 'string') {
    const [year, month, day] = dateString.split('-').map(Number);
    const offset = getTimezoneOffset(timezone);
    const localDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return new Date(localDate.getTime() - offset * 60 * 60 * 1000);
  }

  const year = dateString.getFullYear();
  const month = dateString.getMonth();
  const day = dateString.getDate();

  const offset = getTimezoneOffset(timezone);
  const localDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  return new Date(localDate.getTime() - offset * 60 * 60 * 1000);
}

/**
 * Get timezone offset in hours
 */
function getTimezoneOffset(timezone: string): number {
  const timezoneOffsets: Record<string, number> = {
    'Africa/Addis_Ababa': 3, // EAT
    'Africa/Nairobi': 3, // EAT
    'Africa/Dar_es_Salaam': 3, // EAT
    UTC: 0,
    GMT: 0,
  };

  return timezoneOffsets[timezone] ?? 3; // Default to EAT
}

/**
 * Format date for display in the school's timezone
 */
export function formatDateForDisplay(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  // Create formatter for the specific timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string and return a Date object that represents that date
 * in the server's local time (midnight)
 *
 * @deprecated Use getStartOfDay for better timezone handling
 */
export function getLocalMidnight(dateString?: string): Date {
  const date = dateString ? new Date(dateString) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get today's date as a string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
