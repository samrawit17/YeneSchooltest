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
export declare const ETHIOPIAN_MONTH_NAMES: string[];
export declare function toEthiopianDate(date: Date): EthiopianDate;
export declare function toGregorianDate(ethDate: EthiopianDate): Date;
export declare function formatSchoolDate(date: Date | string, schoolSettings: SchoolSettingsContext): string;
export declare function formatAcademicYear(academicYear: AcademicYearContext, schoolSettings: SchoolSettingsContext): string;
