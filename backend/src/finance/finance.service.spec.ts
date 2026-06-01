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

  it('records payment with the selected term and an internal payment reference', async () => {
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
          receiptNumber: 'PAY-1',
        }),
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
        receiptNumber: 'PAY-20260514-0001',
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

  it('reverses payment, recalculates fee status, and audits it', async () => {
    const tx: any = {
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'payment-2',
          schoolId: 'school-1',
          studentFeeId: 'fee-1',
          amountPaid: 3000,
          receiptNumber: 'PAY-2',
          termId: 'term-2',
          studentFee: {
            finalAmount: 9000,
            status: PaymentStatus.PARTIAL,
            payments: [
              { id: 'payment-1', amountPaid: 3000 },
              { id: 'payment-2', amountPaid: 3000 },
            ],
          },
        }),
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

    expect(tx.payment.delete).toHaveBeenCalledWith({ where: { id: 'payment-2' } });
    expect(tx.studentFee.update).toHaveBeenCalledWith({
      where: { id: 'fee-1' },
      data: { status: PaymentStatus.PARTIAL },
    });
    expect(tx.financeAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PAYMENT_REVERSED',
        reference: 'PAY-2',
        amount: 3000,
      }),
    });
    expect(result).toMatchObject({
      reversed: true,
      paymentReference: 'PAY-2',
      remainingPaid: 3000,
      remainingBalance: 6000,
      status: PaymentStatus.PARTIAL,
    });
  });

  it('allows recording the full remaining annual fee even when a term is selected', async () => {
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
          payments: [{ termId: 'term-3', amountPaid: 4000 }],
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
          id: 'payment-2',
          receiptNumber: 'PAY-2',
        }),
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
        amountPaid: 5000,
        paymentMethod: 'BANK_TRANSFER',
      },
    );

    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        termId: 'term-3',
        studentFeeId: 'fee-1',
        amountPaid: 5000,
      }),
    });
    expect(tx.studentFee.update).toHaveBeenCalledWith({
      where: { id: 'fee-1' },
      data: { status: PaymentStatus.PAID },
    });
  });

  it('rejects annual-fee payments that exceed the remaining annual balance', async () => {
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
          payments: [{ termId: 'term-1', amountPaid: 4000 }],
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
          amountPaid: 6000,
          paymentMethod: 'BANK_TRANSFER',
        },
      ),
    ).rejects.toThrow('Amount exceeds the remaining annual fee balance. Remaining: 5000');
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
        findMany: jest.fn().mockResolvedValue([]),
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
        findMany: jest.fn().mockResolvedValue([]),
      },
      feeStructure: {
        findMany: jest.fn().mockResolvedValue([]),
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
      select: { id: true, startDate: true },
    });
    expect(prisma.term.findFirst).toHaveBeenCalledWith({
      where: { id: 'term-1', academicYear: { schoolId: 'school-1' } },
      select: { id: true, name: true, order: true, academicYearId: true },
    });
  });

  it('applies family discount to the third approved child and above during fee generation', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const prisma: any = {
      academicYear: {
        findFirst: jest.fn().mockResolvedValue({ id: 'year-1', schoolId: 'school-1' }),
      },
      feeStructure: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'fee-structure-1',
            schoolId: 'school-1',
            academicYearId: 'year-1',
            termId: null,
            feeType: 'TUITION',
            amount: 1000,
          },
        ]),
      },
      schoolSetting: {
        findUnique: jest.fn().mockResolvedValue({ value: '15' }),
        findMany: jest.fn().mockResolvedValue([
          { key: 'family_discount_enabled', value: 'true' },
          { key: 'family_discount_min_students', value: '3' },
          { key: 'family_discount_percent', value: '20' },
          { key: 'family_discount_fee_types', value: 'TUITION' },
        ]),
      },
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'student-profile-1', userId: 'student-user-1', createdAt },
          { id: 'student-profile-2', userId: 'student-user-2', createdAt: new Date('2026-01-02T00:00:00.000Z') },
          { id: 'student-profile-3', userId: 'student-user-3', createdAt: new Date('2026-01-03T00:00:00.000Z') },
        ]),
      },
      parentStudent: {
        findMany: jest.fn().mockResolvedValue([
          { parentId: 'parent-profile-1', studentId: 'student-profile-1', isPrimary: true },
          { parentId: 'parent-profile-1', studentId: 'student-profile-2', isPrimary: true },
          { parentId: 'parent-profile-1', studentId: 'student-profile-3', isPrimary: true },
        ]),
      },
      discountPolicy: {
        upsert: jest.fn().mockResolvedValue({ id: 'family-policy-1' }),
      },
      term: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      studentFee: {
        createMany: jest.fn().mockResolvedValue({ count: 3 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const { service } = createService({} as any, prisma);

    const result = await service.generateStudentFees({
      schoolId: 'school-1',
      academicYearId: 'year-1',
    });

    expect(result).toEqual({ created: 3, updatedDiscounts: 0 });
    expect(prisma.studentFee.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          studentId: 'student-user-1',
          discount: 0,
          finalAmount: 1000,
        }),
        expect.objectContaining({
          studentId: 'student-user-2',
          discount: 0,
          finalAmount: 1000,
        }),
        expect.objectContaining({
          studentId: 'student-user-3',
          discount: 200,
          finalAmount: 800,
          discountPolicyId: 'family-policy-1',
        }),
      ]),
      skipDuplicates: true,
    });
  });

  it('sets generated installment fee due dates from the installment month', async () => {
    const prisma: any = {
      academicYear: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'year-1', schoolId: 'school-1' })
          .mockResolvedValueOnce({
            name: '2018',
            startDate: new Date('2025-09-16T21:00:00.000Z'),
          }),
      },
      feeStructure: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'fee-structure-installment-4',
            schoolId: 'school-1',
            academicYearId: 'year-1',
            termId: null,
            feeType: 'TUITION_INSTALLMENT_4',
            amount: 20000,
          },
        ]),
      },
      schoolSetting: {
        findUnique: jest.fn().mockResolvedValue({ value: '15' }),
        findMany: jest.fn().mockResolvedValue([
          { key: 'family_discount_enabled', value: 'false' },
        ]),
      },
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'student-profile-1',
            userId: 'student-user-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ]),
      },
      studentClass: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      term: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      studentFee: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const { service } = createService({} as any, prisma);

    await service.generateStudentFees({
      schoolId: 'school-1',
      academicYearId: 'year-1',
    });

    expect(prisma.studentFee.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          feeStructureId: 'fee-structure-installment-4',
          dueDate: expect.any(Date),
        }),
      ],
      skipDuplicates: true,
    });
    const dueDate = prisma.studentFee.createMany.mock.calls[0][0].data[0].dueDate;
    expect(dueDate.getFullYear()).toBe(2025);
    expect(dueDate.getMonth()).toBe(11);
    expect(dueDate.getDate()).toBe(24);
  });

  it('only applies grade-specific fee structures to students in that grade', async () => {
    const prisma: any = {
      academicYear: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'year-1', schoolId: 'school-1' })
          .mockResolvedValueOnce({
            name: '2018',
            startDate: new Date('2025-09-16T21:00:00.000Z'),
          }),
      },
      feeStructure: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'grade-9-fee',
            schoolId: 'school-1',
            academicYearId: 'year-1',
            termId: null,
            feeType: 'TUITION_INSTALLMENT_1',
            amount: 1000,
            grade: 9,
          },
          {
            id: 'grade-10-fee',
            schoolId: 'school-1',
            academicYearId: 'year-1',
            termId: null,
            feeType: 'TUITION_INSTALLMENT_1',
            amount: 1100,
            grade: 10,
          },
        ]),
      },
      schoolSetting: {
        findUnique: jest.fn().mockResolvedValue({ value: '15' }),
        findMany: jest.fn().mockResolvedValue([
          { key: 'family_discount_enabled', value: 'false' },
        ]),
      },
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'student-profile-1',
            userId: 'student-user-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ]),
      },
      studentClass: {
        findMany: jest.fn().mockResolvedValue([
          {
            studentId: 'student-user-1',
            class: { grade: 9 },
          },
        ]),
      },
      term: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      studentFee: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const { service } = createService({} as any, prisma);

    await service.generateStudentFees({
      schoolId: 'school-1',
      academicYearId: 'year-1',
    });

    expect(prisma.studentFee.createMany.mock.calls[0][0].data).toHaveLength(1);
    expect(prisma.studentFee.createMany.mock.calls[0][0].data[0]).toEqual(
      expect.objectContaining({
        studentId: 'student-user-1',
        feeStructureId: 'grade-9-fee',
        totalAmount: 1000,
      }),
    );
  });

  it('rejects marking a draft payroll run as paid', async () => {
    const tx: any = {
      payrollRun: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'run-1',
          schoolId: 'school-1',
          status: 'DRAFT',
          paymentDate: null,
          notes: null,
        }),
        update: jest.fn(),
      },
    };
    const { service } = createService(tx);

    await expect(
      service.updatePayrollRunStatus(
        { id: 'finance-user-1' },
        'run-1',
        { schoolId: 'school-1', status: 'PAID' },
      ),
    ).rejects.toThrow('Payroll run must move from DRAFT to APPROVED before payment');
    expect(tx.payrollRun.update).not.toHaveBeenCalled();
  });

  it('blocks payroll entry changes after the parent run is paid', async () => {
    const tx: any = {
      payrollEntry: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'entry-1',
          schoolId: 'school-1',
          runId: 'run-1',
          status: 'APPROVED',
          netPay: 1000,
          run: { status: 'PAID' },
        }),
        update: jest.fn(),
      },
    };
    const { service } = createService(tx);

    await expect(
      service.updatePayrollEntryStatus(
        { id: 'finance-user-1' },
        'entry-1',
        { schoolId: 'school-1', status: 'HELD' },
      ),
    ).rejects.toThrow('Entries cannot be changed after the payroll run is final');
    expect(tx.payrollEntry.update).not.toHaveBeenCalled();
  });

  it('excludes held payroll entries from run totals', async () => {
    const tx: any = {
      payrollEntry: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'entry-1',
          schoolId: 'school-1',
          runId: 'run-1',
          status: 'PENDING',
          paymentMethod: null,
          transactionReference: null,
          notes: null,
          paidAt: null,
          netPay: 1000,
          run: { status: 'DRAFT' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'entry-1',
          status: 'HELD',
          netPay: 1000,
          transactionReference: null,
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            status: 'HELD',
            grossPay: 1000,
            deductions: 0,
            tax: 0,
            netPay: 1000,
          },
          {
            status: 'PENDING',
            grossPay: 2000,
            deductions: 200,
            tax: 100,
            netPay: 1700,
          },
        ]),
      },
      payrollRun: {
        update: jest.fn().mockResolvedValue({ id: 'run-1' }),
      },
      financeAuditLog: {
        create: jest.fn(),
      },
    };
    const { service } = createService(tx);

    await service.updatePayrollEntryStatus(
      { id: 'finance-user-1' },
      'entry-1',
      { schoolId: 'school-1', status: 'HELD' },
    );

    expect(tx.payrollRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: {
        grossAmount: 2000,
        deductionsAmount: 300,
        netAmount: 1700,
        entryCount: 1,
      },
    });
  });

  it('notifies finance when the current payroll run has not been created', async () => {
    const currentDate = new Date('2026-06-01T06:00:00.000Z');
    const expectedPeriodMonth = currentDate.getMonth() + 1;
    const expectedPeriodYear = currentDate.getFullYear();
    const expectedPeriodLabel = new Date(
      expectedPeriodYear,
      expectedPeriodMonth - 1,
      1,
    ).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    jest.useFakeTimers().setSystemTime(currentDate);
    notificationService.createNotification.mockClear();

    const prisma: any = {
      school: {
        findMany: jest.fn().mockResolvedValue([{ id: 'school-1', name: 'H&H' }]),
      },
      schoolSetting: {
        findUnique: jest.fn().mockResolvedValue({ value: 'GREGORIAN' }),
      },
      payrollRun: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'finance-user-1' }]),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const { service } = createService({} as any, prisma);

    await service.notifyFinanceToCreateCurrentPayrollRun();

    expect(prisma.payrollRun.findFirst).toHaveBeenCalledWith({
      where: {
        schoolId: 'school-1',
        periodCalendarType: 'GREGORIAN',
        periodMonth: expectedPeriodMonth,
        periodYear: expectedPeriodYear,
        status: { not: 'CANCELLED' },
      },
      select: { id: true },
    });
    expect(notificationService.createNotification).toHaveBeenCalledWith({
      schoolId: 'school-1',
      userId: 'finance-user-1',
      title: `Create ${expectedPeriodLabel} payroll run`,
      message: `No payroll run has been created for ${expectedPeriodLabel}. Create the monthly run so salaries can be reviewed, approved, and paid.`,
      type: 'PAYROLL_RUN_REQUIRED',
      actionUrl: '/finance/payroll',
      metadata: {
        periodMonth: expectedPeriodMonth,
        periodYear: expectedPeriodYear,
        periodCalendarType: 'GREGORIAN',
        reminder: 'create-payroll-run',
      },
    });

    jest.useRealTimers();
  });
});
