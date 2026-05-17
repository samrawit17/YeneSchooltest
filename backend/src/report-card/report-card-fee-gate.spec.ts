import { ForbiddenException } from '@nestjs/common';
import { ReportCardService, ReportCardStatus } from './report-card.service';

jest.mock('archiver', () => jest.fn());

describe('ReportCardService parent fee gate', () => {
  const createService = (overrides: Record<string, any> = {}) => {
    const prisma = {
      parentProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'parent-profile-1',
          schoolId: 'school-1',
        }),
      },
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'student-profile-1',
        }),
      },
      parentStudent: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'parent-student-1',
          student: { userId: 'student-user-1' },
        }),
      },
      schoolSetting: {
        findUnique: jest.fn().mockResolvedValue({ value: 'true' }),
      },
      academicYear: {
        findFirst: jest.fn().mockResolvedValue({ id: 'year-1' }),
      },
      term: {
        findFirst: jest.fn().mockResolvedValue({ id: 'term-3' }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'term-1' },
          { id: 'term-2' },
          { id: 'term-3' },
        ]),
      },
      studentFee: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      reportCard: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'report-card-1',
            studentId: 'student-user-1',
            schoolId: 'school-1',
            academicYear: '2018',
            term: 'Term 3',
            status: ReportCardStatus.PUBLISHED,
            gradeDetails: JSON.stringify([{ subject: 'Math', score: 91 }]),
          },
        ]),
      },
      ...overrides,
    };

    return {
      prisma,
      service: new ReportCardService(
        prisma as any,
        {} as any,
        {} as any,
      ),
    };
  };

  it('blocks parent report cards when the selected term fee is unpaid', async () => {
    const { service } = createService({
      studentFee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'term-fee-1',
            termId: 'term-3',
            finalAmount: 3000,
            payments: [],
          },
        ]),
      },
    });

    await expect(
      service.getPublishedReportCardsForParent('parent-user-1', 'student-user-1', {
        academicYear: '2018',
        term: 'Term 3',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns published report cards after the selected annual fee period is paid', async () => {
    const { prisma, service } = createService({
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
    });

    const cards = await service.getPublishedReportCardsForParent(
      'parent-user-1',
      'student-user-1',
      {
        academicYear: '2018',
        term: 'Term 3',
      },
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].gradeDetails).toEqual([{ subject: 'Math', score: 91 }]);
    expect(prisma.reportCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId: 'student-user-1',
          schoolId: 'school-1',
          status: ReportCardStatus.PUBLISHED,
          academicYear: '2018',
          term: 'Term 3',
        },
      }),
    );
  });
});
