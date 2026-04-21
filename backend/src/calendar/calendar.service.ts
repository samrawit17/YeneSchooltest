import { Injectable } from '@nestjs/common';
import {
  toEthiopian,
  toGregorian,
  isEthiopianLeapYear,
} from 'ethiopian-calendar-new';

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
}

export interface CalendarConversionResult {
  gregorianDate: string;
  ethiopianDate: EthiopianDate;
}

@Injectable()
export class CalendarService {
  /**
   * Ethiopian month names
   */
  private readonly ethiopianMonthNames = [
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
   * Get the current Ethiopian year based on today's Gregorian date
   * Ethiopian new year (Enkutatash) is around September 11 (Gregorian)
   * The Ethiopian calendar is ~7-8 years behind the Gregorian calendar
   */
  getCurrentEthiopianYear(): number {
    const today = new Date();
    return this.getEthiopianYear(today);
  }

  /**
   * Get Ethiopian year from a Gregorian date
   * The Ethiopian calendar year changes around September 11 Gregorian
   */
  getEthiopianYear(gregorianDate: Date): number {
    const ethiopianDate = this.convertGregorianToEthiopian(gregorianDate);
    return ethiopianDate.year;
  }

  /**
   * Convert a Gregorian date to Ethiopian date
   * @param gregorianDate - Date object or ISO string
   */
  convertGregorianToEthiopian(gregorianDate: Date | string): EthiopianDate {
    const date =
      typeof gregorianDate === 'string'
        ? new Date(gregorianDate)
        : gregorianDate;

    // Use local calculation instead of library to ensure correct results
    // Ethiopian calendar is 7-8 years behind Gregorian
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    const gregorianYear = date.getFullYear();

    let ethiopianYear: number;
    if (month >= 9) {
      // After September, Ethiopian year is current Gregorian year - 7
      ethiopianYear = gregorianYear - 7;
    } else {
      // Before September, Ethiopian year is current Gregorian year - 8
      ethiopianYear = gregorianYear - 8;
    }

    // Calculate Ethiopian day of year
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = 0;
    for (let i = 0; i < month - 1; i++) {
      dayOfYear += daysInMonth[i];
    }
    dayOfYear += day;

    // Convert to Ethiopian calendar
    // Ethiopian year has 13 months: 12 months of 30 days + 1 month of 5/6 days
    let ethiopianMonth: number;
    let ethiopianDay: number;

    if (month >= 9) {
      // In the latter part of Ethiopian year (after September 11 Gregorian)
      const adjustedDay = dayOfYear - 254;
      ethiopianMonth = Math.ceil(adjustedDay / 30);
      ethiopianDay = adjustedDay - (ethiopianMonth - 1) * 30;
      if (ethiopianMonth > 13) {
        ethiopianMonth = 13;
        ethiopianDay = adjustedDay - 360 + 30;
      }
    } else {
      // In the first part of Ethiopian year (before September 11 Gregorian)
      const adjustedDay = dayOfYear + 111;
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
      monthName: this.ethiopianMonthNames[ethiopianMonth - 1] || '',
    };
  }

  /**
   * Convert Ethiopian date to Gregorian date
   * @param ethiopianYear - Ethiopian year (e.g., 2018)
   * @param ethiopianMonth - Ethiopian month (1-13)
   * @param ethiopianDay - Ethiopian day (1-30/31)
   */
  convertEthiopianToGregorian(
    ethiopianYear: number,
    ethiopianMonth: number,
    ethiopianDay: number,
  ): Date {
    const gregorian = toGregorian(ethiopianYear, ethiopianMonth, ethiopianDay);
    return new Date(gregorian.year, gregorian.month - 1, gregorian.day);
  }

  /**
   * Get full calendar conversion result
   */
  getCalendarConversion(
    gregorianDate: Date | string,
  ): CalendarConversionResult {
    const date =
      typeof gregorianDate === 'string'
        ? new Date(gregorianDate)
        : gregorianDate;
    const ethiopianDate = this.convertGregorianToEthiopian(date);

    return {
      gregorianDate: date.toISOString().split('T')[0],
      ethiopianDate,
    };
  }

  /**
   * Get Ethiopian date formatted string
   */
  formatEthiopianDate(gregorianDate: Date | string): string {
    const ethiopianDate = this.convertGregorianToEthiopian(gregorianDate);
    return `${ethiopianDate.monthName} ${ethiopianDate.day}, ${ethiopianDate.year} E.C.`;
  }

  /**
   * Get current date in both calendars
   */
  getCurrentDateInfo() {
    const now = new Date();
    const ethiopianYear = this.getCurrentEthiopianYear();
    const ethiopianDate = this.convertGregorianToEthiopian(now);

    return {
      gregorian: {
        date: now.toISOString().split('T')[0],
        fullDate: now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      },
      ethiopian: {
        year: ethiopianYear,
        date: ethiopianDate,
        formatted: this.formatEthiopianDate(now),
      },
    };
  }

  /**
   * Check if Ethiopian new year has passed for a given Gregorian date
   * Ethiopian new year is around September 11
   */
  isEthiopianNewYearPeriod(gregorianDate: Date): boolean {
    const month = gregorianDate.getMonth() + 1; // 1-12
    const day = gregorianDate.getDate();

    // New year period is around September 11 (can vary slightly)
    // Typically September 11 or 12
    return (month === 9 && day >= 11) || (month === 9 && day <= 12);
  }

  /**
   * Get Ethiopian year with proper handling of new year transition
   */
  getEthiopianYearWithTransition(gregorianDate: Date): number {
    const date = new Date(gregorianDate);

    // Ethiopian new year is on September 11/12 Gregorian
    // Before September 11: still previous Ethiopian year
    // On/after September 11: new Ethiopian year

    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Get the base Ethiopian year (approximately 7-8 years behind)
    const baseYear = date.getFullYear() - 7;

    // If we're before September 11, it's still the previous Ethiopian year
    if (month < 9 || (month === 9 && day < 11)) {
      return baseYear;
    }

    return baseYear + 1;
  }

  /**
   * Check if an Ethiopian year is a leap year
   */
  checkLeapYear(year: number): boolean {
    return isEthiopianLeapYear(year);
  }
}
