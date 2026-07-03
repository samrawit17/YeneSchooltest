"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
let SubscriptionService = class SubscriptionService {
    prisma;
    eventBus;
    constructor(prisma, eventBus) {
        this.prisma = prisma;
        this.eventBus = eventBus;
    }
    tierHierarchy = {
        CORE: 1,
        STANDARD: 2,
        ULTIMATE: 3,
    };
    featureTiers = {
        SCHOOL_PROFILE: 'CORE',
        USER_MANAGEMENT: 'CORE',
        ACADEMIC_STRUCTURE: 'CORE',
        ATTENDANCE_TRACKING: 'CORE',
        ANNOUNCEMENTS: 'CORE',
        SCHOOL_CALENDAR: 'CORE',
        BASIC_REPORTS: 'CORE',
        NOTIFICATIONS: 'CORE',
        GRADE_MANAGEMENT: 'STANDARD',
        TIMETABLE_MANAGEMENT: 'STANDARD',
        LESSON_MANAGEMENT: 'STANDARD',
        EXAM_MANAGEMENT: 'STANDARD',
        FINANCE_MANAGEMENT: 'STANDARD',
        PARENT_PORTAL: 'STANDARD',
        MESSAGING: 'STANDARD',
        COMMUNICATION_BOOK: 'STANDARD',
        DOCUMENT_MANAGEMENT: 'STANDARD',
        ENROLLMENT_MANAGEMENT: 'STANDARD',
        CREDENTIAL_MANAGEMENT: 'STANDARD',
        DISCIPLINE_MANAGEMENT: 'STANDARD',
        REPORT_CARDS: 'STANDARD',
        EXAM_SEATING: 'ULTIMATE',
        STUDENT_PROMOTION: 'ULTIMATE',
        STUDENT_RANKINGS: 'ULTIMATE',
        STUDENT_ID_CARDS: 'ULTIMATE',
        CERTIFICATE_TEMPLATES: 'ULTIMATE',
        TEMPLATE_MANAGER: 'ULTIMATE',
        ADVANCED_ANALYTICS: 'ULTIMATE',
        CUSTOM_BRANDING: 'ULTIMATE',
        BULK_OPERATIONS: 'ULTIMATE',
        PRIORITY_SUPPORT: 'ULTIMATE',
        ADVANCED_REPORTING: 'ULTIMATE',
        DATA_EXPORT: 'ULTIMATE',
        SIREN_ALERT: 'ULTIMATE',
    };
    normalizeFeatures(features = []) {
        const normalized = features.map((feature) => feature.trim().toUpperCase());
        const invalid = normalized.filter((feature) => !this.featureTiers[feature]);
        if (invalid.length > 0) {
            throw new localization_1.LocalizedException('subscription.invalid_subscription_feature_s_b53d0d36', undefined, undefined, 'Invalid subscription feature(s): ${invalid.join(\', \')}');
        }
        return Array.from(new Set(normalized));
    }
    mergeTierBaselineFeatures(tier, features = []) {
        return this.normalizeFeatures([...features, ...this.getTierFeatures(tier)]);
    }
    withEffectivePlanFeatures(plan) {
        return {
            ...plan,
            features: this.mergeTierBaselineFeatures(plan.tier, plan.features || []),
        };
    }
    async getAllPlans() {
        const [plans, subscriptionCounts] = await Promise.all([
            this.prisma.plan.findMany({
                where: { isActive: true },
                orderBy: { tier: 'asc' },
            }),
            this.prisma.subscription.groupBy({
                by: ['planId'],
                where: {
                    status: 'ACTIVE',
                    OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
                },
                _count: { _all: true },
            }),
        ]);
        const assignedSchoolsByPlan = new Map(subscriptionCounts.map((row) => [row.planId, row._count._all]));
        return plans.map((plan) => ({
            ...this.withEffectivePlanFeatures(plan),
            assignedSchoolsCount: assignedSchoolsByPlan.get(plan.id) || 0,
        }));
    }
    async getPlanById(id) {
        const plan = await this.prisma.plan.findUnique({
            where: { id },
            include: { schools: true },
        });
        return plan ? this.withEffectivePlanFeatures(plan) : null;
    }
    async getPlanByTier(tier) {
        const plan = await this.prisma.plan.findUnique({
            where: { tier },
        });
        return plan ? this.withEffectivePlanFeatures(plan) : null;
    }
    async createPlan(data) {
        const features = this.mergeTierBaselineFeatures(data.tier, data.features);
        const plan = await this.prisma.plan.create({
            data: {
                name: data.name.trim(),
                tier: data.tier,
                description: data.description,
                features,
            },
        });
        void this.eventBus.emit('subscription.plan.created', {
            planId: plan.id,
            name: plan.name,
            tier: plan.tier,
        });
        return plan;
    }
    async updatePlan(id, data) {
        if (data.features !== undefined) {
            const existingPlan = await this.prisma.plan.findUnique({
                where: { id },
                select: { tier: true },
            });
            if (!existingPlan) {
                throw new localization_1.LocalizedException('subscription.plan_not_found_4e904f21', undefined, common_1.HttpStatus.NOT_FOUND, 'Plan not found');
            }
            data.features = this.mergeTierBaselineFeatures(existingPlan.tier, data.features);
        }
        if (typeof data.name === 'string') {
            data.name = data.name.trim();
        }
        const plan = await this.prisma.plan.update({
            where: { id },
            data,
        });
        const changes = Object.keys(data).filter((key) => data[key] !== undefined);
        void this.eventBus.emit('subscription.plan.updated', {
            planId: plan.id,
            name: plan.name,
            tier: plan.tier,
            changes,
        });
        return this.withEffectivePlanFeatures(plan);
    }
    async deletePlan(id) {
        const plan = await this.prisma.plan.findUnique({
            where: { id },
            select: { id: true, name: true, tier: true },
        });
        if (!plan) {
            throw new localization_1.LocalizedException('subscription.plan_not_found_3cb749fa', undefined, common_1.HttpStatus.NOT_FOUND, 'Plan not found');
        }
        const schoolsWithPlan = await this.prisma.school.count({
            where: { planId: id },
        });
        const subscriptionsWithPlan = await this.prisma.subscription.count({
            where: { planId: id },
        });
        if (schoolsWithPlan > 0 || subscriptionsWithPlan > 0) {
            throw new Error(`Cannot delete plan: ${schoolsWithPlan + subscriptionsWithPlan} school subscription references are using this plan`);
        }
        await this.prisma.plan.delete({
            where: { id },
        });
        void this.eventBus.emit('subscription.plan.deleted', {
            planId: plan.id,
            name: plan.name,
            tier: plan.tier,
        });
    }
    async assignPlanToSchool(schoolId, planId) {
        const school = await this.prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true },
        });
        throw new localization_1.LocalizedException('subscription.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        let planName = null;
        if (planId) {
            const plan = await this.prisma.plan.findFirst({
                where: { id: planId, isActive: true },
                select: { id: true, name: true },
            });
            throw new localization_1.LocalizedException('subscription.active_plan_not_found_9945c730', undefined, common_1.HttpStatus.NOT_FOUND, 'Active plan not found');
            planName = plan.name;
        }
        const result = await this.prisma.$transaction(async (tx) => {
            if (!planId) {
                await tx.subscription.deleteMany({ where: { schoolId } });
                return tx.school.update({
                    where: { id: schoolId },
                    data: { planId: null, planAssignedAt: null },
                    include: { plan: true },
                });
            }
            const now = new Date();
            await tx.subscription.upsert({
                where: { schoolId },
                create: {
                    schoolId,
                    planId,
                    status: 'ACTIVE',
                    startDate: now,
                },
                update: {
                    planId,
                    status: 'ACTIVE',
                    startDate: now,
                    endDate: null,
                },
            });
            return tx.school.update({
                where: { id: schoolId },
                data: {
                    planId,
                    planAssignedAt: now,
                },
                include: { plan: true },
            });
        });
        void this.eventBus.emit('subscription.assigned', {
            schoolId,
            schoolName: school.name,
            planId,
            planName,
        });
        return result;
    }
    async getSchoolPlan(schoolId) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                schoolId,
                status: 'ACTIVE',
                OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
            },
            include: { plan: true },
        });
        if (!subscription?.plan || !subscription.plan.isActive) {
            return null;
        }
        return {
            ...this.withEffectivePlanFeatures(subscription.plan),
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionStartDate: subscription.startDate,
            subscriptionEndDate: subscription.endDate,
        };
    }
    getTierFeatures(tier) {
        const tierOrder = ['CORE', 'STANDARD', 'ULTIMATE'];
        const tierIndex = tierOrder.indexOf(tier);
        return Object.entries(this.featureTiers)
            .filter(([_, featureTier]) => tierOrder.indexOf(featureTier) <= tierIndex)
            .map(([key]) => key);
    }
    async getSchoolSubscription(schoolId) {
        return this.prisma.subscription.findFirst({
            where: {
                schoolId,
                status: 'ACTIVE',
                OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
            },
            include: { plan: true },
        });
    }
    async createSubscription(data) {
        return this.prisma.$transaction(async (tx) => {
            const subscription = await tx.subscription.upsert({
                where: { schoolId: data.schoolId },
                create: {
                    schoolId: data.schoolId,
                    planId: data.planId,
                    endDate: data.endDate,
                    status: 'ACTIVE',
                },
                update: {
                    planId: data.planId,
                    endDate: data.endDate,
                    status: 'ACTIVE',
                },
                include: { plan: true },
            });
            await tx.school.update({
                where: { id: data.schoolId },
                data: { planId: data.planId, planAssignedAt: subscription.startDate },
            });
            return subscription;
        });
    }
    async updateSubscription(id, data) {
        return this.prisma.$transaction(async (tx) => {
            const subscription = await tx.subscription.update({
                where: { id },
                data,
                include: { plan: true },
            });
            const isActive = subscription.status === 'ACTIVE' &&
                (!subscription.endDate || subscription.endDate > new Date());
            await tx.school.update({
                where: { id: subscription.schoolId },
                data: {
                    planId: isActive ? subscription.planId : null,
                    planAssignedAt: isActive ? subscription.startDate : null,
                },
            });
            return subscription;
        });
    }
    async getSchoolsByPlan(planId) {
        const schools = await this.prisma.school.findMany({
            where: {
                subscriptions: {
                    some: {
                        planId,
                        status: 'ACTIVE',
                        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                planAssignedAt: true,
                _count: {
                    select: { users: true },
                },
                subscriptions: {
                    where: {
                        planId,
                        status: 'ACTIVE',
                        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
                    },
                    include: { plan: true },
                    orderBy: { startDate: 'desc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return schools.map((school) => ({
            ...school,
            plan: school.subscriptions[0]?.plan
                ? this.withEffectivePlanFeatures(school.subscriptions[0].plan)
                : null,
            subscription: school.subscriptions[0] || null,
        }));
    }
    async getSchoolsWithPlans() {
        const schools = await this.prisma.school.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                planAssignedAt: true,
                _count: {
                    select: { users: true },
                },
                subscriptions: {
                    where: {
                        status: 'ACTIVE',
                        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
                    },
                    include: { plan: true },
                    orderBy: { startDate: 'desc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return schools.map((school) => {
            const activeSubscription = school.subscriptions[0] || null;
            return {
                ...school,
                plan: activeSubscription?.plan
                    ? this.withEffectivePlanFeatures(activeSubscription.plan)
                    : null,
                subscription: activeSubscription,
            };
        });
    }
    hasFeature(schoolPlan, feature) {
        if (!schoolPlan) {
            return false;
        }
        const normalizedFeature = this.normalizeFeatureName(feature);
        if (!normalizedFeature) {
            return false;
        }
        const effectiveFeatures = new Set((schoolPlan.features || []).map((item) => this.normalizeFeatureName(item)));
        if (effectiveFeatures.has(normalizedFeature)) {
            return true;
        }
        const requiredTier = this.getFeatureTier(normalizedFeature);
        if (!requiredTier) {
            return false;
        }
        return (this.tierHierarchy[schoolPlan.tier] >= this.tierHierarchy[requiredTier]);
    }
    getTierLevel(tier) {
        return this.tierHierarchy[tier];
    }
    getFeatureTier(feature) {
        const normalizedFeature = this.normalizeFeatureName(feature);
        return normalizedFeature ? this.featureTiers[normalizedFeature] || null : null;
    }
    isFeatureAccessible(schoolPlan, feature) {
        return this.hasFeature(schoolPlan, feature);
    }
    normalizeFeatureName(feature) {
        return (feature || '').trim().toUpperCase();
    }
    getSchoolFeatures(schoolPlan) {
        if (!schoolPlan) {
            return {
                accessible: [],
                tier: 'CORE',
                tierLevel: 1,
            };
        }
        const tierLevel = this.tierHierarchy[schoolPlan.tier];
        return {
            accessible: schoolPlan.features || [],
            tier: schoolPlan.tier,
            tierLevel,
        };
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map