import { HttpStatus, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { PlanTier } from '@prisma/client';
import {
  FEATURE_TIERS,
  TIER_HIERARCHY,
  TIER_ORDER,
  SUBSCRIPTION_STATUS,
  VALID_STATUS_TRANSITIONS,
  type SubscriptionStatus,
} from './constants/feature-tiers.const';

export interface PaginationParams {
  skip?: number;
  take?: number;
}

const DEFAULT_PAGE_SIZE = 20;

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  private addOneYear(date: Date): Date {
    return new Date(date.getTime() + ONE_YEAR_MS);
  }

  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    if (currentStatus === newStatus) return;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${(allowed || []).join(', ') || 'none'}`,
      );
    }
  }

  private normalizeFeatures(features: string[] = []) {
    const normalized = features.map((feature) => feature.trim().toUpperCase());
    const invalid = normalized.filter((feature) => !FEATURE_TIERS[feature]);
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid subscription feature(s): ${invalid.join(', ')}`,
      );
    }
    return Array.from(new Set(normalized));
  }

  private mergeTierBaselineFeatures(tier: PlanTier, features: string[] = []) {
    return this.normalizeFeatures([...features, ...this.getTierFeatures(tier)]);
  }

  private withEffectivePlanFeatures<T extends { tier: PlanTier; features: string[] | null }>(
    plan: T,
  ): T & { features: string[] } {
    return {
      ...plan,
      features: this.mergeTierBaselineFeatures(plan.tier, plan.features || []),
    };
  }

  private buildActiveFilter() {
    return {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    };
  }

  private async syncSchoolPlan(
    tx: any,
    schoolId: string,
    planId: string | null,
    startDate: Date | null,
  ) {
    return tx.school.update({
      where: { id: schoolId },
      data: {
        planId,
        planAssignedAt: startDate,
      },
    });
  }

  async getAllPlans(pagination?: PaginationParams) {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? DEFAULT_PAGE_SIZE;

    const [plans, total, subscriptionCounts] = await Promise.all([
      this.prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { tier: 'asc' },
        skip,
        take,
      }),
      this.prisma.plan.count({ where: { isActive: true } }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        where: this.buildActiveFilter(),
        _count: { _all: true },
      }),
    ]);

    const assignedSchoolsByPlan = new Map(
      subscriptionCounts.map((row) => [row.planId, row._count._all]),
    );

    return {
      data: plans.map((plan) => ({
        ...this.withEffectivePlanFeatures(plan),
        assignedSchoolsCount: assignedSchoolsByPlan.get(plan.id) || 0,
      })),
      total,
      skip,
      take,
    };
  }

  async getPlanById(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { schools: true },
    });
    return plan ? this.withEffectivePlanFeatures(plan) : null;
  }

  async getPlanByTier(tier: PlanTier) {
    const plan = await this.prisma.plan.findUnique({
      where: { tier },
    });
    return plan ? this.withEffectivePlanFeatures(plan) : null;
  }

  async createPlan(data: {
    name: string;
    tier: PlanTier;
    description?: string;
    features: string[];
  }) {
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

  async updatePlan(
    id: string,
    data: {
      name?: string;
      description?: string;
      features?: string[];
      isActive?: boolean;
    },
  ) {
    if (data.features !== undefined) {
      const existingPlan = await this.prisma.plan.findUnique({
        where: { id },
        select: { tier: true },
      });
      if (!existingPlan) throw new LocalizedException('subscription.plan_not_found_4e904f21', undefined, HttpStatus.NOT_FOUND, 'Plan not found');
      data.features = this.mergeTierBaselineFeatures(
        existingPlan.tier,
        data.features,
      );
    }
    if (typeof data.name === 'string') {
      data.name = data.name.trim();
    }

    const plan = await this.prisma.plan.update({
      where: { id },
      data,
    });

    const changes = Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined);
    void this.eventBus.emit('subscription.plan.updated', {
      planId: plan.id,
      name: plan.name,
      tier: plan.tier,
      changes,
    });

    return this.withEffectivePlanFeatures(plan);
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      select: { id: true, name: true, tier: true },
    });
    if (!plan) throw new LocalizedException('subscription.plan_not_found_4e904f21', undefined, HttpStatus.NOT_FOUND, 'Plan not found');

    const schoolsWithPlan = await this.prisma.school.count({
      where: { planId: id },
    });
    const subscriptionsWithPlan = await this.prisma.subscription.count({
      where: { planId: id },
    });

    if (schoolsWithPlan > 0 || subscriptionsWithPlan > 0) {
      throw new BadRequestException(
        `Cannot delete plan: ${schoolsWithPlan + subscriptionsWithPlan} school subscription references are using this plan`,
      );
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

  async assignPlanToSchool(schoolId: string, planId: string | null) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true },
    });
    if (!school) throw new LocalizedException('subscription.school_not_found_c75997d5', undefined, HttpStatus.NOT_FOUND, 'School not found');

    let planName: string | null = null;
    if (planId) {
      const plan = await this.prisma.plan.findFirst({
        where: { id: planId, isActive: true },
        select: { id: true, name: true },
      });
      if (!plan) throw new LocalizedException('subscription.active_plan_not_found_9945c730', undefined, HttpStatus.NOT_FOUND, 'Active plan not found');
      planName = plan.name;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (!planId) {
        await tx.subscription.deleteMany({ where: { schoolId } });
        return this.syncSchoolPlan(tx, schoolId, null, null);
      }

      const now = new Date();
      const endDate = this.addOneYear(now);
      await tx.subscription.upsert({
        where: { schoolId },
        create: {
          schoolId,
          planId,
          status: SUBSCRIPTION_STATUS.ACTIVE,
          startDate: now,
          endDate,
        },
        update: {
          planId,
          status: SUBSCRIPTION_STATUS.ACTIVE,
          startDate: now,
          endDate,
        },
      });

      return this.syncSchoolPlan(tx, schoolId, planId, now);
    });

    void this.eventBus.emit('subscription.assigned', {
      schoolId,
      schoolName: school.name,
      planId,
      planName,
    });

    return result;
  }

  async getSchoolPlan(schoolId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        schoolId,
        status: SUBSCRIPTION_STATUS.ACTIVE,
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

  private getTierFeatures(tier: PlanTier): string[] {
    const tierIndex = TIER_ORDER.indexOf(tier);

    return Object.entries(FEATURE_TIERS)
      .filter(([_, featureTier]) => TIER_ORDER.indexOf(featureTier) <= tierIndex)
      .map(([key]) => key);
  }

  async getSchoolSubscription(schoolId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        schoolId,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
      include: { plan: true },
    });
  }

  async createSubscription(data: {
    schoolId: string;
    planId: string;
    endDate?: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const endDate = data.endDate || this.addOneYear(now);

      const subscription = await tx.subscription.upsert({
        where: { schoolId: data.schoolId },
        create: {
          schoolId: data.schoolId,
          planId: data.planId,
          startDate: now,
          endDate,
          status: SUBSCRIPTION_STATUS.ACTIVE,
        },
        update: {
          planId: data.planId,
          startDate: now,
          endDate,
          status: SUBSCRIPTION_STATUS.ACTIVE,
        },
        include: { plan: true },
      });

      await this.syncSchoolPlan(tx, data.schoolId, data.planId, subscription.startDate);

      return subscription;
    });
  }

  async updateSubscription(
    id: string,
    data: { status?: string; endDate?: Date },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { id },
        select: { status: true, schoolId: true, planId: true, startDate: true },
      });
      if (!existing) {
        throw new NotFoundException('Subscription not found');
      }

      if (data.status) {
        this.validateStatusTransition(existing.status, data.status);
      }

      const subscription = await tx.subscription.update({
        where: { id },
        data,
        include: { plan: true },
      });

      const isActive =
        subscription.status === SUBSCRIPTION_STATUS.ACTIVE &&
        (!subscription.endDate || subscription.endDate > new Date());

      await this.syncSchoolPlan(
        tx,
        subscription.schoolId,
        isActive ? subscription.planId : null,
        isActive ? subscription.startDate : null,
      );

      return subscription;
    });
  }

  async renewSubscription(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { id },
        select: { id: true, endDate: true, status: true, schoolId: true, planId: true },
      });
      if (!existing) {
        throw new NotFoundException('Subscription not found');
      }

      if (existing.status === SUBSCRIPTION_STATUS.CANCELLED) {
        throw new BadRequestException('Cannot renew a cancelled subscription');
      }

      const now = new Date();
      const baseDate =
        existing.endDate && existing.endDate > now ? existing.endDate : now;
      const newEndDate = this.addOneYear(baseDate);

      const subscription = await tx.subscription.update({
        where: { id },
        data: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          endDate: newEndDate,
        },
        include: { plan: true },
      });

      await this.syncSchoolPlan(tx, existing.schoolId, existing.planId, now);

      return subscription;
    });
  }

  async getSchoolsByPlan(planId: string, pagination?: PaginationParams) {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? DEFAULT_PAGE_SIZE;

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where: {
          subscriptions: {
            some: {
              planId,
              ...this.buildActiveFilter(),
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
              ...this.buildActiveFilter(),
            },
            include: { plan: true },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.school.count({
        where: {
          subscriptions: {
            some: {
              planId,
              ...this.buildActiveFilter(),
            },
          },
        },
      }),
    ]);

    return {
      data: schools.map((school) => ({
        ...school,
        plan: school.subscriptions[0]?.plan
          ? this.withEffectivePlanFeatures(school.subscriptions[0].plan)
          : null,
        subscription: school.subscriptions[0] || null,
      })),
      total,
      skip,
      take,
    };
  }

  async getSchoolsWithPlans(pagination?: PaginationParams) {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? DEFAULT_PAGE_SIZE;

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
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
            where: this.buildActiveFilter(),
            include: { plan: true },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.school.count(),
    ]);

    return {
      data: schools.map((school) => {
        const activeSubscription = school.subscriptions[0] || null;
        return {
          ...school,
          plan: activeSubscription?.plan
            ? this.withEffectivePlanFeatures(activeSubscription.plan)
            : null,
          subscription: activeSubscription,
        };
      }),
      total,
      skip,
      take,
    };
  }

  hasFeature(
    schoolPlan: { tier: PlanTier; features?: string[] } | null,
    feature: string,
  ): boolean {
    if (!schoolPlan) {
      return false;
    }

    const normalizedFeature = this.normalizeFeatureName(feature);
    if (!normalizedFeature) {
      return false;
    }

    const effectiveFeatures = new Set(
      (schoolPlan.features || []).map((item) => this.normalizeFeatureName(item)),
    );
    if (effectiveFeatures.has(normalizedFeature)) {
      return true;
    }

    const requiredTier = this.getFeatureTier(normalizedFeature);
    if (!requiredTier) {
      return false;
    }

    return (
      TIER_HIERARCHY[schoolPlan.tier] >= TIER_HIERARCHY[requiredTier]
    );
  }

  getTierLevel(tier: PlanTier): number {
    return TIER_HIERARCHY[tier];
  }

  getFeatureTier(feature: string): PlanTier | null {
    const normalizedFeature = this.normalizeFeatureName(feature);
    return normalizedFeature ? FEATURE_TIERS[normalizedFeature] || null : null;
  }

  isFeatureAccessible(
    schoolPlan: { tier: PlanTier; features?: string[] } | null,
    feature: string,
  ): boolean {
    return this.hasFeature(schoolPlan, feature);
  }

  private normalizeFeatureName(feature?: string | null): string {
    return (feature || '').trim().toUpperCase();
  }

  getSchoolFeatures(
    schoolPlan: { tier: PlanTier; features: string[] } | null,
  ): {
    accessible: string[];
    tier: PlanTier;
    tierLevel: number;
  } {
    if (!schoolPlan) {
      return {
        accessible: [],
        tier: 'CORE',
        tierLevel: 1,
      };
    }

    const tierLevel = TIER_HIERARCHY[schoolPlan.tier];

    return {
      accessible: schoolPlan.features || [],
      tier: schoolPlan.tier,
      tierLevel,
    };
  }

  async expireSubscriptions() {
    const now = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATUS.ACTIVE,
        endDate: { lt: now },
      },
      select: { id: true, schoolId: true, planId: true },
    });

    if (expired.length === 0) return [];

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: {
          id: { in: expired.map((s) => s.id) },
        },
        data: { status: SUBSCRIPTION_STATUS.EXPIRED },
      });

      for (const sub of expired) {
        await tx.school.update({
          where: { id: sub.schoolId },
          data: { planId: null, planAssignedAt: null },
        });
      }
    });

    return expired;
  }
}
