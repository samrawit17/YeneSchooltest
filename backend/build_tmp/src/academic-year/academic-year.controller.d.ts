import { AcademicYearService } from './academic-year.service';
import type { CreateAcademicYearDto, UpdateAcademicYearDto, CreateTermDto, UpdateTermDto } from './academic-year.service';
export declare class AcademicYearController {
    private readonly academicYearService;
    constructor(academicYearService: AcademicYearService);
    private resolveSchoolId;
    private requireSchoolId;
    createAcademicYear(createDto: CreateAcademicYearDto, req: any): Promise<({
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
    getAcademicYears(schoolId: string, req: any): Promise<({
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
    getActiveAcademicYear(schoolId: string, req: any): Promise<({
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
    getAcademicYearById(id: string, req: any): Promise<{
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
    updateAcademicYear(id: string, updateDto: UpdateAcademicYearDto, req: any): Promise<{
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
    activateAcademicYear(id: string, req: any): Promise<{
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
    updateCurriculumType(id: string, dto: {
        curriculumType: any;
    }, req: any): Promise<{
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
    deleteAcademicYear(id: string, req: any): Promise<{
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
    getCurrentTerm(schoolId: string, req: any): Promise<({
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
    getTermsByAcademicYear(id: string, req: any): Promise<{
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
    }[]>;
    createTerm(academicYearId: string, createDto: CreateTermDto, req: any): Promise<{
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
    getTermById(termId: string, req: any): Promise<{
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
    updateTerm(termId: string, updateDto: UpdateTermDto, req: any): Promise<{
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
    lockTerm(termId: string, isLocked: boolean, req: any): Promise<{
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
    deleteTerm(termId: string, req: any): Promise<{
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
    getPeriodWeights(id: string, req: any): Promise<{
        id: string;
        name: string;
        order: number;
        percentageWeight: number;
        isLocked: boolean;
    }[]>;
    validatePeriodWeights(id: string, req: any): Promise<{
        isValid: boolean;
        message: string;
    }>;
}
