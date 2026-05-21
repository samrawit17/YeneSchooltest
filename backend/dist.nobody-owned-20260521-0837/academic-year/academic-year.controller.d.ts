import { AcademicYearService } from './academic-year.service';
import type { CreateAcademicYearDto, UpdateAcademicYearDto, CreateTermDto, UpdateTermDto } from './academic-year.service';
export declare class AcademicYearController {
    private readonly academicYearService;
    constructor(academicYearService: AcademicYearService);
    private resolveSchoolId;
    createAcademicYear(createDto: CreateAcademicYearDto, req: any): Promise<({
        school: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            email: string;
            enrollmentKey: string | null;
            code: string | null;
            phone: string | null;
            address: string | null;
            timezone: string;
            logoUrl: string | null;
            isActive: boolean;
            settings: string | null;
            planId: string | null;
            planAssignedAt: Date | null;
        };
        terms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
        calendarType: import("@prisma/client").$Enums.CalendarType;
    }) | null>;
    getAcademicYears(schoolId: string, req: any): Promise<({
        terms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
        calendarType: import("@prisma/client").$Enums.CalendarType;
    })[]>;
    getActiveAcademicYear(schoolId: string, req: any): Promise<({
        terms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
        calendarType: import("@prisma/client").$Enums.CalendarType;
    }) | null>;
    getAcademicYearById(id: string): Promise<{
        school: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            email: string;
            enrollmentKey: string | null;
            code: string | null;
            phone: string | null;
            address: string | null;
            timezone: string;
            logoUrl: string | null;
            isActive: boolean;
            settings: string | null;
            planId: string | null;
            planAssignedAt: Date | null;
        };
        terms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
        calendarType: import("@prisma/client").$Enums.CalendarType;
    }>;
    updateAcademicYear(id: string, updateDto: UpdateAcademicYearDto): Promise<{
        terms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
        calendarType: import("@prisma/client").$Enums.CalendarType;
    }>;
    activateAcademicYear(id: string): Promise<{
        terms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
        calendarType: import("@prisma/client").$Enums.CalendarType;
    }>;
    updateCurriculumType(id: string, dto: {
        curriculumType: any;
    }): Promise<{
        terms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
        calendarType: import("@prisma/client").$Enums.CalendarType;
    }>;
    deleteAcademicYear(id: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
        calendarType: import("@prisma/client").$Enums.CalendarType;
    }>;
    getCurrentTerm(schoolId: string, req: any): Promise<({
        academicYear: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            startDate: Date;
            endDate: Date;
            ethiopianYear: number | null;
            curriculumType: import("@prisma/client").$Enums.CurriculumType;
            calendarType: import("@prisma/client").$Enums.CalendarType;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }) | null>;
    getTermsByAcademicYear(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }[]>;
    createTerm(academicYearId: string, createDto: CreateTermDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
    getTermById(termId: string): Promise<{
        academicYear: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            startDate: Date;
            endDate: Date;
            ethiopianYear: number | null;
            curriculumType: import("@prisma/client").$Enums.CurriculumType;
            calendarType: import("@prisma/client").$Enums.CalendarType;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
    updateTerm(termId: string, updateDto: UpdateTermDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
    lockTerm(termId: string, isLocked: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
    deleteTerm(termId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
    getPeriodWeights(id: string): Promise<{
        id: string;
        name: string;
        order: number;
        percentageWeight: number;
        isLocked: boolean;
    }[]>;
    validatePeriodWeights(id: string): Promise<{
        isValid: boolean;
        message: string;
    }>;
}
