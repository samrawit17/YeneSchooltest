import { ClassService } from './class.service';
import { Role } from '../auth/types/role.enum';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        role: Role;
        schoolId?: string;
    };
}
export declare class ClassController {
    private classService;
    private schoolSettingsService;
    constructor(classService: ClassService, schoolSettingsService: SchoolSettingsService);
    create(req: AuthenticatedRequest, body: any): Promise<{
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
    } | {
        success: boolean;
        message: string;
    }>;
    findAll(req: AuthenticatedRequest, academicYearId?: string): Promise<{
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
        section: string;
        grade: number | null;
        id: string;
        schoolId: string;
        name: string;
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
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        })[];
    }[] | {
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
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        })[];
    } & {
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
    }) | {
        success: boolean;
        message: string;
    }>;
    getGrades(req: AuthenticatedRequest): Promise<number[]>;
    search(req: AuthenticatedRequest, query: string, academicYearId?: string): Promise<{
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
        section: string;
        grade: number | null;
        id: string;
        schoolId: string;
        name: string;
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
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        })[];
    }[] | {
        success: boolean;
        message: string;
    }>;
    update(req: AuthenticatedRequest, id: string, body: any): Promise<({
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
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        })[];
    } & {
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
    }) | {
        success: boolean;
        message: string;
    }>;
    setHomeroomTeacher(req: AuthenticatedRequest, id: string, body: any): Promise<({
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
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        })[];
    } & {
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
    }) | {
        success: boolean;
        message: string;
    }>;
    getStudentsByClass(id: string, req: AuthenticatedRequest, sectionId?: string, search?: string, page?: string, limit?: string, orderBy?: string): Promise<{
        class: {
            id: string;
            name: string;
            grade: number | null;
            section: string;
        };
        students: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    } | {
        success: boolean;
        message: string;
    }>;
    getClassStats(req: AuthenticatedRequest, id: string, sectionId?: string): Promise<{
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
    } | {
        success: boolean;
        message: string;
    }>;
}
export {};
