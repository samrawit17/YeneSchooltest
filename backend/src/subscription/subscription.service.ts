import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanTier } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getAllPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { tier: 'asc' },
    });
  }

  async getPlanById(id: string) {
    return this.prisma.plan.findUnique({
      where: { id },
      include: { schools: true },
    });
  }

  async getPlanByTier(tier: PlanTier) {
    return this.prisma.plan.findUnique({
      where: { tier },
    });
  }

  async createPlan(data: {
    name: string;
    tier: PlanTier;
    description?: string;
    features: string[];
  }) {
    const features = this.normalizeFeatures(data.features);
    return this.prisma.plan.create({
      data: {
        name: data.name.trim(),
        tier: data.tier,
        description: data.description,
        features,
      },
    });
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
    if (data.features) {
      data.features = this.normalizeFeatures(data.features);
    }
    if (data.name) {
      data.name = data.name.trim();
    }

    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }

  async deletePlan(id: string) {
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

    return this.prisma.plan.delete({
      where: { id },
    });
  }

  async assignPlanToSchool(schoolId: string, planId: string | null) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });
    if (!school) throw new NotFoundException('School not found');

    if (planId) {
      const plan = await this.prisma.plan.findFirst({
        where: { id: planId, isActive: true },
        select: { id: true },
      });
      if (!plan) throw new NotFoundException('Active plan not found');
    }

    return this.prisma.$transaction(async (tx) => {
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

    const allFeatures = this.getTierFeatures(subscription.plan.tier);
    return {
      ...subscription.plan,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionStartDate: subscription.startDate,
      subscriptionEndDate: subscription.endDate,
      features: [...new Set([...(subscription.plan.features || []), ...allFeatures])],
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
      where: { subscriptions: { some: { planId, status: 'ACTIVE' } } },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        planAssignedAt: true,
        subscriptions: {
          where: { planId, status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
        },
      },
    });

    return schools.map((school) => ({
      ...school,
      plan: school.subscriptions[0]?.plan || null,
      subscription: school.subscriptions[0] || null,
    }));
  }

  async getSchoolsWithPlans() {
    const schools = await this.prisma.school.findMany({
      include: {
        plan: true,
        subscriptions: {
          where: {
            status: 'ACTIVE',
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
          include: { plan: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return schools.map((school) => {
      const activeSubscription = school.subscriptions[0] || null;
      return {
        ...school,
        plan: activeSubscription?.plan || null,
        subscription: activeSubscription,
      };
    });
  }

  hasFeature(schoolPlan: { tier: PlanTier } | null, feature: string): boolean {
    if (!schoolPlan) {
      return false;
    }

    const requiredTier = this.getFeatureTier(feature);
    if (!requiredTier) {
      return false;
    }

    return (
      this.tierHierarchy[schoolPlan.tier] >= this.tierHierarchy[requiredTier]
    );
  }

  getFeatureTier(feature: string): PlanTier | null {
    return this.featureTiers[feature] || null;
  }

  isFeatureAccessible(
    schoolPlan: { tier: PlanTier } | null,
    feature: string,
  ): boolean {
    return this.hasFeature(schoolPlan, feature);
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
