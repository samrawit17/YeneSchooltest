import { PrismaService } from '../prisma/prisma.service';
import { PlanTier } from '@prisma/client';
export declare class SubscriptionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private readonly tierHierarchy;
    private readonly featureTiers;
    private normalizeFeatures;
    getAllPlans(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    }[]>;
    getPlanById(id: string): Promise<({
        schools: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            email: string;
            enrollmentKey: string | null;
            code: string | null;
            phone: string | null;
            address: string | null;
            timezone: string;
            logoUrl: string | null;
            isActive: boolean;
            settings: string | null;
            planId: string | null;
            planAssignedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    }) | null>;
    getPlanByTier(tier: PlanTier): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    } | null>;
    createPlan(data: {
        name: string;
        tier: PlanTier;
        description?: string;
        features: string[];
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    }>;
    deletePlan(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        tier: import("@prisma/client").$Enums.PlanTier;
        features: string[];
    }>;
    assignPlanToSchool(schoolId: string, planId: string | null): Promise<{
        plan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        enrollmentKey: string | null;
        code: string | null;
        phone: string | null;
        address: string | null;
        timezone: string;
        logoUrl: string | null;
        isActive: boolean;
        settings: string | null;
        planId: string | null;
        planAssignedAt: Date | null;
    }>;
    getSchoolPlan(schoolId: string): Promise<{
        subscriptionId: string;
        subscriptionStatus: string;
        subscriptionStartDate: Date;
        subscriptionEndDate: Date | null;
        features: string[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        description: string | null;
        tier: import("@prisma/client").$Enums.PlanTier;
    } | null>;
    private getTierFeatures;
    getSchoolSubscription(schoolId: string): Promise<({
        plan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
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
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
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
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
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
        plan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        };
        subscription: {
            plan: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                isActive: boolean;
                description: string | null;
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
        email: string;
        isActive: boolean;
        planAssignedAt: Date | null;
        subscriptions: ({
            plan: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                isActive: boolean;
                description: string | null;
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
        plan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            description: string | null;
            tier: import("@prisma/client").$Enums.PlanTier;
            features: string[];
        };
        subscription: {
            plan: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                isActive: boolean;
                description: string | null;
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
        subscriptions: ({
            plan: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                isActive: boolean;
                description: string | null;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        enrollmentKey: string | null;
        code: string | null;
        phone: string | null;
        address: string | null;
        timezone: string;
        logoUrl: string | null;
        isActive: boolean;
        settings: string | null;
        planId: string | null;
        planAssignedAt: Date | null;
    }[]>;
    hasFeature(schoolPlan: {
        tier: PlanTier;
    } | null, feature: string): boolean;
    getFeatureTier(feature: string): PlanTier | null;
    isFeatureAccessible(schoolPlan: {
        tier: PlanTier;
    } | null, feature: string): boolean;
    getSchoolFeatures(schoolPlan: {
        tier: PlanTier;
        features: string[];
    } | null): {
        accessible: string[];
        tier: PlanTier;
        tierLevel: number;
    };
}
