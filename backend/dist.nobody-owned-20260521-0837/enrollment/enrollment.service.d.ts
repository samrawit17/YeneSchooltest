import { PrismaService } from '../prisma/prisma.service';
import { SchoolService } from '../school/school.service';
import { AcademicYearService } from '../academic-year/academic-year.service';
import { NotificationService } from '../notification/notification.service';
import { EnrollmentStatus } from '@prisma/client';
export declare class EnrollmentService {
    private readonly prisma;
    private readonly schoolService;
    private readonly academicYearService;
    private readonly notificationService;
    constructor(prisma: PrismaService, schoolService: SchoolService, academicYearService: AcademicYearService, notificationService: NotificationService);
    resolveSchoolByKey(enrollmentKey: string): Promise<{
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
    }>;
    generateEnrollmentToken(schoolId: string): string;
    verifyEnrollmentToken(token: string): {
        valid: boolean;
        schoolId?: string;
        error?: string;
    };
    getSchoolIdFromToken(token: string): string;
    approveEnrollment(enrollmentId: string, schoolId: string): Promise<{
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
    }>;
    private isAutoSectionAssignmentEnabled;
    private findClassForGrade;
    private findAvailableSection;
    getEnrollmentById(enrollmentId: string): Promise<({
        school: {
            id: string;
            name: string;
        };
        gradeLevel: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            level: number;
        } | null;
        student: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
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
    }) | null>;
    getEnrollmentsBySchool(schoolId: string, status?: EnrollmentStatus): Promise<({
        gradeLevel: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            level: number;
        } | null;
        student: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
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
    })[]>;
    createEnrollment(data: {
        studentId: string;
        schoolId: string;
        academicYear: string;
        gradeId?: string;
        documents?: any;
        metadata?: any;
    }): Promise<{
        gradeLevel: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            level: number;
        } | null;
        student: {
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
    } & {
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
    }>;
    rejectEnrollment(enrollmentId: string, schoolId: string, reason: string): Promise<{
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
    }>;
}
