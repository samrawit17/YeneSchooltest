export declare class CreateFeeStructureDto {
    schoolId: string;
    academicYearId: string;
    termId?: string;
    feeType: string;
    amount: number;
    grade?: number;
    semester?: number;
    description?: string;
}
export declare class UpdateFeeStructureDto {
    feeType?: string;
    amount?: number;
    grade?: number | null;
    semester?: number | null;
    description?: string | null;
    isActive?: boolean;
}
export declare class GenerateStudentFeesDto {
    schoolId: string;
    academicYearId: string;
    termId?: string;
    grade?: number;
}
export declare class StudentFeesQueryDto {
    schoolId: string;
    academicYearId?: string;
    termId?: string;
    studentId?: string;
    grade?: number;
    sectionId?: string;
    status?: 'PAID' | 'PARTIAL' | 'PENDING';
    page?: number;
    limit?: number;
}
export declare class RecordPaymentDto {
    schoolId: string;
    studentFeeId: string;
    studentId: string;
    termId?: string;
    amountPaid: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
    transactionReference?: string;
    paymentDate?: string;
    notes?: string;
}
export declare class ReportQueryDto {
    schoolId: string;
    from?: string;
    to?: string;
    month?: number;
    year?: number;
    termId?: string;
    academicYearId?: string;
    calendarType?: 'ETHIOPIAN' | 'GREGORIAN';
}
export declare enum FeeCollectionMode {
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    SEMESTER = "SEMESTER",
    TERM = "TERM",
    YEARLY = "YEARLY"
}
export declare class CalculateInstallmentFeesDto {
    schoolId: string;
    academicYearId: string;
    feeType: string;
    annualAmount: number;
    grade?: number;
    description?: string;
}
export declare class GenerateInstallmentFeesDto {
    schoolId: string;
    academicYearId: string;
    feeType?: string;
    annualAmount?: number;
    description?: string;
    grade?: number;
}
