import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './reports.dto';
import { CalendarType } from '../common/date.util';
import { EventBusService } from '../core/events/event-bus.service';
type CurriculumType = 'TERM' | 'QUARTER' | 'SEMESTER';
type BillingMode = 'MONTHLY' | 'TERMLY' | 'QUARTERLY' | 'SEMESTERLY' | 'YEARLY';
export interface BillingConfig {
    curriculumType: CurriculumType;
    billingMode: BillingMode;
    calendarType: CalendarType;
    dueDay: number;
    curriculumPeriodCount: number;
    billingPeriodsPerYear: number;
    installmentsPerCurriculumPeriod: number;
    periods?: Array<{
        id: string;
        name: string;
        order: number;
        startDate?: Date | null;
        endDate?: Date | null;
    }>;
}
export declare class ReportsService {
    private readonly prisma;
    private readonly eventBus;
    private readonly logger;
    constructor(prisma: PrismaService, eventBus: EventBusService);
    private normalizeCurriculumType;
    private normalizeBillingMode;
    private getCurriculumPeriodCount;
    private getBillingPeriodsPerYear;
    private getBillingConfig;
    private getTermsForAcademicYear;
    private getCurriculumPeriodForInstallment;
    private getBillingIndexWithinPeriod;
    private enumerateCalendarMonths;
    private getBillingMonthLabelForPeriod;
    private getInstallmentRangeForSelectedTerm;
    private assertAcademicYearInSchool;
    private assertTermInSchool;
    private getFeeStructureInstallmentIndex;
    private normalizeFeeBreakdownType;
    private formatFeeTypeLabel;
    private formatBirr;
    private formatPaymentsWithStudentContext;
    dailyCollectionReport(query: ReportQueryDto): Promise<{
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
    }>;
    monthlyRevenueReport(schoolId: string, month: number, year: number): Promise<{
        month: number;
        year: number;
        total: number;
        count: number;
    }>;
    outstandingBalancesReport(schoolId: string, academicYearId: string, termId?: string, calendarType?: CalendarType | string | null): Promise<{
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
    }>;
    markOverdueFees(schoolId: string, academicYearId: string, termId?: string): Promise<{
        updated: number;
        message: string;
    }>;
    getOverdueFeesReport(schoolId: string, academicYearId: string, termId?: string): Promise<{
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
    }>;
    getAuditLogs(schoolId: string, entityType?: string, entityId?: string, limit?: number, from?: string, to?: string): Promise<{
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
    }[]>;
    paymentHistoryForStudent(schoolId: string, studentId: string): Promise<{
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
    }>;
}
export {};
