import { PrismaService } from '../prisma/prisma.service';
import { SchoolService } from '../school/school.service';
import { AcademicYearService } from '../academic-year/academic-year.service';
import { EventBusService } from '../core/events/event-bus.service';
import { EnrollmentStatus } from '@prisma/client';
export declare class EnrollmentService {
    private readonly prisma;
    private readonly schoolService;
    private readonly academicYearService;
    private readonly eventBus;
    constructor(prisma: PrismaService, schoolService: SchoolService, academicYearService: AcademicYearService, eventBus: EventBusService);
    resolveSchoolByKey(enrollmentKey: string): Promise<{
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
    }>;
    generateEnrollmentToken(schoolId: string): string;
    verifyEnrollmentToken(token: string): {
        valid: boolean;
        schoolId?: string;
        error?: string;
    };
    getSchoolIdFromToken(token: string): string;
    approveEnrollment(enrollmentId: string, schoolId: string): Promise<{
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
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            level: number;
        } | null;
        student: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
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
    }) | null>;
    getEnrollmentsBySchool(schoolId: string, status?: EnrollmentStatus): Promise<({
        gradeLevel: {
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            level: number;
        } | null;
        student: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
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
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            level: number;
        } | null;
        student: {
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
    } & {
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
    }>;
    rejectEnrollment(enrollmentId: string, schoolId: string, reason: string): Promise<{
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
    }>;
}
