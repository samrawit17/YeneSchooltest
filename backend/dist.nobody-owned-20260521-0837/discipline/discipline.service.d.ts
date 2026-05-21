import { PrismaService } from '../prisma/prisma.service';
export declare class DisciplineService {
    private prisma;
    constructor(prisma: PrismaService);
    createIncident(data: {
        schoolId: string;
        studentId: string;
        reportedBy: string;
        incidentDate: Date;
        title: string;
        description: string;
        severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        actionTaken?: string;
    }): Promise<{
        student: {
            user: {
                name: string;
                email: string | null;
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
        reporter: {
            name: string;
            email: string | null;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.DisciplineStatus;
        title: string;
        description: string;
        incidentDate: Date;
        severity: import("@prisma/client").$Enums.DisciplineSeverity;
        actionTaken: string | null;
        outcome: string | null;
        reportedBy: string;
    }>;
    getIncidents(schoolId: string, filters?: {
        studentId?: string;
        severity?: string;
        status?: string;
    }): Promise<({
        student: {
            user: {
                name: string;
                email: string | null;
                avatarUrl: string | null;
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
        reporter: {
            name: string;
            email: string | null;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.DisciplineStatus;
        title: string;
        description: string;
        incidentDate: Date;
        severity: import("@prisma/client").$Enums.DisciplineSeverity;
        actionTaken: string | null;
        outcome: string | null;
        reportedBy: string;
    })[]>;
    getIncidentById(id: string, schoolId: string): Promise<({
        student: {
            user: {
                name: string;
                email: string | null;
                avatarUrl: string | null;
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
        reporter: {
            name: string;
            email: string | null;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.DisciplineStatus;
        title: string;
        description: string;
        incidentDate: Date;
        severity: import("@prisma/client").$Enums.DisciplineSeverity;
        actionTaken: string | null;
        outcome: string | null;
        reportedBy: string;
    }) | null>;
    updateIncident(id: string, schoolId: string, data: {
        title?: string;
        description?: string;
        severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
        actionTaken?: string;
        outcome?: string;
    }): Promise<{
        student: {
            user: {
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
        status: import("@prisma/client").$Enums.DisciplineStatus;
        title: string;
        description: string;
        incidentDate: Date;
        severity: import("@prisma/client").$Enums.DisciplineSeverity;
        actionTaken: string | null;
        outcome: string | null;
        reportedBy: string;
    }>;
    deleteIncident(id: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.DisciplineStatus;
        title: string;
        description: string;
        incidentDate: Date;
        severity: import("@prisma/client").$Enums.DisciplineSeverity;
        actionTaken: string | null;
        outcome: string | null;
        reportedBy: string;
    }>;
    getStudentIncidents(studentId: string, schoolId: string): Promise<({
        reporter: {
            name: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.DisciplineStatus;
        title: string;
        description: string;
        incidentDate: Date;
        severity: import("@prisma/client").$Enums.DisciplineSeverity;
        actionTaken: string | null;
        outcome: string | null;
        reportedBy: string;
    })[]>;
}
