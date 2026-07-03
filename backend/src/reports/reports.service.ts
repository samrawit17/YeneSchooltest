import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import { ReportQueryDto } from './reports.dto';
import {
  CalendarType,
  ETHIOPIAN_MONTH_NAMES,
  toEthiopianDate,
  toGregorianDate,
} from '../common/date.util';
import { EventBusService } from '../core/events/event-bus.service';

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
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

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

  private async getBillingConfig(
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
    const curriculumPeriodCount =
      this.getCurriculumPeriodCount(curriculumType);
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
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return [];

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

  private getFeeStructureInstallmentIndex(feeType?: string | null) {
    const match = String(feeType || '').match(/_INSTALLMENT_(\d+)$/i);
    return match ? Number(match[1]) : null;
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

  private formatBirr(amount: number) {
    return `ETB ${amount.toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })}`;
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

    const rawStudentIds = [
      ...new Set(payments.map((p) => p.studentId).filter(Boolean)),
    ];

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
          [student.id, student.userId].filter((value): value is string =>
            Boolean(value),
          ),
        ),
      ),
    ];
    const academicYearNames = [
      ...new Set(academicYears.map((year) => year.name)),
    ];

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
      const classInfo =
        student && academicYearName
          ? classByProfileAndYear.get(
              `${student.profileId}:${academicYearName}`,
            ) ||
            (student.userId
              ? classByProfileAndYear.get(
                  `${student.userId}:${academicYearName}`,
                )
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
          payment.term?.name || payment.studentFee?.term?.name || null,
        feeType: payment.studentFee?.feeStructure?.feeType || null,
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

    let start = from ? new Date(from) : undefined;
    let end = to ? new Date(to) : undefined;
    if (!start || !end) {
      const now = new Date();
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
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
    const config = await this.getBillingConfig(schoolId, academicYearId);
    const terms = config.periods || [];
    const where: any = {
      schoolId,
      academicYearId,
      feeStructure: { isActive: true },
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
            term: {
              select: {
                name: true,
                order: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        term: {
          select: { name: true, order: true, startDate: true, endDate: true },
        },
        discountPolicy: {
          select: { name: true, discountType: true, discountValue: true },
        },
      },
    });

    const academicYearName = academicYear?.name;

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
      selectedTerm &&
      config.billingPeriodsPerYear !== config.curriculumPeriodCount
        ? this.getInstallmentRangeForSelectedTerm({
            config,
            selectedTerm: selectedTermWithDates,
            terms,
          })
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
        sf.termId !== selectedTerm?.id &&
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
          ? this.getBillingMonthLabelForPeriod(
              sf.term || sf.feeStructure.term,
              this.getBillingIndexWithinPeriod(
                config,
                installmentIndex - 1,
                terms,
              ),
              config,
              resolvedCalendarType,
            )
          : sf.term?.name ||
            sf.feeStructure.term?.name ||
            'Whole Academic Year';

      if (isPeriodView && isYearWide && selectedTerm) {
        const perPeriodAmount =
          Math.round(
            (sf.finalAmount / Math.max(config.billingPeriodsPerYear, 1)) *
              100,
          ) / 100;
        const periodsAlreadyPaid = Math.max(
          0,
          Number(selectedTerm.order || 1) - 1,
        );
        const alreadyAllocatedToEarlierPeriods =
          periodsAlreadyPaid * perPeriodAmount;
        const paidTowardCurrent = Math.max(
          0,
          Math.min(perPeriodAmount, paid - alreadyAllocatedToEarlierPeriods),
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

      const discountPercent =
        sf.discountPolicy?.discountType === 'PERCENTAGE'
          ? sf.discountPolicy.discountValue
          : sf.totalAmount > 0 && sf.discount > 0
            ? Math.round((sf.discount / sf.totalAmount) * 10000) / 100
            : 0;
      const discountLabel = sf.discountPolicy?.name || null;
      const studentClass = classMap.get(sf.studentId);
      return [
        {
          studentId: sf.studentId,
          studentName: sf.student?.name,
          grade: studentClass?.grade || null,
          section: studentClass?.section || null,
          feeType: this.formatFeeTypeLabel(sf.feeStructure.feeType),
          scopeLabel,
          installmentIndex,
          isYearWide,
          total: displayTotal,
          discount: sf.discount,
          discountPercent,
          discountLabel,
          originalTotal: sf.totalAmount,
          paid: displayPaid,
          remaining: displayRemaining,
          status: displayStatus,
        },
      ];
    });
    const totalOutstanding = rows.reduce((s, r) => s + r.remaining, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.paid, 0);
    const totalDiscounts = rows.reduce((s, r) => s + (r.discount || 0), 0);
    return { totalOutstanding, totalRevenue, totalDiscounts, rows };
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

        void this.eventBus.emit('fee.overdue', {
          schoolId: fee.schoolId,
          studentId: fee.studentId,
          amount: fee.totalAmount,
          dueDate: fee.dueDate?.toISOString(),
        });
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

    const candidateStudentIds = [
      studentProfile.id,
      studentProfile.userId,
    ].filter((value): value is string => Boolean(value));

    const payments = await this.prisma.payment.findMany({
      where: { schoolId, studentId: { in: candidateStudentIds } },
      orderBy: { paymentDate: 'desc' },
      include: { studentFee: { include: { feeStructure: true } } },
    });
    const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
    return { totalPaid, count: payments.length, payments };
  }
}
