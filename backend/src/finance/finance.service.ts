import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

const CHUNK_SIZE = 50;
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Prisma } from '@prisma/client';
import { Role } from '../auth/types/role.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';
import { EventBusService } from '../core/events/event-bus.service';
import {
  CalculateInstallmentFeesDto,
  GenerateInstallmentFeesDto,
} from './dto/finance.dto';
import {
  CalendarType,
  ETHIOPIAN_MONTH_NAMES,
  formatSchoolDate,
  toEthiopianDate,
  toGregorianDate,
} from '../common/date.util';

type CurriculumType = 'TERM' | 'QUARTER' | 'SEMESTER';
type BillingMode = 'MONTHLY' | 'TERMLY' | 'QUARTERLY' | 'SEMESTERLY' | 'YEARLY';

export interface BillingConfig {
  curriculumType: CurriculumType;
  billingMode: BillingMode;
  calendarType: CalendarType;
  dueDay: number;
  curriculumPeriodCount: number;
  billingPeriodsPerYear: number;
  installmentsPerCurriculumPeriod: number;
  periods?: Array<{
    id: string;
    name: string;
    order: number;
    startDate?: Date | null;
    endDate?: Date | null;
  }>;
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly FAMILY_DISCOUNT_POLICY_NAME = 'Automatic Family Discount';

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly eventBus: EventBusService,
  ) {}
  // ========================================================
  // INTELLIGENT FEE CALCULATION HELPER METHODS
  // ========================================================

  private normalizeCurriculumType(value?: string | null): CurriculumType {
    const normalized = String(value || '')
      .trim()
      .toUpperCase();
    if (normalized === 'QUARTER' || normalized === 'QUARTERLY')
      return 'QUARTER';
    if (normalized === 'SEMESTER' || normalized === 'SEMESTERLY')
      return 'SEMESTER';
    return 'TERM';
  }

  private normalizeBillingMode(value?: string | null): BillingMode {
    const normalized = String(value || '')
      .trim()
      .toUpperCase();
    if (normalized === 'MONTH' || normalized === 'MONTHLY') return 'MONTHLY';
    if (normalized === 'QUARTER' || normalized === 'QUARTERLY')
      return 'QUARTERLY';
    if (normalized === 'SEMESTER' || normalized === 'SEMESTERLY')
      return 'SEMESTERLY';
    if (normalized === 'TERM' || normalized === 'TERMLY') return 'TERMLY';
    if (normalized === 'YEAR' || normalized === 'YEARLY') return 'YEARLY';
    return 'TERMLY';
  }

  private getCurriculumPeriodCount(curriculumType: CurriculumType) {
    const counts: Record<CurriculumType, number> = {
      TERM: 3,
      QUARTER: 4,
      SEMESTER: 2,
    };
    return counts[curriculumType];
  }

  private getBillingPeriodsPerYear(
    billingMode: BillingMode,
    curriculumPeriodCount: number,
  ) {
    const counts: Record<Exclude<BillingMode, 'MONTHLY' | 'TERMLY'>, number> = {
      QUARTERLY: 4,
      SEMESTERLY: 2,
      YEARLY: 1,
    };
    if (billingMode === 'MONTHLY') return curriculumPeriodCount * 2;
    if (billingMode === 'TERMLY') return curriculumPeriodCount;
    return counts[billingMode];
  }

  async getBillingConfig(
    schoolId: string,
    academicYearId?: string,
  ): Promise<BillingConfig> {
    const settings = await this.prisma.schoolSetting.findMany({
      where: {
        schoolId,
        key: {
          in: [
            'curriculum_type',
            'fee_structure_mode',
            'calendar_type',
            'fee_payment_due_day',
          ],
        },
      },
      select: { key: true, value: true },
    });
    const settingValue = (key: string) =>
      settings.find((setting) => setting.key === key)?.value;

    const curriculumType = this.normalizeCurriculumType(
      settingValue('curriculum_type'),
    );
    const billingMode = this.normalizeBillingMode(
      settingValue('fee_structure_mode'),
    );
    const calendarType =
      String(settingValue('calendar_type') || '').toUpperCase() === 'GREGORIAN'
        ? 'GREGORIAN'
        : 'ETHIOPIAN';
    const dueDay = Math.max(
      1,
      Math.min(
        30,
        Number.parseInt(settingValue('fee_payment_due_day') || '15', 10) || 15,
      ),
    );
    const curriculumPeriodCount = this.getCurriculumPeriodCount(curriculumType);
    const billingPeriodsPerYear = this.getBillingPeriodsPerYear(
      billingMode,
      curriculumPeriodCount,
    );

    const config: BillingConfig = {
      curriculumType,
      billingMode,
      calendarType,
      dueDay,
      curriculumPeriodCount,
      billingPeriodsPerYear,
      installmentsPerCurriculumPeriod: Math.round(
        billingPeriodsPerYear / curriculumPeriodCount,
      ),
    };

    if (academicYearId) {
      config.periods = await this.getTermsForAcademicYear(
        academicYearId,
        schoolId,
      );
    }

    return config;
  }

  private splitAmount(total: number, count: number) {
    const safeCount = Math.max(1, count);
    const baseAmount = Math.floor((Number(total || 0) / safeCount) * 100) / 100;
    const remainder =
      Math.round((Number(total || 0) - baseAmount * safeCount) * 100) / 100;
    return Array.from({ length: safeCount }, (_, index) =>
      index === safeCount - 1
        ? Math.round((baseAmount + remainder) * 100) / 100
        : baseAmount,
    );
  }

  private getCurriculumPeriodForInstallment(
    config: BillingConfig,
    zeroBasedIndex: number,
    periods: Array<{
      id: string;
      order?: number | null;
      name?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
    }>,
  ) {
    if (periods.length === 0 || config.billingMode === 'YEARLY') return null;
    const sortedPeriods = periods
      .slice()
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const billingCount = Math.max(1, config.billingPeriodsPerYear);
    let periodIndex: number;

    if (billingCount >= config.curriculumPeriodCount || billingCount === 1) {
      periodIndex = Math.floor(
        (zeroBasedIndex * config.curriculumPeriodCount) / billingCount,
      );
    } else {
      periodIndex = Math.round(
        (zeroBasedIndex * (config.curriculumPeriodCount - 1)) /
          Math.max(1, billingCount - 1),
      );
    }

    return (
      sortedPeriods[
        Math.max(0, Math.min(periodIndex, sortedPeriods.length - 1))
      ] || null
    );
  }

  private getBillingIndexWithinPeriod(
    config: BillingConfig,
    zeroBasedIndex: number,
    periods: Array<{ id: string; order?: number | null }>,
  ) {
    const period = this.getCurriculumPeriodForInstallment(
      config,
      zeroBasedIndex,
      periods,
    );
    if (!period) return 0;

    let offset = 0;
    for (let i = 0; i < zeroBasedIndex; i += 1) {
      const previousPeriod = this.getCurriculumPeriodForInstallment(
        config,
        i,
        periods,
      );
      if (previousPeriod?.id === period.id) offset += 1;
    }
    return offset;
  }

  private enumerateCalendarMonths(
    startDate: Date,
    endDate: Date,
    calendarType: CalendarType | string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const labels: string[] = [];
    const addLabel = (label?: string | null) => {
      if (label && !labels.includes(label)) labels.push(label);
    };

    if (String(calendarType).toUpperCase() === 'GREGORIAN') {
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= endCursor) {
        addLabel(cursor.toLocaleDateString('en-US', { month: 'long' }));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return labels;
    }

    const startEth = toEthiopianDate(start);
    const endEth = toEthiopianDate(end);
    let absoluteMonth = startEth.year * 13 + startEth.month - 1;
    const endAbsoluteMonth = endEth.year * 13 + endEth.month - 1;
    while (absoluteMonth <= endAbsoluteMonth) {
      const month = (absoluteMonth % 13) + 1;
      addLabel(ETHIOPIAN_MONTH_NAMES[month - 1]);
      absoluteMonth += 1;
    }
    return labels;
  }

  private getBillingMonthLabelForPeriod(
    period: {
      startDate?: Date | null;
      endDate?: Date | null;
      name?: string | null;
      order?: number | null;
    } | null,
    billingIndexWithinPeriod: number,
    config: BillingConfig,
    calendarType: CalendarType | string,
  ): string {
    if (config.billingMode === 'YEARLY') return 'Full Year';
    if (config.billingMode === 'TERMLY') {
      return period?.name || `Period ${billingIndexWithinPeriod + 1}`;
    }

    if (
      config.billingMode === 'MONTHLY' &&
      period?.startDate &&
      period?.endDate
    ) {
      const months = this.enumerateCalendarMonths(
        new Date(period.startDate),
        new Date(period.endDate),
        calendarType,
      );
      return (
        months[billingIndexWithinPeriod] ||
        `Month ${billingIndexWithinPeriod + 1}`
      );
    }

    if (period?.name) return period.name;
    const modeLabel =
      config.billingMode === 'QUARTERLY'
        ? 'Quarter'
        : config.billingMode === 'SEMESTERLY'
          ? 'Semester'
          : 'Installment';
    return `${modeLabel} ${billingIndexWithinPeriod + 1}`;
  }

  private getFeeStructureInstallmentIndex(feeType?: string | null) {
    const match = String(feeType || '').match(/_INSTALLMENT_(\d+)$/i);
    return match ? Number(match[1]) : null;
  }

  private getClassGradeNumber(
    classInfo?: {
      grade?: number | null;
      name?: string | null;
    } | null,
  ) {
    if (classInfo?.grade != null && Number.isFinite(Number(classInfo.grade))) {
      return Number(classInfo.grade);
    }

    const match = String(classInfo?.name || '').match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  private getInstallmentDueDate(params: {
    zeroBasedIndex: number;
    config: BillingConfig;
    period: {
      startDate?: Date | null;
      endDate?: Date | null;
      order?: number | null;
    } | null;
    periods?: Array<{ id: string; order?: number | null }>;
    academicYearStartDate?: Date | null;
    dueDay: number;
    calendarType?: CalendarType | string | null;
  }) {
    const resolvedCalendarType =
      String(params.calendarType || '').toUpperCase() === 'GREGORIAN'
        ? 'GREGORIAN'
        : 'ETHIOPIAN';
    const safeDueDay = Math.max(1, Math.min(30, Number(params.dueDay) || 15));
    const billingIndexWithinPeriod = params.periods?.length
      ? this.getBillingIndexWithinPeriod(
          params.config,
          params.zeroBasedIndex,
          params.periods,
        )
      : params.zeroBasedIndex;
    const isMonthlyBilling = params.config.billingMode === 'MONTHLY';
    const usePeriodEndMonth =
      !isMonthlyBilling && Boolean(params.period?.endDate);
    const periodBaseDate = !usePeriodEndMonth
      ? params.period?.startDate
      : params.period?.endDate;
    const baseDate = periodBaseDate
      ? new Date(periodBaseDate)
      : params.academicYearStartDate
        ? new Date(params.academicYearStartDate)
        : new Date();
    const monthOffset = isMonthlyBilling ? billingIndexWithinPeriod : 0;

    if (resolvedCalendarType === 'ETHIOPIAN') {
      const eth = toEthiopianDate(baseDate);
      const zeroBasedTargetMonth = eth.month - 1 + monthOffset;
      const targetYear = eth.year + Math.floor(zeroBasedTargetMonth / 13);
      const targetMonth = (zeroBasedTargetMonth % 13) + 1;
      const maxDayInPeriodMonth = usePeriodEndMonth ? eth.day : safeDueDay;
      const day = Math.min(
        safeDueDay,
        maxDayInPeriodMonth,
        this.getEthiopianMonthLength(targetYear, targetMonth),
      );
      return toGregorianDate({ year: targetYear, month: targetMonth, day });
    }

    const result = new Date(baseDate);
    result.setMonth(result.getMonth() + monthOffset);
    result.setDate(1);
    const lastDay = new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0,
    ).getDate();
    const maxDayInPeriodMonth = usePeriodEndMonth
      ? new Date(baseDate).getDate()
      : safeDueDay;
    result.setDate(Math.min(safeDueDay, maxDayInPeriodMonth, lastDay));
    return result;
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

  private getMonthOffsetBetweenDates(
    from: Date,
    to: Date,
    calendarType: CalendarType | string,
  ) {
    if (String(calendarType).toUpperCase() === 'ETHIOPIAN') {
      const fromEth = toEthiopianDate(from);
      const toEth = toEthiopianDate(to);
      return (toEth.year - fromEth.year) * 13 + (toEth.month - fromEth.month);
    }
    return (
      (to.getFullYear() - from.getFullYear()) * 12 +
      (to.getMonth() - from.getMonth())
    );
  }

  private getInstallmentRangeForTerm(
    academicYearStartDate: Date | null | undefined,
    term: { startDate?: Date | null; endDate?: Date | null } | null,
    installmentCount: number,
    calendarType: CalendarType | string = 'ETHIOPIAN',
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

    const start = Math.max(
      1,
      Math.min(
        installmentCount,
        this.getMonthOffsetBetweenDates(
          academicYearStartDate,
          term.startDate,
          calendarType,
        ) + 1,
      ),
    );
    const end =
      term.endDate && !Number.isNaN(term.endDate.getTime())
        ? Math.max(
            start,
            Math.min(
              installmentCount,
              this.getMonthOffsetBetweenDates(
                academicYearStartDate,
                term.endDate,
                calendarType,
              ) + 1,
            ),
          )
        : start;

    return { start, end };
  }

  private getInstallmentRangeForSelectedTerm(params: {
    config: BillingConfig;
    selectedTerm: {
      id?: string | null;
      order?: number | null;
      startDate?: Date | null;
      endDate?: Date | null;
    } | null;
    terms: Array<{ id: string; order?: number | null }>;
  }) {
    if (!params.selectedTerm || params.terms.length === 0) return null;
    if (params.config.billingMode === 'YEARLY') return null;

    const indexes: number[] = [];
    for (let i = 0; i < params.config.billingPeriodsPerYear; i += 1) {
      const period = this.getCurriculumPeriodForInstallment(
        params.config,
        i,
        params.terms,
      );
      if (period?.id === params.selectedTerm.id) indexes.push(i + 1);
    }

    if (indexes.length === 0) return null;
    return { start: Math.min(...indexes), end: Math.max(...indexes) };
  }

  private async getTermsForAcademicYear(
    academicYearId: string,
    schoolId?: string,
  ): Promise<any[]> {
    return this.prisma.term.findMany({
      where: {
        academicYearId,
        ...(schoolId ? { academicYear: { schoolId } } : {}),
      },
      orderBy: { order: 'asc' },
    });
  }

  private async assertAcademicYearInSchool(
    schoolId: string,
    academicYearId: string,
  ) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true, name: true, curriculumType: true },
    });
    if (!academicYear) {
      throw new Error('Academic year not found for this school');
    }
    return academicYear;
  }

  private getCurriculumPeriodDisplayName(curriculumType?: string | null) {
    const normalized = String(curriculumType || '')
      .trim()
      .toUpperCase();
    if (normalized === 'QUARTER') return 'Quarter';
    if (normalized === 'SEMESTER') return 'Semester';
    return 'Academic period';
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
          AND: [{ metadata: { contains: `"daysBefore":${daysBefore}` } }],
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
      throw new Error(
        'Selected curriculum period was not found for this school',
      );
    }

    const sent = await this.notifyParentsForTermFeeDue(term, true);
    return { sent, termName: term.name };
  }

  private async notifyParentsForTermFeeDue(
    term: {
      id: string;
      name: string;
      academicYearId: string;
      academicYear: { id: string; schoolId: string; name: string };
    },
    force = false,
  ) {
    const schoolId = term.academicYear.schoolId;
    const config = await this.getBillingConfig(schoolId, term.academicYearId);
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
        : Math.round(
            (fee.finalAmount / Math.max(config.billingPeriodsPerYear, 1)) * 100,
          ) / 100;
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
    return `Birr ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // ========================================================
  // PUBLIC FEE CALCULATION METHODS
  // ========================================================

  async calculateInstallmentFees(dto: CalculateInstallmentFeesDto) {
    const config = await this.getBillingConfig(
      dto.schoolId,
      dto.academicYearId,
    );
    const terms = config.periods || [];
    const amounts = this.splitAmount(
      dto.annualAmount,
      config.billingPeriodsPerYear,
    );
    const installmentAmount = amounts[0] || 0;
    const remainder =
      Math.round(
        (dto.annualAmount - installmentAmount * amounts.length) * 100,
      ) / 100;

    const modeLabels: Record<string, string> = {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMESTERLY: 'Semesterly',
      TERMLY: 'Termly',
      YEARLY: 'Full Year',
    };

    return {
      mode: config.billingMode,
      curriculumType: config.curriculumType,
      modeLabel: modeLabels[config.billingMode] || config.billingMode,
      installmentCount: config.billingPeriodsPerYear,
      installmentAmount,
      remainder,
      annualAmount: dto.annualAmount,
      totalWithRemainder:
        Math.round((dto.annualAmount + remainder) * 100) / 100,
      description: `Annual tuition of ${dto.annualAmount} split into ${config.billingPeriodsPerYear} ${modeLabels[config.billingMode] || 'installments'}`,
      suggestedTermDistribution: amounts.map((amount, index) => {
        const period = this.getCurriculumPeriodForInstallment(
          config,
          index,
          terms,
        );
        const billingIndexWithinPeriod = this.getBillingIndexWithinPeriod(
          config,
          index,
          terms,
        );
        return {
          termName: period?.name || 'Whole Academic Year',
          termId: period?.id,
          label: this.getBillingMonthLabelForPeriod(
            period,
            billingIndexWithinPeriod,
            config,
            config.calendarType,
          ),
          amount,
        };
      }),
    };
  }

  async generateInstallmentFees(dto: GenerateInstallmentFeesDto) {
    await this.assertAcademicYearInSchool(dto.schoolId, dto.academicYearId);
    const [config, academicYear] = await Promise.all([
      this.getBillingConfig(dto.schoolId, dto.academicYearId),
      this.prisma.academicYear.findFirst({
        where: { id: dto.academicYearId, schoolId: dto.schoolId },
        select: { startDate: true },
      }),
    ]);
    const terms = config.periods || [];
    const gradeWhere =
      dto.grade != null ? { grade: dto.grade } : { grade: null };
    const baseType = dto.feeType || 'TUITION';

    const existingStructures = await this.prisma.feeStructure.findMany({
      where: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        feeType: baseType,
        ...gradeWhere,
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
    const amounts = this.splitAmount(
      annualAmount,
      config.billingPeriodsPerYear,
    );

    let created = 0;
    await this.prisma.$transaction(async (tx) => {
      const displayFeeType = String(baseType || 'Tuition').replace(/_/g, ' ');
      const installmentFeePrefix = `${baseType}_INSTALLMENT_`;
      const expectedInstallmentIds: string[] = [];

      for (let i = 0; i < config.billingPeriodsPerYear; i++) {
        const installmentTerm = this.getCurriculumPeriodForInstallment(
          config,
          i,
          terms,
        );
        const billingIndexWithinPeriod = this.getBillingIndexWithinPeriod(
          config,
          i,
          terms,
        );
        const periodName = this.getBillingMonthLabelForPeriod(
          installmentTerm,
          billingIndexWithinPeriod,
          config,
          config.calendarType,
        );
        const installmentTermId = installmentTerm?.id || null;
        const existingInstallment = await tx.feeStructure.findFirst({
          where: {
            schoolId: dto.schoolId,
            academicYearId: dto.academicYearId,
            feeType: `${installmentFeePrefix}${i + 1}`,
            termId: installmentTermId || null,
            ...gradeWhere,
          },
          orderBy: { updatedAt: 'desc' },
        });

        if (!existingInstallment) {
          const createdInstallment = await tx.feeStructure.create({
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
          expectedInstallmentIds.push(createdInstallment.id);
          created++;
        } else {
          const updatedInstallment = await tx.feeStructure.update({
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
          expectedInstallmentIds.push(updatedInstallment.id);
        }
      }

      await tx.feeStructure.updateMany({
        where: {
          schoolId: dto.schoolId,
          academicYearId: dto.academicYearId,
          feeType: { startsWith: installmentFeePrefix },
          ...gradeWhere,
          id: { notIn: expectedInstallmentIds },
        },
        data: { isActive: false },
      });
    });

    return {
      created,
      message:
        created > 0
          ? `Generated ${created} installment fee structures`
          : `Installment fee structures updated for ${config.billingMode}`,
      breakdown: amounts.map((amount, index) => ({
        installment: index + 1,
        amount,
      })),
    };
  }

  async getFeeCollectionMode(schoolId: string): Promise<string> {
    const config = await this.getBillingConfig(schoolId);
    return config.billingMode;
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



  // ========================================================
  // CURRICULUM INFO
  // ========================================================

  async getCurriculumInfo(schoolId: string, academicYearId: string) {
    await this.assertAcademicYearInSchool(schoolId, academicYearId);
    const config = await this.getBillingConfig(schoolId, academicYearId);
    const terms = config.periods || [];
    return {
      curriculumType: config.curriculumType,
      billingMode: config.billingMode,
      calendarType: config.calendarType,
      dueDay: config.dueDay,
      billingPeriodsPerYear: config.billingPeriodsPerYear,
      terms,
      termCount: terms.length,
    };
  }

}
