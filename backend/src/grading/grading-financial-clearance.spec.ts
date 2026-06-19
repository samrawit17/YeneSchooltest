import { NotFoundException } from '@nestjs/common';
import { GradingService } from './grading.service';

describe('GradingService financial clearance', () => {
  const createService = (prisma: Record<string, any>) =>
    new GradingService(
      prisma as any,
      {} as any,
      {
        getOrSetVersioned: jest.fn(),
        invalidateNamespace: jest.fn(),
      } as any,
      {} as any,
    );

  it('blocks selected-term grades when an annual fee was paid for a different term only', async () => {
    const prisma = {
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'student-profile-1',
          userId: 'student-user-1',
        }),
      },
      studentFee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'annual-fee-1',
            termId: null,
            finalAmount: 9000,
            payments: [{ termId: 'term-1', amountPaid: 3000 }],
          },
        ]),
      },
      academicYear: {
        findUnique: jest.fn().mockResolvedValue({ schoolId: 'school-1' }),
      },
      term: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'term-1' },
          { id: 'term-2' },
          { id: 'term-3' },
        ]),
      },
      schoolSetting: {
        findFirst: jest.fn().mockResolvedValue({ value: 'TERM' }),
      },
    };
    const service = createService(prisma);

    const result = await service.verifyFinancialClearance(
      'student-user-1',
      'school-1',
      'year-1',
      'term-3',
      false,
    );

    expect(result.isCleared).toBe(false);
    expect(result.outstandingFees).toHaveLength(1);
  });

  it('clears selected-term grades when the annual period amount was paid for that term', async () => {
    const prisma = {
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'student-profile-1',
          userId: 'student-user-1',
        }),
      },
      studentFee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'annual-fee-1',
            termId: null,
            finalAmount: 9000,
            payments: [{ termId: 'term-3', amountPaid: 3000 }],
          },
        ]),
      },
      academicYear: {
        findUnique: jest.fn().mockResolvedValue({ schoolId: 'school-1' }),
      },
      term: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'term-1' },
          { id: 'term-2' },
          { id: 'term-3' },
        ]),
      },
      schoolSetting: {
        findFirst: jest.fn().mockResolvedValue({ value: 'TERM' }),
      },
    };
    const service = createService(prisma);

    const result = await service.verifyFinancialClearance(
      'student-user-1',
      'school-1',
      'year-1',
      'term-3',
      false,
    );

    expect(result.isCleared).toBe(true);
    expect(result.outstandingFees).toHaveLength(0);
  });

  it('throws when the student profile does not exist', async () => {
    const service = createService({
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.verifyFinancialClearance(
        'missing-student',
        'school-1',
        'year-1',
        'term-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes student profile lookup to the requested school', async () => {
    const prisma = {
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = createService(prisma);

    await expect(
      service.verifyFinancialClearance(
        'student-user-1',
        'school-1',
        'year-1',
        'term-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith({
      where: {
        schoolId: 'school-1',
        OR: [{ id: 'student-user-1' }, { userId: 'student-user-1' }],
      },
      select: { id: true, userId: true },
    });
  });
});
