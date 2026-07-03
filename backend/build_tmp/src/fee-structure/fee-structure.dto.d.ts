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
export declare enum FeeCollectionMode {
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    SEMESTERLY = "SEMESTERLY",
    TERMLY = "TERMLY",
    YEARLY = "YEARLY"
}
export declare enum CurriculumType {
    TERM = "TERM",
    QUARTER = "QUARTER",
    SEMESTER = "SEMESTER"
}
