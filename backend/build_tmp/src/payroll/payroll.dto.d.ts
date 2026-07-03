export declare class UpsertPayrollSalaryDto {
    schoolId: string;
    staffUserId: string;
    baseSalary: number;
    allowances?: number;
    deductions?: number;
    bankName?: string;
    bankAccount?: string;
    tinNumber?: string;
    isActive?: boolean;
    effectiveFrom?: string;
    notes?: string;
}
export declare class CreatePayrollRunDto {
    schoolId: string;
    periodMonth: number;
    periodYear: number;
    title?: string;
    paymentDate?: string;
    notes?: string;
}
export declare class PayrollQueryDto {
    schoolId: string;
    month?: number;
    year?: number;
    status?: string;
}
export declare class UpdatePayrollRunStatusDto {
    schoolId: string;
    status: string;
    paymentDate?: string;
    notes?: string;
}
export declare class UpdatePayrollEntryStatusDto {
    schoolId: string;
    status: string;
    paymentMethod?: string;
    transactionReference?: string;
    notes?: string;
}
