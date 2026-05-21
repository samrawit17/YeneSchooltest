import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Role } from './types/role.enum';
import { PrismaService } from '../prisma/prisma.service';
declare class LoginDto {
    email?: string;
    loginIdentifier?: string;
    password: string;
}
export declare class AuthController {
    private authService;
    private prismaService;
    constructor(authService: AuthService, prismaService: PrismaService);
    login(body: LoginDto, res?: Response): Promise<{
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
    registerParent(req: any, body: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
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
    registerRegistrar(req: any, body: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
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
    getCurrentUser(req: any): Promise<any>;
    getUser(req: any, id: string): Promise<any>;
    updateCurrentUser(req: any, body: {
        name?: string;
        phone?: string;
        avatarUrl?: string;
        theme?: string;
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
    updateUser(req: any, id: string, body: {
        email?: string;
        password?: string;
        name?: string;
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
    uploadUserAvatar(req: any, id: string, file?: Express.Multer.File): Promise<{
        id: string;
        schoolId: string | null;
        updatedAt: Date;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
    }>;
    updateTheme(req: any, body: {
        theme: string;
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
    deleteUser(req: any, id: string): Promise<{
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
export {};
