import { SubscriptionService } from './subscription.service';
import { PlanTier } from '@prisma/client';
export declare class SubscriptionController {
    private readonly subscriptionService;
    constructor(subscriptionService: SubscriptionService);
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
    getPlanById(id: string): Promise<{
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
    }>;
    createPlan(body: {
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
    updatePlan(id: string, body: {
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
    assignPlanToSchool(body: {
        schoolId: string;
        planId: string | null;
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
    getSchoolPlan(req: any, schoolId: string): Promise<{
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
    } | {
        tier: "CORE";
        features: never[];
    }>;
    getSchoolSubscription(req: any, schoolId: string): Promise<({
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
    createSubscription(body: {
        schoolId: string;
        planId: string;
        endDate?: string;
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
    updateSubscription(id: string, body: {
        status?: string;
        endDate?: string;
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
    getSchoolsWithPlans(planId?: string): Promise<{
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
    checkFeature(req: any, schoolId: string, feature: string): Promise<{
        hasAccess: boolean;
        feature: string;
        tier: import("@prisma/client").$Enums.PlanTier;
    }>;
    private assertSameSchoolOrSuperAdmin;
}
