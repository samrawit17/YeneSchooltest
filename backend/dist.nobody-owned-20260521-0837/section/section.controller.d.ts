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
    findAll(classId?: string, classIds?: string, search?: string, req?: AuthenticatedRequest): Promise<({
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
    findOne(req: AuthenticatedRequest, id: string): Promise<({
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
    }) | {
        success: boolean;
        message: string;
    }>;
    update(req: AuthenticatedRequest, id: string, body: any): Promise<{
        id: string;
        name: string;
        classId: string;
        homeroomTeacherId: string | null;
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
        capacity: number;
        roomNumber: string | null;
        isExamRoom: boolean;
    } | {
        success: boolean;
        message: string;
    }>;
    syncCapacity(req: AuthenticatedRequest): Promise<{
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
}
export {};
