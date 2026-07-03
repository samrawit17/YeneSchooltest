export declare class ReportQueryDto {
    schoolId: string;
    from?: string;
    to?: string;
    month?: number;
    year?: number;
    termId?: string;
    academicYearId?: string;
    calendarType?: 'ETHIOPIAN' | 'GREGORIAN';
    includeOutstanding?: string;
}
