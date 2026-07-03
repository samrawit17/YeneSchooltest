import { PrismaService } from '../prisma/prisma.service';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
import { EventBusService } from '../core/events/event-bus.service';
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
    private eventBus;
    constructor(prismaService: PrismaService, schoolSettingsService: SchoolSettingsService, eventBus: EventBusService);
    private requireSchoolId;
    private assertSchoolAccess;
    private assertTermSchoolAccess;
    private assertTermDatesDoNotOverlap;
    private assertPeriodWeight;
    private assertTotalWeightDoesNotExceed100;
    createAcademicYear(createDto: CreateAcademicYearDto): Promise<({
        school: {
            id: string;
            name: string;
            email: string;
            isActive: boolean;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            enrollmentKey: string | null;
            code: string | null;
            publicUrlSlug: string;
            address: string | null;
            timezone: string;
            logoUrl: string | null;
            settings: string | null;
            planId: string | null;
            planAssignedAt: Date | null;
        };
        terms: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        calendarType: import("@prisma/client").$Enums.CalendarType;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
    }) | null>;
    getAcademicYears(schoolId: string): Promise<({
        terms: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        calendarType: import("@prisma/client").$Enums.CalendarType;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
    })[]>;
    getAcademicYearById(id: string, schoolId?: string): Promise<{
        school: {
            id: string;
            name: string;
            email: string;
            isActive: boolean;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            enrollmentKey: string | null;
            code: string | null;
            publicUrlSlug: string;
            address: string | null;
            timezone: string;
            logoUrl: string | null;
            settings: string | null;
            planId: string | null;
            planAssignedAt: Date | null;
        };
        terms: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        calendarType: import("@prisma/client").$Enums.CalendarType;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
    }>;
    getActiveAcademicYear(schoolId: string): Promise<({
        terms: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        calendarType: import("@prisma/client").$Enums.CalendarType;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
    }) | null>;
    resolveAcademicYearId(schoolId: string, providedAcademicYearId?: string | null): Promise<string>;
    updateAcademicYear(id: string, updateDto: UpdateAcademicYearDto, schoolId?: string): Promise<{
        terms: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        calendarType: import("@prisma/client").$Enums.CalendarType;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
    }>;
    updateCurriculumType(id: string, dto: UpdateCurriculumTypeDto, schoolId?: string): Promise<{
        terms: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        calendarType: import("@prisma/client").$Enums.CalendarType;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
    }>;
    activateAcademicYear(id: string, schoolId?: string): Promise<{
        terms: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        calendarType: import("@prisma/client").$Enums.CalendarType;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
    }>;
    deleteAcademicYear(id: string, schoolId?: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        calendarType: import("@prisma/client").$Enums.CalendarType;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
    }>;
    getCurrentTerm(schoolId: string): Promise<({
        academicYear: {
            id: string;
            name: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            calendarType: import("@prisma/client").$Enums.CalendarType;
            startDate: Date;
            endDate: Date;
            ethiopianYear: number | null;
            curriculumType: import("@prisma/client").$Enums.CurriculumType;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }) | null>;
    getPeriodWeights(id: string, schoolId?: string): Promise<{
        id: string;
        name: string;
        order: number;
        percentageWeight: number;
        isLocked: boolean;
    }[]>;
    validatePeriodWeights(id: string, schoolId?: string): Promise<boolean>;
    createTerm(academicYearId: string, dto: CreateTermDto, schoolId?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
    updateTerm(termId: string, dto: UpdateTermDto, schoolId?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
    lockTerm(termId: string, isLocked: boolean, schoolId?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
    deleteTerm(termId: string, schoolId?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
    getTermById(termId: string, schoolId?: string): Promise<{
        academicYear: {
            id: string;
            name: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            calendarType: import("@prisma/client").$Enums.CalendarType;
            startDate: Date;
            endDate: Date;
            ethiopianYear: number | null;
            curriculumType: import("@prisma/client").$Enums.CurriculumType;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        order: number;
        isLocked: boolean;
        percentageWeight: number;
    }>;
}
export {};
