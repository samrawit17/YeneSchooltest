import { FinanceService } from './finance.service';
import { CreateFeeStructureDto, UpdateFeeStructureDto, GenerateStudentFeesDto, StudentFeesQueryDto, RecordPaymentDto, ReportQueryDto, CalculateInstallmentFeesDto, GenerateInstallmentFeesDto } from './dto/finance.dto';
export declare class FinanceController {
    private readonly financeService;
    constructor(financeService: FinanceService);
    private resolveSchoolId;
    createFeeStructure(dto: CreateFeeStructureDto, req: any): Promise<{
        success: boolean;
        data: {
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
    }>;
    listFeeStructures(schoolId: string, academicYearId?: string, termId?: string, req?: any): Promise<{
        success: boolean;
        data: ({
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
        })[];
    }>;
    updateFeeStructure(id: string, schoolId: string, dto: UpdateFeeStructureDto, req: any): Promise<{
        success: boolean;
        data: {
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
    }>;
    deleteFeeStructure(id: string, schoolId: string, req: any): Promise<{
        success: boolean;
        data: {
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
    }>;
    clearFeeStructures(schoolId: string, academicYearId?: string, req?: any): Promise<{
        success: boolean;
        data: import("@prisma/client").Prisma.BatchPayload;
    }>;
    generateStudentFees(dto: GenerateStudentFeesDto, req: any): Promise<{
        created: number;
        success: boolean;
    }>;
    listStudentFees(query: StudentFeesQueryDto, req: any): Promise<{
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
        success: boolean;
    }>;
    recordPayment(dto: RecordPaymentDto, req: any): Promise<{
        payment: any;
        receiptNumber: any;
        remaining: number;
        status: "PAID" | "PARTIAL";
        success: boolean;
    }>;
    reversePayment(paymentId: string, body: {
        schoolId: string;
        reason?: string;
    }, req: any): Promise<{
        reversed: boolean;
        receiptNumber: string;
        remainingPaid: number;
        remainingBalance: number;
        status: "PENDING" | "PAID" | "PARTIAL";
        success: boolean;
    }>;
    sendPeriodFeeReminders(body: {
        schoolId: string;
        termId: string;
    }, req: any): Promise<{
        sent: number;
        termName: string;
        success: boolean;
    }>;
    dailyReport(query: ReportQueryDto, req: any): Promise<{
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
        success: boolean;
    }>;
    getAllPayments(schoolId: string, req: any): Promise<{
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
            dueDate: string | null;
        }[];
        success: boolean;
    }>;
    auditLogs(schoolId: string, entityType?: string, entityId?: string, limit?: number, req?: any): Promise<{
        success: boolean;
        data: {
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
        }[];
    }>;
    studentHistory(studentId: string, schoolId: string, req?: any): Promise<{
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
        success: boolean;
    }>;
    getStudentFeeSummary(studentId: string, schoolId: string, academicYearId: string, termId?: string, req?: any): Promise<{
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
        success: boolean;
    }>;
    getCurriculumInfo(schoolId: string, academicYearId: string, req?: any): Promise<{
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
        success: boolean;
    }>;
    calculateInstallmentFees(dto: CalculateInstallmentFeesDto, req: any): Promise<{
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
        success: boolean;
    }>;
    generateInstallmentFees(dto: GenerateInstallmentFeesDto, req: any): Promise<{
        created: number;
        message: string;
        breakdown?: undefined;
        success: boolean;
    } | {
        created: number;
        message: string;
        breakdown: {
            installment: number;
            amount: number;
        }[];
        success: boolean;
    }>;
    getFeeCollectionMode(schoolId: string, req: any): Promise<{
        success: boolean;
        data: {
            mode: string;
            modeLabel: string;
            installmentCount: number;
        };
    }>;
    createDiscountPolicy(req: any, body: {
        name: string;
        discountType: string;
        discountValue: number;
        isActive?: boolean;
        criteria?: string;
    }): Promise<{
        success: boolean;
        data: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            discountType: string;
            discountValue: number;
            criteria: string | null;
        };
    }>;
    listDiscountPolicies(req: any, includeInactive?: string): Promise<{
        success: boolean;
        data: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            discountType: string;
            discountValue: number;
            criteria: string | null;
        }[];
    }>;
    updateDiscountPolicy(req: any, id: string, body: {
        name?: string;
        discountType?: string;
        discountValue?: number;
        isActive?: boolean;
        criteria?: string;
    }): Promise<{
        success: boolean;
        data: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            discountType: string;
            discountValue: number;
            criteria: string | null;
        };
    }>;
    deleteDiscountPolicy(req: any, id: string): Promise<{
        success: boolean;
        data: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            discountType: string;
            discountValue: number;
            criteria: string | null;
        };
    }>;
    applyDiscountPolicy(req: any, studentFeeId: string, body: {
        discountPolicyId: string;
    }): Promise<{
        success: boolean;
        data: {
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
    }>;
}
