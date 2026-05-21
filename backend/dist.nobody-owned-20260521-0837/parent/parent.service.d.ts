import { PrismaService } from '../prisma/prisma.service';
import { CredentialService } from '../credential/credential.service';
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
    constructor(prismaService: PrismaService, credentialService: CredentialService);
    createParent(createParentDto: CreateParentDto, createdById: string): Promise<{
        credentials: {
            username: string;
            temporaryPassword: string;
        };
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
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
    }): Promise<{
        total: number;
        data: ({
            user: {
                id: string;
                name: string;
                username: string | null;
                email: string | null;
                phone: string | null;
                isActive: boolean;
                avatarUrl: string | null;
            };
            children: ({
                student: {
                    user: {
                        name: string;
                    };
                    section: string | null;
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
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            address: string | null;
            userId: string;
            occupation: string | null;
        })[];
        page: number;
        limit: number;
    }>;
    listParents(schoolId: string, options: {
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        total: number;
        data: ({
            user: {
                id: string;
                name: string;
                username: string | null;
                email: string | null;
                phone: string | null;
                isActive: boolean;
                avatarUrl: string | null;
            };
            children: ({
                student: {
                    user: {
                        name: string;
                    };
                    section: string | null;
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
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            address: string | null;
            userId: string;
            occupation: string | null;
        })[];
        page: number;
        limit: number;
    }>;
    getParentById(parentId: string, schoolId: string): Promise<{
        user: {
            id: string;
            name: string;
            username: string | null;
            email: string | null;
            phone: string | null;
            isActive: boolean;
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
                academicYear: string | null;
                section: string | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                phone: string | null;
                address: string | null;
                documents: string | null;
                userId: string;
                studentId: string;
                studentCode: string;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    getParentByUserId(userId: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    updateParent(parentId: string, schoolId: string, data: UpdateParentDto): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
    getChildrenByParentUserId(parentUserId: string, schoolId: string): Promise<any[]>;
    getRelatedTeachersByParentUserId(parentUserId: string, schoolId: string): Promise<RelatedTeacherOption[]>;
    getChildByIdForParent(parentUserId: string, childId: string, schoolId: string): Promise<any>;
    deleteParent(parentId: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        address: string | null;
        userId: string;
        occupation: string | null;
    }>;
}
export {};
