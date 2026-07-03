import { SectionService } from './section.service';
import { Role } from '../auth/types/role.enum';
import { PrismaService } from '../prisma/prisma.service';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        role: Role;
        schoolId?: string;
    };
}
export declare class SectionController {
    private sectionService;
    private prismaService;
    constructor(sectionService: SectionService, prismaService: PrismaService);
    create(req: AuthenticatedRequest, body: {
        classId: string;
        name: string;
        stream?: string;
        capacity: number;
        roomNumber?: string;
        homeroomTeacherId?: string;
    }): Promise<({
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
    }) | {
        success: boolean;
        message: string;
    }>;
    findAll(classId?: string, classIds?: string, search?: string, academicYearId?: string, req?: AuthenticatedRequest): Promise<({
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
    findOne(req: AuthenticatedRequest, id: string): Promise<({
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
    }) | {
        success: boolean;
        message: string;
    }>;
    syncCapacity(req: AuthenticatedRequest, academicYearId?: string): Promise<{
        status: string;
        message: string;
        updatedCount?: undefined;
        newCapacity?: undefined;
    } | {
        status: string;
        message: string;
        updatedCount: number;
        newCapacity: number;
    }>;
    update(req: AuthenticatedRequest, id: string, body: any): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        stream: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    } | {
        success: boolean;
        message: string;
    }>;
    setHomeroomTeacher(id: string, body: any, req: AuthenticatedRequest): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        stream: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    } | {
        success: boolean;
        message: string;
    }>;
    delete(req: AuthenticatedRequest, id: string): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
        stream: string | null;
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    } | {
        success: boolean;
        message: string;
    }>;
}
export {};
