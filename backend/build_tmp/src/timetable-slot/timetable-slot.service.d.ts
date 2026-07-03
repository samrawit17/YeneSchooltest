import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
export declare class TimetableSlotService {
    private prisma;
    private eventBus;
    constructor(prisma: PrismaService, eventBus: EventBusService);
    private readonly teachingWeekDays;
    private readonly defaultMaxPeriodsPerDay;
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
    private getMaxPeriodsPerDay;
    private validatePeriodCapacity;
    private validateAutoGenerationLoads;
    private validateBatchConflicts;
    create(data: CreateTimetableSlotDto): Promise<{
        class: {
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
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
        } | null;
        class: {
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
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
    getByStudent(schoolId: string, studentId: string): Promise<({
        class: {
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
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
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
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
    findByTeacher(schoolId: string, teacherId: string, academicYearId?: string): Promise<({
        class: {
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
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
        } | null;
        class: {
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
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
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
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
    delete(id: string, schoolId: string): Promise<void>;
    bulkCreate(schoolId: string, slots: CreateTimetableSlotDto[]): Promise<{
        success: boolean;
        created: any[];
        errors: never[];
    }>;
    deleteByClassSection(schoolId: string, classId: string, sectionId?: string, academicYearId?: string): Promise<Prisma.BatchPayload>;
    getTimetableGrid(schoolId: string, classId: string, sectionId?: string, academicYearId?: string): Promise<{
        days: string[];
        grid: Record<string, any[]>;
        slots: ({
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                stream: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                grade: number | null;
                code: string | null;
                academicYearId: string | null;
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
