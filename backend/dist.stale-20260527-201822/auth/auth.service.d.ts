import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from './types/role.enum';
import { CredentialService } from '../credential/credential.service';
import { NotificationService } from '../notification/notification.service';
export declare const JWT_COOKIE_NAME = "Authentication";
export declare class AuthService {
    private prismaService;
    private jwtService;
    private credentialService;
    private notificationService;
    constructor(prismaService: PrismaService, jwtService: JwtService, credentialService: CredentialService, notificationService: NotificationService);
    private normalizeUsername;
    validateUser(loginIdentifier: string, password: string): Promise<any>;
    private getUsersWithRoleTextFilter;
    login(user: any, res?: Response): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            username: any;
            name: any;
            role: any;
            schoolId: any;
            calendarType: any;
            theme: any;
            phone: any;
            avatarUrl: any;
            mustChangePassword: any;
            createdAt: any;
            updatedAt: any;
            permissions: any;
        };
    }>;
    logout(res?: Response): Promise<{
        message: string;
    }>;
    registerAdmin(email: string, password: string, name: string, schoolId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    registerItManager(email: string, password: string, name: string, schoolId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    registerTeacher(email: string, name: string, schoolId: string): Promise<{
        user: {
            id: string;
            email: string | null;
            username: string | null;
            name: string;
            role: import("@prisma/client").$Enums.Role;
        };
        credentials: {
            username: string;
            temporaryPassword: string;
        };
    }>;
    registerStudent(email: string, password: string, name: string, schoolId: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        username: string | null;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        lastLoginAt: Date | null;
        mustChangePassword: boolean;
    }>;
    registerParent(email: string, password: string, name: string, schoolId: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        username: string | null;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        lastLoginAt: Date | null;
        mustChangePassword: boolean;
    }>;
    registerRegistrar(email: string, password: string, name: string, schoolId: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        username: string | null;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        lastLoginAt: Date | null;
        mustChangePassword: boolean;
    }>;
    registerStudentSelf(studentData: {
        email: string;
        password: string;
        name: string;
        schoolId: string;
        academicYear: string;
        gradeId: string;
        gender?: string;
        address?: string;
        phone?: string;
        emergencyContact?: {
            name: string;
            phone: string;
            relationship: string;
        };
        guardianName?: string;
        guardianPhone?: string;
        guardianEmail?: string;
        photo?: string;
        documents?: {
            type: string;
            fileUrl: string;
            title?: string;
        }[];
    }): Promise<{
        user: {
            id: string;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            username: string | null;
            email: string | null;
            phone: string | null;
            isActive: boolean;
            password: string;
            role: import("@prisma/client").$Enums.Role;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            lastLoginAt: Date | null;
            mustChangePassword: boolean;
        };
        studentProfile: {
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
        enrollment: {
            academicYear: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            documents: string | null;
            studentId: string;
            gradeId: string | null;
            status: import("@prisma/client").$Enums.EnrollmentStatus;
            metadata: string | null;
            rejectionReason: string | null;
        };
        message: string;
    }>;
    private generateStudentCode;
    getUsers(role?: Role, roles?: Role[], filters?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{
        data: {
            id: string;
            email: string;
            username: string | null;
            name: string;
            role: string;
            schoolId: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    } | {
        data: {
            id: string;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            username: string | null;
            email: string | null;
            phone: string | null;
            isActive: boolean;
            role: import("@prisma/client").$Enums.Role;
            avatarUrl: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUsersBySchool(schoolId: string, role?: Role, roles?: Role[], filters?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{
        data: {
            id: string;
            email: string;
            username: string | null;
            name: string;
            role: string;
            schoolId: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    } | {
        data: {
            id: string;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            username: string | null;
            email: string | null;
            phone: string | null;
            isActive: boolean;
            role: import("@prisma/client").$Enums.Role;
            avatarUrl: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUserById(id: string): Promise<{
        teacherProfile: {
            department: {
                name: string;
            } | null;
            id: string;
            employeeId: string;
            designation: string | null;
            qualification: string | null;
            specialization: string | null;
            hireDate: Date | null;
            experienceYears: number | null;
        } | null;
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        lastLoginAt: Date | null;
    } | null>;
    updateUser(id: string, data: {
        email?: string;
        password?: string;
        name?: string;
        theme?: string;
        phone?: string;
        avatarUrl?: string;
    }): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
    }>;
    uploadUserAvatar(targetUserId: string, requester: {
        id: string;
        role: Role | string;
        schoolId?: string | null;
    }, file?: Express.Multer.File): Promise<{
        id: string;
        schoolId: string | null;
        updatedAt: Date;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
    }>;
    deleteUser(id: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        username: string | null;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        lastLoginAt: Date | null;
        mustChangePassword: boolean;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        mustChangePassword: boolean;
    }>;
    requestPasswordReset(username: string): Promise<{
        notified: boolean;
    }>;
    resetPasswordWithToken(token: string, newPassword: string): Promise<{
        userId: string;
    }>;
    adminResetUserPassword(targetUserId: string, adminUserId: string, adminSchoolId: string, adminRole: Role, requestedTemporaryPassword?: string): Promise<{
        userId: string;
        email: string | null;
        username: string | null;
        temporaryPassword: string;
        message: string;
    }>;
}
