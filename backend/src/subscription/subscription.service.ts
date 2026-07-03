import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { PlanTier } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  private readonly tierHierarchy: Record<PlanTier, number> = {
    CORE: 1,
    STANDARD: 2,
    ULTIMATE: 3,
  };

  private readonly featureTiers: Record<string, PlanTier> = {
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

  private normalizeFeatures(features: string[] = []) {
    const normalized = features.map((feature) => feature.trim().toUpperCase());
    const invalid = normalized.filter((feature) => !this.featureTiers[feature]);
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

    const assignedSchoolsByPlan = new Map(
      subscriptionCounts.map((row) => [row.planId, row._count._all]),
    );

    return plans.map((plan) => ({
      ...this.withEffectivePlanFeatures(plan),
      assignedSchoolsCount: assignedSchoolsByPlan.get(plan.id) || 0,
    }));
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
      if (!existingPlan) {
        throw new NotFoundException('Plan not found');
      }
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
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const schoolsWithPlan = await this.prisma.school.count({
      where: { planId: id },
    });
    const subscriptionsWithPlan = await this.prisma.subscription.count({
      where: { planId: id },
    });

    if (schoolsWithPlan > 0 || subscriptionsWithPlan > 0) {
      throw new Error(
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
    if (!school) throw new NotFoundException('School not found');

    let planName: string | null = null;
    if (planId) {
      const plan = await this.prisma.plan.findFirst({
        where: { id: planId, isActive: true },
        select: { id: true, name: true },
      });
      if (!plan) throw new NotFoundException('Active plan not found');
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

  async getSchoolPlan(schoolId: string) {
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

  private getTierFeatures(tier: PlanTier): string[] {
    const tierOrder: PlanTier[] = ['CORE', 'STANDARD', 'ULTIMATE'];
    const tierIndex = tierOrder.indexOf(tier);

    return Object.entries(this.featureTiers)
      .filter(([_, featureTier]) => tierOrder.indexOf(featureTier) <= tierIndex)
      .map(([key]) => key);
  }

  async getSchoolSubscription(schoolId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE',
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

  async updateSubscription(
    id: string,
    data: { status?: string; endDate?: Date },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.update({
        where: { id },
        data,
        include: { plan: true },
      });

      const isActive =
        subscription.status === 'ACTIVE' &&
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

  async getSchoolsByPlan(planId: string) {
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
      this.tierHierarchy[schoolPlan.tier] >= this.tierHierarchy[requiredTier]
    );
  }

  getTierLevel(tier: PlanTier): number {
    return this.tierHierarchy[tier];
  }

  getFeatureTier(feature: string): PlanTier | null {
    const normalizedFeature = this.normalizeFeatureName(feature);
    return normalizedFeature ? this.featureTiers[normalizedFeature] || null : null;
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

    const tierLevel = this.tierHierarchy[schoolPlan.tier];

    return {
      accessible: schoolPlan.features || [],
      tier: schoolPlan.tier,
      tierLevel,
    };
  }
}
