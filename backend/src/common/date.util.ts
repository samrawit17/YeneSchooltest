import { toEthiopian, toGregorian } from 'ethiopian-calendar-new';

export type CalendarType = 'ETHIOPIAN' | 'GREGORIAN';

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
}

export interface SchoolSettingsContext {
  calendarType: CalendarType;
}

export interface AcademicYearContext {
  id: string;
  label: string;
  ethiopianYear?: number | null;
  startDate: Date | string;
  endDate: Date | string;
}

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
];

export function toEthiopianDate(date: Date): EthiopianDate {
  return toEthiopian(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function toGregorianDate(ethDate: EthiopianDate): Date {
  const result = toGregorian(ethDate.year, ethDate.month, ethDate.day);
  return new Date(result.year, result.month - 1, result.day);
}

export function formatSchoolDate(
  date: Date | string,
  schoolSettings: SchoolSettingsContext,
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;

  if (schoolSettings.calendarType === 'ETHIOPIAN') {
    const etDate = toEthiopianDate(d);
    const monthName = ETHIOPIAN_MONTH_NAMES[etDate.month - 1] || '';
    return `${monthName} ${etDate.day}, ${etDate.year} E.C.`;
  }

  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatAcademicYear(
  academicYear: AcademicYearContext,
  schoolSettings: SchoolSettingsContext,
): string {
  if (!academicYear) return '';

  if (
    schoolSettings.calendarType === 'ETHIOPIAN' &&
    academicYear.ethiopianYear
  ) {
    return `${academicYear.ethiopianYear} E.C.`;
  }

  // Gregorian fallback to label or full year range
  if (academicYear.label && academicYear.label !== '') {
    return academicYear.label;
  }

  const start = new Date(academicYear.startDate).getFullYear();
  const end = new Date(academicYear.endDate).getFullYear();
  return `${start}-${end}`;
}
