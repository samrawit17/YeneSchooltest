const CHUNK_SIZE = 50;

import { HttpStatus,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Prisma } from '@prisma/client';
import { Role } from '../auth/types/role.enum';
import {
  GenerateStudentFeesDto,
  StudentFeesQueryDto,
} from './student-fee.dto';
import {
  CalendarType,
  ETHIOPIAN_MONTH_NAMES,
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
export class StudentFeeService {
  private readonly logger = new Logger(StudentFeeService.name);
  private readonly FAMILY_DISCOUNT_POLICY_NAME = 'Automatic Family Discount';

  constructor(private readonly prisma: PrismaService) {}

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

  private async getSchoolCalendarType(schoolId: string): Promise<CalendarType> {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'calendar_type' } },
      select: { value: true },
    });
    return setting?.value === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN';
  }

  async assertStudentFeeSummaryAccess(
    user: { id?: string; role?: string; schoolId?: string } | undefined,
    schoolId: string,
    studentId: string,
  ) {
    if (!user?.id) throw new LocalizedException('student_fee.authentication_required_442ef31b', undefined, HttpStatus.FORBIDDEN, 'Authentication required');

    const normalizedUserRole = String(user.role || '')
      .trim()
      .toUpperCase();
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

      throw new ForbiddenException('You can only view your own fee summary');
    }

    if (normalizedUserRole === Role.PARENT) {
      const parentProfile = await this.prisma.parentProfile.findFirst({
        where: {
          schoolId,
          OR: [{ id: user.id }, { userId: user.id }],
        },
        select: { id: true, userId: true },
      });
      if (!parentProfile) throw new LocalizedException('student_fee.parent_profile_not_found_ad089d27', undefined, HttpStatus.FORBIDDEN, 'Parent profile not found');

      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: { schoolId, OR: [{ id: studentId }, { userId: studentId }] },
        select: { id: true, userId: true },
      });
      if (!studentProfile) throw new LocalizedException('student_fee.student_not_found_2525e0b2', undefined, HttpStatus.FORBIDDEN, 'Student not found');

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

    throw new ForbiddenException(
      'You are not allowed to view this fee summary',
    );
  }

  async generateStudentFees(dto: GenerateStudentFeesDto) {
    await this.assertAcademicYearInSchool(dto.schoolId, dto.academicYearId);
    const config = await this.getBillingConfig(
      dto.schoolId,
      dto.academicYearId,
    );
    const periods = config.periods || [];
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId: dto.schoolId },
      select: { name: true, startDate: true },
    });
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
      generatedFeeStructures.length > 0
        ? generatedFeeStructures
        : foundFeeStructures;
    if (feeStructures.length === 0) return { created: 0 };

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

    const termById = new Map(periods.map((period) => [period.id, period]));

    const annualDiscountCache = new Map<string, number>();
    const studentAnnualTotalCache = new Map<string, number>();

    const data = feeStructures.flatMap((fs) => {
      const installmentIndex = this.getFeeStructureInstallmentIndex(fs.feeType);
      const zeroBasedIndex = installmentIndex ? installmentIndex - 1 : 0;
      const period =
        (fs.termId ? termById.get(fs.termId) || null : null) ||
        (installmentIndex
          ? this.getCurriculumPeriodForInstallment(
              config,
              zeroBasedIndex,
              periods,
            )
          : null);
      const dueDate = this.getInstallmentDueDate({
        zeroBasedIndex,
        config,
        period,
        periods,
        academicYearStartDate: academicYear?.startDate || null,
        dueDay: config.dueDay,
        calendarType: config.calendarType,
      });
      const targetStudentIds =
        fs.grade == null
          ? studentIds
          : studentIds.filter(
              (studentId) =>
                studentGradeById.get(studentId) === Number(fs.grade),
            );

      return targetStudentIds.map((studentId) => {
        const normType = this.normalizeFeeType(fs.feeType);
        const annualKey = `${studentId}:${normType}`;

        if (!annualDiscountCache.has(annualKey)) {
          const sameTypeStructures = feeStructures.filter((f) => {
            if (this.normalizeFeeType(f.feeType) !== normType) return false;
            if (f.grade == null) return true;
            return studentGradeById.get(studentId) === Number(f.grade);
          });
          const annualTotal = sameTypeStructures.reduce(
            (sum, f) => sum + Number(f.amount),
            0,
          );
          studentAnnualTotalCache.set(annualKey, annualTotal);
          const annualDiscount = this.calculateFamilyDiscountAmount(
            normType,
            annualTotal,
            studentId,
            familyDiscount,
          );
          annualDiscountCache.set(annualKey, annualDiscount);
        }

        const annualDiscount = annualDiscountCache.get(annualKey) || 0;
        const annualTotal = studentAnnualTotalCache.get(annualKey) || fs.amount;
        const discount =
          annualTotal > 0
            ? Math.round(
                ((annualDiscount * Number(fs.amount)) / annualTotal) * 100,
              ) / 100
            : 0;

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

    const existingFees = data.length
      ? await this.prisma.studentFee.findMany({
          where: {
            schoolId: dto.schoolId,
            academicYearId: dto.academicYearId,
            feeStructureId: {
              in: Array.from(new Set(data.map((row) => row.feeStructureId))),
            },
            studentId: {
              in: Array.from(new Set(data.map((row) => row.studentId))),
            },
          },
          select: {
            id: true,
            feeStructureId: true,
            studentId: true,
            termId: true,
            dueDate: true,
          },
        })
      : [];
    const existingSet = new Set(
      existingFees.map((fee) => `${fee.feeStructureId}:${fee.studentId}`),
    );
    const existingByKey = new Map(
      existingFees.map((fee) => [
        `${fee.feeStructureId}:${fee.studentId}`,
        fee,
      ]),
    );
    const dataToCreate = data.filter(
      (row) => !existingSet.has(`${row.feeStructureId}:${row.studentId}`),
    );

    const result = dataToCreate.length
      ? await this.prisma.studentFee.createMany({
          data: dataToCreate,
          skipDuplicates: true,
        })
      : { count: 0 };

    const reconcileUpdates = data
      .map((row) => {
        const existing = existingByKey.get(
          `${row.feeStructureId}:${row.studentId}`,
        );
        if (!existing) return null;

        const nextTermId = row.termId ?? null;
        const nextDueDate = row.dueDate ?? null;
        const existingDueTime = existing.dueDate
          ? new Date(existing.dueDate).getTime()
          : null;
        const nextDueTime = nextDueDate
          ? new Date(nextDueDate).getTime()
          : null;
        const dataToUpdate: { termId?: string | null; dueDate?: Date | null } =
          {};

        if ((existing.termId ?? null) !== nextTermId) {
          dataToUpdate.termId = nextTermId;
        }
        if (existingDueTime !== nextDueTime) {
          dataToUpdate.dueDate = nextDueDate;
        }
        if (Object.keys(dataToUpdate).length === 0) return null;

        return this.prisma.studentFee.update({
          where: { id: existing.id },
          data: dataToUpdate,
        });
      })
      .filter(Boolean);

    if (reconcileUpdates.length > 0) {
      for (let i = 0; i < reconcileUpdates.length; i += CHUNK_SIZE) {
        const chunk = reconcileUpdates.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk);
      }
    }

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
    const settingMap = new Map(
      settings.map((setting) => [setting.key, setting.value]),
    );
    const enabled = this.parseBooleanSetting(
      settingMap.get('family_discount_enabled'),
      false,
    );
    const minStudents = Math.max(
      2,
      Math.min(
        20,
        Number(settingMap.get('family_discount_min_students') || 3) || 3,
      ),
    );
    const configuredPercent = settingMap.has('family_discount_percent')
      ? settingMap.get('family_discount_percent')
      : '20';
    const percent = Math.max(0, Math.min(100, Number(configuredPercent) || 0));
    const feeTypes = String(
      settingMap.get('family_discount_fee_types') || 'TUITION',
    )
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

    const studentByProfileId = new Map(
      students.map((student) => [student.id, student]),
    );
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
        .filter(
          (
            student,
          ): student is { id: string; userId: string; createdAt: Date } =>
            Boolean(student),
        )
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
    context: Awaited<ReturnType<StudentFeeService['getFamilyDiscountContext']>>,
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
    familyDiscount: Awaited<
      ReturnType<StudentFeeService['getFamilyDiscountContext']>
    >;
  }) {
    if (params.studentIds.length === 0 || params.feeStructures.length === 0) {
      return 0;
    }

    const feeStructureById = new Map(
      params.feeStructures.map((feeStructure) => [
        feeStructure.id,
        feeStructure,
      ]),
    );

    const rows = await this.prisma.studentFee.findMany({
      where: {
        schoolId: params.schoolId,
        academicYearId: params.academicYearId,
        studentId: { in: params.studentIds },
        feeStructureId: {
          in: params.feeStructures.map((feeStructure) => feeStructure.id),
        },
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

    const annualDiscountCache = new Map<string, number>();
    const studentAnnualTotalCache = new Map<string, number>();
    const studentFeeGroupKey = (studentId: string, normType: string) =>
      `${studentId}::${normType}`;

    for (const row of rows) {
      const feeStructure = feeStructureById.get(row.feeStructureId);
      if (!feeStructure) continue;
      const normType = this.normalizeFeeType(feeStructure.feeType);
      const key = studentFeeGroupKey(row.studentId, normType);
      if (annualDiscountCache.has(key)) continue;

      const sameStudentRows = rows.filter(
        (r) =>
          r.studentId === row.studentId &&
          this.normalizeFeeType(
            feeStructureById.get(r.feeStructureId)?.feeType || '',
          ) === normType,
      );
      const annualTotal = sameStudentRows.reduce(
        (sum, r) => sum + Number(r.totalAmount),
        0,
      );
      studentAnnualTotalCache.set(key, annualTotal);
      const annualDiscount = this.calculateFamilyDiscountAmount(
        normType,
        annualTotal,
        row.studentId,
        params.familyDiscount,
      );
      annualDiscountCache.set(key, annualDiscount);
    }

    let updated = 0;
    for (const row of rows) {
      const feeStructure = feeStructureById.get(row.feeStructureId);
      if (!feeStructure) continue;
      const normType = this.normalizeFeeType(feeStructure.feeType);
      const key = studentFeeGroupKey(row.studentId, normType);
      const annualDiscount = annualDiscountCache.get(key) || 0;
      const annualTotal = studentAnnualTotalCache.get(key) || row.totalAmount;
      const discount =
        annualTotal > 0
          ? Math.round(
              ((annualDiscount * Number(row.totalAmount)) / annualTotal) * 100,
            ) / 100
          : 0;
      const finalAmount = Math.max(0, row.totalAmount - discount);
      const discountPolicyId =
        discount > 0 ? params.familyDiscount.policyId : null;
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
    const whereBase: any = { schoolId, feeStructure: { isActive: true } };
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
    const [resolvedCalendarType, config] = await Promise.all([
      this.getSchoolCalendarType(schoolId),
      this.getBillingConfig(schoolId, academicYearId),
    ]);
    const terms = config.periods || [];
    if (termId) {
      const selectedTerm = await this.assertTermInSchool(schoolId, termId);
      if (
        selectedTerm &&
        config.billingPeriodsPerYear !== config.curriculumPeriodCount &&
        academicYearWithDates?.startDate
      ) {
        const selectedTermWithDates =
          terms.find((term) => term.id === selectedTerm.id) || selectedTerm;
        const installmentRange = this.getInstallmentRangeForSelectedTerm({
          config,
          selectedTerm: selectedTermWithDates,
          terms,
        });

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
        const ids = Array.from(new Set(studentClasses.map((x) => x.studentId)));
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
            include: {
              term: {
                select: {
                  id: true,
                  name: true,
                  order: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          },
          discountPolicy: {
            select: { name: true, discountType: true, discountValue: true },
          },
          term: {
            select: {
              id: true,
              name: true,
              order: true,
              startDate: true,
              endDate: true,
            },
          },
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
            select: {
              id: true,
              name: true,
              order: true,
              academicYearId: true,
              startDate: true,
              endDate: true,
            },
          })
        : null;
    if (termId && termId !== 'all' && !selectedTerm) {
      throw new Error('Term not found');
    }
    const [config, resolvedCalendarType] = await Promise.all([
      this.getBillingConfig(schoolId, academicYearId),
      this.getSchoolCalendarType(schoolId),
    ]);
    const terms = config.periods || [];
    const selectedTermInstallmentRange =
      selectedTerm &&
      config.billingPeriodsPerYear !== config.curriculumPeriodCount
        ? this.getInstallmentRangeForSelectedTerm({
            config,
            selectedTerm:
              terms.find((term) => term.id === selectedTerm.id) || null,
            terms,
          })
        : null;

    const studentFeesWhere: any = {
      studentId: { in: candidateStudentIds },
      academicYearId,
      schoolId,
      feeStructure: { isActive: true },
    };
    if (termId && termId !== 'all') {
      studentFeesWhere.OR = [{ termId }, { termId: null }];
    }

    const studentFees = await this.prisma.studentFee.findMany({
      where: studentFeesWhere,
      include: {
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
        discountPolicy: {
          select: { name: true, discountType: true, discountValue: true },
        },
        term: {
          select: { name: true, order: true, startDate: true, endDate: true },
        },
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
        sf.termId !== selectedTerm?.id &&
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
          : sf.term?.name || sf.feeStructure.term?.name || null;

      if (isPeriodView && isYearWide && selectedTerm) {
        const perPeriodAmount =
          Math.round(
            (sf.finalAmount / Math.max(config.billingPeriodsPerYear, 1)) * 100,
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

      return [
        {
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
        },
      ];
    });

    const payments = studentFees.flatMap((sf) => {
      const installmentIndex = this.getFeeStructureInstallmentIndex(
        sf.feeStructure.feeType,
      );
      if (
        selectedTermInstallmentRange &&
        installmentIndex !== null &&
        sf.termId !== selectedTerm?.id &&
        (installmentIndex < selectedTermInstallmentRange.start ||
          installmentIndex > selectedTermInstallmentRange.end)
      ) {
        return [];
      }
      const termName =
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
      curriculumType: config.curriculumType,
      billingMode: config.billingMode,
      billingPeriodsPerYear: config.billingPeriodsPerYear,
      terms,
      summary: { totalFees, totalPaid, totalBalance, nextDueDate: null },
    };
  }
}
