import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialService } from '../credential/credential.service';
import { EnrollmentStatus } from '@prisma/client';
import { ClassService } from '../class/class.service';
import { CacheService } from '../infrastructure/cache/cache.service';
export interface CreateStudentDto {
    email?: string;
    name: string;
    schoolId: string;
    academicYear: string;
    grade: number;
    className?: string;
    stream?: string | null;
    section?: string;
    rollNumber?: string;
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
    stream?: string | null;
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
    stream?: string | null;
}
export interface StudentsByClassResult {
    class: {
        id: string;
        name: string;
        grade: number;
        section: string;
    };
    students: Array<{
        id: string;
        name: string;
        email?: string;
        phone?: string;
        gender?: string;
        avatarUrl?: string;
        studentCode?: string;
        rollNumber?: string;
        section?: any;
    }>;
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export declare class StudentService {
    private prismaService;
    private credentialService;
    private classService;
    private cacheService;
    private storageService;
    constructor(prismaService: PrismaService, credentialService: CredentialService, classService: ClassService, cacheService: CacheService, storageService: StorageService);
    private normalizeStudentStream;
    private extractGradeFromClassName;
    private resolveSectionWithCapacity;
    private getStudentListNamespace;
    private invalidateStudentCaches;
    getMyClassAssignment(studentUserId: string, schoolId: string): Promise<{
        assigned: boolean;
        classId: null;
        sectionId: null;
        className: null;
        section: null;
        academicYearId: string | null;
        academicYearName: string | null;
        grade?: undefined;
    } | {
        assigned: boolean;
        classId: string;
        sectionId: string;
        className: string | null;
        section: string | null;
        grade: number | null;
        academicYearId: string | null;
        academicYearName: string | null;
    }>;
    createStudent(createStudentDto: CreateStudentDto, createdById: string): Promise<{
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
        username: string;
        temporaryPassword: string;
    }>;
    getStudents(schoolId: string, filters?: {
        status?: EnrollmentStatus | 'ACTIVE' | 'INACTIVE';
        grade?: number;
        section?: string;
        academicYear?: string;
    }, pagination?: {
        page: number;
        limit: number;
    }, requesterId?: string, requesterRole?: string, search?: string, rollNumber?: string): Promise<{
        data: {
            grade: number | undefined;
            academicYearDisplay: string | null;
            parentName: string | null;
            parentPhone: string | null;
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
            } | undefined;
            user: {
                id: string;
                name: string;
                email: string | null;
                isActive: boolean;
            };
            parents: ({
                parent: {
                    user: {
                        name: string;
                        phone: string | null;
                    };
                } & {
                    id: string;
                    phone: string | null;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    address: string | null;
                    userId: string;
                    occupation: string | null;
                };
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                studentId: string;
                emergencyContact: boolean;
                parentId: string;
                relation: string;
                isVerified: boolean;
                isPrimary: boolean;
            })[];
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
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getStudentById(studentId: string, schoolId: string): Promise<{
        academicYearDisplay: string | null;
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
        } | null;
        enrollmentYear: string | null;
        classTeacher: any;
        class: {
            id: any;
            name: any;
            section: any;
            homeroomTeacher: any;
        } | null;
        lastLogin: Date | null;
        parents: {
            id: any;
            name: any;
            email: any;
            phone: any;
            relation: any;
            isPrimary: any;
            emergencyContact: any;
            lastLogin: any;
        }[];
        user: {
            id: string;
            name: string;
            email: string | null;
            username: string | null;
            isActive: boolean;
            avatarUrl: string | null;
            lastLoginAt: Date | null;
        };
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
    }>;
    getStudentsForIdCards(schoolId: string, filters?: {
        grade?: string;
        section?: string;
        academicYear?: string;
        search?: string;
        studentIds?: string[];
    }): Promise<{
        students: {
            studentId: string;
            studentCode: string;
            name: string;
            grade: number;
            section: string;
            academicYear: string;
            dateOfBirth: null;
            gender: string | undefined;
            bloodGroup: string | undefined;
            address: string | undefined;
            phone: string | undefined;
            email: string | undefined;
            photoUrl: string | undefined;
            rollNumber: string | undefined;
            emergencyContact: any;
        }[];
        school: {
            name: string;
            code: string | null;
            address: string;
            phone: string;
            email: string;
            logo: string | undefined;
        };
        academicYear: string;
        total: number;
    }>;
    getIdCardTemplate(schoolId: string): Promise<{
        schoolId: string;
        title: any;
        themeColor: string;
        schoolName: any;
        schoolPhone: any;
        schoolAddress: any;
        schoolLogoUrl: string;
        showEmergencyContact: boolean;
        showBloodGroup: boolean;
        useCustomBackground: boolean;
        customBackgroundUrl: any;
    }>;
    saveIdCardTemplate(schoolId: string, value: Record<string, any>): Promise<{
        schoolId: string;
        title: any;
        themeColor: string;
        schoolName: any;
        schoolPhone: any;
        schoolAddress: any;
        schoolLogoUrl: string;
        showEmergencyContact: boolean;
        showBloodGroup: boolean;
        useCustomBackground: boolean;
        customBackgroundUrl: any;
    }>;
    uploadIdCardWatermark(schoolId: string, file: Express.Multer.File): Promise<string>;
    private normalizeHexColor;
    private hexToRgbColor;
    private resolvePublicAssetPath;
    generateIdCardPdf(schoolId: string, studentId: string): Promise<Buffer>;
    generateIdCardBulkZip(schoolId: string, studentIds: string[]): Promise<Buffer>;
    updateStudent(studentId: string, schoolId: string, updateStudentDto: UpdateStudentDto): Promise<{
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
    }>;
    deleteStudent(studentId: string, schoolId: string, deletedById?: string): Promise<{
        message: string;
    }>;
    getPendingEnrollments(schoolId: string): Promise<{
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
        } | undefined;
        student: {
            id: string;
            name: string;
            email: string | null;
        };
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
    }[]>;
    approveEnrollment(enrollmentId: string, schoolId: string, approveData: ApproveEnrollmentDto): Promise<{
        message: string;
    }>;
    rejectEnrollment(enrollmentId: string, schoolId: string, rejectionReason: string): Promise<{
        message: string;
    }>;
    assignClass(studentId: string, schoolId: string, assignData: AssignClassDto): Promise<{
        message: string;
        studentId: string;
        className: string;
        stream: string | null;
        section: string;
        rollNumber: string;
    }>;
    uploadDocuments(studentId: string, schoolId: string, documents: any[]): Promise<{
        message: string;
        studentId: string;
        documentCount: number;
    }>;
    deleteDocument(studentId: string, schoolId: string, documentKey: string): Promise<{
        message: string;
        studentId: string;
        documentCount: any;
    }>;
    uploadDocumentFile(studentId: string, schoolId: string, file: Express.Multer.File, data: {
        title?: string;
        type?: string;
        description?: string;
    }): Promise<{
        message: string;
        studentId: string;
        documentCount: number;
    }>;
    getStudentsByClassProxy(classId: string, sectionId?: string, search?: string, pagination?: {
        page: number;
        limit: number;
    }, schoolId?: string): Promise<{
        class: {
            id: string;
            name: string;
            grade: number | null;
            section: string;
            homeroomTeacherId: string | null;
            sectionHomeroomTeacherId: string | null;
        };
        students: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getStudentsByHomeroomTeacher(schoolId: string, teacherId: string, requesterRole: string, academicYearId?: string): Promise<{
        data: {
            id: string;
            name: string;
            avatarUrl: string | null;
            email: string | null;
            phone: string | null;
            classId: string;
            className: string;
            section: string | null;
            grade: number | null;
            academicYear: string | null;
        }[];
    }>;
    private generateStudentCode;
    private generateTempPassword;
}
