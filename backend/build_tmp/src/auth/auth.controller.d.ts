import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Role } from './types/role.enum';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthController {
    private authService;
    private prismaService;
    constructor(authService: AuthService, prismaService: PrismaService);
    login(req: any, res?: Response): Promise<{
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
    registerAdmin(req: any, body: {
        email: string;
        password: string;
        name: string;
        schoolId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    registerItManager(req: any, body: {
        email: string;
        password: string;
        name: string;
        schoolId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    registerTeacher(req: any, body: {
        email: string;
        name: string;
    }): Promise<{
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
    registerStudent(req: any, body: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
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
    registerParent(req: any, body: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
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
    registerRegistrar(req: any, body: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
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
    registerStudentSelf(body: {
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
        documents?: any[];
    }, files: Express.Multer.File[]): Promise<{
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
    getUsers(req: any, role?: Role): Promise<{
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
    getTeachers(req: any, page?: string, limit?: string, search?: string): Promise<{
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
    getCurrentUser(req: any): Promise<any>;
    getUser(req: any, id: string): Promise<any>;
    updateCurrentUser(req: any, body: {
        name?: string;
        phone?: string;
        avatarUrl?: string;
        theme?: string;
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
    updateUser(req: any, id: string, body: {
        email?: string;
        password?: string;
        name?: string;
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
    uploadUserAvatar(req: any, id: string, file?: Express.Multer.File): Promise<{
        id: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
        schoolId: string | null;
        updatedAt: Date;
    }>;
    updateTheme(req: any, body: {
        theme: string;
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
    deleteUser(req: any, id: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.Role;
        email: string | null;
        schoolId: string | null;
    } | null>;
    changePassword(req: any, body: {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }): Promise<{
        mustChangePassword: boolean;
        success: boolean;
        message: string;
    }>;
    requestPasswordReset(body: {
        username: string;
    }): Promise<{
        notified: boolean;
        success: boolean;
        message: string;
    } | {
        success: boolean;
        message: string;
    }>;
    resetPassword(body: {
        token: string;
        newPassword: string;
        confirmPassword: string;
    }): Promise<{
        userId: string;
        success: boolean;
        message: string;
    }>;
    adminResetUserPassword(req: any, userId: string, body?: {
        temporaryPassword?: string;
    }): Promise<{
        userId: string;
        email: string | null;
        username: string | null;
        temporaryPassword: string;
        message: string;
        success: boolean;
    }>;
}
