import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { EventBusService } from '../core/events/event-bus.service';
import { CalculateInstallmentFeesDto, GenerateInstallmentFeesDto } from './dto/finance.dto';
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
export declare class FinanceService {
    private readonly prisma;
    private readonly notificationService;
    private readonly eventBus;
    private readonly logger;
    private readonly FAMILY_DISCOUNT_POLICY_NAME;
    constructor(prisma: PrismaService, notificationService: NotificationService, eventBus: EventBusService);
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
    private getInstallmentRangeForTerm;
    private getInstallmentRangeForSelectedTerm;
    private getTermsForAcademicYear;
    private assertAcademicYearInSchool;
    private getCurriculumPeriodDisplayName;
    private assertTermInSchool;
    notifyParentsForStartingCurriculumPeriods(): Promise<void>;
    notifyFinanceForUpcomingPayrollPayments(): Promise<void>;
    notifyFinanceToCreateCurrentPayrollRun(): Promise<void>;
    private getSchoolCalendarType;
    private getCurrentPayrollPeriod;
    private getPayrollPeriodLabel;
    private notifyFinanceForMissingPayrollRun;
    private notifyFinanceForPayrollRunDue;
    sendPeriodFeeReminders(schoolId: string, termId: string): Promise<{
        sent: number;
        termName: string;
    }>;
    private notifyParentsForTermFeeDue;
    private formatBirr;
    calculateInstallmentFees(dto: CalculateInstallmentFeesDto): Promise<{
        mode: BillingMode;
        curriculumType: CurriculumType;
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
    private getPayrollStaffRoles;
    private getPayrollRunTitle;
    private calculatePayrollTotals;
    private refreshPayrollRunTotals;
    getCurriculumInfo(schoolId: string, academicYearId: string): Promise<{
        curriculumType: CurriculumType;
        billingMode: BillingMode;
        calendarType: CalendarType;
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
    }>;
}
export {};
