import { HttpStatus } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { ApproveEnrollmentDto, RejectEnrollmentDto } from './dto';
export declare class EnrollmentController {
    private readonly enrollmentService;
    constructor(enrollmentService: EnrollmentService);
    enrollmentLanding(enrollmentKey: string): Promise<{
        error: string;
        message: string;
        statusCode: HttpStatus;
        success?: undefined;
        school?: undefined;
        enrollmentToken?: undefined;
        frontendUrl?: undefined;
    } | {
        success: boolean;
        school: {
            id: string;
            name: string;
        };
        enrollmentToken: string;
        frontendUrl: string;
        error?: undefined;
        message?: undefined;
        statusCode?: undefined;
    }>;
    verifyToken(token: string): {
        valid: boolean;
        schoolId?: string;
        error?: string;
    };
    approveEnrollment(dto: ApproveEnrollmentDto): Promise<{
        success: boolean;
        message: string;
        data: {
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
    }>;
    rejectEnrollment(dto: RejectEnrollmentDto): Promise<{
        success: boolean;
        message: string;
        data: {
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
    }>;
}
