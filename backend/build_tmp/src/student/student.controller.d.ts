import { StudentService } from './student.service';
import type { CreateStudentDto, UpdateStudentDto, ApproveEnrollmentDto, AssignClassDto } from './student.service';
import type { Response } from 'express';
export declare class StudentController {
    private readonly studentService;
    constructor(studentService: StudentService);
    private requireSchoolContext;
    createStudent(createStudentDto: CreateStudentDto, req: any): Promise<{
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
    getStudents(req: any, classId?: string, sectionId?: string, section?: string, status?: string, grade?: string, page?: string, limit?: string, search?: string, rollNumber?: string, year?: string, academicYearId?: string): Promise<{
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
    } | {
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
    getStudentsForIdCards(req: any, grade?: string, section?: string, academicYear?: string, search?: string, studentIds?: string): Promise<{
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
    getIdCardTemplate(req: any): Promise<{
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
    saveIdCardTemplate(req: any, body: {
        template: Record<string, any>;
    }): Promise<{
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
    uploadIdCardWatermark(req: any, file: Express.Multer.File): Promise<{
        url: string;
    }>;
    generateIdCardPdf(req: any, studentId: string, res: Response): Promise<void>;
    generateIdCardsBulkPdf(req: any, body: {
        studentIds: string[];
    }, res: Response): Promise<void>;
    getStudentById(studentId: string, req: any): Promise<{
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
    updateStudent(studentId: string, updateStudentDto: UpdateStudentDto, req: any): Promise<{
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
    getMyClassAssignment(req: any): Promise<{
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
    getMyHomeroomStudents(req: any, academicYearId?: string): Promise<{
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
    getPendingEnrollments(req: any): Promise<{
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
    approveEnrollment(enrollmentId: string, approveData: ApproveEnrollmentDto, req: any): Promise<{
        message: string;
    }>;
    rejectEnrollment(enrollmentId: string, rejectionReason: string, req: any): Promise<{
        message: string;
    }>;
    assignClass(studentId: string, assignData: AssignClassDto, req: any): Promise<{
        message: string;
        studentId: string;
        className: string;
        stream: string | null;
        section: string;
        rollNumber: string;
    }>;
    uploadDocuments(studentId: string, documents: any[], req: any): Promise<{
        message: string;
        studentId: string;
        documentCount: number;
    }>;
    deleteDocument(studentId: string, documentKey: string, req: any): Promise<{
        message: string;
        studentId: string;
        documentCount: any;
    }>;
    uploadDocumentFile(studentId: string, file: Express.Multer.File, body: {
        title?: string;
        type?: string;
        description?: string;
    }, req: any): Promise<{
        message: string;
        studentId: string;
        documentCount: number;
    }>;
}
