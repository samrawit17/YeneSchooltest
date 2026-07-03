import { TeacherService } from './teacher.service';
export declare class TeacherController {
    private readonly teacherService;
    constructor(teacherService: TeacherService);
    getTeachers(req: any, page?: string, limit?: string, search?: string, status?: string, classId?: string, sectionId?: string, subject?: string): Promise<{
        data: {
            id: string;
            userId: string;
            email: string | null;
            name: string;
            staffId: string;
            phone: string;
            isActive: boolean;
            employmentStatus: string;
            designation: string;
            specialization: string;
            subjects: string[];
            hireDate: Date | null | undefined;
            createdAt: Date;
            avatarUrl: string;
            assignedClasses: string[];
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getTeacherById(teacherId: string, req: any): Promise<{
        id: string;
        userId: string;
        email: string | null;
        username: string | null;
        name: string;
        staffId: string;
        phone: string;
        isActive: boolean;
        employmentStatus: string;
        designation: string;
        specialization: string;
        hireDate: Date | null | undefined;
        department: string;
        createdAt: Date;
        lastLoginAt: Date | null;
        avatarUrl: string;
    }>;
    getMyAssignments(req: any, academicYear?: string): Promise<{
        homeroomClasses: {
            studentCount: number;
            id: string;
            name: string;
            grade: number | null;
        }[];
        homeroomSections: {
            studentCount: number;
            id: string;
            name: string;
            class: {
                id: string;
                name: string;
                grade: number | null;
            };
            capacity: number;
            roomNumber: string | null;
        }[];
        teachingAssignments: {
            id: string;
            class: {
                id: string;
                name: string;
                section: string;
                grade: number | null;
            };
            section: {
                id: string;
                name: string;
            };
            subject: {
                id: string;
                name: string;
                code: string | null;
            };
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }[];
        teachingClasses: {
            id: string;
            class: {
                id: string;
                name: string;
                grade: number | null;
                section: string | null;
            };
            section: {
                id: string;
                name: string;
                roomNumber: string | null;
            } | null;
            subject: {
                id: string;
                name: string;
                code: string | null;
            } | null;
            room: string | null;
            studentCount: number;
            schedules: string[];
        }[];
    }>;
    getTeacherAssignments(teacherId: string, req: any): Promise<{
        homeroomClasses: {
            studentCount: number;
            id: string;
            name: string;
            grade: number | null;
        }[];
        homeroomSections: {
            studentCount: number;
            id: string;
            name: string;
            class: {
                id: string;
                name: string;
                grade: number | null;
            };
            capacity: number;
            roomNumber: string | null;
        }[];
        teachingAssignments: {
            id: string;
            class: {
                id: string;
                name: string;
                section: string;
                grade: number | null;
            };
            section: {
                id: string;
                name: string;
            };
            subject: {
                id: string;
                name: string;
                code: string | null;
            };
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }[];
        teachingClasses: {
            id: string;
            class: {
                id: string;
                name: string;
                grade: number | null;
                section: string | null;
            };
            section: {
                id: string;
                name: string;
                roomNumber: string | null;
            } | null;
            subject: {
                id: string;
                name: string;
                code: string | null;
            } | null;
            room: string | null;
            studentCount: number;
            schedules: string[];
        }[];
    }>;
}
