import { DiscountPolicyService } from './discount-policy.service';
export declare class DiscountPolicyController {
    private readonly discountPolicyService;
    constructor(discountPolicyService: DiscountPolicyService);
    create(req: any, body: {
        name: string;
        discountType: string;
        discountValue: number;
        isActive?: boolean;
        criteria?: string;
    }): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            discountType: string;
            discountValue: number;
            criteria: string | null;
        };
    }>;
    list(req: any, includeInactive?: string): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            discountType: string;
            discountValue: number;
            criteria: string | null;
        }[];
    }>;
    update(req: any, id: string, body: {
        name?: string;
        discountType?: string;
        discountValue?: number;
        isActive?: boolean;
        criteria?: string;
    }): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            discountType: string;
            discountValue: number;
            criteria: string | null;
        };
    }>;
    delete(req: any, id: string): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            discountType: string;
            discountValue: number;
            criteria: string | null;
        };
    }>;
}
