import { CalendarService } from './calendar.service';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
export declare class CalendarController {
    private readonly calendarService;
    private readonly schoolSettingsService;
    constructor(calendarService: CalendarService, schoolSettingsService: SchoolSettingsService);
    getCurrentEthiopianYear(): {
        year: number;
        description: string;
    };
    getCurrentDate(): {
        gregorian: {
            date: string;
            fullDate: string;
        };
        ethiopian: {
            year: number;
            date: import("./calendar.service").EthiopianDate;
            formatted: string;
        };
    };
    convertDate(date: string): import("./calendar.service").CalendarConversionResult | {
        error: string;
    };
    convertToGregorian(year: string, month: string, day: string): {
        error: string;
        ethiopian?: undefined;
        gregorian?: undefined;
    } | {
        ethiopian: {
            year: number;
            month: number;
            day: number;
        };
        gregorian: string;
        error?: undefined;
    };
    getSchoolCalendarMode(schoolId: string): Promise<{
        schoolId: string;
        calendarType: any;
    }>;
    checkNewYear(date?: string): {
        date: string;
        isNewYearPeriod: boolean;
        ethiopianYear: number;
        message: string;
    };
}
