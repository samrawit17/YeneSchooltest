import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { Role } from '../auth/types/role.enum';
export declare class ClassService {
    private prisma;
    private eventBus;
    constructor(prisma: PrismaService, eventBus: EventBusService);
    private assertAcademicYearBelongsToSchool;
    create(data: {
        schoolId: string;
        academicYearId: string;
        grade: number;
        section: string;
        name?: string;
    }): Promise<{
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
    }>;
    findAll(schoolId: string, academicYearId?: string): Promise<{
        id: string;
        name: string;
        schoolId: string;
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
        section: string;
        grade: number | null;
        academicYearId: string;
        homeroomTeacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
        sections: ({
            homeroomTeacher: {
                id: string;
                name: string;
                email: string | null;
            } | null;
        } & {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        })[];
    }[]>;
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
        homeroomTeacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
        sections: ({
            homeroomTeacher: {
                id: string;
                name: string;
                email: string | null;
            } | null;
        } & {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        })[];
    } & {
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
    }>;
    findByGradeAndYear(schoolId: string, academicYearId: string, grade: number): Promise<({
        sections: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        }[];
    } & {
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
    }) | null>;
    update(id: string, schoolId: string, data: {
        academicYearId?: string;
        grade?: number;
        name?: string;
        section?: string;
        homeroomTeacherId?: string | null;
    }): Promise<{
        sections: ({
            homeroomTeacher: {
                id: string;
                name: string;
                email: string | null;
            } | null;
        } & {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        })[];
    } & {
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
    }>;
    delete(id: string, schoolId: string): Promise<{
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
    }>;
    getOrCreate(schoolId: string, academicYearId: string, grade: number, section: string): Promise<({
        sections: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        }[];
    } & {
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
    }) | null>;
    getGrades(schoolId?: string): Promise<number[]>;
    search(schoolId: string, query: string, academicYearId?: string): Promise<{
        id: string;
        name: string;
        schoolId: string;
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
        section: string;
        grade: number | null;
        academicYearId: string;
        homeroomTeacher: {
            id: string;
            name: string;
            email: string | null;
        } | null;
        sections: ({
            homeroomTeacher: {
                id: string;
                name: string;
                email: string | null;
            } | null;
        } & {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        })[];
    }[]>;
    getStudentsByClass(schoolId: string, classId: string, sectionId?: string, search?: string, pagination?: {
        page: number;
        limit: number;
        orderBy?: string;
    }, requester?: {
        id: string;
        role: Role;
    }): Promise<{
        class: {
            id: string;
            name: string;
            grade: number | null;
            section: string;
            homeroomTeacherId: string | null;
            sectionHomeroomTeacherId: string | null;
        };
        students: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    private resolveTeacherClassStudentScope;
    getClassStats(schoolId: string, classId: string, sectionId?: string): Promise<{
        class: {
            id: string;
            name: string;
            grade: number | null;
            section: string;
            homeroomTeacher: {
                id: string;
                name: string;
                email: string | null;
            } | null;
            sections: {
                id: string;
                name: string;
                capacity: number;
                roomNumber: string | null;
                homeroomTeacher: {
                    id: string;
                    name: string;
                    email: string | null;
                } | null;
            }[];
        };
        stats: {
            totalStudents: number;
            maleCount: number;
            femaleCount: number;
        };
    }>;
}
