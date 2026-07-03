import { ReportQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    private resolveSchoolId;
    dailyReport(query: ReportQueryDto, req: any): Promise<{
        total: number;
        todayTotal: number;
        totalOutstanding: number;
        count: number;
        payments: {
            id: string;
            receiptNumber: string;
            paymentReference: string;
            transactionReference: string | null;
            studentName: string;
            studentId: string;
            className: string;
            grade: string;
            section: string;
            paymentMethod: string;
            amountPaid: number;
            recordedBy: string | null;
            paymentDate: string;
            notes: string | null;
            termId: string | null;
            termName: string | null;
            feeType: string | null;
        }[];
        dailyData: {
            date: string;
            amount: number;
        }[];
        feeBreakdown: {
            tuition: number;
            registration: number;
            examFee: number;
            library: number;
            other: number;
        };
        outstandingRows: any[];
        paidStudents: number;
        partialStudents: number;
        unpaidStudents: number;
        success: boolean;
    }>;
    monthlyReport(schoolId: string, month: string, year: string, req: any): Promise<{
        month: number;
        year: number;
        total: number;
        count: number;
        success: boolean;
    }>;
    outstanding(schoolId: string, academicYearId: string, termId?: string, calendarType?: 'ETHIOPIAN' | 'GREGORIAN', req?: any): Promise<{
        totalOutstanding: number;
        totalRevenue: number;
        totalDiscounts: number;
        rows: {
            studentId: string;
            studentName: string;
            grade: string | null;
            section: string | null;
            feeType: string;
            scopeLabel: string;
            installmentIndex: number | null;
            isYearWide: boolean;
            total: number;
            discount: number;
            discountPercent: number;
            discountLabel: string | null;
            originalTotal: number;
            paid: number;
            remaining: number;
            status: import("@prisma/client").$Enums.PaymentStatus;
        }[];
        success: boolean;
    }>;
    markOverdue(body: {
        schoolId: string;
        academicYearId: string;
        termId?: string;
    }, req: any): Promise<{
        updated: number;
        message: string;
        success: boolean;
    }>;
    overdueReport(schoolId: string, academicYearId: string, termId?: string, req?: any): Promise<{
        totalOverdue: number;
        count: number;
        rows: {
            studentId: string;
            studentName: string;
            feeType: string;
            termName: string | null;
            total: number;
            paid: number;
            remaining: number;
            daysOverdue: number;
            penaltyAccumulated: number;
            dueDate: string | null;
        }[];
        success: boolean;
    }>;
    auditLogs(schoolId: string, entityType?: string, entityId?: string, limit?: number, from?: string, to?: string, req?: any): Promise<{
        success: boolean;
        data: {
            id: string;
            action: string;
            description: string | null;
            schoolId: string;
            createdAt: Date;
            userId: string;
            newValue: string | null;
            amount: number | null;
            entityType: string;
            entityId: string;
            previousValue: string | null;
            reference: string | null;
        }[];
    }>;
    studentHistory(studentId: string, schoolId: string, req?: any): Promise<{
        totalPaid: number;
        count: number;
        payments: ({
            studentFee: {
                feeStructure: {
                    id: string;
                    description: string | null;
                    isActive: boolean;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    grade: number | null;
                    academicYearId: string;
                    termId: string | null;
                    feeType: string;
                    amount: number;
                    semester: number | null;
                };
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                deletedById: string | null;
                studentId: string;
                academicYearId: string;
                status: import("@prisma/client").$Enums.PaymentStatus;
                termId: string | null;
                dueDate: Date | null;
                notes: string | null;
                feeStructureId: string;
                totalAmount: number;
                discount: number;
                finalAmount: number;
                penaltyAmount: number;
                discountPolicyId: string | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
            studentId: string;
            termId: string | null;
            paymentMethod: string;
            amountPaid: number;
            notes: string | null;
            paymentDate: Date;
            receiptNumber: string;
            receivedById: string;
            studentFeeId: string;
            transactionReference: string | null;
        })[];
        success: boolean;
    }>;
}
