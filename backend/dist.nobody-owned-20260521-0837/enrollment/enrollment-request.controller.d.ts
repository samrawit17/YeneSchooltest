import { EnrollmentRequestService } from './enrollment-request.service';
import { CreateEnrollmentRequestDto, EnrollmentQueryDto } from './dto/enrollment-request.dto';
export declare class EnrollmentRequestController {
    private readonly enrollmentService;
    constructor(enrollmentService: EnrollmentRequestService);
    getPublicSchools(): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            code: string | null;
            logoUrl: string | null;
            accentColor: string | null;
        }[];
    }>;
    createEnrollmentRequest(dto: CreateEnrollmentRequestDto): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            status: import("@prisma/client").$Enums.EnrollmentRequestStatus;
            referenceNumber: string;
        };
    }>;
    checkCapacity(schoolId: string, grade: number): Promise<{
        success: boolean;
        data: {
            exists: boolean;
            message: string;
            grade?: undefined;
            totalCapacity?: undefined;
            totalEnrolled?: undefined;
            totalAvailable?: undefined;
            isFull?: undefined;
            sections?: undefined;
        } | {
            exists: boolean;
            grade: string;
            totalCapacity: number;
            totalEnrolled: number;
            totalAvailable: number;
            isFull: boolean;
            sections: {
                name: string;
                capacity: number;
                enrolled: number;
                available: number;
            }[];
            message?: undefined;
        };
    }>;
    getAvailableGrades(schoolId: string): Promise<{
        success: boolean;
        data: {
            grade: number;
        }[];
    }>;
    getEnrollmentStatus(schoolId: string): Promise<{
        success: boolean;
        data: {
            isOpen: boolean;
            academicYearId: string | null;
            academicYearName: string | null;
            message: string;
        };
    }>;
    listRequests(query: EnrollmentQueryDto): Promise<{
        total: number;
        page: number;
        limit: number;
        data: ({
            academicYear: {
                id: string;
                name: string;
            };
            allocatedClass: {
                id: string;
                name: string;
            } | null;
            allocatedSection: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            address: string | null;
            documents: string | null;
            userId: string | null;
            academicYearId: string;
            gender: string;
            nationality: string | null;
            status: import("@prisma/client").$Enums.EnrollmentRequestStatus;
            rejectionReason: string | null;
            approvedBy: string | null;
            dateOfBirth: Date;
            firstName: string;
            middleName: string | null;
            lastName: string;
            previousSchool: string | null;
            previousGrade: number | null;
            transferCertificate: boolean;
            parentFirstName: string;
            parentLastName: string;
            parentPhone: string;
            parentEmail: string | null;
            parentRelation: string;
            requestedGrade: number;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
        })[];
        success: boolean;
    }>;
    getStats(schoolId: string, academicYearId?: string): Promise<{
        success: boolean;
        data: {
            total: number;
            pending: number;
            approved: number;
            rejected: number;
            waitlisted: number;
            byGrade: {
                grade: number;
                count: number;
            }[];
        };
    }>;
    getRequest(id: string, schoolId: string): Promise<{
        success: boolean;
        data: {
            user: {
                id: string;
                email: string | null;
            } | null;
            academicYear: {
                id: string;
                name: string;
            };
            allocatedClass: {
                section: string;
                id: string;
                name: string;
            } | null;
            allocatedSection: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            address: string | null;
            documents: string | null;
            userId: string | null;
            academicYearId: string;
            gender: string;
            nationality: string | null;
            status: import("@prisma/client").$Enums.EnrollmentRequestStatus;
            rejectionReason: string | null;
            approvedBy: string | null;
            dateOfBirth: Date;
            firstName: string;
            middleName: string | null;
            lastName: string;
            previousSchool: string | null;
            previousGrade: number | null;
            transferCertificate: boolean;
            parentFirstName: string;
            parentLastName: string;
            parentPhone: string;
            parentEmail: string | null;
            parentRelation: string;
            requestedGrade: number;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
        };
    }>;
    approveEnrollment(id: string, schoolId: string, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            enrollment: {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                phone: string | null;
                address: string | null;
                documents: string | null;
                userId: string | null;
                academicYearId: string;
                gender: string;
                nationality: string | null;
                status: import("@prisma/client").$Enums.EnrollmentRequestStatus;
                rejectionReason: string | null;
                approvedBy: string | null;
                dateOfBirth: Date;
                firstName: string;
                middleName: string | null;
                lastName: string;
                previousSchool: string | null;
                previousGrade: number | null;
                transferCertificate: boolean;
                parentFirstName: string;
                parentLastName: string;
                parentPhone: string;
                parentEmail: string | null;
                parentRelation: string;
                requestedGrade: number;
                requestedSection: string | null;
                approvedAt: Date | null;
                allocatedRollNumber: number | null;
                allocatedStudentCode: string | null;
                allocatedClassId: string | null;
                allocatedSectionId: string | null;
            };
            credentials: {
                student: {
                    userId: string;
                    username: string;
                    password: string;
                    studentCode: string;
                    class: string;
                    section: string;
                    rollNumber: number;
                };
                parent: {
                    userId: string;
                    username: string | undefined;
                    password: string;
                    phone: string;
                };
            };
        };
    }>;
    rejectEnrollment(id: string, schoolId: string, reason: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            address: string | null;
            documents: string | null;
            userId: string | null;
            academicYearId: string;
            gender: string;
            nationality: string | null;
            status: import("@prisma/client").$Enums.EnrollmentRequestStatus;
            rejectionReason: string | null;
            approvedBy: string | null;
            dateOfBirth: Date;
            firstName: string;
            middleName: string | null;
            lastName: string;
            previousSchool: string | null;
            previousGrade: number | null;
            transferCertificate: boolean;
            parentFirstName: string;
            parentLastName: string;
            parentPhone: string;
            parentEmail: string | null;
            parentRelation: string;
            requestedGrade: number;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
        };
    }>;
    waitlistEnrollment(id: string, schoolId: string): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            address: string | null;
            documents: string | null;
            userId: string | null;
            academicYearId: string;
            gender: string;
            nationality: string | null;
            status: import("@prisma/client").$Enums.EnrollmentRequestStatus;
            rejectionReason: string | null;
            approvedBy: string | null;
            dateOfBirth: Date;
            firstName: string;
            middleName: string | null;
            lastName: string;
            previousSchool: string | null;
            previousGrade: number | null;
            transferCertificate: boolean;
            parentFirstName: string;
            parentLastName: string;
            parentPhone: string;
            parentEmail: string | null;
            parentRelation: string;
            requestedGrade: number;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
        };
    }>;
    cancelEnrollment(id: string, schoolId: string): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            address: string | null;
            documents: string | null;
            userId: string | null;
            academicYearId: string;
            gender: string;
            nationality: string | null;
            status: import("@prisma/client").$Enums.EnrollmentRequestStatus;
            rejectionReason: string | null;
            approvedBy: string | null;
            dateOfBirth: Date;
            firstName: string;
            middleName: string | null;
            lastName: string;
            previousSchool: string | null;
            previousGrade: number | null;
            transferCertificate: boolean;
            parentFirstName: string;
            parentLastName: string;
            parentPhone: string;
            parentEmail: string | null;
            parentRelation: string;
            requestedGrade: number;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
        };
    }>;
    sendCredentials(id: string, schoolId: string, body: {
        sendEmail?: boolean;
        sendSms?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            student: {
                email: string | null | undefined;
            };
            note: string;
        };
    }>;
}
