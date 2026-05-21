import { PrismaService } from '../prisma/prisma.service';
export declare class SectionService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(schoolId?: string, classId?: string, classIds?: string[]): Promise<({
        class: {
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
        };
        _count: {
            studentClasses: number;
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
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    })[]>;
    search(schoolId: string, query: string): Promise<({
        class: {
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
        };
        _count: {
            studentClasses: number;
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
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    })[]>;
    findOne(id: string, schoolId: string): Promise<{
        class: {
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
        };
    } & {
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    }>;
    update(id: string, schoolId: string, data: {
        name?: string;
        capacity?: number;
        roomNumber?: string;
        homeroomTeacherId?: string | null;
    }): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    }>;
    delete(id: string, schoolId: string): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    }>;
    findAvailableSection(classId: string): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    } | null>;
    getNextSectionName(classId: string): Promise<string>;
}
