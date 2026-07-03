import { StudentFeeService } from './student-fee.service';
import { GenerateStudentFeesDto, StudentFeesQueryDto } from './student-fee.dto';
export declare class StudentFeeController {
    private readonly studentFeeService;
    constructor(studentFeeService: StudentFeeService);
    private resolveSchoolId;
    generateStudentFees(dto: GenerateStudentFeesDto, req: any): Promise<{
        created: number;
        updatedDiscounts?: undefined;
        success: boolean;
    } | {
        created: number;
        updatedDiscounts: number;
        success: boolean;
    }>;
    listStudentFees(query: StudentFeesQueryDto, req: any): Promise<{
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
        curriculumType: "SEMESTER" | "QUARTER" | "TERM";
        billingMode: "MONTHLY" | "QUARTERLY" | "YEARLY" | "SEMESTERLY" | "TERMLY";
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
        success: boolean;
    }>;
}
