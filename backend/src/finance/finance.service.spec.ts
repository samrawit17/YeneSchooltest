import { PaymentStatus } from '@prisma/client';
import { FinanceService } from './finance.service';

describe('FinanceService critical payment flows', () => {
  const notificationService = {
    createNotification: jest.fn(),
  };

  const createService = (tx: any, prismaOverrides: Record<string, any> = {}) => {
    const prisma: any = {
      $transaction: jest.fn((callback) => callback(tx)),
      payment: {
        count: jest.fn().mockResolvedValue(0),
      },
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      ...prismaOverrides,
    };
    return {
      service: new FinanceService(prisma, notificationService as any),
      prisma,
    };
  };

  it('records payment with the selected term and creates a matching receipt', async () => {
    const paymentDate = new Date('2026-05-14T00:00:00.000Z');
    const tx: any = {
      studentFee: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'fee-1',
          schoolId: 'school-1',
          studentId: 'student-user-1',
          academicYearId: 'year-1',
          termId: null,
          finalAmount: 9000,
          status: PaymentStatus.PENDING,
          payments: [],
        }),
        update: jest.fn(),
      },
      term: {
        findFirst: jest.fn().mockResolvedValue({ id: 'term-3' }),
        count: jest.fn().mockResolvedValue(3),
      },
      schoolSetting: {
        findFirst: jest.fn(),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'payment-1',
          receiptNumber: 'RCPT-1',
        }),
      },
      receipt: {
        create: jest.fn(),
      },
      financeAuditLog: {
        create: jest.fn(),
      },
    };
    const { service } = createService(tx);

    await service.recordPayment(
      { id: 'finance-user-1' },
      {
        schoolId: 'school-1',
        studentFeeId: 'fee-1',
        studentId: 'student-user-1',
        termId: 'term-3',
        amountPaid: 3000,
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: paymentDate.toISOString(),
      },
    );

    expect(tx.term.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'term-3',
        academicYearId: 'year-1',
        academicYear: { schoolId: 'school-1' },
      },
      select: { id: true },
    });
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        termId: 'term-3',
        studentFeeId: 'fee-1',
        amountPaid: 3000,
        receiptNumber: 'RCPT-20260514-0001',
      }),
    });
    expect(tx.receipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentId: 'payment-1',
        receiptNumber: 'RCPT-1',
        amountPaid: 3000,
      }),
    });
  });

  it('rejects payment when the selected term is outside the fee academic year', async () => {
    const tx: any = {
      studentFee: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'fee-1',
          schoolId: 'school-1',
          studentId: 'student-user-1',
          academicYearId: 'year-1',
          termId: null,
          finalAmount: 9000,
          payments: [],
        }),
      },
      term: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const { service } = createService(tx);

    await expect(
      service.recordPayment(
        { id: 'finance-user-1' },
        {
          schoolId: 'school-1',
          studentFeeId: 'fee-1',
          studentId: 'student-user-1',
          termId: 'other-year-term',
          amountPaid: 3000,
          paymentMethod: 'BANK_TRANSFER',
        },
      ),
    ).rejects.toThrow('Selected payment period does not match this fee academic year');
  });

  it('rejects payment when the selected fee belongs to a different student', async () => {
    const tx: any = {
      studentFee: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'fee-1',
          schoolId: 'school-1',
          studentId: 'student-user-2',
          academicYearId: 'year-1',
          termId: null,
          finalAmount: 9000,
          payments: [],
        }),
      },
    };
    const { service } = createService(tx);

    await expect(
      service.recordPayment(
        { id: 'finance-user-1' },
        {
          schoolId: 'school-1',
          studentFeeId: 'fee-1',
          studentId: 'student-user-1',
          termId: 'term-3',
          amountPaid: 3000,
          paymentMethod: 'BANK_TRANSFER',
        },
      ),
    ).rejects.toThrow('Fee does not match this student');
  });

  it('reverses payment, deletes receipt, recalculates fee status, and audits it', async () => {
    const tx: any = {
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'payment-2',
          schoolId: 'school-1',
          studentFeeId: 'fee-1',
          amountPaid: 3000,
          receiptNumber: 'RCPT-2',
          termId: 'term-2',
          studentFee: {
            finalAmount: 9000,
            status: PaymentStatus.PARTIAL,
            payments: [
              { id: 'payment-1', amountPaid: 3000 },
              { id: 'payment-2', amountPaid: 3000 },
            ],
          },
          receipt: { id: 'receipt-2' },
        }),
        delete: jest.fn(),
      },
      receipt: {
        delete: jest.fn(),
      },
      studentFee: {
        update: jest.fn(),
      },
      financeAuditLog: {
        create: jest.fn(),
      },
    };
    const { service } = createService(tx);

    const result = await service.reversePayment(
      { id: 'finance-user-1' },
      'school-1',
      'payment-2',
      'Wrong term selected',
    );

    expect(tx.receipt.delete).toHaveBeenCalledWith({ where: { id: 'receipt-2' } });
    expect(tx.payment.delete).toHaveBeenCalledWith({ where: { id: 'payment-2' } });
    expect(tx.studentFee.update).toHaveBeenCalledWith({
      where: { id: 'fee-1' },
      data: { status: PaymentStatus.PARTIAL },
    });
    expect(tx.financeAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PAYMENT_REVERSED',
        reference: 'RCPT-2',
        amount: 3000,
      }),
    });
    expect(result).toMatchObject({
      reversed: true,
      receiptNumber: 'RCPT-2',
      remainingPaid: 3000,
      remainingBalance: 6000,
      status: PaymentStatus.PARTIAL,
    });
  });

  it('rejects duplicate payment for the same selected annual-fee term', async () => {
    const tx: any = {
      studentFee: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'fee-1',
          schoolId: 'school-1',
          studentId: 'student-user-1',
          academicYearId: 'year-1',
          termId: null,
          finalAmount: 9000,
          status: PaymentStatus.PARTIAL,
          payments: [{ termId: 'term-3', amountPaid: 3000 }],
        }),
      },
      term: {
        findFirst: jest.fn().mockResolvedValue({ id: 'term-3' }),
        count: jest.fn().mockResolvedValue(3),
      },
      schoolSetting: {
        findFirst: jest.fn(),
      },
    };
    const { service } = createService(tx);

    await expect(
      service.recordPayment(
        { id: 'finance-user-1' },
        {
          schoolId: 'school-1',
          studentFeeId: 'fee-1',
          studentId: 'student-user-1',
          termId: 'term-3',
          amountPaid: 3000,
          paymentMethod: 'BANK_TRANSFER',
        },
      ),
    ).rejects.toThrow('This term or semester is already fully paid');
  });

  it('school-scopes student fee summary lookup, academic year, and term', async () => {
    const prisma: any = {
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'student-profile-1',
          userId: 'student-user-1',
          studentCode: 'S-001',
          academicYear: '2026',
          section: 'A',
          user: { name: 'Student One' },
        }),
      },
      academicYear: {
        findFirst: jest.fn().mockResolvedValue({ id: 'year-1' }),
      },
      term: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'term-1',
          name: 'Term 1',
          order: 1,
          academicYearId: 'year-1',
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      schoolSetting: {
        findUnique: jest.fn().mockResolvedValue({ value: 'TERM' }),
      },
      studentFee: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const { service } = createService({} as any, prisma);

    await service.getStudentFeeSummary(
      'school-1',
      'student-user-1',
      'year-1',
      'term-1',
    );

    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith({
      where: {
        schoolId: 'school-1',
        OR: [{ id: 'student-user-1' }, { userId: 'student-user-1' }],
      },
      include: { user: { select: { name: true } } },
    });
    expect(prisma.academicYear.findFirst).toHaveBeenCalledWith({
      where: { id: 'year-1', schoolId: 'school-1' },
      select: { id: true },
    });
    expect(prisma.term.findFirst).toHaveBeenCalledWith({
      where: { id: 'term-1', academicYear: { schoolId: 'school-1' } },
      select: { id: true, name: true, order: true, academicYearId: true },
    });
  });
});
