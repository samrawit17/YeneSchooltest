import { PayrollService } from './payroll.service';
import { UpsertPayrollSalaryDto, CreatePayrollRunDto, PayrollQueryDto, UpdatePayrollRunStatusDto, UpdatePayrollEntryStatusDto } from './payroll.dto';
export declare class PayrollController {
    private readonly payrollService;
    constructor(payrollService: PayrollService);
    private resolveSchoolId;
    payrollStaff(schoolId: string, req: any): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            isActive: boolean;
            employeeId: string | null;
            designation: string | null;
            department: string | null;
            salary: {
                id: string;
                isActive: boolean;
                notes: string | null;
                baseSalary: number;
                allowances: number;
                deductions: number;
                bankName: string | null;
                bankAccount: string | null;
                tinNumber: string | null;
                effectiveFrom: Date;
            };
        }[];
    }>;
    payrollSalaries(schoolId: string, req: any): Promise<{
        success: boolean;
        data: ({
            staffUser: {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
                email: string | null;
                isActive: boolean;
                financeProfile: {
                    department: {
                        name: string;
                    } | null;
                    employeeId: string;
                } | null;
                teacherProfile: {
                    department: {
                        name: string;
                    } | null;
                    employeeId: string;
                    designation: string | null;
                } | null;
            };
        } & {
            id: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            staffUserId: string;
            baseSalary: number;
            allowances: number;
            deductions: number;
            bankName: string | null;
            bankAccount: string | null;
            tinNumber: string | null;
            effectiveFrom: Date;
            payFrequency: import("@prisma/client").$Enums.PayrollFrequency;
            effectiveTo: Date | null;
        })[];
    }>;
    upsertPayrollSalary(dto: UpsertPayrollSalaryDto, req: any): Promise<{
        success: boolean;
        data: {
            id: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            staffUserId: string;
            baseSalary: number;
            allowances: number;
            deductions: number;
            bankName: string | null;
            bankAccount: string | null;
            tinNumber: string | null;
            effectiveFrom: Date;
            payFrequency: import("@prisma/client").$Enums.PayrollFrequency;
            effectiveTo: Date | null;
        };
    }>;
    payrollRuns(query: PayrollQueryDto, req: any): Promise<{
        runs: ({
            _count: {
                entries: number;
            };
            createdBy: {
                id: string;
                name: string;
            } | null;
            approvedBy: {
                id: string;
                name: string;
            } | null;
            paidBy: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PayrollRunStatus;
            title: string;
            approvedById: string | null;
            createdById: string | null;
            notes: string | null;
            paymentDate: Date | null;
            periodMonth: number;
            periodYear: number;
            periodCalendarType: import("@prisma/client").$Enums.CalendarType;
            grossAmount: number;
            deductionsAmount: number;
            netAmount: number;
            entryCount: number;
            paidById: string | null;
            paidAt: Date | null;
        })[];
        summary: {
            runCount: number;
            entryCount: number;
            grossAmount: number;
            deductionsAmount: number;
            netAmount: number;
        };
        success: boolean;
    }>;
    createPayrollRun(dto: CreatePayrollRunDto, req: any): Promise<{
        success: boolean;
        data: {
            entries: ({
                staffUser: {
                    id: string;
                    name: string;
                    role: import("@prisma/client").$Enums.Role;
                    email: string | null;
                    financeProfile: {
                        department: {
                            name: string;
                        } | null;
                        employeeId: string;
                    } | null;
                    teacherProfile: {
                        department: {
                            name: string;
                        } | null;
                        employeeId: string;
                        designation: string | null;
                    } | null;
                };
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.PayrollEntryStatus;
                paymentMethod: import("@prisma/client").$Enums.PayrollPaymentMethod | null;
                notes: string | null;
                transactionReference: string | null;
                staffUserId: string;
                baseSalary: number;
                allowances: number;
                deductions: number;
                paidAt: Date | null;
                runId: string;
                salaryId: string | null;
                bonus: number;
                tax: number;
                grossPay: number;
                netPay: number;
            })[];
            createdBy: {
                id: string;
                name: string;
            } | null;
            approvedBy: {
                id: string;
                name: string;
            } | null;
            paidBy: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PayrollRunStatus;
            title: string;
            approvedById: string | null;
            createdById: string | null;
            notes: string | null;
            paymentDate: Date | null;
            periodMonth: number;
            periodYear: number;
            periodCalendarType: import("@prisma/client").$Enums.CalendarType;
            grossAmount: number;
            deductionsAmount: number;
            netAmount: number;
            entryCount: number;
            paidById: string | null;
            paidAt: Date | null;
        };
    }>;
    payrollRun(id: string, schoolId: string, req: any): Promise<{
        success: boolean;
        data: {
            entries: ({
                staffUser: {
                    id: string;
                    name: string;
                    role: import("@prisma/client").$Enums.Role;
                    email: string | null;
                    financeProfile: {
                        department: {
                            name: string;
                        } | null;
                        employeeId: string;
                    } | null;
                    teacherProfile: {
                        department: {
                            name: string;
                        } | null;
                        employeeId: string;
                        designation: string | null;
                    } | null;
                };
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.PayrollEntryStatus;
                paymentMethod: import("@prisma/client").$Enums.PayrollPaymentMethod | null;
                notes: string | null;
                transactionReference: string | null;
                staffUserId: string;
                baseSalary: number;
                allowances: number;
                deductions: number;
                paidAt: Date | null;
                runId: string;
                salaryId: string | null;
                bonus: number;
                tax: number;
                grossPay: number;
                netPay: number;
            })[];
            createdBy: {
                id: string;
                name: string;
            } | null;
            approvedBy: {
                id: string;
                name: string;
            } | null;
            paidBy: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PayrollRunStatus;
            title: string;
            approvedById: string | null;
            createdById: string | null;
            notes: string | null;
            paymentDate: Date | null;
            periodMonth: number;
            periodYear: number;
            periodCalendarType: import("@prisma/client").$Enums.CalendarType;
            grossAmount: number;
            deductionsAmount: number;
            netAmount: number;
            entryCount: number;
            paidById: string | null;
            paidAt: Date | null;
        };
    }>;
    updatePayrollRunStatus(id: string, dto: UpdatePayrollRunStatusDto, req: any): Promise<{
        success: boolean;
        data: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PayrollRunStatus;
            title: string;
            approvedById: string | null;
            createdById: string | null;
            notes: string | null;
            paymentDate: Date | null;
            periodMonth: number;
            periodYear: number;
            periodCalendarType: import("@prisma/client").$Enums.CalendarType;
            grossAmount: number;
            deductionsAmount: number;
            netAmount: number;
            entryCount: number;
            paidById: string | null;
            paidAt: Date | null;
        };
    }>;
    updatePayrollEntryStatus(id: string, dto: UpdatePayrollEntryStatusDto, req: any): Promise<{
        success: boolean;
        data: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PayrollEntryStatus;
            paymentMethod: import("@prisma/client").$Enums.PayrollPaymentMethod | null;
            notes: string | null;
            transactionReference: string | null;
            staffUserId: string;
            baseSalary: number;
            allowances: number;
            deductions: number;
            paidAt: Date | null;
            runId: string;
            salaryId: string | null;
            bonus: number;
            tax: number;
            grossPay: number;
            netPay: number;
        };
    }>;
}
