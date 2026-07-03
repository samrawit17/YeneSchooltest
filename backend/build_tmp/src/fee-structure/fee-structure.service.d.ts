import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CalendarType } from '../common/date.util';
import type { CreateFeeStructureDto, UpdateFeeStructureDto, CalculateInstallmentFeesDto, GenerateInstallmentFeesDto } from './fee-structure.dto';
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
export declare class FeeStructureService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getBillingConfig(schoolId: string, academicYearId?: string): Promise<BillingConfig>;
    getFeeCollectionMode(schoolId: string): Promise<string>;
    createFeeStructure(dto: CreateFeeStructureDto): Promise<{
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
    }>;
    listFeeStructures(schoolId: string, academicYearId?: string, termId?: string): Promise<({
        term: {
            id: string;
            name: string;
            order: number;
        } | null;
    } & {
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
    })[]>;
    updateFeeStructure(id: string, schoolId: string, dto: UpdateFeeStructureDto): Promise<{
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
    }>;
    deleteFeeStructure(id: string, schoolId: string): Promise<{
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
    }>;
    deleteFeeStructuresBySchool(schoolId: string, academicYearId?: string): Promise<Prisma.BatchPayload>;
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
            termName: any;
            termId: any;
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
    getBillingConfigSync(schoolId: string, billingMode?: string, curriculumType?: string, calendarType?: string, dueDay?: number, curriculumPeriodCount?: number, billingPeriodsPerYear?: number): BillingConfig;
    private normalizeCurriculumType;
    private normalizeBillingMode;
    private getCurriculumPeriodCount;
    private getBillingPeriodsPerYear;
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
    private assertTermInSchool;
    private getCurriculumPeriodDisplayName;
    private formatBirr;
    private normalizeFeeType;
}
export {};
