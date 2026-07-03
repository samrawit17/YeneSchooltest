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
    }) | {
        success: boolean;
        message: string;
    }>;
    findAll(req: AuthenticatedRequest, dayOfWeek?: string, classId?: string, teacherId?: string, academicYearId?: string): Promise<({
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
    })[] | {
        success: boolean;
        message: string;
    }>;
    findByStudent(req: AuthenticatedRequest, studentId: string): Promise<({
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
    })[] | {
        success: boolean;
        message: string;
    }>;
    findByClass(req: AuthenticatedRequest, classId: string): Promise<({
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
    })[] | {
        success: boolean;
        message: string;
    }>;
    findByTeacher(req: AuthenticatedRequest, targetTeacherId: string, academicYearId?: string): Promise<({
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
    deleteByClassSection(req: AuthenticatedRequest, classId: string, sectionId: string, academicYearId?: string): Promise<import("@prisma/client").Prisma.BatchPayload | {
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
    } | {
        success: boolean;
        message: string;
    }>;
    findOne(req: AuthenticatedRequest, id: string): Promise<({
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
    }) | {
        success: boolean;
        message: string;
    }>;
    update(req: AuthenticatedRequest, id: string, body: UpdateTimetableSlotDto): Promise<({
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
    }) | {
        success: boolean;
        message: string;
    }>;
    delete(req: AuthenticatedRequest, id: string): Promise<void | {
        success: boolean;
        message: string;
    }>;
}
export {};
