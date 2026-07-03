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
    } | {
        success: boolean;
        message: string;
    }>;
    findAll(req: AuthenticatedRequest, academicYearId?: string): Promise<{
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
    }[] | {
        success: boolean;
        message: string;
    }>;
    getGrades(req: AuthenticatedRequest): Promise<number[]>;
    search(req: AuthenticatedRequest, query: string, academicYearId?: string): Promise<{
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
    }[] | {
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
    }) | {
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
    delete(req: AuthenticatedRequest, id: string): Promise<{
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
    } | {
        success: boolean;
        message: string;
    }>;
}
export {};
