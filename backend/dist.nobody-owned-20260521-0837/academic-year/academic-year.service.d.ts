import { PrismaService } from '../prisma/prisma.service';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
type CurriculumType = 'SEMESTER' | 'QUARTER' | 'TERM' | 'CUSTOM';
type CalendarType = 'GREGORIAN' | 'ETHIOPIAN';
export interface CreateAcademicYearDto {
    name: string;
    startDate: Date;
    endDate: Date;
    schoolId: string;
    curriculumType?: CurriculumType;
    calendarType?: CalendarType;
}
export interface UpdateAcademicYearDto {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    curriculumType?: CurriculumType;
    calendarType?: CalendarType;
}
export interface UpdateCurriculumTypeDto {
    curriculumType: CurriculumType;
}
export interface CreateTermDto {
    name: string;
    order: number;
    percentageWeight: number;
    startDate: Date;
    endDate: Date;
}
export interface UpdateTermDto {
    name?: string;
    order?: number;
    percentageWeight?: number;
    startDate?: Date;
    endDate?: Date;
}
export declare class AcademicYearService {
    private prismaService;
    private schoolSettingsService;
    constructor(prismaService: PrismaService, schoolSettingsService: SchoolSettingsService);
    createAcademicYear(createDto: CreateAcademicYearDto): Promise<({
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
    getAcademicYears(schoolId: string): Promise<({
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
    getActiveAcademicYear(schoolId: string): Promise<({
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
    resolveAcademicYearId(schoolId: string, providedAcademicYearId?: string | null): Promise<string>;
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
    updateCurriculumType(id: string, dto: UpdateCurriculumTypeDto): Promise<{
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
    getCurrentTerm(schoolId: string): Promise<({
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
    getPeriodWeights(id: string): Promise<{
        id: string;
        name: string;
        order: number;
        percentageWeight: number;
        isLocked: boolean;
    }[]>;
    validatePeriodWeights(id: string): Promise<boolean>;
    createTerm(academicYearId: string, dto: CreateTermDto): Promise<{
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
    updateTerm(termId: string, dto: UpdateTermDto): Promise<{
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
}
export {};
