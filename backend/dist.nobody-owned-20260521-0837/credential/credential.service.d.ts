import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/types/role.enum';
export interface StudentIdComponents {
    schoolCode: string;
    year: string;
    sequence: number;
}
export interface StaffIdComponents {
    schoolCode: string;
    roleType: 'T' | 'A' | 'P';
    sequence: number;
}
export interface GeneratedCredentials {
    username: string;
    temporaryPassword: string;
    hashedPassword: string;
}
export interface BulkCredentialResult {
    id: string;
    name: string;
    email?: string | null;
    username: string;
    temporaryPassword: string;
    role: Role;
}
export interface CredentialSlip {
    schoolLogo: string | null;
    schoolName: string;
    schoolCode: string | null;
    studentName: string;
    admissionNumber: string;
    username: string;
    temporaryPassword: string;
    instructions: string[];
    generatedAt: Date;
}
export declare class CredentialService {
    private prismaService;
    constructor(prismaService: PrismaService);
    generateStudentAdmissionNumber(schoolId: string, academicYear: string): Promise<string>;
    generateTemporaryPassword(length?: number): string;
    hashPassword(password: string): Promise<string>;
    generateStudentCredentials(schoolId: string, academicYear: string): Promise<GeneratedCredentials>;
    generateStaffCredentials(schoolId: string, role: Role.TEACHER | Role.ADMIN | Role.IT_MANAGER | Role.REGISTRAR | Role.FINANCE | Role.PARENT, academicYear?: string): Promise<GeneratedCredentials>;
    generateBulkStudentCredentials(schoolId: string, academicYear: string, count: number): Promise<GeneratedCredentials[]>;
    generateCredentialSlips(schoolId: string, credentials: BulkCredentialResult[]): Promise<CredentialSlip[]>;
    exportToCSV(credentials: BulkCredentialResult[]): string;
    validatePasswordStrength(password: string): {
        isValid: boolean;
        errors: string[];
    };
    isUsernameUnique(schoolId: string, username: string): Promise<boolean>;
    ensureUniqueUsername(schoolId: string, baseUsername: string): Promise<string>;
    createPasswordResetToken(userId: string): Promise<string>;
    validatePasswordResetToken(token: string): Promise<string | null>;
    markTokenAsUsed(token: string): Promise<void>;
    logCredentialGeneration(schoolId: string, generatedById: string, targetType: string, targetCount: number, academicYear: string | null, usernames: string[]): Promise<void>;
    private getOrCreateSchoolYearCounter;
    private extractYearFromAcademicYear;
    private getRoleTypePrefix;
    private padSequence;
    private shuffleString;
    generateStaffId(schoolId: string, role: Role, academicYear?: string): Promise<string>;
    generateSectionRollNumber(schoolId: string, className: string, sectionName: string, studentName?: string, prismaArg?: any): Promise<string>;
    assignRollNumbersByAlphabet(schoolId: string, academicYear: string): Promise<{
        updated: number;
    }>;
    createPendingCredential(data: {
        schoolId: string;
        userId: string;
        name: string;
        email?: string | null;
        username: string;
        temporaryPassword: string;
        role: string;
    }, prisma?: Pick<PrismaService, 'pendingCredential'>): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        name: string;
        username: string;
        temporaryPassword: string;
        email: string | null;
        role: string;
        userId: string | null;
        expiresAt: Date;
        isSent: boolean;
        sentAt: Date | null;
        sentVia: string | null;
        batchId: string | null;
    }>;
    private resolveAcademicYearValue;
    listCredentials(schoolId: string, options: {
        status: 'pending' | 'sent' | 'all';
        role?: string;
        search?: string;
        page: number;
        limit: number;
    }): Promise<{
        data: ({
            user: {
                id: string;
                isActive: boolean;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            name: string;
            username: string;
            temporaryPassword: string;
            email: string | null;
            role: string;
            userId: string | null;
            expiresAt: Date;
            isSent: boolean;
            sentAt: Date | null;
            sentVia: string | null;
            batchId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getCredentialStats(schoolId: string): Promise<{
        total: number;
        pending: number;
        sent: number;
        byRole: {
            role: string;
            count: number;
        }[];
    }>;
    markCredentialSent(id: string, schoolId: string, sentVia?: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        name: string;
        username: string;
        temporaryPassword: string;
        email: string | null;
        role: string;
        userId: string | null;
        expiresAt: Date;
        isSent: boolean;
        sentAt: Date | null;
        sentVia: string | null;
        batchId: string | null;
    }>;
    deletePendingCredential(id: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        name: string;
        username: string;
        temporaryPassword: string;
        email: string | null;
        role: string;
        userId: string | null;
        expiresAt: Date;
        isSent: boolean;
        sentAt: Date | null;
        sentVia: string | null;
        batchId: string | null;
    }>;
}
