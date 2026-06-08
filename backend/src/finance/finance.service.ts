import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Prisma } from '@prisma/client';
import { Role } from '../auth/types/role.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';
import {
  CreateFeeStructureDto,
  UpdateFeeStructureDto,
  GenerateStudentFeesDto,
  StudentFeesQueryDto,
  RecordPaymentDto,
  ReportQueryDto,
  CalculateInstallmentFeesDto,
  GenerateInstallmentFeesDto,
  CreatePayrollRunDto,
  PayrollQueryDto,
  UpdatePayrollEntryStatusDto,
  UpdatePayrollRunStatusDto,
  UpsertPayrollSalaryDto,
} from './dto/finance.dto';
import {
  CalendarType,
  ETHIOPIAN_MONTH_NAMES,
  formatSchoolDate,
  toEthiopianDate,
  toGregorianDate,
} from '../common/date.util';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly FAMILY_DISCOUNT_POLICY_NAME = 'Automatic Family Discount';

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async assertStudentFeeSummaryAccess(
    user: { id?: string; role?: string; schoolId?: string } | undefined,
    schoolId: string,
    studentId: string,
  ) {
    if (!user?.id) {
      throw new ForbiddenException('Authentication required');
    }

    const normalizedUserRole = String(user.role || '').trim().toUpperCase();
    const elevatedRoles = new Set([
      Role.ADMIN,
      Role.IT_MANAGER,
      Role.FINANCE,
      Role.REGISTRAR,
      Role.SUPER_ADMIN,
    ]);
    if (normalizedUserRole && elevatedRoles.has(normalizedUserRole as Role)) {
      return;
    }

    if (normalizedUserRole === Role.STUDENT) {
      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: {
          schoolId,
          OR: [{ id: studentId }, { userId: studentId }, { userId: user.id }],
        },
        select: { id: true, userId: true },
      });

      if (
        studentProfile &&
        (studentProfile.id === studentId ||
          studentProfile.userId === studentId ||
          studentProfile.userId === user.id)
      ) {
        return;
      }

      throw new ForbiddenException(
        'You can only view your own fee summary',
      );
    }

    if (normalizedUserRole === Role.PARENT) {
      const parentProfile = await this.prisma.parentProfile.findFirst({
        where: {
          schoolId,
          OR: [{ id: user.id }, { userId: user.id }],
        },
        select: { id: true, userId: true },
      });
      if (!parentProfile) {
        throw new ForbiddenException('Parent profile not found');
      }

      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: { schoolId, OR: [{ id: studentId }, { userId: studentId }] },
        select: { id: true, userId: true },
      });
      if (!studentProfile) {
        throw new ForbiddenException('Student not found');
      }

      const possibleParentIds = [
        parentProfile.id,
        parentProfile.userId,
        user.id,
      ].filter((value): value is string => Boolean(value));
      const possibleStudentIds = [
        studentProfile.id,
        studentProfile.userId,
        studentId,
      ].filter((value): value is string => Boolean(value));

      const link = await this.prisma.parentStudent.findFirst({
        where: {
          schoolId,
          parentId: { in: possibleParentIds },
          studentId: { in: possibleStudentIds },
        },
        select: { studentId: true },
      });

      if (link) return;

      throw new ForbiddenException(
        'You can only view your linked children fee summaries',
      );
    }

    throw new ForbiddenException('You are not allowed to view this fee summary');
  }

  private async formatPaymentsWithStudentContext(
    payments: Array<{
      id: string;
      receiptNumber: string;
      transactionReference?: string | null;
      studentId: string;
      paymentMethod: string;
      amountPaid: number;
      receivedById: string | null;
      paymentDate: Date;
      notes: string | null;
      termId?: string | null;
      term?: { id: string; name: string } | null;
      studentFee?: {
        academicYearId?: string | null;
        termId?: string | null;
        term?: { id: string; name: string } | null;
        feeStructure?: { feeType?: string | null } | null;
      } | null;
    }>,
  ) {
    if (payments.length === 0) return [];

    const rawStudentIds = [...new Set(payments.map((p) => p.studentId).filter(Boolean))];

    const students = await this.prisma.studentProfile.findMany({
      where: {
        OR: [{ id: { in: rawStudentIds } }, { userId: { in: rawStudentIds } }],
      },
      include: { user: { select: { name: true } } },
    });

    const studentByAnyId = new Map<
      string,
      { profileId: string; userId: string | null; name: string }
    >();
    students.forEach((student) => {
      const payload = {
        profileId: student.id,
        userId: student.userId,
        name: student.user?.name || 'N/A',
      };
      studentByAnyId.set(student.id, payload);
      if (student.userId) {
        studentByAnyId.set(student.userId, payload);
      }
    });

    const academicYearIds = [
      ...new Set(
        payments
          .map((payment) => payment.studentFee?.academicYearId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const academicYears = academicYearIds.length
      ? await this.prisma.academicYear.findMany({
          where: { id: { in: academicYearIds } },
          select: { id: true, name: true },
        })
      : [];

    const academicYearNameById = new Map(
      academicYears.map((academicYear) => [academicYear.id, academicYear.name]),
    );

    const studentRosterIds = [
      ...new Set(
        students.flatMap((student) =>
          [student.id, student.userId].filter(
            (value): value is string => Boolean(value),
          ),
        ),
      ),
    ];
    const academicYearNames = [...new Set(academicYears.map((year) => year.name))];

    const studentClasses =
      studentRosterIds.length > 0 && academicYearNames.length > 0
        ? await this.prisma.studentClass.findMany({
            where: {
              studentId: { in: studentRosterIds },
              academicYear: { in: academicYearNames },
            },
            include: {
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          })
        : [];

    const classByProfileAndYear = new Map<
      string,
      { grade: string | null; section: string | null }
    >();
    studentClasses.forEach((studentClass) => {
      classByProfileAndYear.set(
        `${studentClass.studentId}:${studentClass.academicYear}`,
        {
          grade: studentClass.class?.name || null,
          section: studentClass.section?.name || null,
        },
      );
    });

    return payments.map((payment) => {
      const student = studentByAnyId.get(payment.studentId);
      const academicYearName = payment.studentFee?.academicYearId
        ? academicYearNameById.get(payment.studentFee.academicYearId) || null
        : null;
      const classInfo = student && academicYearName
        ? classByProfileAndYear.get(`${student.profileId}:${academicYearName}`) ||
          (student.userId
            ? classByProfileAndYear.get(`${student.userId}:${academicYearName}`)
            : null)
        : null;

      return {
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        paymentReference: payment.receiptNumber,
        transactionReference: payment.transactionReference || null,
        studentName: student?.name || 'N/A',
        studentId: payment.studentId,
        className: classInfo?.grade || 'N/A',
        grade: classInfo?.grade || 'N/A',
        section: classInfo?.section || 'N/A',
        paymentMethod: payment.paymentMethod,
        amountPaid: payment.amountPaid,
        recordedBy: payment.receivedById,
        paymentDate: payment.paymentDate.toISOString(),
        notes: payment.notes,
        termId:
          payment.termId ||
          payment.term?.id ||
          payment.studentFee?.termId ||
          payment.studentFee?.term?.id ||
          null,
        termName:
          payment.term?.name ||
          payment.studentFee?.term?.name ||
          null,
        feeType: payment.studentFee?.feeStructure?.feeType || null,
      };
    });
  }

  // ========================================================
  // INTELLIGENT FEE CALCULATION HELPER METHODS
  // ========================================================

  private async getFeeCollectionModeInternal(
    schoolId: string,
  ): Promise<string> {
    const [feeStructureMode, curriculumType] = await Promise.all([
      this.prisma.schoolSetting.findUnique({
        where: { schoolId_key: { schoolId, key: 'fee_structure_mode' } },
      }),
      this.prisma.schoolSetting.findUnique({
        where: { schoolId_key: { schoolId, key: 'curriculum_type' } },
      }),
    ]);

    return feeStructureMode?.value || curriculumType?.value || 'TERM';
  }

  private getInstallmentCountInternal(feeCollectionMode: string): number {
    const modeMap: Record<string, number> = {
      QUARTER: 4,
      QUARTERLY: 4,
      SEMESTER: 2,
      SEMESTERLY: 2,
      TERM: 3,
      TERMLY: 3,
      MONTH: 12,
      MONTHLY: 12,
      YEARLY: 1,
      YEAR: 1,
    };
    return modeMap[feeCollectionMode] || 3;
  }

  private calculateInstallmentAmountInternal(
    annualAmount: number,
    feeCollectionMode: string,
  ): number {
    const count = this.getInstallmentCountInternal(feeCollectionMode);
    return Math.round((annualAmount / count) * 100) / 100;
  }

  private calculateRemainderInternal(
    annualAmount: number,
    feeCollectionMode: string,
  ): number {
    const count = this.getInstallmentCountInternal(feeCollectionMode);
    const installmentAmount = Math.floor((annualAmount / count) * 100) / 100;
    return Math.round((annualAmount - installmentAmount * count) * 100) / 100;
  }

  private getInstallmentPeriodLabel(
    feeCollectionMode: string,
    index: number,
    academicYearStartDate?: Date | null,
    term?: { name?: string | null } | null,
    calendarType?: CalendarType | string | null,
  ): string {
    const resolvedCalendarType =
      String(calendarType || '').toUpperCase() === 'GREGORIAN'
        ? 'GREGORIAN'
        : 'ETHIOPIAN';
    const normalizedMode = String(feeCollectionMode || '').toUpperCase();
    if (term?.name) {
      return term.name;
    }

    const modeLabels: Record<string, string> = {
      MONTH: 'Month',
      MONTHLY: 'Month',
      QUARTER: 'Quarter',
      QUARTERLY: 'Quarter',
      SEMESTER: 'Semester',
      SEMESTERLY: 'Semester',
      TERM: 'Term',
      TERMLY: 'Term',
      YEAR: 'Full Year',
      YEARLY: 'Full Year',
    };

    if (
      ['MONTH', 'MONTHLY'].includes(normalizedMode) &&
      academicYearStartDate &&
      !Number.isNaN(academicYearStartDate.getTime())
    ) {
      const targetDate = new Date(academicYearStartDate);
      targetDate.setMonth(targetDate.getMonth() + index);
      if (resolvedCalendarType === 'GREGORIAN') {
        return targetDate.toLocaleDateString('en-US', { month: 'long' });
      }
      const ethiopianDate = toEthiopianDate(targetDate);
      return ETHIOPIAN_MONTH_NAMES[ethiopianDate.month - 1] || `Month ${index + 1}`;
    }

    const label = modeLabels[normalizedMode] || 'Installment';
    return normalizedMode === 'YEAR' || normalizedMode === 'YEARLY'
      ? label
      : `${label} ${index + 1}`;
  }

  private getFeeStructureInstallmentIndex(feeType?: string | null) {
    const match = String(feeType || '').match(/_INSTALLMENT_(\d+)$/i);
    return match ? Number(match[1]) : null;
  }

  private getClassGradeNumber(classInfo?: {
    grade?: number | null;
    name?: string | null;
  } | null) {
    if (classInfo?.grade != null && Number.isFinite(Number(classInfo.grade))) {
      return Number(classInfo.grade);
    }

    const match = String(classInfo?.name || '').match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  private getStudentFeeDueDate(params: {
    academicYearStartDate?: Date | null;
    termStartDate?: Date | null;
    feeType?: string | null;
    dueDay: number;
    calendarType?: CalendarType | string | null;
  }) {
    const installmentIndex = this.getFeeStructureInstallmentIndex(params.feeType);
    const resolvedCalendarType =
      String(params.calendarType || '').toUpperCase() === 'GREGORIAN'
        ? 'GREGORIAN'
        : 'ETHIOPIAN';
    const safeDueDay = Math.max(1, Math.min(31, Number(params.dueDay) || 15));

    if (
      resolvedCalendarType === 'ETHIOPIAN' &&
      params.academicYearStartDate &&
      installmentIndex &&
      !Number.isNaN(new Date(params.academicYearStartDate).getTime()) &&
      !params.termStartDate
    ) {
      const startEth = toEthiopianDate(new Date(params.academicYearStartDate));
      const zeroBasedMonth = startEth.month - 1 + installmentIndex - 1;
      const year = startEth.year + Math.floor(zeroBasedMonth / 13);
      const month = (zeroBasedMonth % 13) + 1;
      const day = Math.min(safeDueDay, this.getEthiopianMonthLength(year, month));
      return toGregorianDate({ year, month, day });
    }

    const baseDate = params.termStartDate
      ? new Date(params.termStartDate)
      : installmentIndex && params.academicYearStartDate
        ? new Date(params.academicYearStartDate)
        : new Date();

    if (resolvedCalendarType === 'ETHIOPIAN') {
      const baseEth = toEthiopianDate(baseDate);
      const day = Math.min(
        safeDueDay,
        this.getEthiopianMonthLength(baseEth.year, baseEth.month),
      );
      return toGregorianDate({ year: baseEth.year, month: baseEth.month, day });
    }

    if (
      !params.termStartDate &&
      installmentIndex &&
      params.academicYearStartDate
    ) {
      baseDate.setMonth(baseDate.getMonth() + installmentIndex - 1);
    }

    const dueDate = new Date(baseDate);
    dueDate.setDate(1);
    const lastDayOfMonth = new Date(
      dueDate.getFullYear(),
      dueDate.getMonth() + 1,
      0,
    ).getDate();
    dueDate.setDate(Math.min(safeDueDay, lastDayOfMonth));
    return dueDate;
  }

  private getEthiopianMonthLength(year: number, month: number) {
    if (month >= 1 && month <= 12) return 30;
    return year % 4 === 3 ? 6 : 5;
  }

  private normalizeFeeBreakdownType(feeType?: string | null) {
    return String(feeType || '')
      .trim()
      .toUpperCase()
      .replace(/_INSTALLMENT_\d+$/i, '')
      .replace(/_ANNUAL$/i, '');
  }

  private formatFeeTypeLabel(feeType?: string | null) {
    return this.normalizeFeeBreakdownType(feeType)
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }

  private getInstallmentRangeForTerm(
    academicYearStartDate: Date | null | undefined,
    term: { startDate?: Date | null; endDate?: Date | null } | null,
    installmentCount: number,
  ) {
    if (
      !academicYearStartDate ||
      !term?.startDate ||
      installmentCount <= 1 ||
      Number.isNaN(academicYearStartDate.getTime()) ||
      Number.isNaN(term.startDate.getTime())
    ) {
      return null;
    }

    const monthDiff = (date: Date) =>
      (date.getFullYear() - academicYearStartDate.getFullYear()) * 12 +
      (date.getMonth() - academicYearStartDate.getMonth());
    const start = Math.max(1, Math.min(installmentCount, monthDiff(term.startDate) + 1));
    const end = term.endDate && !Number.isNaN(term.endDate.getTime())
      ? Math.max(start, Math.min(installmentCount, monthDiff(term.endDate) + 1))
      : start;

    return { start, end };
  }

  private async getTermsForAcademicYear(
    academicYearId: string,
  ): Promise<any[]> {
    return this.prisma.term.findMany({
      where: { academicYearId },
      orderBy: { order: 'asc' },
    });
  }

  private async assertAcademicYearInSchool(
    schoolId: string,
    academicYearId: string,
  ) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true, name: true },
    });
    if (!academicYear) {
      throw new Error('Academic year not found for this school');
    }
    return academicYear;
  }

  private async assertTermInSchool(schoolId: string, termId?: string) {
    if (!termId || termId === 'all') return null;

    const term = await this.prisma.term.findFirst({
      where: { id: termId, academicYear: { schoolId } },
      select: {
        id: true,
        name: true,
        order: true,
        academicYearId: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!term) {
      throw new Error('Term not found for this school');
    }
    return term;
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyParentsForStartingCurriculumPeriods() {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const startingTerms = await this.prisma.term.findMany({
      where: {
        startDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        academicYear: {
          select: {
            id: true,
            schoolId: true,
            name: true,
          },
        },
      },
    });

    for (const term of startingTerms) {
      try {
        await this.notifyParentsForTermFeeDue(term);
      } catch (error: any) {
        this.logger.error(
          `Failed to send fee reminders for ${term.name}: ${error?.message || error}`,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyFinanceForUpcomingPayrollPayments() {
    for (const daysBefore of [5, 2]) {
      const targetStart = new Date();
      targetStart.setDate(targetStart.getDate() + daysBefore);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(targetStart);
      targetEnd.setHours(23, 59, 59, 999);

      const payrollRuns = await this.prisma.payrollRun.findMany({
        where: {
          status: { notIn: ['PAID', 'CANCELLED'] },
          paymentDate: {
            gte: targetStart,
            lte: targetEnd,
          },
        },
        select: {
          id: true,
          schoolId: true,
          title: true,
          periodMonth: true,
          periodYear: true,
          periodCalendarType: true,
          paymentDate: true,
          netAmount: true,
        },
      });

      for (const run of payrollRuns) {
        try {
          await this.notifyFinanceForPayrollRunDue(run, daysBefore);
        } catch (error: any) {
          this.logger.error(
            `Failed to send payroll reminder for ${run.title}: ${error?.message || error}`,
          );
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyFinanceToCreateCurrentPayrollRun() {
    const schools = await this.prisma.school.findMany({
      where: {
        isActive: true,
        payrollSalaries: { some: { isActive: true } },
      },
      select: { id: true, name: true },
    });

    for (const school of schools) {
      try {
        const calendarType = await this.getSchoolCalendarType(school.id);
        const period = this.getCurrentPayrollPeriod(calendarType);
        const existingRun = await this.prisma.payrollRun.findFirst({
          where: {
            schoolId: school.id,
            periodCalendarType: calendarType,
            periodMonth: period.month,
            periodYear: period.year,
            status: { not: 'CANCELLED' },
          },
          select: { id: true },
        });

        if (existingRun) continue;

        await this.notifyFinanceForMissingPayrollRun(
          school,
          period.month,
          period.year,
          calendarType,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to send payroll run creation reminder for ${school.name}: ${error?.message || error}`,
        );
      }
    }
  }

  private async getSchoolCalendarType(schoolId: string): Promise<CalendarType> {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'calendar_type' } },
      select: { value: true },
    });
    return setting?.value === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN';
  }

  private getCurrentPayrollPeriod(calendarType: CalendarType) {
    const today = new Date();
    if (calendarType === 'ETHIOPIAN') {
      const ethiopian = toEthiopianDate(today);
      return { month: ethiopian.month, year: ethiopian.year };
    }

    return { month: today.getMonth() + 1, year: today.getFullYear() };
  }

  private getPayrollPeriodLabel(
    month: number,
    year: number,
    calendarType: CalendarType,
  ) {
    if (calendarType === 'ETHIOPIAN') {
      const monthName = ETHIOPIAN_MONTH_NAMES[month - 1] || `Month ${month}`;
      return `${monthName} ${year} E.C.`;
    }

    return new Date(year, month - 1, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  private async notifyFinanceForMissingPayrollRun(
    school: { id: string; name: string },
    periodMonth: number,
    periodYear: number,
    calendarType: CalendarType,
  ) {
    const financeUsers = await this.prisma.user.findMany({
      where: {
        schoolId: school.id,
        role: Role.FINANCE,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (financeUsers.length === 0) return;

    const periodLabel = this.getPayrollPeriodLabel(
      periodMonth,
      periodYear,
      calendarType,
    );
    const title = `Create ${periodLabel} payroll run`;
    const message = `No payroll run has been created for ${periodLabel}. Create the monthly run so salaries can be reviewed, approved, and paid.`;
    const metadata = {
      periodMonth,
      periodYear,
      periodCalendarType: calendarType,
      reminder: 'create-payroll-run',
    };

    for (const financeUser of financeUsers) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          schoolId: school.id,
          userId: financeUser.id,
          type: NotificationType.PAYROLL_RUN_REQUIRED,
          metadata: {
            contains: `"periodCalendarType":"${calendarType}"`,
          },
          AND: [
            { metadata: { contains: `"periodMonth":${periodMonth}` } },
            { metadata: { contains: `"periodYear":${periodYear}` } },
            { metadata: { contains: `"reminder":"create-payroll-run"` } },
          ],
        },
        select: { id: true },
      });

      if (existing) continue;

      await this.notificationService.createNotification({
        schoolId: school.id,
        userId: financeUser.id,
        title,
        message,
        type: NotificationType.PAYROLL_RUN_REQUIRED,
        actionUrl: '/finance/payroll',
        metadata,
      });
    }
  }

  private async notifyFinanceForPayrollRunDue(
    run: {
      id: string;
      schoolId: string;
      title: string;
      periodMonth: number;
      periodYear: number;
      periodCalendarType?: string | null;
      paymentDate: Date | null;
      netAmount: number;
    },
    daysBefore: number,
  ) {
    const financeUsers = await this.prisma.user.findMany({
      where: {
        schoolId: run.schoolId,
        role: Role.FINANCE,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (financeUsers.length === 0) return;

    const schoolCalendarType = await this.getSchoolCalendarType(run.schoolId);
    const calendarType: CalendarType =
      run.periodCalendarType === 'ETHIOPIAN' ||
      run.periodCalendarType === 'GREGORIAN'
        ? run.periodCalendarType
        : schoolCalendarType;
    const periodLabel = this.getPayrollPeriodLabel(
      run.periodMonth,
      run.periodYear,
      calendarType,
    );
    const paymentDateLabel = run.paymentDate
      ? formatSchoolDate(run.paymentDate, { calendarType })
      : 'the scheduled payment date';
    const amount = new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 0,
    }).format(run.netAmount);
    const title = `${periodLabel} payroll payment due in ${daysBefore} days`;
    const message = `${periodLabel} payroll is scheduled for payment on ${paymentDateLabel}. Net payroll: ${amount}.`;
    const metadata = {
      payrollRunId: run.id,
      daysBefore,
      paymentDate: run.paymentDate?.toISOString() || null,
      periodMonth: run.periodMonth,
      periodYear: run.periodYear,
      periodCalendarType: calendarType,
    };

    for (const financeUser of financeUsers) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          schoolId: run.schoolId,
          userId: financeUser.id,
          type: NotificationType.PAYROLL_PAYMENT_DUE,
          metadata: { contains: `"payrollRunId":"${run.id}"` },
          AND: [
            { metadata: { contains: `"daysBefore":${daysBefore}` } },
          ],
        },
        select: { id: true },
      });

      if (existing) continue;

      await this.notificationService.createNotification({
        schoolId: run.schoolId,
        userId: financeUser.id,
        title,
        message,
        type: NotificationType.PAYROLL_PAYMENT_DUE,
        actionUrl: '/finance/payroll',
        metadata,
      });
    }
  }

  async sendPeriodFeeReminders(schoolId: string, termId: string) {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, academicYear: { schoolId } },
      include: {
        academicYear: {
          select: {
            id: true,
            schoolId: true,
            name: true,
          },
        },
      },
    });

    if (!term) {
      throw new Error('Selected curriculum period was not found for this school');
    }

    const sent = await this.notifyParentsForTermFeeDue(term, true);
    return { sent, termName: term.name };
  }

  private async notifyParentsForTermFeeDue(term: {
    id: string;
    name: string;
    academicYearId: string;
    academicYear: { id: string; schoolId: string; name: string };
  }, force = false) {
    const schoolId = term.academicYear.schoolId;
    const curriculumType = await this.getFeeCollectionModeInternal(schoolId);
    const installmentCount = this.getInstallmentCountInternal(curriculumType);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    let sent = 0;

    const fees = await this.prisma.studentFee.findMany({
      where: {
        schoolId,
        academicYearId: term.academicYearId,
        OR: [{ termId: term.id }, { termId: null }],
      },
      include: {
        payments: true,
        feeStructure: { select: { feeType: true } },
        student: { select: { id: true, name: true } },
      },
    });

    for (const fee of fees) {
      const expectedForPeriod = fee.termId
        ? fee.finalAmount
        : Math.round((fee.finalAmount / Math.max(installmentCount, 1)) * 100) /
          100;
      const paidForPeriod = fee.termId
        ? fee.payments.reduce((sum, payment) => sum + payment.amountPaid, 0)
        : fee.payments
            .filter((payment) => payment.termId === term.id)
            .reduce((sum, payment) => sum + payment.amountPaid, 0);
      const balance = Math.max(0, expectedForPeriod - paidForPeriod);

      if (balance <= 0) continue;

      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: {
          schoolId,
          OR: [{ id: fee.studentId }, { userId: fee.studentId }],
        },
        select: {
          id: true,
          user: { select: { name: true } },
          parents: {
            select: {
              parent: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      const parentUserIds = [
        ...new Set(
          (studentProfile?.parents || [])
            .map((link) => link.parent.userId)
            .filter((value): value is string => Boolean(value)),
        ),
      ];

      for (const parentUserId of parentUserIds) {
        const alreadyNotified = await this.prisma.notification.findFirst({
          where: {
            schoolId,
            userId: parentUserId,
            type: NotificationType.FEE_DUE,
            createdAt: { gte: startOfToday },
            metadata: {
              contains: `"termId":"${term.id}"`,
            },
          },
          select: { id: true },
        });

        if (!force && alreadyNotified) continue;

        await this.notificationService.createNotification({
          schoolId,
          userId: parentUserId,
          title: `${term.name} fee payment due`,
          message: `Please pay ${this.formatBirr(balance)} for ${studentProfile?.user?.name || fee.student?.name || 'your child'} for ${term.name}.`,
          type: NotificationType.FEE_DUE,
          actionUrl: '/parent/fees',
          metadata: {
            termId: term.id,
            termName: term.name,
            academicYearId: term.academicYearId,
            studentId: studentProfile?.id || fee.studentId,
            feeType: fee.feeStructure.feeType,
            amountDue: balance,
          },
        });
        sent += 1;
      }
    }

    return sent;
  }

  private formatBirr(amount: number) {
    return `Brr ${amount.toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })}`;
  }

  // ========================================================
  // PUBLIC FEE CALCULATION METHODS
  // ========================================================

  async calculateInstallmentFees(dto: CalculateInstallmentFeesDto) {
    const feeCollectionMode = await this.getFeeCollectionModeInternal(
      dto.schoolId,
    );
    const installmentCount =
      this.getInstallmentCountInternal(feeCollectionMode);
    const installmentAmount = this.calculateInstallmentAmountInternal(
      dto.annualAmount,
      feeCollectionMode,
    );
    const remainder = this.calculateRemainderInternal(
      dto.annualAmount,
      feeCollectionMode,
    );

    const terms = await this.getTermsForAcademicYear(dto.academicYearId);

    const modeLabels: Record<string, string> = {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMESTER: 'Semester',
      TERM: 'Term',
      YEARLY: 'Full Year',
    };

    return {
      mode: feeCollectionMode,
      modeLabel: modeLabels[feeCollectionMode] || feeCollectionMode,
      installmentCount,
      installmentAmount,
      remainder,
      annualAmount: dto.annualAmount,
      totalWithRemainder:
        Math.round((dto.annualAmount + remainder) * 100) / 100,
      description: `Annual tuition of ${dto.annualAmount} split into ${installmentCount} ${modeLabels[feeCollectionMode] || 'installments'}`,
      suggestedTermDistribution: terms
        .slice(0, installmentCount)
        .map((term, index) => ({
          termName: term?.name || `${index + 1}`,
          termId: term?.id,
          amount:
            index === installmentCount - 1 && remainder !== 0
              ? Math.round((installmentAmount + remainder) * 100) / 100
              : installmentAmount,
        })),
    };
  }

  async generateInstallmentFees(dto: GenerateInstallmentFeesDto) {
    const feeCollectionMode = await this.getFeeCollectionModeInternal(
      dto.schoolId,
    );
    const installmentCount =
      this.getInstallmentCountInternal(feeCollectionMode);
    const terms = await this.getTermsForAcademicYear(dto.academicYearId);

    const existingStructures = await this.prisma.feeStructure.findMany({
      where: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        feeType: dto.feeType || 'TUITION',
        ...(dto.grade ? { grade: dto.grade } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingStructures.length === 0 && !dto.annualAmount) {
      return {
        created: 0,
        message:
          'No base fee structure found. Create an annual fee structure first or provide annualAmount.',
      };
    }

    const baseStructure = existingStructures[0];
    const annualAmount = dto.annualAmount ?? baseStructure.amount;
    const baseAmount = this.calculateInstallmentAmountInternal(
      annualAmount,
      feeCollectionMode,
    );
    const remainder = this.calculateRemainderInternal(
      annualAmount,
      feeCollectionMode,
    );

    const amounts: number[] = [];
    for (let i = 0; i < installmentCount; i++) {
      if (i === installmentCount - 1 && remainder !== 0) {
        amounts.push(Math.round((baseAmount + remainder) * 100) / 100);
      } else {
        amounts.push(baseAmount);
      }
    }

    let created = 0;
    await this.prisma.$transaction(async (tx) => {
      const displayFeeType = String(dto.feeType || 'Tuition').replace(
        /_/g,
        ' ',
      );
      const installmentFeePrefix = `${dto.feeType || 'TUITION'}_INSTALLMENT_`;

      for (let i = 0; i < installmentCount; i++) {
        const periodName = this.getInstallmentPeriodLabel(
          feeCollectionMode,
          i,
          undefined,
          terms[i],
        );
        const installmentTermId =
          periodName === terms[i]?.name ? terms[i]?.id : null;
        const existingInstallment = await tx.feeStructure.findFirst({
          where: {
            schoolId: dto.schoolId,
            academicYearId: dto.academicYearId,
            feeType: `${installmentFeePrefix}${i + 1}`,
            ...(dto.grade ? { grade: dto.grade } : {}),
          },
        });

        if (!existingInstallment) {
          await tx.feeStructure.create({
            data: {
              schoolId: dto.schoolId,
              academicYearId: dto.academicYearId,
              termId: installmentTermId || null,
              feeType: `${installmentFeePrefix}${i + 1}`,
              amount: amounts[i],
              grade: dto.grade ?? null,
              description:
                dto.description ||
                `${displayFeeType} installment for ${periodName}`,
              isActive: true,
            },
          });
          created++;
        } else {
          await tx.feeStructure.update({
            where: { id: existingInstallment.id },
            data: {
              termId: installmentTermId || null,
              amount: amounts[i],
              description:
                dto.description ||
                `${displayFeeType} installment for ${periodName}`,
              isActive: true,
            },
          });
        }
      }

      await tx.feeStructure.updateMany({
        where: {
          schoolId: dto.schoolId,
          academicYearId: dto.academicYearId,
          feeType: { startsWith: installmentFeePrefix },
          ...(dto.grade ? { grade: dto.grade } : {}),
          NOT: Array.from({ length: installmentCount }, (_, index) => ({
            feeType: `${installmentFeePrefix}${index + 1}`,
          })),
        },
        data: { isActive: false },
      });
    });

    return {
      created,
      message:
        created > 0
          ? `Generated ${created} installment fee structures`
          : `Installment fee structures updated for ${feeCollectionMode}`,
      breakdown: amounts.map((amount, index) => ({
        installment: index + 1,
        amount,
      })),
    };
  }

  async getFeeCollectionMode(schoolId: string): Promise<string> {
    return this.getFeeCollectionModeInternal(schoolId);
  }

  async getInstallmentCount(feeCollectionMode: string): Promise<number> {
    return this.getInstallmentCountInternal(feeCollectionMode);
  }

  // ========================================================
  // EXISTING FEE STRUCTURE METHODS
  // ========================================================

  async createFeeStructure(dto: CreateFeeStructureDto) {
    return this.prisma.feeStructure.create({
      data: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        termId: dto.termId ?? null,
        feeType: dto.feeType,
        amount: dto.amount,
        grade: dto.grade ?? null,
        semester: dto.semester ?? null,
        description: dto.description ?? null,
        isActive: true,
      },
    });
  }

  async listFeeStructures(
    schoolId: string,
    academicYearId?: string,
    termId?: string,
  ) {
    return this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
        ...(termId && termId !== 'all'
          ? { OR: [{ termId }, { termId: null }] }
          : {}),
      },
      include: { term: { select: { id: true, name: true, order: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateFeeStructure(
    id: string,
    schoolId: string,
    dto: UpdateFeeStructureDto,
  ) {
    const fs = await this.prisma.feeStructure.findUnique({ where: { id } });
    if (!fs || fs.schoolId !== schoolId)
      throw new Error('Fee structure not found for this school');
    return this.prisma.feeStructure.update({
      where: { id },
      data: {
        feeType: dto.feeType ?? fs.feeType,
        amount: dto.amount ?? fs.amount,
        grade: dto.grade === undefined ? fs.grade : dto.grade,
        semester: dto.semester === undefined ? fs.semester : dto.semester,
        description:
          dto.description === undefined ? fs.description : dto.description,
        isActive: dto.isActive === undefined ? fs.isActive : dto.isActive,
      },
    });
  }

  async deleteFeeStructure(id: string, schoolId: string) {
    const fs = await this.prisma.feeStructure.findUnique({ where: { id } });
    if (!fs || fs.schoolId !== schoolId)
      throw new Error('Fee structure not found for this school');
    return this.prisma.feeStructure.delete({ where: { id } });
  }

  async deleteFeeStructuresBySchool(
    schoolId: string,
    academicYearId?: string,
  ) {
    const where: any = { schoolId };
    if (academicYearId) where.academicYearId = academicYearId;
    return this.prisma.feeStructure.deleteMany({ where });
  }

  // ========================================================
  // STUDENT FEES METHODS
  // ========================================================

  async generateStudentFees(dto: GenerateStudentFeesDto) {
    await this.assertAcademicYearInSchool(dto.schoolId, dto.academicYearId);
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId: dto.schoolId },
      select: { name: true, startDate: true },
    });
    const calendarType = await this.getSchoolCalendarType(dto.schoolId);
    if (dto.termId) {
      await this.assertTermInSchool(dto.schoolId, dto.termId);
    }

    const feeStructuresWhere: any = {
      schoolId: dto.schoolId,
      academicYearId: dto.academicYearId,
      isActive: true,
      ...(dto.grade ? { OR: [{ grade: dto.grade }, { grade: null }] } : {}),
    };
    if (dto.termId) feeStructuresWhere.termId = dto.termId;

    const foundFeeStructures = await this.prisma.feeStructure.findMany({
      where: feeStructuresWhere,
    });
    const generatedFeeStructures = foundFeeStructures.filter((feeStructure) =>
      feeStructure.feeType.includes('_INSTALLMENT_'),
    );
    const feeStructures =
      generatedFeeStructures.length > 0 ? generatedFeeStructures : foundFeeStructures;
    if (feeStructures.length === 0) return { created: 0 };

    // Get due day from settings
    const dueDaySetting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId: dto.schoolId, key: 'fee_payment_due_day' } },
    });
    const dueDay = parseInt(dueDaySetting?.value || '15', 10);

    const students = await this.prisma.studentProfile.findMany({
      where: { schoolId: dto.schoolId, enrollmentStatus: 'APPROVED' },
      select: { id: true, userId: true, createdAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const studentIds = students.map((s) => s.userId).filter(Boolean);
    if (studentIds.length === 0) return { created: 0 };
    const studentGradeById = new Map<string, number>();
    if (academicYear?.name) {
      const studentClasses = await this.prisma.studentClass.findMany({
        where: {
          schoolId: dto.schoolId,
          academicYear: academicYear.name,
          studentId: { in: studentIds },
        },
        include: {
          class: { select: { grade: true, name: true } },
        },
      });
      studentClasses.forEach((studentClass) => {
        const gradeNumber = this.getClassGradeNumber(studentClass.class);
        if (gradeNumber != null) {
          studentGradeById.set(studentClass.studentId, gradeNumber);
        }
      });
    }
    const familyDiscount = await this.getFamilyDiscountContext(
      dto.schoolId,
      students,
    );

    const termIds = Array.from(
      new Set(feeStructures.map((fs) => fs.termId).filter((id): id is string => Boolean(id))),
    );
    const termStartById = new Map<string, Date>();
    if (termIds.length > 0) {
      const feeTerms = await this.prisma.term.findMany({
        where: { id: { in: termIds } },
        select: { id: true, startDate: true },
      });
      feeTerms.forEach((term) => {
        if (term.startDate) termStartById.set(term.id, new Date(term.startDate));
      });
    }

    const data = feeStructures.flatMap((fs) => {
      const dueDate = this.getStudentFeeDueDate({
        academicYearStartDate: academicYear?.startDate || null,
        termStartDate: termStartById.get(fs.termId || '') || null,
        feeType: fs.feeType,
        dueDay,
        calendarType,
      });
      const targetStudentIds =
        fs.grade == null
          ? studentIds
          : studentIds.filter(
              (studentId) => studentGradeById.get(studentId) === Number(fs.grade),
            );

      return targetStudentIds.map((studentId) => {
        const discount = this.calculateFamilyDiscountAmount(
          fs.feeType,
          fs.amount,
          studentId,
          familyDiscount,
        );

        return {
          schoolId: dto.schoolId,
          studentId,
          feeStructureId: fs.id,
          academicYearId: dto.academicYearId,
          termId: fs.termId || undefined,
          totalAmount: fs.amount,
          discount,
          finalAmount: Math.max(0, fs.amount - discount),
          discountPolicyId: discount > 0 ? familyDiscount.policyId : undefined,
          notes: discount > 0 ? familyDiscount.note : undefined,
          status: PaymentStatus.PENDING,
          dueDate,
        };
      });
    });

    const result = await this.prisma.studentFee.createMany({
      data,
      skipDuplicates: true,
    });
    const updated = await this.recalculateFamilyDiscountsForExistingFees({
      schoolId: dto.schoolId,
      academicYearId: dto.academicYearId,
      feeStructures,
      studentIds,
      familyDiscount,
    });
    return { created: result.count, updatedDiscounts: updated };
  }

  private normalizeFeeType(value?: string | null) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/_INSTALLMENT_\d+$/i, '')
      .replace(/_ANNUAL$/i, '')
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private parseBooleanSetting(value: unknown, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return fallback;
  }

  private async getFamilyDiscountContext(
    schoolId: string,
    students: Array<{ id: string; userId: string; createdAt: Date }>,
  ) {
    const settings = await this.prisma.schoolSetting.findMany({
      where: {
        schoolId,
        key: {
          in: [
            'family_discount_enabled',
            'family_discount_min_students',
            'family_discount_percent',
            'family_discount_fee_types',
          ],
        },
      },
      select: { key: true, value: true },
    });
    const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));
    const enabled = this.parseBooleanSetting(
      settingMap.get('family_discount_enabled'),
      false,
    );
    const minStudents = Math.max(
      2,
      Math.min(20, Number(settingMap.get('family_discount_min_students') || 3) || 3),
    );
    const configuredPercent = settingMap.has('family_discount_percent')
      ? settingMap.get('family_discount_percent')
      : '20';
    const percent = Math.max(
      0,
      Math.min(100, Number(configuredPercent) || 0),
    );
    const feeTypes = String(settingMap.get('family_discount_fee_types') || 'TUITION')
      .split(',')
      .map((item) => this.normalizeFeeType(item))
      .filter(Boolean);

    const empty = {
      enabled: false,
      minStudents,
      percent,
      feeTypes: new Set(feeTypes.length ? feeTypes : ['TUITION']),
      eligibleStudentIds: new Set<string>(),
      policyId: undefined as string | undefined,
      note: undefined as string | undefined,
    };

    if (!enabled || percent <= 0 || students.length < minStudents) {
      return empty;
    }

    const studentByProfileId = new Map(students.map((student) => [student.id, student]));
    const parentLinks = await this.prisma.parentStudent.findMany({
      where: {
        schoolId,
        studentId: { in: students.map((student) => student.id) },
      },
      select: {
        parentId: true,
        studentId: true,
        isPrimary: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    const profileIdsByParent = new Map<string, Set<string>>();
    parentLinks.forEach((link) => {
      if (!studentByProfileId.has(link.studentId)) return;
      if (!profileIdsByParent.has(link.parentId)) {
        profileIdsByParent.set(link.parentId, new Set());
      }
      profileIdsByParent.get(link.parentId)!.add(link.studentId);
    });

    const eligibleStudentIds = new Set<string>();
    profileIdsByParent.forEach((profileIds) => {
      const familyStudents = Array.from(profileIds)
        .map((profileId) => studentByProfileId.get(profileId))
        .filter((student): student is { id: string; userId: string; createdAt: Date } => Boolean(student))
        .sort((a, b) => {
          const dateDiff = a.createdAt.getTime() - b.createdAt.getTime();
          return dateDiff !== 0 ? dateDiff : a.id.localeCompare(b.id);
        });

      if (familyStudents.length < minStudents) return;

      familyStudents.slice(minStudents - 1).forEach((student) => {
        eligibleStudentIds.add(student.userId);
      });
    });

    if (eligibleStudentIds.size === 0) return empty;

    const policy = await this.prisma.discountPolicy.upsert({
      where: {
        schoolId_name: {
          schoolId,
          name: this.FAMILY_DISCOUNT_POLICY_NAME,
        },
      },
      update: {
        discountType: 'PERCENTAGE',
        discountValue: percent,
        isActive: true,
        criteria: JSON.stringify({
          type: 'FAMILY_SIZE',
          minStudents,
          appliesTo: 'CHILD_NUMBER_AND_ABOVE',
          feeTypes: Array.from(empty.feeTypes),
        }),
      },
      create: {
        schoolId,
        name: this.FAMILY_DISCOUNT_POLICY_NAME,
        discountType: 'PERCENTAGE',
        discountValue: percent,
        isActive: true,
        criteria: JSON.stringify({
          type: 'FAMILY_SIZE',
          minStudents,
          appliesTo: 'CHILD_NUMBER_AND_ABOVE',
          feeTypes: Array.from(empty.feeTypes),
        }),
      },
      select: { id: true },
    });

    return {
      ...empty,
      enabled: true,
      policyId: policy.id,
      eligibleStudentIds,
      note: `Family discount: ${percent}% for child ${minStudents} and above`,
    };
  }

  private calculateFamilyDiscountAmount(
    feeType: string,
    amount: number,
    studentId: string,
    context: Awaited<ReturnType<FinanceService['getFamilyDiscountContext']>>,
  ) {
    if (!context.enabled || !context.eligibleStudentIds.has(studentId)) {
      return 0;
    }
    if (
      !context.feeTypes.has('ALL') &&
      !context.feeTypes.has(this.normalizeFeeType(feeType))
    ) {
      return 0;
    }

    return Math.round(((amount * context.percent) / 100) * 100) / 100;
  }

  private async recalculateFamilyDiscountsForExistingFees(params: {
    schoolId: string;
    academicYearId: string;
    feeStructures: Array<{ id: string; feeType: string; amount: number }>;
    studentIds: string[];
    familyDiscount: Awaited<ReturnType<FinanceService['getFamilyDiscountContext']>>;
  }) {
    if (params.studentIds.length === 0 || params.feeStructures.length === 0) {
      return 0;
    }

    const feeStructureById = new Map(
      params.feeStructures.map((feeStructure) => [feeStructure.id, feeStructure]),
    );
    const rows = await this.prisma.studentFee.findMany({
      where: {
        schoolId: params.schoolId,
        academicYearId: params.academicYearId,
        studentId: { in: params.studentIds },
        feeStructureId: { in: params.feeStructures.map((feeStructure) => feeStructure.id) },
        payments: { none: {} },
      },
      select: {
        id: true,
        studentId: true,
        feeStructureId: true,
        totalAmount: true,
        discount: true,
        finalAmount: true,
        discountPolicyId: true,
      },
    });

    let updated = 0;
    for (const row of rows) {
      const feeStructure = feeStructureById.get(row.feeStructureId);
      if (!feeStructure) continue;
      const discount = this.calculateFamilyDiscountAmount(
        feeStructure.feeType,
        row.totalAmount,
        row.studentId,
        params.familyDiscount,
      );
      const finalAmount = Math.max(0, row.totalAmount - discount);
      const discountPolicyId = discount > 0 ? params.familyDiscount.policyId : null;
      const shouldUpdate =
        Math.abs(row.discount - discount) > 0.001 ||
        Math.abs(row.finalAmount - finalAmount) > 0.001 ||
        (row.discountPolicyId || null) !== discountPolicyId;

      if (!shouldUpdate) continue;

      await this.prisma.studentFee.update({
        where: { id: row.id },
        data: {
          discount,
          finalAmount,
          discountPolicyId,
          notes: discount > 0 ? params.familyDiscount.note : null,
        },
      });
      updated += 1;
    }

    return updated;
  }

  async getStudentFees(query: StudentFeesQueryDto) {
    const {
      schoolId,
      academicYearId,
      termId,
      grade,
      sectionId,
      status,
      page = 1,
      limit = 20,
      studentId,
      search,
    } = query;
    const skip = (page - 1) * limit;
    const whereBase: any = { schoolId };
    if (status) whereBase.status = status as PaymentStatus;
    if (studentId) whereBase.studentId = studentId;
    if (academicYearId) whereBase.academicYearId = academicYearId;
    const trimmedSearch = String(search || '').trim();
    if (trimmedSearch) {
      whereBase.student = {
        OR: [
          { name: { contains: trimmedSearch, mode: 'insensitive' } },
          { email: { contains: trimmedSearch, mode: 'insensitive' } },
        ],
      };
    }
    const academicYear = academicYearId
      ? await this.assertAcademicYearInSchool(schoolId, academicYearId)
      : null;
    const academicYearWithDates = academicYearId
      ? await this.prisma.academicYear.findFirst({
          where: { id: academicYearId, schoolId },
          select: { startDate: true },
        })
      : null;
    const resolvedCalendarType = await this.getSchoolCalendarType(schoolId);
    const curriculumType = await this.getFeeCollectionModeInternal(schoolId);
    const normalizedFeeMode = String(curriculumType || '').toUpperCase();
    if (termId) {
      const selectedTerm = await this.assertTermInSchool(schoolId, termId);
      if (
        selectedTerm &&
        ['MONTH', 'MONTHLY'].includes(normalizedFeeMode) &&
        academicYearWithDates?.startDate
      ) {
        const installmentCount = this.getInstallmentCountInternal(curriculumType);
        const terms = await this.prisma.term.findMany({
          where: { academicYearId, academicYear: { schoolId } },
          orderBy: { order: 'asc' },
        });
        const selectedTermWithDates =
          terms.find((term) => term.id === selectedTerm.id) || selectedTerm;
        const installmentRange =
          this.getInstallmentRangeForTerm(
            academicYearWithDates.startDate,
            selectedTermWithDates,
            installmentCount,
          ) ||
          (terms.length > 0
            ? {
                start:
                  Math.floor(
                    ((selectedTerm.order - 1) * installmentCount) / terms.length,
                  ) + 1,
                end: Math.floor(
                  (selectedTerm.order * installmentCount) / terms.length,
                ),
              }
            : null);

        if (installmentRange) {
          whereBase.OR = [
            { termId },
            ...Array.from(
              { length: installmentRange.end - installmentRange.start + 1 },
              (_, offset) => ({
                feeStructure: {
                  feeType: {
                    endsWith: `_INSTALLMENT_${installmentRange.start + offset}`,
                  },
                },
              }),
            ),
          ];
        } else {
          whereBase.termId = termId;
        }
      } else {
        whereBase.termId = termId;
      }
    }

    if (grade !== undefined || sectionId) {
      if (academicYearId) {
        const scWhere: any = { schoolId, academicYear: academicYear?.name };
        if (grade !== undefined) {
          scWhere.class = {
            OR: [{ grade }, { name: { equals: `Grade ${grade}` } }],
          };
        }
        if (sectionId) scWhere.sectionId = sectionId;
        const studentClasses = await this.prisma.studentClass.findMany({
          where: scWhere,
          select: { studentId: true },
        });
        const ids = Array.from(
          new Set(studentClasses.map((x) => x.studentId)),
        );
        whereBase.studentId = { in: ids };
      }
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.studentFee.count({ where: whereBase }),
      this.prisma.studentFee.findMany({
        where: whereBase,
        include: {
          student: { select: { id: true, name: true } },
          feeStructure: {
            include: { term: { select: { id: true, name: true } } },
          },
          discountPolicy: {
            select: { name: true, discountType: true, discountValue: true },
          },
          term: { select: { id: true, name: true } },
          payments: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const studentIds = Array.from(new Set(rows.map((row) => row.studentId)));
    const studentClasses =
      academicYear?.name && studentIds.length > 0
        ? await this.prisma.studentClass.findMany({
            where: {
              schoolId,
              studentId: { in: studentIds },
              academicYear: academicYear.name,
            },
            include: {
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          })
        : [];
    const classMap = new Map<
      string,
      { grade: string | null; section: string | null }
    >();
    studentClasses.forEach((studentClass) => {
      classMap.set(studentClass.studentId, {
        grade: studentClass.class?.name || null,
        section: studentClass.section?.name || null,
      });
    });

    const data = rows.map((sf) => {
      const paid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const remaining = Math.max(0, sf.finalAmount - paid);
      const installmentIndex = this.getFeeStructureInstallmentIndex(
        sf.feeStructure.feeType,
      );
      const scopeLabel =
        installmentIndex !== null
          ? this.getInstallmentPeriodLabel(
              curriculumType,
              installmentIndex - 1,
              academicYearWithDates?.startDate,
              sf.term || sf.feeStructure.term,
              resolvedCalendarType,
            )
          : sf.term?.name || sf.feeStructure.term?.name || 'Whole Academic Year';
      const studentClass = classMap.get(sf.studentId);
      return {
        id: sf.id,
        studentId: sf.studentId,
        studentName: sf.student?.name,
        grade: studentClass?.grade || null,
        section: studentClass?.section || null,
        feeType: sf.feeStructure.feeType,
        scopeLabel,
        installmentIndex,
        totalFee: sf.totalAmount,
        discount: sf.discount,
        discountPercent:
          sf.discountPolicy?.discountType === 'PERCENTAGE'
            ? sf.discountPolicy.discountValue
            : sf.totalAmount > 0 && sf.discount > 0
              ? Math.round((sf.discount / sf.totalAmount) * 10000) / 100
              : 0,
        discountLabel: sf.discountPolicy?.name || null,
        finalAmount: sf.finalAmount,
        paidAmount: paid,
        remainingBalance: remaining,
        status: sf.status,
        academicYearId: sf.academicYearId,
        termName: sf.term?.name || sf.feeStructure.term?.name || null,
        dueDate: sf.dueDate,
        updatedAt: sf.updatedAt,
      };
    });

    return { total, data };
  }

  // ========================================================
  // PAYMENT METHODS
  // ========================================================

  private getPaymentReferenceDateParts(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return { y, m, d, dateKey: `${y}${m}${d}` };
  }

  private async generatePaymentReference(schoolId: string, paymentDate = new Date()) {
    const { y, m, d, dateKey } = this.getPaymentReferenceDateParts(paymentDate);
    const latestPayment = await this.prisma.payment.findFirst({
      where: {
        schoolId,
        paymentDate: {
          gte: new Date(`${y}-${m}-${d}T00:00:00.000Z`),
          lte: new Date(`${y}-${m}-${d}T23:59:59.999Z`),
        },
        receiptNumber: { startsWith: `PAY-${dateKey}-` },
      },
      orderBy: { receiptNumber: 'desc' },
      select: { receiptNumber: true },
    });

    const latestSequence = latestPayment?.receiptNumber
      ? Number(latestPayment.receiptNumber.split('-').at(-1)) || 0
      : 0;
    const seq = String(latestSequence + 1).padStart(4, '0');
    return `PAY-${dateKey}-${seq}`;
  }

  private async generatePaymentReferenceCandidate(
    tx: any,
    schoolId: string,
    paymentDate: Date,
  ) {
    const { y, m, d, dateKey } = this.getPaymentReferenceDateParts(paymentDate);
    const latestPayment = await tx.payment.findFirst({
      where: {
        schoolId,
        paymentDate: {
          gte: new Date(`${y}-${m}-${d}T00:00:00.000Z`),
          lte: new Date(`${y}-${m}-${d}T23:59:59.999Z`),
        },
        receiptNumber: { startsWith: `PAY-${dateKey}-` },
      },
      orderBy: { receiptNumber: 'desc' },
      select: { receiptNumber: true },
    });

    const latestSequence = latestPayment?.receiptNumber
      ? Number(latestPayment.receiptNumber.split('-').at(-1)) || 0
      : 0;
    const seq = String(latestSequence + 1).padStart(4, '0');
    return `PAY-${dateKey}-${seq}`;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async createPaymentWithUniqueReference(
    tx: any,
    data: {
      schoolId: string;
      studentFeeId: string;
      termId: string | null;
      studentId: string;
      amountPaid: number;
      paymentMethod: string;
      transactionReference?: string;
      paymentDate: Date;
      receivedById: string;
      notes?: string;
    },
  ) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const receiptNumber = await this.generatePaymentReferenceCandidate(
        tx,
        data.schoolId,
        data.paymentDate,
      );
      try {
        return await tx.payment.create({
          data: {
            ...data,
            receiptNumber,
          },
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to generate a unique payment reference');
  }

  private async createPaymentWithFallbackReference(
    tx: any,
    data: {
      schoolId: string;
      studentFeeId: string;
      termId: string | null;
      studentId: string;
      amountPaid: number;
      paymentMethod: string;
      transactionReference?: string;
      paymentDate: Date;
      receivedById: string;
      notes?: string;
    },
  ) {
    try {
      return await this.createPaymentWithUniqueReference(tx, data);
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const fallbackReceipt = `PAY-${this.getPaymentReferenceDateParts(data.paymentDate).dateKey}-${Date.now().toString(36).toUpperCase()}`;
      return tx.payment.create({
        data: {
          ...data,
          receiptNumber: fallbackReceipt,
        },
      });
    }
  }

  private async getPeriodCountForFee(tx: any, schoolId: string, academicYearId: string) {
    const termsCount = await tx.term.count({ where: { academicYearId } });
    if (termsCount > 0) return termsCount;

    const settings = await tx.schoolSetting.findMany({
      where: {
        schoolId,
        key: { in: ['fee_structure_mode', 'curriculum_type'] },
      },
      select: { key: true, value: true },
    });
    const feeStructureMode = settings.find(
      (setting) => setting.key === 'fee_structure_mode',
    );
    const curriculumType = settings.find(
      (setting) => setting.key === 'curriculum_type',
    );
    return this.getInstallmentCountInternal(
      feeStructureMode?.value || curriculumType?.value || 'TERM',
    );
  }

  private async logAudit(
    tx: any,
    data: {
      schoolId: string;
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      previousValue?: any;
      newValue?: any;
      amount?: number;
      reference?: string;
      description?: string;
    },
  ) {
    return tx.financeAuditLog.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        previousValue: data.previousValue
          ? JSON.stringify(data.previousValue)
          : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : null,
        amount: data.amount,
        reference: data.reference,
        description: data.description,
      },
    });
  }

  async recordPayment(user: any, dto: RecordPaymentDto) {
    const paymentDate = dto.paymentDate
      ? new Date(dto.paymentDate)
      : new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const sf = dto.studentFeeId
        ? await tx.studentFee.findUnique({
            where: { id: dto.studentFeeId },
            include: { payments: true, feeStructure: { select: { feeType: true } } },
          })
        : await tx.studentFee.findFirst({
            where: { schoolId: dto.schoolId, studentId: dto.studentId },
            orderBy: { createdAt: 'desc' },
            include: { payments: true, feeStructure: { select: { feeType: true } } },
          });

      if (!sf) {
        throw new Error(
          'No fee found for this student. Generate student fees first.',
        );
      }
      if (sf.schoolId !== dto.schoolId) {
        throw new Error('Fee does not match this school');
      }
      if (sf.studentId !== dto.studentId) {
        throw new Error('Fee does not match this student');
      }
      const paymentTermId = dto.termId || sf.termId || null;
      const feeInstallmentIndex = this.getFeeStructureInstallmentIndex(
        sf.feeStructure?.feeType,
      );
      const isInstallmentFee = feeInstallmentIndex !== null;
      if (dto.termId) {
        const term = await tx.term.findFirst({
          where: {
            id: dto.termId,
            academicYearId: sf.academicYearId,
            academicYear: { schoolId: dto.schoolId },
          },
          select: { id: true },
        });
        if (!term) {
          throw new Error('Selected payment period does not match this fee academic year');
        }
      }
      if (!sf.termId && !paymentTermId && !isInstallmentFee) {
        throw new Error('Select the term or semester this annual fee payment is for');
      }

      const alreadyPaid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const isAnnualFeePayment = !sf.termId && !isInstallmentFee && Boolean(paymentTermId);
      const alreadyPaidForSelectedPeriod =
        isInstallmentFee
          ? alreadyPaid
          : paymentTermId
          ? sf.payments
              .filter((payment) => payment.termId === paymentTermId)
              .reduce((s, payment) => s + payment.amountPaid, 0)
          : alreadyPaid;
      const expectedForSelectedPeriod =
        isAnnualFeePayment
          ? Math.round(
              (sf.finalAmount /
                Math.max(
                  await this.getPeriodCountForFee(
                    tx,
                    dto.schoolId,
                    sf.academicYearId,
                  ),
                  1,
                )) *
                100,
            ) / 100
          : sf.finalAmount;
      const outstanding = Math.max(
        0,
        isAnnualFeePayment
          ? sf.finalAmount - alreadyPaid
          : expectedForSelectedPeriod - alreadyPaidForSelectedPeriod,
      );
      if (dto.amountPaid <= 0) throw new Error('Invalid amount');
      if (outstanding <= 0) {
        throw new Error(
          isAnnualFeePayment
            ? 'This annual fee is already fully paid'
            : isInstallmentFee
              ? 'This installment is already fully paid'
            : 'This term or semester is already fully paid',
        );
      }
      if (dto.amountPaid > outstanding)
        throw new Error(
          isAnnualFeePayment
            ? `Amount exceeds the remaining annual fee balance. Remaining: ${outstanding}`
            : isInstallmentFee
              ? `Amount exceeds the remaining installment balance. Remaining: ${outstanding}`
            : `Amount exceeds outstanding balance for the selected term or semester. Remaining: ${outstanding}`,
        );

      const payment = await this.createPaymentWithFallbackReference(tx, {
        schoolId: dto.schoolId,
        studentFeeId: sf.id,
        termId: paymentTermId,
        studentId: sf.studentId,
        amountPaid: dto.amountPaid,
        paymentMethod: dto.paymentMethod,
        transactionReference: dto.transactionReference,
        paymentDate,
        receivedById: user.id,
        notes: dto.notes,
      });

      const paidNow = alreadyPaid + dto.amountPaid;
      const remaining = Math.max(0, sf.finalAmount - paidNow);
      const newStatus =
        remaining <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
      await tx.studentFee.update({
        where: { id: sf.id },
        data: { status: newStatus },
      });

      await this.logAudit(tx, {
        schoolId: dto.schoolId,
        userId: user.id,
        action: 'PAYMENT',
        entityType: 'Payment',
        entityId: payment.id,
        previousValue: { paid: alreadyPaid, status: sf.status },
        newValue: { paid: paidNow, status: newStatus },
        amount: dto.amountPaid,
        reference: dto.transactionReference || payment.receiptNumber,
        description: `Payment recorded for student fee ${sf.id}`,
      });

      return { payment, paymentReference: payment.receiptNumber, remaining, status: newStatus };
    });

    await this.notifyParentsOfRecordedPayment(dto.schoolId, result.payment);

    return result;
  }

  private async notifyParentsOfRecordedPayment(
    schoolId: string,
    payment: {
      id: string;
      studentId: string;
      termId: string | null;
      amountPaid: number;
      receiptNumber: string;
      transactionReference?: string | null;
    },
  ) {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        userId: payment.studentId,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        parents: {
          select: {
            parent: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    const parentUserIds = [
      ...new Set(
        (studentProfile?.parents || [])
          .map((link) => link.parent.userId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    if (parentUserIds.length === 0) {
      return { count: 0 };
    }

    const term = payment.termId
      ? await this.prisma.term.findFirst({
          where: { id: payment.termId, academicYear: { schoolId } },
          select: { id: true, name: true },
        })
      : null;
    const studentName = studentProfile?.user?.name || 'your child';
    const amount = this.formatBirr(payment.amountPaid);

    return this.notificationService.createBulkNotifications({
      schoolId,
      userIds: parentUserIds,
      title: 'Payment Recorded',
      message: `Payment of ${amount} has been recorded for ${studentName}${term?.name ? ` for ${term.name}` : ''}.`,
      type: NotificationType.PAYMENT_RECEIVED,
      actionUrl: '/parent/fees',
      metadata: {
        paymentId: payment.id,
        paymentReference: payment.receiptNumber,
        transactionReference: payment.transactionReference || null,
        amountPaid: payment.amountPaid,
        studentId: studentProfile?.id || payment.studentId,
        studentUserId: payment.studentId,
        studentName,
        termId: term?.id || null,
        termName: term?.name || null,
      },
    });
  }

  // ========================================================
  // REPORT METHODS
  // ========================================================

  async getAllPayments(schoolId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { schoolId },
      orderBy: { paymentDate: 'desc' },
      include: {
        term: { select: { id: true, name: true } },
        studentFee: {
          select: {
            academicYearId: true,
            termId: true,
            term: { select: { id: true, name: true } },
            feeStructure: { select: { feeType: true } },
          },
        },
      },
    });

    const formattedPayments =
      await this.formatPaymentsWithStudentContext(payments);

    const total = payments.reduce((s, p) => s + p.amountPaid, 0);
    return { total, count: payments.length, payments: formattedPayments };
  }

  async reversePayment(
    user: any,
    schoolId: string,
    paymentId: string,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, schoolId },
        include: {
          studentFee: {
            include: {
              payments: { select: { id: true, amountPaid: true } },
            },
          },
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const remainingPaid = payment.studentFee.payments
        .filter((item) => item.id !== payment.id)
        .reduce((sum, item) => sum + item.amountPaid, 0);
      const remainingBalance = Math.max(
        0,
        payment.studentFee.finalAmount - remainingPaid,
      );
      const newStatus =
        remainingBalance <= 0
          ? PaymentStatus.PAID
          : remainingPaid > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.PENDING;

      await tx.payment.delete({ where: { id: payment.id } });

      await tx.studentFee.update({
        where: { id: payment.studentFeeId },
        data: { status: newStatus },
      });

      await this.logAudit(tx, {
        schoolId,
        userId: user.id,
        action: 'PAYMENT_REVERSED',
        entityType: 'Payment',
        entityId: payment.id,
        previousValue: {
          amountPaid: payment.amountPaid,
          status: payment.studentFee.status,
          paymentReference: payment.receiptNumber,
          termId: payment.termId,
        },
        newValue: {
          remainingPaid,
          status: newStatus,
          reason: reason || null,
        },
        amount: payment.amountPaid,
        reference: payment.transactionReference || payment.receiptNumber,
        description: `Payment reversed for student fee ${payment.studentFeeId}`,
      });

      return {
        reversed: true,
        paymentReference: payment.receiptNumber,
        remainingPaid,
        remainingBalance,
        status: newStatus,
      };
    });
  }

  async dailyCollectionReport(query: ReportQueryDto) {
    const { schoolId, from, to, termId, academicYearId } = query;
    const includeOutstanding =
      String((query as any).includeOutstanding ?? 'true').toLowerCase() !==
      'false';
    if (academicYearId) {
      await this.assertAcademicYearInSchool(schoolId, academicYearId);
    }
    await this.assertTermInSchool(schoolId, termId);

    // Parse dates or default to today
    let start = from ? new Date(from) : undefined;
    let end = to ? new Date(to) : undefined;
    if (!start || !end) {
      const y = new Date().getFullYear();
      const m = String(new Date().getMonth() + 1).padStart(2, '0');
      const d = String(new Date().getDate()).padStart(2, '0');
      start = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
      end = new Date(`${y}-${m}-${d}T23:59:59.999Z`);
    }

    const where: any = { schoolId, paymentDate: { gte: start, lte: end } };
    if (academicYearId || (termId && termId !== 'all')) {
      where.studentFee = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(termId && termId !== 'all'
          ? { OR: [{ termId }, { termId: null }] }
          : {}),
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        term: { select: { id: true, name: true } },
        studentFee: {
          select: {
            termId: true,
            term: { select: { id: true, name: true } },
            academicYearId: true,
            feeStructure: {
              select: {
                feeType: true,
              },
            },
          },
        },
      },
    });

    const formattedPayments =
      await this.formatPaymentsWithStudentContext(payments);

    const total = payments.reduce((s, p) => s + p.amountPaid, 0);
    const dailyDataMap = new Map<string, number>();
    payments.forEach((payment) => {
      const dateKey = payment.paymentDate.toISOString().split('T')[0];
      dailyDataMap.set(
        dateKey,
        (dailyDataMap.get(dateKey) || 0) + payment.amountPaid,
      );
    });
    const dailyData = Array.from(dailyDataMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, amount]) => ({ date, amount }));

    // Get outstanding balances and student payment stats
    let totalOutstanding = 0;
    let totalRevenue = 0;
    let outstandingRows: any[] = [];
    let paidStudents = 0;
    let partialStudents = 0;
    let unpaidStudents = 0;
    const feeBreakdown = {
      tuition: 0,
      registration: 0,
      examFee: 0,
      library: 0,
      other: 0,
    };

    payments.forEach((payment) => {
      const feeType = this.normalizeFeeBreakdownType(
        payment.studentFee?.feeStructure?.feeType,
      );
      switch (feeType) {
        case 'TUITION':
          feeBreakdown.tuition += payment.amountPaid;
          break;
        case 'REGISTRATION':
          feeBreakdown.registration += payment.amountPaid;
          break;
        case 'EXAM':
          feeBreakdown.examFee += payment.amountPaid;
          break;
        case 'LIBRARY':
          feeBreakdown.library += payment.amountPaid;
          break;
        default:
          feeBreakdown.other += payment.amountPaid;
          break;
      }
    });

    if (academicYearId && includeOutstanding) {
      const outstandingResult = await this.outstandingBalancesReport(
        schoolId,
        academicYearId,
        termId,
      );
      totalOutstanding = outstandingResult.totalOutstanding;
      totalRevenue = outstandingResult.totalRevenue;
      outstandingRows = outstandingResult.rows;

      // Calculate payment status counts from rows - consider PENDING as unpaid
      outstandingRows.forEach((row: any) => {
        const status = row.status;
        if (status === 'PAID') {
          paidStudents++;
        } else if (status === 'PARTIAL') {
          partialStudents++;
        } else if (status === 'PENDING' || status === 'UNPAID') {
          unpaidStudents++;
        }
      });
    }

    return {
      total: includeOutstanding ? totalRevenue : total,
      todayTotal: total,
      totalOutstanding,
      count: payments.length,
      payments: formattedPayments,
      dailyData,
      feeBreakdown,
      outstandingRows,
      paidStudents,
      partialStudents,
      unpaidStudents,
    };
  }

  async monthlyRevenueReport(schoolId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const payments = await this.prisma.payment.findMany({
      where: { schoolId, paymentDate: { gte: start, lte: end } },
    });
    const total = payments.reduce((s, p) => s + p.amountPaid, 0);
    return { month, year, total, count: payments.length };
  }

  async outstandingBalancesReport(
    schoolId: string,
    academicYearId: string,
    termId?: string,
    calendarType?: CalendarType | string | null,
  ) {
    const resolvedCalendarType =
      String(calendarType || '').toUpperCase() === 'GREGORIAN'
        ? 'GREGORIAN'
        : 'ETHIOPIAN';
    const academicYear = await this.assertAcademicYearInSchool(
      schoolId,
      academicYearId,
    );
    const academicYearWithDates = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { startDate: true },
    });
    const selectedTerm = await this.assertTermInSchool(schoolId, termId);
    const curriculumType = await this.getFeeCollectionModeInternal(schoolId);
    const installmentCount = this.getInstallmentCountInternal(curriculumType);
    const terms = await this.prisma.term.findMany({
      where: { academicYearId, academicYear: { schoolId } },
      orderBy: { order: 'asc' },
    });
    const where: any = {
      schoolId,
      academicYearId,
      ...(termId && termId !== 'all'
        ? { OR: [{ termId }, { termId: null }] }
        : {}),
    };

    const fees = await this.prisma.studentFee.findMany({
      where,
      include: {
        payments: true,
        student: { select: { id: true, name: true } },
        feeStructure: {
          include: {
            term: { select: { name: true } },
          },
        },
        term: { select: { name: true } },
      },
    });

    // Get academic year name (studentClass uses year name, not ID)
    const academicYearName = academicYear?.name;

    // Get student classes in parallel
    const studentIds = fees.map((f) => f.studentId);
    const studentClasses = await this.prisma.studentClass.findMany({
      where: {
        schoolId,
        studentId: { in: studentIds },
        academicYear: academicYearName,
      },
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });

    // Create a map for quick lookup
    const classMap = new Map<
      string,
      { grade: string | null; section: string | null }
    >();
    studentClasses.forEach((sc) => {
      classMap.set(sc.studentId, {
        grade: sc.class?.name || null,
        section: sc.section?.name || null,
      });
    });

    const selectedTermWithDates = selectedTerm
      ? terms.find((term) => term.id === selectedTerm.id) || null
      : null;
    const selectedTermInstallmentRange =
      selectedTerm && terms.length > 0 && installmentCount > terms.length
        ? this.getInstallmentRangeForTerm(
            academicYearWithDates?.startDate,
            selectedTermWithDates,
            installmentCount,
          ) || {
            start:
              Math.floor(((selectedTerm.order - 1) * installmentCount) / terms.length) +
              1,
            end: Math.floor((selectedTerm.order * installmentCount) / terms.length),
          }
        : null;

    const rows = fees.flatMap((sf) => {
      const paid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const installmentIndex = this.getFeeStructureInstallmentIndex(
        sf.feeStructure.feeType,
      );
      const isYearWide = !sf.termId && installmentIndex === null;
      const isPeriodView = Boolean(selectedTerm);

      if (
        selectedTermInstallmentRange &&
        installmentIndex !== null &&
        (installmentIndex < selectedTermInstallmentRange.start ||
          installmentIndex > selectedTermInstallmentRange.end)
      ) {
        return [];
      }

      let displayTotal = sf.finalAmount;
      let displayPaid = paid;
      let displayRemaining = Math.max(0, sf.finalAmount - paid);
      let displayStatus = sf.status;
      let scopeLabel =
        installmentIndex !== null
          ? this.getInstallmentPeriodLabel(
              curriculumType,
              installmentIndex - 1,
              academicYearWithDates?.startDate,
              sf.term || sf.feeStructure.term,
              resolvedCalendarType,
            )
          :
        sf.term?.name ||
        sf.feeStructure.term?.name ||
        'Whole Academic Year';

      if (isPeriodView && isYearWide && selectedTerm) {
        const perPeriodAmount =
          Math.round((sf.finalAmount / Math.max(installmentCount, 1)) * 100) /
          100;
        const paidTowardCurrent = Math.max(
          0,
          Math.min(perPeriodAmount, paid),
        );
        const currentRemaining = Math.max(
          0,
          perPeriodAmount - paidTowardCurrent,
        );

        displayTotal = perPeriodAmount;
        displayPaid = paidTowardCurrent;
        displayRemaining = currentRemaining;
        displayStatus =
          currentRemaining <= 0
            ? PaymentStatus.PAID
            : paidTowardCurrent > 0
              ? PaymentStatus.PARTIAL
              : PaymentStatus.PENDING;
        scopeLabel = `${selectedTerm.name} share`;
      }

      const studentClass = classMap.get(sf.studentId);
      return [{
        studentId: sf.studentId,
        studentName: sf.student?.name,
        grade: studentClass?.grade || null,
        section: studentClass?.section || null,
        feeType: this.formatFeeTypeLabel(sf.feeStructure.feeType),
        scopeLabel,
        installmentIndex,
        isYearWide,
        total: displayTotal,
        paid: displayPaid,
        remaining: displayRemaining,
        status: displayStatus,
      }];
    });
    const totalOutstanding = rows.reduce((s, r) => s + r.remaining, 0);
    // Total Revenue = actual amount collected (sum of all payments made)
    const totalRevenue = rows.reduce((s, r) => s + r.paid, 0);
    return { totalOutstanding, totalRevenue, rows };
  }

  async markOverdueFees(
    schoolId: string,
    academicYearId: string,
    termId?: string,
  ) {
    await this.assertAcademicYearInSchool(schoolId, academicYearId);
    await this.assertTermInSchool(schoolId, termId);

    const where: any = {
      schoolId,
      academicYearId,
      status: PaymentStatus.PENDING,
    };
    if (termId) where.termId = termId;

    const overdueFees = await this.prisma.studentFee.findMany({
      where: { ...where, dueDate: { lt: new Date() } },
    });

    if (overdueFees.length === 0)
      return { updated: 0, message: 'No fees due for marking overdue' };

    let updated = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const fee of overdueFees) {
        await tx.studentFee.update({
          where: { id: fee.id },
          data: { status: PaymentStatus.OVERDUE },
        });
        updated++;
      }
    });

    return { updated, message: `Marked ${updated} fees as overdue` };
  }

  async getOverdueFeesReport(
    schoolId: string,
    academicYearId: string,
    termId?: string,
  ) {
    await this.assertAcademicYearInSchool(schoolId, academicYearId);
    await this.assertTermInSchool(schoolId, termId);

    const where: any = {
      schoolId,
      academicYearId,
      status: PaymentStatus.OVERDUE,
    };
    if (termId) where.termId = termId;

    const penaltySetting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'fee_daily_penalty_amount' } },
    });
    const dailyPenalty = parseFloat(penaltySetting?.value || '0');

    const fees = await this.prisma.studentFee.findMany({
      where,
      include: {
        payments: true,
        student: { select: { id: true, name: true } },
        feeStructure: true,
        term: { select: { name: true } },
      },
    });

    const rows = fees.map((sf) => {
      const paid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const daysOverdue = sf.dueDate
        ? Math.floor(
            (new Date().getTime() - new Date(sf.dueDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;
      const penaltyAccumulated = Math.max(0, daysOverdue) * dailyPenalty;

      return {
        studentId: sf.studentId,
        studentName: sf.student?.name,
        feeType: sf.feeStructure.feeType,
        termName: sf.term?.name || null,
        total: sf.finalAmount,
        paid,
        remaining: Math.max(0, sf.finalAmount - paid),
        daysOverdue: Math.max(0, daysOverdue),
        penaltyAccumulated,
        dueDate: sf.dueDate?.toISOString() || null,
      };
    });

    const totalOverdue = rows.reduce((s, r) => s + r.remaining, 0);
    return { totalOverdue, count: rows.length, rows };
  }

  async getAuditLogs(
    schoolId: string,
    entityType?: string,
    entityId?: string,
    limit = 100,
    from?: string,
    to?: string,
  ) {
    const where: any = { schoolId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (from || to) {
      where.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          where.createdAt.gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = toDate;
        }
      }
      if (Object.keys(where.createdAt).length === 0) {
        delete where.createdAt;
      }
    }

    return this.prisma.financeAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private getPayrollStaffRoles() {
    return [
      Role.ADMIN,
      Role.IT_MANAGER,
      Role.REGISTRAR,
      Role.TEACHER,
      Role.FINANCE,
    ];
  }

  private getPayrollRunTitle(
    month: number,
    year: number,
    calendarType: CalendarType = 'GREGORIAN',
  ) {
    if (calendarType === 'ETHIOPIAN') {
      const monthName = ETHIOPIAN_MONTH_NAMES[month - 1] || `Month ${month}`;
      return `${monthName} ${year} E.C. Payroll`;
    }

    return `${new Date(year, month - 1, 1).toLocaleString('en-US', {
      month: 'long',
    })} ${year} Payroll`;
  }

  private calculatePayrollTotals(row: {
    baseSalary: number;
    allowances?: number | null;
    deductions?: number | null;
    bonus?: number | null;
    tax?: number | null;
  }) {
    const baseSalary = Number(row.baseSalary || 0);
    const allowances = Number(row.allowances || 0);
    const deductions = Number(row.deductions || 0);
    const bonus = Number(row.bonus || 0);
    const tax = Number(row.tax || 0);
    const grossPay = baseSalary + allowances + bonus;
    const netPay = Math.max(0, grossPay - deductions - tax);

    return {
      grossPay: Math.round(grossPay * 100) / 100,
      deductionsAmount: Math.round((deductions + tax) * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
    };
  }

  private async refreshPayrollRunTotals(tx: any, runId: string) {
    const entries = await tx.payrollEntry.findMany({
      where: { runId },
      select: {
        grossPay: true,
        deductions: true,
        tax: true,
        netPay: true,
        status: true,
      },
    });

    const payableEntries = entries.filter((entry) => entry.status !== 'HELD');
    const totals = payableEntries.reduce(
      (sum, entry) => ({
        grossAmount: sum.grossAmount + Number(entry.grossPay || 0),
        deductionsAmount:
          sum.deductionsAmount +
          Number(entry.deductions || 0) +
          Number(entry.tax || 0),
        netAmount: sum.netAmount + Number(entry.netPay || 0),
      }),
      { grossAmount: 0, deductionsAmount: 0, netAmount: 0 },
    );

    return tx.payrollRun.update({
      where: { id: runId },
      data: {
        grossAmount: Math.round(totals.grossAmount * 100) / 100,
        deductionsAmount: Math.round(totals.deductionsAmount * 100) / 100,
        netAmount: Math.round(totals.netAmount * 100) / 100,
        entryCount: payableEntries.length,
      },
    });
  }

  async listPayrollStaff(schoolId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        deletedAt: null,
        role: { in: this.getPayrollStaffRoles() },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        teacherProfile: {
          select: {
            employeeId: true,
            designation: true,
            department: { select: { name: true } },
          },
        },
        financeProfile: {
          select: {
            employeeId: true,
            department: { select: { name: true } },
          },
        },
        payrollSalaries: {
          where: { schoolId },
          take: 1,
          select: {
            id: true,
            baseSalary: true,
            allowances: true,
            deductions: true,
            bankName: true,
            bankAccount: true,
            tinNumber: true,
            isActive: true,
            effectiveFrom: true,
            notes: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      employeeId:
        user.teacherProfile?.employeeId ||
        user.financeProfile?.employeeId ||
        null,
      designation:
        user.teacherProfile?.designation ||
        (user.role === Role.FINANCE ? 'Finance Staff' : null),
      department:
        user.teacherProfile?.department?.name ||
        user.financeProfile?.department?.name ||
        null,
      salary: user.payrollSalaries[0] || null,
    }));
  }

  async listPayrollSalaries(schoolId: string) {
    return this.prisma.payrollSalary.findMany({
      where: { schoolId },
      include: {
        staffUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            teacherProfile: {
              select: {
                employeeId: true,
                designation: true,
                department: { select: { name: true } },
              },
            },
            financeProfile: {
              select: {
                employeeId: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async upsertPayrollSalary(user: any, dto: UpsertPayrollSalaryDto) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: dto.staffUserId,
        schoolId: dto.schoolId,
        deletedAt: null,
        role: { in: this.getPayrollStaffRoles() },
      },
      select: { id: true, name: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found for this school');
    }

    const salary = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.payrollSalary.findUnique({
        where: {
          schoolId_staffUserId: {
            schoolId: dto.schoolId,
            staffUserId: dto.staffUserId,
          },
        },
      });

      const payload = {
        baseSalary: dto.baseSalary,
        allowances: dto.allowances ?? 0,
        deductions: dto.deductions ?? 0,
        bankName: dto.bankName || null,
        bankAccount: dto.bankAccount || null,
        tinNumber: dto.tinNumber || null,
        isActive: dto.isActive ?? true,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        notes: dto.notes || null,
      };

      const saved = await tx.payrollSalary.upsert({
        where: {
          schoolId_staffUserId: {
            schoolId: dto.schoolId,
            staffUserId: dto.staffUserId,
          },
        },
        update: payload,
        create: {
          schoolId: dto.schoolId,
          staffUserId: dto.staffUserId,
          ...payload,
        },
      });

      await this.logAudit(tx, {
        schoolId: dto.schoolId,
        userId: user.id,
        action: existing ? 'UPDATE' : 'CREATE',
        entityType: 'PayrollSalary',
        entityId: saved.id,
        previousValue: existing,
        newValue: saved,
        amount: saved.baseSalary + saved.allowances - saved.deductions,
        description: `Payroll salary ${existing ? 'updated' : 'created'} for ${staff.name}`,
      });

      return saved;
    });

    return salary;
  }

  async listPayrollRuns(query: PayrollQueryDto) {
    const where: Prisma.PayrollRunWhereInput = { schoolId: query.schoolId };
    if (query.month) where.periodMonth = query.month;
    if (query.year) where.periodYear = query.year;
    if (query.status) where.status = query.status;

    const runs = await this.prisma.payrollRun.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
        _count: { select: { entries: true } },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    const summary = runs.reduce(
      (sum, run) => ({
        runCount: sum.runCount + 1,
        entryCount: sum.entryCount + run.entryCount,
        grossAmount: sum.grossAmount + run.grossAmount,
        deductionsAmount: sum.deductionsAmount + run.deductionsAmount,
        netAmount: sum.netAmount + run.netAmount,
      }),
      {
        runCount: 0,
        entryCount: 0,
        grossAmount: 0,
        deductionsAmount: 0,
        netAmount: 0,
      },
    );

    return { runs, summary };
  }

  async getPayrollRun(schoolId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, schoolId },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
        entries: {
          include: {
            staffUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                teacherProfile: {
                  select: {
                    employeeId: true,
                    designation: true,
                    department: { select: { name: true } },
                  },
                },
                financeProfile: {
                  select: {
                    employeeId: true,
                    department: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: [{ staffUser: { name: 'asc' } }],
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    return run;
  }

  async createPayrollRun(user: any, dto: CreatePayrollRunDto) {
    const activeSalaries = await this.prisma.payrollSalary.findMany({
      where: {
        schoolId: dto.schoolId,
        isActive: true,
        staffUser: {
          isActive: true,
          deletedAt: null,
          role: { in: this.getPayrollStaffRoles() },
        },
      },
      include: { staffUser: { select: { id: true, name: true } } },
      orderBy: [{ staffUser: { name: 'asc' } }],
    });

    if (activeSalaries.length === 0) {
      throw new BadRequestException(
        'Add at least one active staff salary before creating payroll',
      );
    }

    const calendarType = await this.getSchoolCalendarType(dto.schoolId);

    try {
      const runId = await this.prisma.$transaction(async (tx) => {
        const run = await tx.payrollRun.create({
          data: {
            schoolId: dto.schoolId,
            title:
              dto.title ||
              this.getPayrollRunTitle(
                dto.periodMonth,
                dto.periodYear,
                calendarType,
              ),
            periodMonth: dto.periodMonth,
            periodYear: dto.periodYear,
            periodCalendarType: calendarType,
            paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
            notes: dto.notes || null,
            createdById: user.id,
          },
        });

        await tx.payrollEntry.createMany({
          data: activeSalaries.map((salary) => {
            const totals = this.calculatePayrollTotals(salary);
            return {
              runId: run.id,
              schoolId: dto.schoolId,
              staffUserId: salary.staffUserId,
              salaryId: salary.id,
              baseSalary: salary.baseSalary,
              allowances: salary.allowances,
              deductions: salary.deductions,
              grossPay: totals.grossPay,
              netPay: totals.netPay,
              status: 'PENDING',
            };
          }),
        });

        const refreshedRun = await this.refreshPayrollRunTotals(tx, run.id);
        await this.logAudit(tx, {
          schoolId: dto.schoolId,
          userId: user.id,
          action: 'CREATE',
          entityType: 'PayrollRun',
          entityId: run.id,
          newValue: refreshedRun,
          amount: refreshedRun.netAmount,
          description: `Payroll run created for ${dto.periodMonth}/${dto.periodYear}`,
        });

        return run.id;
      });

      return this.getPayrollRun(dto.schoolId, runId);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Payroll already exists for this month');
      }
      throw error;
    }
  }

  async updatePayrollRunStatus(
    user: any,
    runId: string,
    dto: UpdatePayrollRunStatusDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.findFirst({
        where: { id: runId, schoolId: dto.schoolId },
      });

      if (!run) {
        throw new NotFoundException('Payroll run not found');
      }

      if (run.status === 'PAID') {
        throw new BadRequestException('Paid payroll runs cannot be changed');
      }

      if (run.status === 'CANCELLED') {
        throw new BadRequestException('Cancelled payroll runs cannot be changed');
      }

      if (run.status !== dto.status) {
        const allowedTransitions: Record<string, string[]> = {
          DRAFT: ['APPROVED', 'CANCELLED'],
          APPROVED: ['PAID', 'CANCELLED'],
        };
        const allowedNextStatuses = allowedTransitions[run.status] || [];
        if (!allowedNextStatuses.includes(dto.status)) {
          throw new BadRequestException(
            `Payroll run must move from DRAFT to APPROVED before payment`,
          );
        }
      }

      const statusData: Record<string, any> = {
        status: dto.status,
        notes: dto.notes ?? run.notes,
      };

      if (dto.status === 'APPROVED') {
        statusData.approvedById = user.id;
        await tx.payrollEntry.updateMany({
          where: { runId, status: 'PENDING' },
          data: { status: 'APPROVED' },
        });
      }

      if (dto.status === 'PAID') {
        const entryStatuses = await tx.payrollEntry.groupBy({
          by: ['status'],
          where: { runId },
          _count: { _all: true },
        });
        const counts = entryStatuses.reduce<Record<string, number>>(
          (sum, row) => ({ ...sum, [row.status]: row._count._all }),
          {},
        );
        if (counts.PENDING) {
          throw new BadRequestException(
            'Approve the payroll run before marking it paid',
          );
        }
        if (!counts.APPROVED && !counts.PAID) {
          throw new BadRequestException(
            'Payroll has no payable entries to mark as paid',
          );
        }

        statusData.paidById = user.id;
        statusData.paymentDate = dto.paymentDate
          ? new Date(dto.paymentDate)
          : run.paymentDate || new Date();
        statusData.paidAt = new Date();
        await tx.payrollEntry.updateMany({
          where: { runId, status: 'APPROVED' },
          data: { status: 'PAID', paidAt: statusData.paidAt },
        });
      }

      const updated = await tx.payrollRun.update({
        where: { id: runId },
        data: statusData,
      });

      await this.logAudit(tx, {
        schoolId: dto.schoolId,
        userId: user.id,
        action: dto.status,
        entityType: 'PayrollRun',
        entityId: runId,
        previousValue: run,
        newValue: updated,
        amount: updated.netAmount,
        description: `Payroll run marked ${dto.status}`,
      });

      return updated;
    });
  }

  async updatePayrollEntryStatus(
    user: any,
    entryId: string,
    dto: UpdatePayrollEntryStatusDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.payrollEntry.findFirst({
        where: { id: entryId, schoolId: dto.schoolId },
        include: { run: { select: { status: true } } },
      });

      if (!entry) {
        throw new NotFoundException('Payroll entry not found');
      }

      if (entry.run.status === 'PAID' || entry.run.status === 'CANCELLED') {
        throw new BadRequestException(
          'Entries cannot be changed after the payroll run is final',
        );
      }

      if (entry.status === 'PAID' && dto.status !== 'PAID') {
        throw new BadRequestException('Paid payroll entries cannot be reopened');
      }

      if (dto.status === 'PAID' && entry.run.status !== 'APPROVED') {
        throw new BadRequestException(
          'Approve the payroll run before paying staff entries',
        );
      }

      const updated = await tx.payrollEntry.update({
        where: { id: entryId },
        data: {
          status: dto.status,
          paymentMethod: dto.paymentMethod || entry.paymentMethod,
          transactionReference:
            dto.transactionReference || entry.transactionReference,
          notes: dto.notes ?? entry.notes,
          paidAt: dto.status === 'PAID' ? new Date() : entry.paidAt,
        },
      });

      await this.refreshPayrollRunTotals(tx, entry.runId);
      await this.logAudit(tx, {
        schoolId: dto.schoolId,
        userId: user.id,
        action: dto.status,
        entityType: 'PayrollEntry',
        entityId: entryId,
        previousValue: entry,
        newValue: updated,
        amount: updated.netPay,
        reference: updated.transactionReference || undefined,
        description: `Payroll entry marked ${dto.status}`,
      });

      return updated;
    });
  }

  async paymentHistoryForStudent(schoolId: string, studentId: string) {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        OR: [{ id: studentId }, { userId: studentId }],
      },
      select: { id: true, userId: true },
    });

    if (!studentProfile) {
      throw new Error('Student not found');
    }

    const candidateStudentIds = [studentProfile.id, studentProfile.userId].filter(
      (value): value is string => Boolean(value),
    );

    const payments = await this.prisma.payment.findMany({
      where: { schoolId, studentId: { in: candidateStudentIds } },
      orderBy: { paymentDate: 'desc' },
      include: { studentFee: { include: { feeStructure: true } } },
    });
    const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
    return { totalPaid, count: payments.length, payments };
  }

  // ========================================================
  // CURRICULUM INFO
  // ========================================================

  async getCurriculumInfo(schoolId: string, academicYearId: string) {
    await this.assertAcademicYearInSchool(schoolId, academicYearId);
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'curriculum_type' } },
    });
    const curriculumType = setting?.value || 'TERM';
    const terms = await this.prisma.term.findMany({
      where: { academicYearId, academicYear: { schoolId } },
      orderBy: { order: 'asc' },
    });
    return { curriculumType, terms, termCount: terms.length };
  }

  // ========================================================
  // STUDENT FEE SUMMARY (PARENT PORTAL)
  // ========================================================

  async getStudentFeeSummary(
    schoolId: string,
    studentId: string,
    academicYearId: string,
    termId?: string,
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        OR: [{ id: studentId }, { userId: studentId }],
      },
      include: { user: { select: { name: true } } },
    });

    if (!student) throw new Error('Student not found');
    const profileId = student.id;
    const candidateStudentIds = [student.id, student.userId].filter(
      (value): value is string => Boolean(value),
    );

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true, startDate: true },
    });
    if (!academicYear) {
      throw new Error('Academic year not found');
    }

    const discountStudents = await this.prisma.studentProfile.findMany({
      where: { schoolId, enrollmentStatus: 'APPROVED' },
      select: { id: true, userId: true, createdAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const familyDiscount = await this.getFamilyDiscountContext(
      schoolId,
      discountStudents,
    );
    if (familyDiscount.enabled) {
      const feeStructures = await this.prisma.feeStructure.findMany({
        where: { schoolId, academicYearId, isActive: true },
        select: { id: true, feeType: true, amount: true },
      });
      await this.recalculateFamilyDiscountsForExistingFees({
        schoolId,
        academicYearId,
        feeStructures,
        studentIds: candidateStudentIds,
        familyDiscount,
      });
    }

    const selectedTerm =
      termId && termId !== 'all'
        ? await this.prisma.term.findFirst({
            where: { id: termId, academicYear: { schoolId } },
            select: { id: true, name: true, order: true, academicYearId: true },
          })
        : null;
    if (termId && termId !== 'all' && !selectedTerm) {
      throw new Error('Term not found');
    }
    const curriculumType = await this.getFeeCollectionModeInternal(schoolId);
    const installmentCount = this.getInstallmentCountInternal(curriculumType);
    const terms = await this.prisma.term.findMany({
      where: { academicYearId, academicYear: { schoolId } },
      orderBy: { order: 'asc' },
    });
    const selectedTermInstallmentRange =
      selectedTerm && terms.length > 0 && installmentCount > terms.length
        ? this.getInstallmentRangeForTerm(
            academicYear.startDate,
            terms.find((term) => term.id === selectedTerm.id) || null,
            installmentCount,
          ) || {
            start:
              Math.floor(((selectedTerm.order - 1) * installmentCount) / terms.length) +
              1,
            end: Math.floor((selectedTerm.order * installmentCount) / terms.length),
          }
        : null;

    const studentFeesWhere: any = {
      studentId: { in: candidateStudentIds },
      academicYearId,
      schoolId,
    };
    if (termId && termId !== 'all') {
      studentFeesWhere.OR = [{ termId }, { termId: null }];
    }

    const studentFees = await this.prisma.studentFee.findMany({
      where: studentFeesWhere,
      include: {
        feeStructure: { include: { term: { select: { name: true } } } },
        discountPolicy: {
          select: { name: true, discountType: true, discountValue: true },
        },
        term: { select: { name: true } },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: { term: { select: { name: true } } },
        },
      },
    });

    const feeItems = studentFees.flatMap((sf) => {
      const paid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const installmentIndex = this.getFeeStructureInstallmentIndex(
        sf.feeStructure.feeType,
      );
      const isYearWide = !sf.termId && installmentIndex === null;
      const isPeriodView = Boolean(selectedTerm);

      if (
        selectedTermInstallmentRange &&
        installmentIndex !== null &&
        (installmentIndex < selectedTermInstallmentRange.start ||
          installmentIndex > selectedTermInstallmentRange.end)
      ) {
        return [];
      }

      let amount = sf.totalAmount;
      let paidAmount = paid;
      let balance = Math.max(0, sf.finalAmount - paid);
      let status = sf.status;
      let termName =
        installmentIndex !== null
          ? this.getInstallmentPeriodLabel(
              curriculumType,
              installmentIndex - 1,
              academicYear?.startDate || null,
              sf.term || sf.feeStructure.term,
            )
          : sf.term?.name || sf.feeStructure.term?.name || null;

      if (isPeriodView && isYearWide && selectedTerm) {
        const perPeriodAmount =
          Math.round((sf.finalAmount / Math.max(installmentCount, 1)) * 100) /
          100;
        const paidTowardCurrent = Math.max(0, Math.min(perPeriodAmount, paid));
        const currentRemaining = Math.max(0, perPeriodAmount - paidTowardCurrent);

        amount = perPeriodAmount;
        paidAmount = paidTowardCurrent;
        balance = currentRemaining;
        status =
          currentRemaining <= 0
            ? PaymentStatus.PAID
            : paidTowardCurrent > 0
              ? PaymentStatus.PARTIAL
              : PaymentStatus.PENDING;
        termName = `${selectedTerm.name} share`;
      }

      return [{
        id: sf.id,
        name: sf.feeStructure.feeType,
        amount,
        originalAmount: sf.totalAmount,
        discount: sf.discount,
        finalAmount: sf.finalAmount,
        discountPercent:
          sf.discountPolicy?.discountType === 'PERCENTAGE'
            ? sf.discountPolicy.discountValue
            : sf.totalAmount > 0 && sf.discount > 0
              ? Math.round((sf.discount / sf.totalAmount) * 10000) / 100
              : 0,
        discountLabel: sf.discountPolicy?.name || null,
        dueDate: sf.dueDate?.toISOString() || null,
        status,
        paidAmount,
        balance,
        category: sf.feeStructure.feeType,
        termId: sf.termId,
        termName,
        isYearWide,
      }];
    });

    const payments = studentFees.flatMap((sf) => {
      const installmentIndex = this.getFeeStructureInstallmentIndex(
        sf.feeStructure.feeType,
      );
      if (
        selectedTermInstallmentRange &&
        installmentIndex !== null &&
        (installmentIndex < selectedTermInstallmentRange.start ||
          installmentIndex > selectedTermInstallmentRange.end)
      ) {
        return [];
      }
      const termName =
        installmentIndex !== null
          ? this.getInstallmentPeriodLabel(
              curriculumType,
              installmentIndex - 1,
              academicYear?.startDate || null,
              sf.term || sf.feeStructure.term,
            )
          : sf.term?.name || sf.feeStructure.term?.name || null;

      return sf.payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        paymentReference: p.receiptNumber,
        transactionReference: p.transactionReference || null,
        studentFeeId: sf.id,
        amount: p.amountPaid,
        paymentMethod: p.paymentMethod,
        paidAt: p.paymentDate.toISOString(),
        feeItemName: sf.feeStructure.feeType,
        termId: p.termId || sf.termId,
        termName: p.term?.name || termName,
        isYearWide: !sf.termId && installmentIndex === null,
        status: 'COMPLETED',
      }));
    });

    const totalFees = feeItems.reduce((s, f) => s + f.amount, 0);
    const totalPaid = feeItems.reduce((s, f) => s + f.paidAmount, 0);
    const totalBalance = feeItems.reduce((s, f) => s + f.balance, 0);

    return {
      student: {
        id: student.id,
        name: student.user.name,
        studentCode: student.studentCode || 'N/A',
        className:
          'Grade ' +
          (student.academicYear ? student.academicYear.split('-')[0] : 'N/A'),
        section: student.section || 'N/A',
      },
      feeItems,
      payments,
      curriculumType,
      terms,
      summary: { totalFees, totalPaid, totalBalance, nextDueDate: null },
    };
  }

  // ========================================================
  // DISCOUNT POLICY METHODS
  // ========================================================

  async createDiscountPolicy(
    schoolId: string,
    data: {
      name: string;
      discountType: string;
      discountValue: number;
      isActive?: boolean;
      criteria?: string;
    },
  ) {
    return this.prisma.discountPolicy.create({
      data: {
        schoolId,
        name: data.name,
        discountType: data.discountType,
        discountValue: data.discountValue,
        isActive: data.isActive ?? true,
        criteria: data.criteria ?? null,
      },
    });
  }

  async listDiscountPolicies(schoolId: string, includeInactive = false) {
    return this.prisma.discountPolicy.findMany({
      where: { schoolId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async updateDiscountPolicy(
    id: string,
    schoolId: string,
    data: {
      name?: string;
      discountType?: string;
      discountValue?: number;
      isActive?: boolean;
      criteria?: string;
    },
  ) {
    const policy = await this.prisma.discountPolicy.findUnique({
      where: { id },
    });
    if (!policy || policy.schoolId !== schoolId)
      throw new Error('Discount policy not found for this school');
    return this.prisma.discountPolicy.update({
      where: { id },
      data: {
        name: data.name ?? policy.name,
        discountType: data.discountType ?? policy.discountType,
        discountValue: data.discountValue ?? policy.discountValue,
        isActive: data.isActive ?? policy.isActive,
        criteria: data.criteria ?? policy.criteria,
      },
    });
  }

  async deleteDiscountPolicy(id: string, schoolId: string) {
    const policy = await this.prisma.discountPolicy.findUnique({
      where: { id },
    });
    if (!policy || policy.schoolId !== schoolId)
      throw new Error('Discount policy not found for this school');
    return this.prisma.discountPolicy.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async applyDiscountPolicy(
    studentFeeId: string,
    discountPolicyId: string,
    schoolId: string,
  ) {
    const policy = await this.prisma.discountPolicy.findUnique({
      where: { id: discountPolicyId },
    });
    if (!policy || policy.schoolId !== schoolId)
      throw new Error('Invalid discount policy');

    const studentFee = await this.prisma.studentFee.findUnique({
      where: { id: studentFeeId },
    });
    if (!studentFee || studentFee.schoolId !== schoolId)
      throw new Error('Student fee not found');

    let discountAmount = 0;
    if (policy.discountType === 'PERCENTAGE') {
      discountAmount = (studentFee.totalAmount * policy.discountValue) / 100;
    } else {
      discountAmount = policy.discountValue;
    }

    return this.prisma.studentFee.update({
      where: { id: studentFeeId },
      data: {
        discountPolicyId,
        discount: discountAmount,
        finalAmount: Math.max(0, studentFee.totalAmount - discountAmount),
      },
    });
  }
}
