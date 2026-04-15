declare module 'ethiopian-date' {
    export function toEthiopian(gregorianDate: Date | string | number): [number, number, number];
    export function toGregorian(ethiopianYear: number, ethiopianMonth: number, ethiopianDay: number): [number, number, number];
    export function getMonthName(month: number): string;
    export function getDayName(day: number): string;
    export function isLeapYear(year: number): boolean;
}
