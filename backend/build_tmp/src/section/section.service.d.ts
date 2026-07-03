import { PrismaService } from '../prisma/prisma.service';
export declare class SectionService {
    private prisma;
    constructor(prisma: PrismaService);
    create(schoolId: string, data: {
        classId: string;
        name: string;
        stream?: string | null;
        capacity: number;
        roomNumber?: string;
        homeroomTeacherId?: string | null;
    }): Promise<{
        class: {
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
        };
    } & {
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        stream: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    }>;
    findAll(schoolId?: string, classId?: string, classIds?: string[], academicYearId?: string): Promise<({
        _count: {
            studentClasses: number;
        };
        class: {
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
        };
        homeroomTeacher: {
            id: string;
            name: string;
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
    })[]>;
    search(schoolId: string, query: string, academicYearId?: string): Promise<({
        _count: {
            studentClasses: number;
        };
        class: {
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
        };
        homeroomTeacher: {
            id: string;
            name: string;
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
    })[]>;
    findOne(id: string, schoolId: string): Promise<{
        class: {
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
        };
    } & {
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        stream: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    }>;
    update(id: string, schoolId: string, data: {
        name?: string;
        stream?: string | null;
        capacity?: number;
        roomNumber?: string;
        homeroomTeacherId?: string | null;
    }): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        stream: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    }>;
    delete(id: string, schoolId: string): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        stream: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    }>;
    findAvailableSection(classId: string): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        stream: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    } | null>;
    getNextSectionName(classId: string): Promise<string>;
}
