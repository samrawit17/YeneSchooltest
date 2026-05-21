import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { CreateFeeStructureDto, UpdateFeeStructureDto, GenerateStudentFeesDto, StudentFeesQueryDto, RecordPaymentDto, ReportQueryDto, CalculateInstallmentFeesDto, GenerateInstallmentFeesDto } from './dto/finance.dto';
import { CalendarType } from '../common/date.util';
export declare class FinanceService {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    assertStudentFeeSummaryAccess(user: {
        id?: string;
        role?: string;
        schoolId?: string;
    } | undefined, schoolId: string, studentId: string): Promise<void>;
    private formatPaymentsWithStudentContext;
    private getFeeCollectionModeInternal;
    private getInstallmentCountInternal;
    private calculateInstallmentAmountInternal;
    private calculateRemainderInternal;
    private getInstallmentPeriodLabel;
    private getFeeStructureInstallmentIndex;
    private normalizeFeeBreakdownType;
    private formatFeeTypeLabel;
    private getInstallmentRangeForTerm;
    private getTermsForAcademicYear;
    private assertAcademicYearInSchool;
    private assertTermInSchool;
    notifyParentsForStartingCurriculumPeriods(): Promise<void>;
    sendPeriodFeeReminders(schoolId: string, termId: string): Promise<{
        sent: number;
        termName: string;
    }>;
    private notifyParentsForTermFeeDue;
    private formatBirr;
    calculateInstallmentFees(dto: CalculateInstallmentFeesDto): Promise<{
        mode: string;
        modeLabel: string;
        installmentCount: number;
        installmentAmount: number;
        remainder: number;
        annualAmount: number;
        totalWithRemainder: number;
        description: string;
        suggestedTermDistribution: {
            termName: any;
            termId: any;
            amount: number;
        }[];
    }>;
    generateInstallmentFees(dto: GenerateInstallmentFeesDto): Promise<{
        created: number;
        message: string;
        breakdown?: undefined;
    } | {
        created: number;
        message: string;
        breakdown: {
            installment: number;
            amount: number;
        }[];
    }>;
    getFeeCollectionMode(schoolId: string): Promise<string>;
    getInstallmentCount(feeCollectionMode: string): Promise<number>;
    createFeeStructure(dto: CreateFeeStructureDto): Promise<{
        grade: number | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        academicYearId: string;
        description: string | null;
        termId: string | null;
        feeType: string;
        amount: number;
        semester: number | null;
    }>;
    listFeeStructures(schoolId: string, academicYearId?: string, termId?: string): Promise<({
        term: {
            id: string;
            name: string;
            order: number;
        } | null;
    } & {
        grade: number | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        academicYearId: string;
        description: string | null;
        termId: string | null;
        feeType: string;
        amount: number;
        semester: number | null;
    })[]>;
    updateFeeStructure(id: string, schoolId: string, dto: UpdateFeeStructureDto): Promise<{
        grade: number | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        academicYearId: string;
        description: string | null;
        termId: string | null;
        feeType: string;
        amount: number;
        semester: number | null;
    }>;
    deleteFeeStructure(id: string, schoolId: string): Promise<{
        grade: number | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        academicYearId: string;
        description: string | null;
        termId: string | null;
        feeType: string;
        amount: number;
        semester: number | null;
    }>;
    deleteFeeStructuresBySchool(schoolId: string, academicYearId?: string): Promise<Prisma.BatchPayload>;
    generateStudentFees(dto: GenerateStudentFeesDto): Promise<{
        created: number;
    }>;
    getStudentFees(query: StudentFeesQueryDto): Promise<{
        total: number;
        data: {
            id: string;
            studentId: string;
            studentName: string;
            feeType: string;
            totalFee: number;
            discount: number;
            finalAmount: number;
            paidAmount: number;
            remainingBalance: number;
            status: import("@prisma/client").$Enums.PaymentStatus;
            academicYearId: string;
            termName: string | null;
            updatedAt: Date;
        }[];
    }>;
    private getReceiptDateParts;
    private generateReceiptNumber;
    private generateReceiptNumberCandidate;
    private isUniqueConstraintError;
    private createPaymentWithUniqueReceipt;
    private createPaymentWithFallbackReceipt;
    private getPeriodCountForFee;
    private legacyGenerateReceiptNumber;
    private logAudit;
    recordPayment(user: any, dto: RecordPaymentDto): Promise<{
        payment: any;
        receiptNumber: any;
        remaining: number;
        status: "PAID" | "PARTIAL";
    }>;
    private notifyParentsOfRecordedPayment;
    getAllPayments(schoolId: string): Promise<{
        total: number;
        count: number;
        payments: {
            id: string;
            receiptNumber: string;
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
    }>;
    reversePayment(user: any, schoolId: string, paymentId: string, reason?: string): Promise<{
        reversed: boolean;
        receiptNumber: string;
        remainingPaid: number;
        remainingBalance: number;
        status: "PENDING" | "PAID" | "PARTIAL";
    }>;
    dailyCollectionReport(query: ReportQueryDto): Promise<{
        total: number;
        todayTotal: number;
        totalOutstanding: number;
        count: number;
        payments: {
            id: string;
            receiptNumber: string;
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
            dueDate: string | null;
        }[];
    }>;
    getAuditLogs(schoolId: string, entityType?: string, entityId?: string, limit?: number): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        userId: string;
        action: string;
        description: string | null;
        amount: number | null;
        entityType: string;
        entityId: string;
        previousValue: string | null;
        newValue: string | null;
        reference: string | null;
    }[]>;
    paymentHistoryForStudent(schoolId: string, studentId: string): Promise<{
        totalPaid: number;
        count: number;
        payments: ({
            studentFee: {
                feeStructure: {
                    grade: number | null;
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    isActive: boolean;
                    academicYearId: string;
                    description: string | null;
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
                studentId: string;
                academicYearId: string;
                status: import("@prisma/client").$Enums.PaymentStatus;
                termId: string | null;
                notes: string | null;
                feeStructureId: string;
                totalAmount: number;
                discount: number;
                finalAmount: number;
                penaltyAmount: number;
                dueDate: Date | null;
                discountPolicyId: string | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
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
    getCurriculumInfo(schoolId: string, academicYearId: string): Promise<{
        curriculumType: string;
        terms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
        termCount: number;
    }>;
    getStudentFeeSummary(schoolId: string, studentId: string, academicYearId: string, termId?: string): Promise<{
        student: {
            id: string;
            name: string;
            studentCode: string;
            className: string;
            section: string;
        };
        feeItems: {
            id: string;
            name: string;
            amount: number;
            dueDate: string | null;
            status: import("@prisma/client").$Enums.PaymentStatus;
            paidAmount: number;
            balance: number;
            category: string;
            termId: string | null;
            termName: string | null;
            isYearWide: boolean;
        }[];
        payments: {
            id: string;
            receiptNumber: string;
            studentFeeId: string;
            amount: number;
            paymentMethod: string;
            paidAt: string;
            feeItemName: string;
            termId: string | null;
            termName: string | null;
            isYearWide: boolean;
            status: string;
        }[];
        curriculumType: string;
        terms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        }[];
        summary: {
            totalFees: number;
            totalPaid: number;
            totalBalance: number;
            nextDueDate: null;
        };
    }>;
    createDiscountPolicy(schoolId: string, data: {
        name: string;
        discountType: string;
        discountValue: number;
        isActive?: boolean;
        criteria?: string;
    }): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        discountType: string;
        discountValue: number;
        criteria: string | null;
    }>;
    listDiscountPolicies(schoolId: string, includeInactive?: boolean): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        discountType: string;
        discountValue: number;
        criteria: string | null;
    }[]>;
    updateDiscountPolicy(id: string, schoolId: string, data: {
        name?: string;
        discountType?: string;
        discountValue?: number;
        isActive?: boolean;
        criteria?: string;
    }): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        discountType: string;
        discountValue: number;
        criteria: string | null;
    }>;
    deleteDiscountPolicy(id: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        discountType: string;
        discountValue: number;
        criteria: string | null;
    }>;
    applyDiscountPolicy(studentFeeId: string, discountPolicyId: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        academicYearId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        termId: string | null;
        notes: string | null;
        feeStructureId: string;
        totalAmount: number;
        discount: number;
        finalAmount: number;
        penaltyAmount: number;
        dueDate: Date | null;
        discountPolicyId: string | null;
    }>;
}
