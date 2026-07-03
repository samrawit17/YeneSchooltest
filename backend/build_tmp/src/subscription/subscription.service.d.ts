import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { PlanTier } from '@prisma/client';
export declare class SubscriptionService {
    private readonly prisma;
    private readonly eventBus;
    constructor(prisma: PrismaService, eventBus: EventBusService);
    private readonly tierHierarchy;
    private readonly featureTiers;
    private normalizeFeatures;
    private mergeTierBaselineFeatures;
    private withEffectivePlanFeatures;
    getAllPlans(): Promise<{
        assignedSchoolsCount: number;
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    }[]>;
    getPlanById(id: string): Promise<({
        schools: {
            id: string;
            name: string;
            email: string;
            isActive: boolean;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            enrollmentKey: string | null;
            code: string | null;
            publicUrlSlug: string;
            address: string | null;
            timezone: string;
            logoUrl: string | null;
            settings: string | null;
            planId: string | null;
            planAssignedAt: Date | null;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    } & {
        features: string[];
    }) | null>;
    getPlanByTier(tier: PlanTier): Promise<({
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    } & {
        features: string[];
    }) | null>;
    createPlan(data: {
        name: string;
        tier: PlanTier;
        description?: string;
        features: string[];
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    }>;
    updatePlan(id: string, data: {
        name?: string;
        description?: string;
        features?: string[];
        isActive?: boolean;
    }): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    } & {
        features: string[];
    }>;
    deletePlan(id: string): Promise<void>;
    assignPlanToSchool(schoolId: string, planId: string | null): Promise<{
        plan: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        } | null;
    } & {
        id: string;
        name: string;
        email: string;
        isActive: boolean;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        enrollmentKey: string | null;
        code: string | null;
        publicUrlSlug: string;
        address: string | null;
        timezone: string;
        logoUrl: string | null;
        settings: string | null;
        planId: string | null;
        planAssignedAt: Date | null;
    }>;
    getSchoolPlan(schoolId: string): Promise<{
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
    } | null>;
    private getTierFeatures;
    getSchoolSubscription(schoolId: string): Promise<({
        plan: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        planId: string;
        startDate: Date;
        endDate: Date | null;
        status: string;
    }) | null>;
    createSubscription(data: {
        schoolId: string;
        planId: string;
        endDate?: Date;
    }): Promise<{
        plan: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        planId: string;
        startDate: Date;
        endDate: Date | null;
        status: string;
    }>;
    updateSubscription(id: string, data: {
        status?: string;
        endDate?: Date;
    }): Promise<{
        plan: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        planId: string;
        startDate: Date;
        endDate: Date | null;
        status: string;
    }>;
    getSchoolsByPlan(planId: string): Promise<{
        plan: ({
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        } & {
            features: string[];
        }) | null;
        subscription: {
            plan: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                tier: import("@prisma/client").$Enums.PlanTier;
                features: string[];
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            planId: string;
            startDate: Date;
            endDate: Date | null;
            status: string;
        };
        id: string;
        name: string;
        _count: {
            users: number;
        };
        email: string;
        isActive: boolean;
        planAssignedAt: Date | null;
        subscriptions: ({
            plan: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                tier: import("@prisma/client").$Enums.PlanTier;
                features: string[];
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            planId: string;
            startDate: Date;
            endDate: Date | null;
            status: string;
        })[];
    }[]>;
    getSchoolsWithPlans(): Promise<{
        plan: ({
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        } & {
            features: string[];
        }) | null;
        subscription: {
            plan: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                tier: import("@prisma/client").$Enums.PlanTier;
                features: string[];
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            planId: string;
            startDate: Date;
            endDate: Date | null;
            status: string;
        };
        id: string;
        name: string;
        _count: {
            users: number;
        };
        email: string;
        isActive: boolean;
        planAssignedAt: Date | null;
        subscriptions: ({
            plan: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                tier: import("@prisma/client").$Enums.PlanTier;
                features: string[];
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            planId: string;
            startDate: Date;
            endDate: Date | null;
            status: string;
        })[];
    }[]>;
    hasFeature(schoolPlan: {
        tier: PlanTier;
        features?: string[];
    } | null, feature: string): boolean;
    getTierLevel(tier: PlanTier): number;
    getFeatureTier(feature: string): PlanTier | null;
    isFeatureAccessible(schoolPlan: {
        tier: PlanTier;
        features?: string[];
    } | null, feature: string): boolean;
    private normalizeFeatureName;
    getSchoolFeatures(schoolPlan: {
        tier: PlanTier;
        features: string[];
    } | null): {
        accessible: string[];
        tier: PlanTier;
        tierLevel: number;
    };
}
