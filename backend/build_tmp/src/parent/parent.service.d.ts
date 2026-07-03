import { PrismaService } from '../prisma/prisma.service';
import { CredentialService } from '../credential/credential.service';
import { EventBusService } from '../core/events/event-bus.service';
export interface FeeBreakdown {
    feeId: string;
    feeType: string;
    amount: number;
    discount: number;
    finalAmount: number;
    paid: number;
    balance: number;
    status: string;
    termId: string | null;
    termName: string;
}
export interface CreateParentDto {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    schoolId?: string;
}
export interface UpdateParentDto {
    email?: string;
    name?: string;
    phone?: string;
    address?: string;
    occupation?: string;
}
export interface LinkParentToStudentDto {
    parentProfileId: string;
    studentProfileId: string;
    relation?: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
}
export interface CreateParentAndLinkDto {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    studentProfileId: string;
    relation?: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
}
type RelatedTeacherOption = {
    teacherId: string;
    teacherName: string;
    teacherEmail: string | null;
    teacherPhone: string | null;
    studentId: string;
    childName: string;
    className: string | null;
    section: string | null;
    relationType: 'HOMEROOM' | 'TEACHING';
    subjects: string[];
};
export declare class ParentService {
    private readonly prismaService;
    private readonly credentialService;
    private readonly eventBus;
    constructor(prismaService: PrismaService, credentialService: CredentialService, eventBus: EventBusService);
    createParent(createParentDto: CreateParentDto, createdById: string): Promise<{
        credentials: {
            username: string;
            temporaryPassword: string;
        };
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    createParentAndLink(dto: CreateParentAndLinkDto, createdById: string, schoolId: string): Promise<{
        credentials: {
            username: string;
            temporaryPassword: string;
        };
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    linkParentToStudent(dto: LinkParentToStudentDto, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        emergencyContact: boolean;
        parentId: string;
        relation: string;
        isVerified: boolean;
        isPrimary: boolean;
    }>;
    unlinkParentFromStudent(parentId: string, studentId: string, schoolId: string): Promise<{
        success: boolean;
    }>;
    getParents(schoolId: string, options: {
        search?: string;
        page?: number;
        limit?: number;
        status?: string;
        children?: string;
    }): Promise<{
        total: number;
        data: ({
            user: {
                id: string;
                name: string;
                email: string | null;
                username: string | null;
                isActive: boolean;
                phone: string | null;
                avatarUrl: string | null;
            };
            children: ({
                student: {
                    user: {
                        id: string;
                        name: string;
                    };
                    section: string | null;
                    studentCode: string;
                    className: string | null;
                };
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                studentId: string;
                emergencyContact: boolean;
                parentId: string;
                relation: string;
                isVerified: boolean;
                isPrimary: boolean;
            })[];
        } & {
            id: string;
            phone: string | null;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            userId: string;
            occupation: string | null;
        })[];
        page: number;
        limit: number;
        totalPages: number;
    }>;
    listParents(schoolId: string, options: {
        search?: string;
        page?: number;
        limit?: number;
        status?: string;
        children?: string;
    }): Promise<{
        total: number;
        data: ({
            user: {
                id: string;
                name: string;
                email: string | null;
                username: string | null;
                isActive: boolean;
                phone: string | null;
                avatarUrl: string | null;
            };
            children: ({
                student: {
                    user: {
                        id: string;
                        name: string;
                    };
                    section: string | null;
                    studentCode: string;
                    className: string | null;
                };
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                studentId: string;
                emergencyContact: boolean;
                parentId: string;
                relation: string;
                isVerified: boolean;
                isPrimary: boolean;
            })[];
        } & {
            id: string;
            phone: string | null;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            userId: string;
            occupation: string | null;
        })[];
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getParentById(parentId: string, schoolId: string): Promise<{
        user: {
            id: string;
            name: string;
            email: string | null;
            username: string | null;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            lastLoginAt: Date | null;
        };
        children: ({
            student: {
                user: {
                    id: string;
                    name: string;
                };
            } & {
                id: string;
                phone: string | null;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                deletedById: string | null;
                documents: string | null;
                academicYear: string | null;
                section: string | null;
                address: string | null;
                userId: string;
                studentId: string;
                stream: string | null;
                studentCode: string;
                faydaNumber: string | null;
                enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                className: string | null;
                rollNumber: string | null;
                gender: string | null;
                motherName: string | null;
                motherPhone: string | null;
                emergencyContact: string | null;
                medicalInfo: string | null;
                nationality: string | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            emergencyContact: boolean;
            parentId: string;
            relation: string;
            isVerified: boolean;
            isPrimary: boolean;
        })[];
    } & {
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    getParentByUserId(userId: string, schoolId: string): Promise<{
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    updateParent(parentId: string, schoolId: string, data: UpdateParentDto): Promise<{
        user: {
            id: string;
            name: string;
            email: string | null;
            username: string | null;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            lastLoginAt: Date | null;
        };
        children: ({
            student: {
                user: {
                    id: string;
                    name: string;
                };
            } & {
                id: string;
                phone: string | null;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                deletedById: string | null;
                documents: string | null;
                academicYear: string | null;
                section: string | null;
                address: string | null;
                userId: string;
                studentId: string;
                stream: string | null;
                studentCode: string;
                faydaNumber: string | null;
                enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                className: string | null;
                rollNumber: string | null;
                gender: string | null;
                motherName: string | null;
                motherPhone: string | null;
                emergencyContact: string | null;
                medicalInfo: string | null;
                nationality: string | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            emergencyContact: boolean;
            parentId: string;
            relation: string;
            isVerified: boolean;
            isPrimary: boolean;
        })[];
    } & {
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    getChildrenByParentUserId(parentUserId: string, schoolId: string): Promise<any[]>;
    getRelatedTeachersByParentUserId(parentUserId: string, schoolId: string): Promise<RelatedTeacherOption[]>;
    getChildByIdForParent(parentUserId: string, childId: string, schoolId: string): Promise<any>;
    deleteParent(parentId: string, schoolId: string): Promise<{
        id: string;
        phone: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
}
export {};
