import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../subscription.service';
declare abstract class BaseSubscriptionGuard implements CanActivate {
    protected readonly reflector: Reflector;
    protected readonly subscriptionService: SubscriptionService;
    constructor(reflector: Reflector, subscriptionService: SubscriptionService);
    abstract canActivate(context: ExecutionContext): Promise<boolean>;
    protected resolveSchoolPlan(context: ExecutionContext): Promise<{
        plan: null;
        isSuperAdmin: boolean;
    } | {
        plan: {
            subscriptionId: string;
            subscriptionStatus: string;
            subscriptionStartDate: Date;
            subscriptionEndDate: Date | null;
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        };
        isSuperAdmin: boolean;
    }>;
}
export declare class SubscriptionGuard extends BaseSubscriptionGuard {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export declare class MinimumTierGuard extends BaseSubscriptionGuard {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export {};
