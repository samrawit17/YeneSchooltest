import { FeeStructureService } from './fee-structure.service';
import { CreateFeeStructureDto, UpdateFeeStructureDto, CalculateInstallmentFeesDto, GenerateInstallmentFeesDto } from './fee-structure.dto';
export declare class FeeStructureController {
    private readonly feeStructureService;
    constructor(feeStructureService: FeeStructureService);
    private resolveSchoolId;
    createFeeStructure(dto: CreateFeeStructureDto, req: any): Promise<{
        success: boolean;
        data: {
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
        })[];
    }>;
    updateFeeStructure(id: string, schoolId: string, dto: UpdateFeeStructureDto, req: any): Promise<{
        success: boolean;
        data: {
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
    }>;
    deleteFeeStructure(id: string, schoolId: string, req: any): Promise<{
        success: boolean;
        data: {
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
    }>;
    clearFeeStructures(schoolId: string, academicYearId?: string, req?: any): Promise<{
        success: boolean;
        data: import("@prisma/client").Prisma.BatchPayload;
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
            termName: any;
            termId: any;
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
        data: import("./fee-structure.service").BillingConfig;
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
}
