import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from './types/role.enum';
import { CredentialService } from '../credential/credential.service';
import { EventBusService } from '../core/events/event-bus.service';
import { NotificationService } from '../notification/notification.service';
import { StorageService } from '../storage/storage.service';
export declare const JWT_COOKIE_NAME = "Authentication";
export declare class AuthService {
    private prismaService;
    private jwtService;
    private credentialService;
    private notificationService;
    private eventBus;
    private storageService;
    constructor(prismaService: PrismaService, jwtService: JwtService, credentialService: CredentialService, notificationService: NotificationService, eventBus: EventBusService, storageService: StorageService);
    private normalizeUsername;
    validateUser(loginIdentifier: string, password: string, schoolId?: string): Promise<any>;
    private getUsersWithRoleTextFilter;
    login(user: any, res?: Response): Promise<{
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
    private parseJwtCookieMaxAge;
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
        name: string;
        role: import("@prisma/client").$Enums.Role;
        email: string | null;
        username: string | null;
        password: string;
        isActive: boolean;
        phone: string | null;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        language: string;
        lastLoginAt: Date | null;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        deletedById: string | null;
        mustChangePassword: boolean;
    }>;
    registerParent(email: string, password: string, name: string, schoolId: string): Promise<{
        id: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        email: string | null;
        username: string | null;
        password: string;
        isActive: boolean;
        phone: string | null;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        language: string;
        lastLoginAt: Date | null;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        deletedById: string | null;
        mustChangePassword: boolean;
    }>;
    registerRegistrar(email: string, password: string, name: string, schoolId: string): Promise<{
        id: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        email: string | null;
        username: string | null;
        password: string;
        isActive: boolean;
        phone: string | null;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        language: string;
        lastLoginAt: Date | null;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        deletedById: string | null;
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
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            password: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            language: string;
            lastLoginAt: Date | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
            mustChangePassword: boolean;
        };
        studentProfile: {
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
        enrollment: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
            documents: string | null;
            academicYear: string;
            grade: number | null;
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
            teacherProfile: {
                id: string;
                employeeId: string | null;
                designation: string | null;
                specialization: string | null;
            } | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    } | {
        data: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            teacherProfile: {
                id: string;
                employeeId: string;
                designation: string | null;
                specialization: string | null;
            } | null;
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
            teacherProfile: {
                id: string;
                employeeId: string | null;
                designation: string | null;
                specialization: string | null;
            } | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    } | {
        data: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            teacherProfile: {
                id: string;
                employeeId: string;
                designation: string | null;
                specialization: string | null;
            } | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUserById(id: string): Promise<{
        id: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        email: string | null;
        isActive: boolean;
        phone: string | null;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        lastLoginAt: Date | null;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        teacherProfile: {
            id: string;
            department: {
                name: string;
            } | null;
            employeeId: string;
            designation: string | null;
            qualification: string | null;
            specialization: string | null;
            hireDate: Date | null;
            experienceYears: number | null;
        } | null;
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
        name: string;
        role: import("@prisma/client").$Enums.Role;
        email: string | null;
        isActive: boolean;
        phone: string | null;
        avatarUrl: string | null;
        theme: import("@prisma/client").$Enums.ThemePreference;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    uploadUserAvatar(targetUserId: string, requester: {
        id: string;
        role: Role | string;
        schoolId?: string | null;
    }, file?: Express.Multer.File): Promise<{
        id: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
        schoolId: string | null;
        updatedAt: Date;
    }>;
    deleteUser(id: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.Role;
        email: string | null;
        schoolId: string | null;
    } | null>;
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
