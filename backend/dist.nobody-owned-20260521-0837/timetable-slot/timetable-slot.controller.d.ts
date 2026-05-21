import { TimetableSlotService } from './timetable-slot.service';
import { Role } from '../auth/types/role.enum';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        role: Role;
        schoolId?: string;
    };
}
export declare class TimetableSlotController {
    private timetableSlotService;
    constructor(timetableSlotService: TimetableSlotService);
    create(req: AuthenticatedRequest, body: CreateTimetableSlotDto): Promise<({
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
    }) | {
        success: boolean;
        message: string;
    }>;
    findAll(req: AuthenticatedRequest, dayOfWeek?: string, classId?: string, teacherId?: string, academicYearId?: string): Promise<({
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
    })[] | {
        success: boolean;
        message: string;
    }>;
    findByClass(req: AuthenticatedRequest, classId: string): Promise<({
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
    })[] | {
        success: boolean;
        message: string;
    }>;
    findByTeacher(req: AuthenticatedRequest, targetTeacherId: string): Promise<({
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
    })[] | {
        success: boolean;
        message: string;
    }>;
    bulkCreate(req: AuthenticatedRequest, body: {
        slots: CreateTimetableSlotDto[];
    }): Promise<{
        success: boolean;
        created: any[];
        errors: never[];
    } | {
        success: boolean;
        message: string;
    }>;
    autoGenerate(req: AuthenticatedRequest, body: {
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
    } | {
        success: boolean;
        message: string;
    }>;
    deleteByClassSection(req: AuthenticatedRequest, classId: string, sectionId: string): Promise<import("@prisma/client").Prisma.BatchPayload | {
        success: boolean;
        message: string;
    }>;
    getTimetableGrid(req: AuthenticatedRequest, classId: string, sectionId?: string, academicYearId?: string): Promise<{
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
    } | {
        success: boolean;
        message: string;
    }>;
    findOne(req: AuthenticatedRequest, id: string): Promise<({
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
    }) | {
        success: boolean;
        message: string;
    }>;
    update(req: AuthenticatedRequest, id: string, body: UpdateTimetableSlotDto): Promise<({
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
    }) | {
        success: boolean;
        message: string;
    }>;
    delete(req: AuthenticatedRequest, id: string): Promise<{
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
    } | {
        success: boolean;
        message: string;
    }>;
}
export {};
