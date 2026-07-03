import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import type { UpsertPayrollSalaryDto, CreatePayrollRunDto, PayrollQueryDto, UpdatePayrollRunStatusDto, UpdatePayrollEntryStatusDto } from './payroll.dto';
export declare class PayrollService {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    listPayrollStaff(schoolId: string): Promise<{
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
    }[]>;
    listPayrollSalaries(schoolId: string): Promise<({
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
    })[]>;
    upsertPayrollSalary(user: any, dto: UpsertPayrollSalaryDto): Promise<{
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
    }>;
    listPayrollRuns(query: PayrollQueryDto): Promise<{
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
    }>;
    getPayrollRun(schoolId: string, runId: string): Promise<{
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
    }>;
    createPayrollRun(user: any, dto: CreatePayrollRunDto): Promise<{
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
    }>;
    updatePayrollRunStatus(user: any, runId: string, dto: UpdatePayrollRunStatusDto): Promise<{
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
    }>;
    updatePayrollEntryStatus(user: any, entryId: string, dto: UpdatePayrollEntryStatusDto): Promise<{
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
    }>;
    notifyFinanceForUpcomingPayrollPayments(): Promise<void>;
    notifyFinanceToCreateCurrentPayrollRun(): Promise<void>;
    private getPayrollStaffRoles;
    private getPayrollRunTitle;
    private calculatePayrollTotals;
    private getSchoolCalendarType;
    private getCurrentPayrollPeriod;
    private getPayrollPeriodLabel;
    private refreshPayrollRunTotals;
    private isUniqueConstraintError;
    private logAudit;
    private notifyFinanceForMissingPayrollRun;
    private notifyFinanceForPayrollRunDue;
}
