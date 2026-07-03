import { PrismaService } from '../prisma/prisma.service';
import { GenerateStudentFeesDto, StudentFeesQueryDto } from './student-fee.dto';
import { CalendarType } from '../common/date.util';
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
export declare class StudentFeeService {
    private readonly prisma;
    private readonly logger;
    private readonly FAMILY_DISCOUNT_POLICY_NAME;
    constructor(prisma: PrismaService);
    private normalizeCurriculumType;
    private normalizeBillingMode;
    private getCurriculumPeriodCount;
    private getBillingPeriodsPerYear;
    getBillingConfig(schoolId: string, academicYearId?: string): Promise<BillingConfig>;
    private splitAmount;
    private getCurriculumPeriodForInstallment;
    private getBillingIndexWithinPeriod;
    private enumerateCalendarMonths;
    private getBillingMonthLabelForPeriod;
    private getFeeStructureInstallmentIndex;
    private getClassGradeNumber;
    private getInstallmentDueDate;
    private getEthiopianMonthLength;
    private normalizeFeeBreakdownType;
    private formatFeeTypeLabel;
    private getMonthOffsetBetweenDates;
    private getInstallmentRangeForSelectedTerm;
    private getTermsForAcademicYear;
    private assertAcademicYearInSchool;
    private getCurriculumPeriodDisplayName;
    private assertTermInSchool;
    private getSchoolCalendarType;
    assertStudentFeeSummaryAccess(user: {
        id?: string;
        role?: string;
        schoolId?: string;
    } | undefined, schoolId: string, studentId: string): Promise<void>;
    generateStudentFees(dto: GenerateStudentFeesDto): Promise<{
        created: number;
        updatedDiscounts?: undefined;
    } | {
        created: number;
        updatedDiscounts: number;
    }>;
    private normalizeFeeType;
    private parseBooleanSetting;
    private getFamilyDiscountContext;
    private calculateFamilyDiscountAmount;
    private recalculateFamilyDiscountsForExistingFees;
    getStudentFees(query: StudentFeesQueryDto): Promise<{
        total: number;
        data: {
            id: string;
            studentId: string;
            studentName: string;
            grade: string | null;
            section: string | null;
            feeType: string;
            scopeLabel: string;
            installmentIndex: number | null;
            totalFee: number;
            discount: number;
            discountPercent: number;
            discountLabel: string | null;
            finalAmount: number;
            paidAmount: number;
            remainingBalance: number;
            status: import("@prisma/client").$Enums.PaymentStatus;
            academicYearId: string;
            termName: string | null;
            dueDate: Date | null;
            updatedAt: Date;
        }[];
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
            originalAmount: number;
            discount: number;
            finalAmount: number;
            discountPercent: number;
            discountLabel: string | null;
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
            paymentReference: string;
            transactionReference: string | null;
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
        curriculumType: CurriculumType;
        billingMode: BillingMode;
        billingPeriodsPerYear: number;
        terms: {
            id: string;
            name: string;
            order: number;
            startDate?: Date | null;
            endDate?: Date | null;
        }[];
        summary: {
            totalFees: number;
            totalPaid: number;
            totalBalance: number;
            nextDueDate: null;
        };
    }>;
}
export {};
