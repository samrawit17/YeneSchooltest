import { Injectable } from '@nestjs/common';
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
    return this.prisma.plan.create({
      data: {
        name: data.name,
        tier: data.tier,
        description: data.description,
        features: data.features,
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
    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }

  async deletePlan(id: string) {
    const schoolsWithPlan = await this.prisma.school.count({
      where: { planId: id },
    });

    if (schoolsWithPlan > 0) {
      throw new Error(
        `Cannot delete plan: ${schoolsWithPlan} schools are using this plan`,
      );
    }

    return this.prisma.plan.delete({
      where: { id },
    });
  }

  async assignPlanToSchool(schoolId: string, planId: string) {
    return this.prisma.school.update({
      where: { id: schoolId },
      data: {
        planId,
        planAssignedAt: new Date(),
      },
      include: { plan: true },
    });
  }

  async getSchoolPlan(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: { plan: true },
    });

    if (!school?.plan) {
      return null;
    }

    const allFeatures = this.getTierFeatures(school.plan.tier);
    return {
      ...school.plan,
      features: [...new Set([...(school.plan.features || []), ...allFeatures])],
    };
  }

  private getTierFeatures(tier: PlanTier): string[] {
    const tierOrder: PlanTier[] = ['CORE', 'STANDARD', 'ULTIMATE'];
    const tierIndex = tierOrder.indexOf(tier);

    const featureTiers: Record<string, PlanTier> = {
      USER_MANAGEMENT: 'CORE',
      BASIC_REPORTS: 'CORE',
      NOTIFICATIONS: 'CORE',
      SCHOOL_PROFILE: 'CORE',
      ATTENDANCE_TRACKING: 'STANDARD',
      GRADE_MANAGEMENT: 'STANDARD',
      TIMETABLE_MANAGEMENT: 'STANDARD',
      EXAM_MANAGEMENT: 'STANDARD',
      EXAM_SEATING: 'ULTIMATE',
      FINANCE_MANAGEMENT: 'STANDARD',
      PARENT_PORTAL: 'STANDARD',
      MESSAGING: 'STANDARD',
      ANNOUNCEMENTS: 'STANDARD',
      DOCUMENT_MANAGEMENT: 'STANDARD',
      TRANSPORT_MANAGEMENT: 'STANDARD',
      ADVANCED_ANALYTICS: 'ULTIMATE',
      CUSTOM_BRANDING: 'ULTIMATE',
      API_ACCESS: 'ULTIMATE',
      BULK_OPERATIONS: 'ULTIMATE',
      PRIORITY_SUPPORT: 'ULTIMATE',
      CUSTOM_INTEGRATIONS: 'ULTIMATE',
      ADVANCED_REPORTING: 'ULTIMATE',
      DATA_EXPORT: 'ULTIMATE',
      SIREN_ALERT: 'ULTIMATE',
    };

    return Object.entries(featureTiers)
      .filter(([_, featureTier]) => tierOrder.indexOf(featureTier) <= tierIndex)
      .map(([key]) => key);
  }

  async getSchoolSubscription(schoolId: string) {
    return this.prisma.subscription.findUnique({
      where: { schoolId },
      include: { plan: true },
    });
  }

  async createSubscription(data: {
    schoolId: string;
    planId: string;
    endDate?: Date;
  }) {
    return this.prisma.subscription.create({
      data: {
        schoolId: data.schoolId,
        planId: data.planId,
        endDate: data.endDate,
      },
      include: { plan: true },
    });
  }

  async updateSubscription(
    id: string,
    data: { status?: string; endDate?: Date },
  ) {
    return this.prisma.subscription.update({
      where: { id },
      data,
    });
  }

  async getSchoolsByPlan(planId: string) {
    return this.prisma.school.findMany({
      where: { planId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        planAssignedAt: true,
      },
    });
  }

  async getSchoolsWithPlans() {
    return this.prisma.school.findMany({
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  hasFeature(schoolPlan: { tier: PlanTier } | null, feature: string): boolean {
    if (!schoolPlan) {
      return false;
    }

    const requiredTier = this.getFeatureTier(feature);
    if (!requiredTier) {
      return true;
    }

    return (
      this.tierHierarchy[schoolPlan.tier] >= this.tierHierarchy[requiredTier]
    );
  }

  getFeatureTier(feature: string): PlanTier | null {
    const ultimateFeatures = [
      'EXAM_SEATING',
      'ADVANCED_ANALYTICS',
      'CUSTOM_BRANDING',
      'API_ACCESS',
      'BULK_OPERATIONS',
      'PRIORITY_SUPPORT',
      'CUSTOM_INTEGRATIONS',
      'ADVANCED_REPORTING',
      'DATA_EXPORT',
    ];

    const standardFeatures = [
      'ATTENDANCE_TRACKING',
      'GRADE_MANAGEMENT',
      'TIMETABLE_MANAGEMENT',
      'EXAM_MANAGEMENT',
      'FINANCE_MANAGEMENT',
      'PARENT_PORTAL',
      'MESSAGING',
      'ANNOUNCEMENTS',
      'DOCUMENT_MANAGEMENT',
      'TRANSPORT_MANAGEMENT',
    ];

    if (ultimateFeatures.includes(feature)) {
      return 'ULTIMATE';
    }

    if (standardFeatures.includes(feature)) {
      return 'STANDARD';
    }

    return 'CORE';
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
