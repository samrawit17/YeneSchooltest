import { EnrollmentRequestService } from './enrollment-request.service';
import { CreateEnrollmentRequestDto, EnrollmentQueryDto } from './dto/enrollment-request.dto';
export declare class EnrollmentRequestController {
    private readonly enrollmentService;
    constructor(enrollmentService: EnrollmentRequestService);
    private getAuthenticatedSchoolId;
    getPublicSchools(): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            code: string | null;
            publicUrlSlug: string;
            logoUrl: string | null;
            accentColor: string | null;
            loginImageUrl: string | null;
            schoolStartsAt: string | null;
            registrationStartsAt: string | null;
            isMaintenance: boolean;
        }[];
    }>;
    getPublicSchoolById(id: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            id: string;
            name: string;
            code: string | null;
            publicUrlSlug: string;
            logoUrl: string | null;
            email: string;
            phone: string | null;
            address: string | null;
            isActive: boolean;
            accentColor: string | null;
            loginImageUrl: string | null;
            schoolStartsAt: string | null;
            registrationStartsAt: string | null;
            isMaintenance: boolean;
        };
        message?: undefined;
    }>;
    getPublicSchoolByUrlSlug(slug: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            id: string;
            name: string;
            code: string | null;
            publicUrlSlug: string;
            logoUrl: string | null;
            email: string;
            phone: string | null;
            address: string | null;
            isActive: boolean;
            accentColor: string | null;
            loginImageUrl: string | null;
            schoolStartsAt: string | null;
            registrationStartsAt: string | null;
            isMaintenance: boolean;
        };
        message?: undefined;
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
    listRequests(query: EnrollmentQueryDto, req: any): Promise<{
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
            email: string | null;
            phone: string | null;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            documents: string | null;
            address: string | null;
            userId: string | null;
            academicYearId: string;
            faydaNumber: string | null;
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
            requestedStream: string | null;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
        })[];
        success: boolean;
    }>;
    getStats(req: any, academicYearId?: string): Promise<{
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
    getRequest(id: string, req: any): Promise<{
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
                id: string;
                name: string;
                section: string;
            } | null;
            allocatedSection: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            documents: string | null;
            address: string | null;
            userId: string | null;
            academicYearId: string;
            faydaNumber: string | null;
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
            requestedStream: string | null;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
        };
    }>;
    approveEnrollment(id: string, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            enrollment: {
                id: string;
                email: string | null;
                phone: string | null;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                documents: string | null;
                address: string | null;
                userId: string | null;
                academicYearId: string;
                faydaNumber: string | null;
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
                requestedStream: string | null;
                requestedSection: string | null;
                approvedAt: Date | null;
                allocatedClassId: string | null;
                allocatedSectionId: string | null;
                allocatedRollNumber: number | null;
                allocatedStudentCode: string | null;
            };
            credentials: {
                student: {
                    userId: string;
                    username: string;
                    password: string;
                    studentCode: string;
                    class: string;
                    section: any;
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
    rejectEnrollment(id: string, reason: string, req: any): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            id: string;
            email: string | null;
            phone: string | null;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            documents: string | null;
            address: string | null;
            userId: string | null;
            academicYearId: string;
            faydaNumber: string | null;
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
            requestedStream: string | null;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
        };
    }>;
    waitlistEnrollment(id: string, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            email: string | null;
            phone: string | null;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            documents: string | null;
            address: string | null;
            userId: string | null;
            academicYearId: string;
            faydaNumber: string | null;
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
            requestedStream: string | null;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
        };
    }>;
    cancelEnrollment(id: string, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            id: string;
            email: string | null;
            phone: string | null;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            documents: string | null;
            address: string | null;
            userId: string | null;
            academicYearId: string;
            faydaNumber: string | null;
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
            requestedStream: string | null;
            requestedSection: string | null;
            approvedAt: Date | null;
            allocatedClassId: string | null;
            allocatedSectionId: string | null;
            allocatedRollNumber: number | null;
            allocatedStudentCode: string | null;
        };
    }>;
    sendCredentials(id: string, body: {
        sendEmail?: boolean;
        sendSms?: boolean;
    }, req: any): Promise<{
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
