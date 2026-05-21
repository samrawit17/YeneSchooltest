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
export declare class CalendarService {
    private readonly ethiopianMonthNames;
    getCurrentEthiopianYear(): number;
    getEthiopianYear(gregorianDate: Date): number;
    convertGregorianToEthiopian(gregorianDate: Date | string): EthiopianDate;
    convertEthiopianToGregorian(ethiopianYear: number, ethiopianMonth: number, ethiopianDay: number): Date;
    getCalendarConversion(gregorianDate: Date | string): CalendarConversionResult;
    formatEthiopianDate(gregorianDate: Date | string): string;
    getCurrentDateInfo(): {
        gregorian: {
            date: string;
            fullDate: string;
        };
        ethiopian: {
            year: number;
            date: EthiopianDate;
            formatted: string;
        };
    };
    isEthiopianNewYearPeriod(gregorianDate: Date): boolean;
    getEthiopianYearWithTransition(gregorianDate: Date): number;
    checkLeapYear(year: number): boolean;
}
