import { PrismaService } from '../prisma/prisma.service';
export declare class DiscountPolicyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(schoolId: string, data: {
        name: string;
        discountType: string;
        discountValue: number;
        isActive?: boolean;
        criteria?: string;
    }): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        discountType: string;
        discountValue: number;
        criteria: string | null;
    }>;
    list(schoolId: string, includeInactive?: boolean): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        discountType: string;
        discountValue: number;
        criteria: string | null;
    }[]>;
    update(id: string, schoolId: string, data: {
        name?: string;
        discountType?: string;
        discountValue?: number;
        isActive?: boolean;
        criteria?: string;
    }): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        discountType: string;
        discountValue: number;
        criteria: string | null;
    }>;
    delete(id: string, schoolId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        discountType: string;
        discountValue: number;
        criteria: string | null;
    }>;
    applyToStudentFee(studentFeeId: string, discountPolicyId: string, schoolId: string): Promise<{
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
    }>;
}
