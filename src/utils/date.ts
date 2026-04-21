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

const ETHIOPIAN_MONTH_NAMES = [
  'Meskerem', 'Tikemet', 'Hidar', 'Tahsas', 'Ter', 'Yekatit',
  'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];

export function toEthiopianDate(date: Date): EthiopianDate {
  return toEthiopian(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function toGregorianDate(ethDate: EthiopianDate): Date {
  const result = toGregorian(ethDate.year, ethDate.month, ethDate.day);
  return new Date(result.year, result.month - 1, result.day);
}

export function formatSchoolDate(date: Date | string, schoolSettings: SchoolSettingsContext): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (schoolSettings.calendarType === 'ETHIOPIAN') {
    const etDate = toEthiopianDate(d);
    const monthName = ETHIOPIAN_MONTH_NAMES[etDate.month - 1] || '';
    return `${monthName} ${etDate.day}, ${etDate.year} E.C.`;
  }
  
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatAcademicYear(academicYear: AcademicYearContext, schoolSettings?: SchoolSettingsContext): string {
  if (!academicYear) return '';

  const normalizedLabel = typeof academicYear.label === 'string' ? academicYear.label.trim() : '';
  const startDate = academicYear.startDate ? new Date(academicYear.startDate) : null;
  const endDate = academicYear.endDate ? new Date(academicYear.endDate) : null;
  const hasValidStart = !!startDate && !Number.isNaN(startDate.getTime());
  const hasValidEnd = !!endDate && !Number.isNaN(endDate.getTime());
  
  if (schoolSettings?.calendarType === 'ETHIOPIAN' && academicYear.ethiopianYear) {
    return `${academicYear.ethiopianYear} E.C.`;
  }
  
  // Gregorian fallback to label or full year range
  if (normalizedLabel) {
    return normalizedLabel;
  }
  
  if (hasValidStart && hasValidEnd) {
    const start = startDate.getFullYear();
    const end = endDate.getFullYear();
    return start === end ? `${start}` : `${start}-${end}`;
  }

  if (hasValidStart) {
    return `${startDate.getFullYear()}`;
  }

  if (hasValidEnd) {
    return `${endDate.getFullYear()}`;
  }

  if (academicYear.id) {
    return 'Academic Year';
  }

  return 'No Academic Year';
}

export function formatGlobalDate(date: Date | string): string {
  const calendarType: CalendarType = 
    (typeof window !== 'undefined' && (window as any).__SMS_ACTIVE_CALENDAR_TYPE__) || 'ETHIOPIAN';
  return formatSchoolDate(date, { calendarType });
}
