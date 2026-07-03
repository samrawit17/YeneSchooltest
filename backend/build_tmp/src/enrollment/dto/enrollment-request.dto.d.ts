export declare class CreateEnrollmentRequestDto {
    schoolId: string;
    academicYearId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    faydaNumber: string;
    nationality?: string;
    email?: string;
    phone?: string;
    address?: string;
    previousSchool?: string;
    previousGrade?: number;
    transferCertificate?: boolean;
    parentFirstName: string;
    parentLastName: string;
    parentPhone: string;
    parentEmail?: string;
    parentRelation: string;
    requestedGrade: number;
    requestedStream?: string;
    documents?: Record<string, boolean>;
}
export declare class EnrollmentQueryDto {
    schoolId?: string;
    academicYearId?: string;
    status?: string;
    grade?: number;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class RejectEnrollmentDto {
    reason: string;
}
export declare class SendCredentialsDto {
    sendEmail?: boolean;
    sendSms?: boolean;
}
