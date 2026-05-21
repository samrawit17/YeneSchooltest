import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentStatus } from '@prisma/client';
import { AutoAssignmentService } from '../auto-assignment/auto-assignment.service';
import { CredentialService } from '../credential/credential.service';
export interface CreateStudentDto {
    email: string;
    name: string;
    academicYear: string;
    gradeId: string;
    gender?: string;
    address?: string;
    phone?: string;
    motherName?: string;
    motherPhone?: string;
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
}
export interface UpdateStudentDto {
    name?: string;
    gender?: string;
    address?: string;
    phone?: string;
    motherName?: string;
    motherPhone?: string;
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
}
export interface ApproveEnrollmentDto {
    className: string;
    section: string;
    rollNumber: string;
}
export interface AssignClassDto {
    className: string;
    section: string;
    rollNumber: string;
    classId?: string;
    sectionId?: string;
}
export declare class RegistrarService {
    private prismaService;
    private autoAssignmentService;
    private credentialService;
    constructor(prismaService: PrismaService, autoAssignmentService: AutoAssignmentService, credentialService: CredentialService);
    createStudent(createStudentDto: CreateStudentDto, schoolId: string, createdById: string): Promise<{
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
        studentCode: string;
        username: string;
        temporaryPassword: string;
    }>;
    getStudents(schoolId: string, filters?: {
        status?: EnrollmentStatus;
        grade?: number;
    }): Promise<{
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
        } | undefined;
        user: {
            id: string;
            name: string;
            email: string | null;
            isActive: boolean;
        };
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
    }[]>;
    getStudentById(studentId: string, schoolId: string): Promise<{
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
        } | null;
        user: {
            id: string;
            name: string;
            email: string | null;
            isActive: boolean;
        };
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
    }>;
    updateStudent(studentId: string, schoolId: string, updateStudentDto: UpdateStudentDto): Promise<{
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
    }>;
    getPendingEnrollments(schoolId: string): Promise<{
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
        } | undefined;
        student: {
            id: string;
            name: string;
            email: string | null;
        };
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
    }[]>;
    getEnrollments(schoolId: string, status?: string, page?: number): Promise<{
        data: {
            user: {
                id: string;
                name: string;
                email: string | null;
                phone: string | null;
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
            } | undefined;
            student: {
                id: string;
                name: string;
                email: string | null;
                phone: string | null;
            };
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
        }[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    approveEnrollment(enrollmentId: string, schoolId: string, approveData: ApproveEnrollmentDto): Promise<{
        message: string;
    }>;
    approveEnrollmentAuto(enrollmentId: string, schoolId: string): Promise<import("../auto-assignment/auto-assignment.service").AutoAssignmentResult>;
    rejectEnrollment(enrollmentId: string, schoolId: string, rejectionReason: string): Promise<{
        message: string;
    }>;
    assignClass(studentId: string, schoolId: string, assignData: AssignClassDto): Promise<{
        message: string;
        studentId: string;
        className: string;
        section: string;
        rollNumber: string;
    }>;
    uploadDocuments(studentId: string, schoolId: string, documents: any[]): Promise<{
        message: string;
        studentId: string;
        documentCount: number;
    }>;
    private generateStudentCode;
    private generateTempPassword;
}
