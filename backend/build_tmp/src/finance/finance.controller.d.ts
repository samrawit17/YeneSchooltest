import { FinanceService } from './finance.service';
import { DiscountPolicyService } from '../discount-policy/discount-policy.service';
import { CalculateInstallmentFeesDto, GenerateInstallmentFeesDto } from './dto/finance.dto';
export declare class FinanceController {
    private readonly financeService;
    private readonly discountPolicyService;
    constructor(financeService: FinanceService, discountPolicyService: DiscountPolicyService);
    private resolveSchoolId;
    sendPeriodFeeReminders(body: {
        schoolId: string;
        termId: string;
    }, req: any): Promise<{
        sent: number;
        termName: string;
        success: boolean;
    }>;
    getCurriculumInfo(schoolId: string, academicYearId: string, req?: any): Promise<{
        curriculumType: "SEMESTER" | "QUARTER" | "TERM";
        billingMode: "MONTHLY" | "QUARTERLY" | "YEARLY" | "SEMESTERLY" | "TERMLY";
        calendarType: import("../common/date.util").CalendarType;
        dueDay: number;
        billingPeriodsPerYear: number;
        terms: {
            id: string;
            name: string;
            order: number;
            startDate?: Date | null;
            endDate?: Date | null;
        }[];
        termCount: number;
        success: boolean;
    }>;
    calculateInstallmentFees(dto: CalculateInstallmentFeesDto, req: any): Promise<{
        mode: "MONTHLY" | "QUARTERLY" | "YEARLY" | "SEMESTERLY" | "TERMLY";
        curriculumType: "SEMESTER" | "QUARTER" | "TERM";
        modeLabel: string;
        installmentCount: number;
        installmentAmount: number;
        remainder: number;
        annualAmount: number;
        totalWithRemainder: number;
        description: string;
        suggestedTermDistribution: {
            termName: string;
            termId: string | undefined;
            label: string;
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
    getBillingConfig(schoolId: string, academicYearId: string, req: any): Promise<{
        success: boolean;
        data: import("./finance.service").BillingConfig;
    }>;
    getFeeCollectionMode(schoolId: string, req: any): Promise<{
        success: boolean;
        data: {
            mode: "MONTHLY" | "QUARTERLY" | "YEARLY" | "SEMESTERLY" | "TERMLY";
            modeLabel: string;
            installmentCount: number;
            curriculumType: "SEMESTER" | "QUARTER" | "TERM";
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
    }>;
}
