import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
export declare class TimetableSlotService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly teachingWeekDays;
    private readonly maxPeriodsPerDay;
    private buildAutoGenerateSlotKey;
    private scoreAutoGenerateCandidate;
    private buildAcademicYearFilter;
    assertParentCanViewClassTimetable(schoolId: string, parentUserId: string, classId: string, sectionId?: string): Promise<void>;
    resolveTeacherTimetableTarget(schoolId: string, requester: {
        id: string;
        role: string;
    }, targetTeacherId: string): Promise<string>;
    private timesOverlap;
    private validateNoConflict;
    private validatePeriodCapacity;
    private validateAutoGenerationLoads;
    private validateBatchConflicts;
    create(data: CreateTimetableSlotDto): Promise<{
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        academicYearId: string | null;
        subjectId: string;
        teacherId: string | null;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
    }>;
    findAll(schoolId: string, filters?: {
        dayOfWeek?: number;
        classId?: string;
        teacherId?: string;
        academicYearId?: string;
    }): Promise<({
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
        } | null;
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        academicYearId: string | null;
        subjectId: string;
        teacherId: string | null;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
    })[]>;
    findByClass(schoolId: string, classId: string): Promise<({
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        academicYearId: string | null;
        subjectId: string;
        teacherId: string | null;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
    })[]>;
    findByTeacher(schoolId: string, teacherId: string): Promise<({
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        academicYearId: string | null;
        subjectId: string;
        teacherId: string | null;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
    })[]>;
    findOne(id: string, schoolId: string): Promise<{
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
        } | null;
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        academicYearId: string | null;
        subjectId: string;
        teacherId: string | null;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
    }>;
    update(id: string, schoolId: string, data: UpdateTimetableSlotDto): Promise<{
        class: {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
            isActive: boolean;
            description: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        teacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        academicYearId: string | null;
        subjectId: string;
        teacherId: string | null;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
    }>;
    delete(id: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string;
        academicYearId: string | null;
        subjectId: string;
        teacherId: string | null;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
    }>;
    bulkCreate(schoolId: string, slots: CreateTimetableSlotDto[]): Promise<{
        success: boolean;
        created: any[];
        errors: never[];
    }>;
    deleteByClassSection(schoolId: string, classId: string, sectionId?: string): Promise<Prisma.BatchPayload>;
    getTimetableGrid(schoolId: string, classId: string, sectionId?: string, academicYearId?: string): Promise<{
        days: string[];
        grid: Record<string, any[]>;
        slots: ({
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string | null;
                isActive: boolean;
                description: string | null;
                credits: number | null;
                colorCode: string | null;
            };
            teacher: {
                id: string;
                name: string;
                email: string | null;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        })[];
    }>;
    autoGenerateSectionTimetable(schoolId: string, payload: {
        classId: string;
        sectionId: string;
        academicYearId?: string;
        apply?: boolean;
        periodRequirements: Array<{
            classSubjectId: string;
            periodsPerWeek: number;
        }>;
    }): Promise<{
        success: boolean;
        applied: boolean;
        classId: string;
        sectionId: string;
        academicYearId: string | null;
        generatedSlots: {
            classSubjectId: string;
            subjectId: string;
            subjectName: string;
            teacherId?: string;
            teacherName?: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            periodNumber: number;
            room?: string | null;
        }[];
        unscheduled: {
            classSubjectId: string;
            subjectName: string;
            teacherName: string | null;
            reason: string;
        }[];
        summary: {
            requestedPeriods: number;
            generatedPeriods: number;
            unscheduledPeriods: number;
        };
    }>;
}
