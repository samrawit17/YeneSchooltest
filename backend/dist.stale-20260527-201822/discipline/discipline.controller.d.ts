import { DisciplineService } from './discipline.service';
interface CreateIncidentDto {
    schoolId: string;
    studentId: string;
    incidentDate: Date;
    title: string;
    description: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    actionTaken?: string;
}
interface UpdateIncidentDto {
    title?: string;
    description?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
    actionTaken?: string;
    outcome?: string;
}
export declare class DisciplineController {
    private readonly disciplineService;
    constructor(disciplineService: DisciplineService);
    createIncident(req: any, dto: CreateIncidentDto & {
        reportedBy: string;
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
    getIncidents(req: any, studentId?: string, severity?: string, status?: string): Promise<({
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
    getStudentIncidents(req: any, studentId: string): Promise<({
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
    getIncident(req: any, id: string): Promise<({
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
    updateIncident(req: any, id: string, dto: UpdateIncidentDto): Promise<{
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
    deleteIncident(req: any, id: string): Promise<{
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
}
export {};
