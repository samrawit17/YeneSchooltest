import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SUBSCRIPTION_STATUS } from './constants/feature-tiers.const';

describe('SubscriptionService', () => {
  const createService = () => {
    const prisma = {
      plan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
      },
      school: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    const eventBus = { emit: jest.fn() };
    return {
      prisma,
      eventBus,
      service: new SubscriptionService(prisma as any, eventBus as any),
    };
  };

  describe('hasFeature', () => {
    it('returns false when schoolPlan is null', () => {
      const { service } = createService();
      expect(service.hasFeature(null, 'GRADE_MANAGEMENT')).toBe(false);
    });

    it('returns true when feature is in plan features', () => {
      const { service } = createService();
      const plan = { tier: 'CORE' as const, features: ['GRADE_MANAGEMENT'] };
      expect(service.hasFeature(plan, 'GRADE_MANAGEMENT')).toBe(true);
    });

    it('returns true when feature is accessible via tier hierarchy', () => {
      const { service } = createService();
      const plan = { tier: 'ULTIMATE' as const, features: [] };
      expect(service.hasFeature(plan, 'GRADE_MANAGEMENT')).toBe(true);
    });

    it('returns false when feature is not in required tier', () => {
      const { service } = createService();
      const plan = { tier: 'CORE' as const, features: [] };
      expect(service.hasFeature(plan, 'EXAM_SEATING')).toBe(false);
    });

    it('normalizes feature names', () => {
      const { service } = createService();
      const plan = { tier: 'CORE' as const, features: ['grade_management'] };
      expect(service.hasFeature(plan, 'GRADE_MANAGEMENT')).toBe(true);
    });
  });

  describe('getTierLevel', () => {
    it('returns 1 for CORE', () => {
      const { service } = createService();
      expect(service.getTierLevel('CORE')).toBe(1);
    });

    it('returns 2 for STANDARD', () => {
      const { service } = createService();
      expect(service.getTierLevel('STANDARD')).toBe(2);
    });

    it('returns 3 for ULTIMATE', () => {
      const { service } = createService();
      expect(service.getTierLevel('ULTIMATE')).toBe(3);
    });
  });

  describe('getFeatureTier', () => {
    it('returns the correct tier for a feature', () => {
      const { service } = createService();
      expect(service.getFeatureTier('GRADE_MANAGEMENT')).toBe('STANDARD');
      expect(service.getFeatureTier('EXAM_SEATING')).toBe('ULTIMATE');
      expect(service.getFeatureTier('SCHOOL_PROFILE')).toBe('CORE');
    });

    it('returns null for unknown feature', () => {
      const { service } = createService();
      expect(service.getFeatureTier('UNKNOWN_FEATURE')).toBeNull();
    });
  });

  describe('isFeatureAccessible', () => {
    it('delegates to hasFeature', () => {
      const { service } = createService();
      const plan = { tier: 'STANDARD' as const, features: [] };
      expect(service.isFeatureAccessible(plan, 'GRADE_MANAGEMENT')).toBe(true);
      expect(service.isFeatureAccessible(plan, 'EXAM_SEATING')).toBe(false);
    });
  });

  describe('getSchoolFeatures', () => {
    it('returns empty accessible for null plan', () => {
      const { service } = createService();
      expect(service.getSchoolFeatures(null)).toEqual({
        accessible: [],
        tier: 'CORE',
        tierLevel: 1,
      });
    });

    it('returns features for valid plan', () => {
      const { service } = createService();
      const plan = { tier: 'ULTIMATE' as const, features: ['GRADE_MANAGEMENT', 'EXAM_SEATING'] };
      const result = service.getSchoolFeatures(plan);
      expect(result.accessible).toEqual(['GRADE_MANAGEMENT', 'EXAM_SEATING']);
      expect(result.tier).toBe('ULTIMATE');
      expect(result.tierLevel).toBe(3);
    });
  });

  describe('getAllPlans', () => {
    it('returns paginated plans with counts', async () => {
      const { prisma, service } = createService();
      prisma.plan.findMany.mockResolvedValue([
        { id: 'p1', name: 'Core', tier: 'CORE', features: [], isActive: true, description: null, createdAt: new Date(), updatedAt: new Date() },
      ]);
      prisma.plan.count.mockResolvedValue(1);
      prisma.subscription.groupBy.mockResolvedValue([
        { planId: 'p1', _count: { _all: 3 } },
      ]);

      const result = await service.getAllPlans({ skip: 0, take: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].assignedSchoolsCount).toBe(3);
    });
  });

  describe('createPlan', () => {
    it('creates a plan with normalized features', async () => {
      const { prisma, service } = createService();
      prisma.plan.create.mockResolvedValue({
        id: 'p1',
        name: 'Test Plan',
        tier: 'STANDARD',
        features: ['GRADE_MANAGEMENT', 'SCHOOL_PROFILE'],
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createPlan({
        name: 'Test Plan',
        tier: 'STANDARD',
        features: [],
      });

      expect(result.name).toBe('Test Plan');
      expect(prisma.plan.create).toHaveBeenCalled();
    });
  });

  describe('deletePlan', () => {
    it('throws when plan has schools assigned', async () => {
      const { prisma, service } = createService();
      prisma.plan.findUnique.mockResolvedValue({ id: 'p1', name: 'Test', tier: 'CORE' });
      prisma.school.count.mockResolvedValue(2);
      prisma.subscription.count.mockResolvedValue(0);

      await expect(service.deletePlan('p1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignPlanToSchool', () => {
    it('creates yearly subscription when assigning a plan', async () => {
      const { prisma, service } = createService();
      const now = new Date();
      prisma.school.findUnique.mockResolvedValue({ id: 's1', name: 'Test School' });
      prisma.plan.findFirst.mockResolvedValue({ id: 'p1', name: 'Standard' });
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          subscription: { upsert: jest.fn().mockResolvedValue({ id: 'sub-1' }) },
          school: { update: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      await service.assignPlanToSchool('s1', 'p1');

      const upsertCall = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = {
        subscription: { upsert: jest.fn() },
        school: { update: jest.fn() },
      };
      await upsertCall(mockTx);

      const upsertArgs = mockTx.subscription.upsert.mock.calls[0][0];
      expect(upsertArgs.create.status).toBe('ACTIVE');
      expect(upsertArgs.create.endDate).toBeDefined();

      const endTime = upsertArgs.create.endDate.getTime();
      const startTime = upsertArgs.create.startDate.getTime();
      const yearMs = 365 * 24 * 60 * 60 * 1000;
      expect(endTime - startTime).toBe(yearMs);
    });
  });

  describe('renewSubscription', () => {
    it('extends subscription by one year from current endDate', async () => {
      const { prisma, service } = createService();
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const mockTx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              endDate: futureDate,
              status: 'ACTIVE',
              schoolId: 's1',
              planId: 'p1',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'sub-1',
              endDate: new Date(futureDate.getTime() + 365 * 24 * 60 * 60 * 1000),
              status: 'ACTIVE',
              planId: 'p1',
              schoolId: 's1',
            }),
          },
          school: { update: jest.fn() },
        };
        return cb(mockTx);
      });

      const result = await service.renewSubscription('sub-1');
      expect(result.status).toBe('ACTIVE');

      const expectedEnd = futureDate.getTime() + 365 * 24 * 60 * 60 * 1000;
      expect(result.endDate!.getTime()).toBe(expectedEnd);
    });

    it('throws when renewing a cancelled subscription', async () => {
      const { prisma, service } = createService();
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const mockTx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              endDate: new Date(),
              status: 'CANCELLED',
              schoolId: 's1',
              planId: 'p1',
            }),
          },
        };
        return cb(mockTx);
      });

      await expect(service.renewSubscription('sub-1')).rejects.toThrow(BadRequestException);
    });

    it('renews from today if subscription already expired', async () => {
      const { prisma, service } = createService();
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const mockTx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              endDate: pastDate,
              status: 'EXPIRED',
              schoolId: 's1',
              planId: 'p1',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'sub-1',
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              status: 'ACTIVE',
              planId: 'p1',
              schoolId: 's1',
            }),
          },
          school: { update: jest.fn() },
        };
        return cb(mockTx);
      });

      const result = await service.renewSubscription('sub-1');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('createSubscription', () => {
    it('creates subscription with 1-year endDate when not specified', async () => {
      const { prisma, service } = createService();
      const startDate = new Date();
      prisma.subscription.upsert.mockResolvedValue({
        id: 'sub-1',
        startDate,
        planId: 'p1',
        schoolId: 's1',
      });
      prisma.school.update.mockResolvedValue({});

      const result = await service.createSubscription({ schoolId: 's1', planId: 'p1' });

      const upsertArgs = prisma.subscription.upsert.mock.calls[0][0];
      expect(upsertArgs.create.endDate).toBeDefined();
      expect(upsertArgs.create.status).toBe('ACTIVE');

      const endTime = upsertArgs.create.endDate.getTime();
      const startTime = upsertArgs.create.startDate.getTime();
      const yearMs = 365 * 24 * 60 * 60 * 1000;
      expect(endTime - startTime).toBe(yearMs);
    });
  });

  describe('expireSubscriptions', () => {
    it('marks expired subscriptions and clears school planId', async () => {
      const { prisma, service } = createService();
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', schoolId: 's1', planId: 'p1' },
        { id: 'sub-2', schoolId: 's2', planId: 'p2' },
      ]);

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const mockTx = {
          subscription: { updateMany: jest.fn() },
          school: { update: jest.fn() },
        };
        return cb(mockTx);
      });

      const result = await service.expireSubscriptions();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sub-1');
      expect(result[1].id).toBe('sub-2');
    });

    it('returns empty array when no expired subscriptions', async () => {
      const { prisma, service } = createService();
      prisma.subscription.findMany.mockResolvedValue([]);

      const result = await service.expireSubscriptions();
      expect(result).toEqual([]);
    });
  });
});
