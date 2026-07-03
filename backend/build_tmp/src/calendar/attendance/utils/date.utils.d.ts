export declare const DEFAULT_TIMEZONE = "Africa/Addis_Ababa";
export declare const ETHIOPIAN_MONTHS: string[];
export declare function getEthiopianDate(gregorianDate: Date): {
    year: number;
    month: number;
    day: number;
    monthName: string;
};
export declare function formatEthiopianDate(gregorianDate: Date): string;
export declare function getEthiopianYear(gregorianDate: Date): number;
export declare function getStartOfDay(dateString: string | Date, timezone?: string): Date;
export declare function getEndOfDay(dateString: string | Date, timezone?: string): Date;
export declare function formatDateForDisplay(date: Date, timezone?: string): string;
export declare function getLocalMidnight(dateString?: string): Date;
export declare function getTodayDateString(): string;
