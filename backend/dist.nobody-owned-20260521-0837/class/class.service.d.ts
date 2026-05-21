import { PrismaService } from '../prisma/prisma.service';
export declare class ClassService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        schoolId: string;
        academicYearId: string;
        grade: number;
        section: string;
        name?: string;
    }): Promise<{
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
    }>;
    findAll(schoolId: string, academicYearId?: string): Promise<{
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
    }[]>;
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
    }>;
    findByGradeAndYear(schoolId: string, academicYearId: string, grade: number): Promise<({
        sections: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        }[];
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
    }) | null>;
    update(id: string, schoolId: string, data: {
        academicYearId?: string;
        grade?: number;
        name?: string;
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
    }>;
    delete(id: string, schoolId: string): Promise<{
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
    }>;
    getOrCreate(schoolId: string, academicYearId: string, grade: number, section: string): Promise<({
        sections: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        }[];
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
    }) | null>;
    getGrades(schoolId?: string): Promise<number[]>;
    search(schoolId: string, query: string, academicYearId?: string): Promise<{
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
    }[]>;
    getStudentsByClass(schoolId: string, classId: string, sectionId?: string, search?: string, pagination?: {
        page: number;
        limit: number;
        orderBy?: string;
    }): Promise<{
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
    }>;
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
