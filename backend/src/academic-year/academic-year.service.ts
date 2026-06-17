import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
import { toEthiopian } from 'ethiopian-calendar-new';

// Curriculum type enum - matches schema.prisma
type CurriculumType = 'SEMESTER' | 'QUARTER' | 'TERM' | 'CUSTOM';
type CalendarType = 'GREGORIAN' | 'ETHIOPIAN';

/**
 * Utility to get Ethiopian year from Gregorian date
 */
const getEthiopianYear = (date: Date): number => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  // Ethiopian New Year is Sep 11 or 12
  if (month < 9 || (month === 9 && day < 11)) {
    return year - 8;
  }
  return year - 7;
};

export interface CreateAcademicYearDto {
  name: string; // "2025–2026"
  startDate: Date;
  endDate: Date;
  schoolId: string;
  curriculumType?: CurriculumType; // SEMESTER, QUARTER, TERM, CUSTOM
  calendarType?: CalendarType; // GREGORIAN, ETHIOPIAN
}

export interface UpdateAcademicYearDto {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  curriculumType?: CurriculumType;
  calendarType?: CalendarType;
}

export interface UpdateCurriculumTypeDto {
  curriculumType: CurriculumType;
}

export interface CreateTermDto {
  name: string;
  order: number;
  percentageWeight: number;
  startDate: Date;
  endDate: Date;
}

export interface UpdateTermDto {
  name?: string;
  order?: number;
  percentageWeight?: number;
  startDate?: Date;
  endDate?: Date;
}

// Default period configurations based on curriculum type
const DEFAULT_PERIOD_CONFIGS = {
  SEMESTER: [
    { name: 'Semester 1', order: 1, percentageWeight: 50 },
    { name: 'Semester 2', order: 2, percentageWeight: 50 },
  ],
  QUARTER: [
    { name: 'Quarter 1', order: 1, percentageWeight: 25 },
    { name: 'Quarter 2', order: 2, percentageWeight: 25 },
    { name: 'Quarter 3', order: 3, percentageWeight: 25 },
    { name: 'Quarter 4', order: 4, percentageWeight: 25 },
  ],
  TERM: [
    { name: 'Term 1', order: 1, percentageWeight: 33.33 },
    { name: 'Term 2', order: 2, percentageWeight: 33.33 },
    { name: 'Term 3', order: 3, percentageWeight: 33.34 },
  ],
};

const CURRICULUM_TYPES = ['SEMESTER', 'QUARTER', 'TERM', 'CUSTOM'] as const;
const CALENDAR_TYPES = ['GREGORIAN', 'ETHIOPIAN'] as const;

const isCurriculumType = (value: unknown): value is CurriculumType =>
  typeof value === 'string' &&
  CURRICULUM_TYPES.includes(value as CurriculumType);

const isCalendarType = (value: unknown): value is CalendarType =>
  typeof value === 'string' && CALENDAR_TYPES.includes(value as CalendarType);

const parseValidDate = (value: Date | string | undefined, label: string) => {
  if (!value) {
    throw new BadRequestException(`${label} is required`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label} must be a valid date`);
  }
  return date;
};

const assertDateRange = (startDate: Date, endDate: Date) => {
  if (startDate >= endDate) {
    throw new BadRequestException('Start date must be before end date');
  }
};

const STANDARD_PERIOD_DURATIONS: Partial<
  Record<CurriculumType, Array<{ months: number; days?: number }>>
> = {
  SEMESTER: [{ months: 5 }, { months: 5 }],
  QUARTER: [
    { months: 2, days: 15 },
    { months: 2, days: 15 },
    { months: 2, days: 15 },
    { months: 2, days: 15 },
  ],
  TERM: [
    { months: 3, days: 10 },
    { months: 3, days: 10 },
    { months: 3, days: 10 },
  ],
};

const addMonthsAndDays = (date: Date, months = 0, days = 0) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  result.setDate(result.getDate() + days);
  return result;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const buildPeriodDateRanges = (
  curriculumType: CurriculumType,
  startDate: Date,
  endDate: Date,
  periodConfig: Array<{
    name: string;
    order: number;
    percentageWeight: number;
  }>,
) => {
  const standardDurations = STANDARD_PERIOD_DURATIONS[curriculumType];
  const academicYearStart = new Date(startDate);
  const academicYearEnd = new Date(endDate);

  const result: Array<{
    name: string;
    order: number;
    percentageWeight: number;
    startDate: Date;
    endDate: Date;
  }> = [];

  for (let index = 0; index < periodConfig.length; index++) {
    const config = periodConfig[index];
    const isLastPeriod = index === periodConfig.length - 1;

    let periodStart: Date;
    if (index === 0) {
      periodStart = new Date(academicYearStart);
    } else {
      periodStart = addDays(result[index - 1].endDate, 1);
    }

    let periodEnd: Date;
    if (isLastPeriod) {
      periodEnd = new Date(academicYearEnd);
    } else if (standardDurations?.[index]) {
      const duration = standardDurations[index];
      periodEnd = addDays(
        addMonthsAndDays(periodStart, duration.months, duration.days ?? 0),
        -1,
      );
    } else {
      const remainingPeriods = periodConfig.length - index;
      const remainingDurationMs =
        academicYearEnd.getTime() - periodStart.getTime();
      periodEnd = addDays(
        new Date(
          periodStart.getTime() +
            Math.floor(remainingDurationMs / remainingPeriods),
        ),
        -1,
      );
    }

    if (periodEnd > academicYearEnd) {
      periodEnd = new Date(academicYearEnd);
    }

    result.push({
      name: config.name,
      order: config.order,
      percentageWeight: config.percentageWeight,
      startDate: periodStart,
      endDate: periodEnd,
    });
  }

  return result;
};

@Injectable()
export class AcademicYearService {
  constructor(
    private prismaService: PrismaService,
    private schoolSettingsService: SchoolSettingsService,
  ) {}

  private requireSchoolId(schoolId?: string | null) {
    if (!schoolId) {
      throw new BadRequestException('schoolId is required');
    }
    return schoolId;
  }

  private assertSchoolAccess(
    recordSchoolId: string,
    expectedSchoolId?: string,
  ) {
    if (expectedSchoolId && recordSchoolId !== expectedSchoolId) {
      throw new NotFoundException('Academic year not found');
    }
  }

  private async assertTermSchoolAccess(
    termId: string,
    expectedSchoolId?: string,
  ) {
    const term = await this.prismaService.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    this.assertSchoolAccess(term.academicYear.schoolId, expectedSchoolId);
    return term;
  }

  private async assertTermDatesDoNotOverlap(
    academicYearId: string,
    startDate: Date,
    endDate: Date,
    excludeTermId?: string,
  ) {
    const overlappingTerm = await this.prismaService.term.findFirst({
      where: {
        academicYearId,
        ...(excludeTermId ? { id: { not: excludeTermId } } : {}),
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { name: true },
    });

    if (overlappingTerm) {
      throw new BadRequestException(
        `Period dates overlap with ${overlappingTerm.name}`,
      );
    }
  }

  private assertPeriodWeight(percentageWeight: number | undefined) {
    if (percentageWeight === undefined) return;
    if (
      typeof percentageWeight !== 'number' ||
      Number.isNaN(percentageWeight) ||
      percentageWeight < 0 ||
      percentageWeight > 100
    ) {
      throw new BadRequestException('Period weight must be between 0 and 100');
    }
  }

  private async assertTotalWeightDoesNotExceed100(
    academicYearId: string,
    nextWeight: number,
    excludeTermId?: string,
  ) {
    const terms = await this.prismaService.term.findMany({
      where: {
        academicYearId,
        ...(excludeTermId ? { id: { not: excludeTermId } } : {}),
      },
      select: { percentageWeight: true },
    });
    const total =
      terms.reduce((sum, term) => sum + term.percentageWeight, 0) + nextWeight;

    if (total > 100.01) {
      throw new BadRequestException('Total period weight cannot exceed 100%');
    }
  }

  async createAcademicYear(createDto: CreateAcademicYearDto) {
    const {
      name,
      startDate,
      endDate,
      schoolId,
      curriculumType,
      calendarType = 'ETHIOPIAN',
    } = createDto;
    const finalSchoolId = this.requireSchoolId(schoolId);
    const trimmedName = name?.trim();

    if (!trimmedName) {
      throw new BadRequestException('Academic year name is required');
    }
    if (curriculumType && !isCurriculumType(curriculumType)) {
      throw new BadRequestException('Invalid curriculum type');
    }
    if (calendarType && !isCalendarType(calendarType)) {
      throw new BadRequestException('Invalid calendar type');
    }

    const parsedStartDate = parseValidDate(startDate, 'Start date');
    const parsedEndDate = parseValidDate(endDate, 'End date');
    assertDateRange(parsedStartDate, parsedEndDate);

    // Check if academic year with same name exists for this school
    const existing = await this.prismaService.academicYear.findUnique({
      where: {
        schoolId_name: {
          schoolId: finalSchoolId,
          name: trimmedName,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Academic year with this name already exists for this school',
      );
    }

    // Get curriculum type from school settings if not provided
    let finalCurriculumType = curriculumType || 'SEMESTER';
    if (!curriculumType) {
      const schoolSetting = await this.schoolSettingsService.getSetting(
        finalSchoolId,
        'curriculum_type',
      );
      if (isCurriculumType(schoolSetting)) {
        finalCurriculumType = schoolSetting;
      }
    }

    // Create academic year with curriculum type and ethiopian year
    const academicYear = await this.prismaService.academicYear.create({
      data: {
        name: trimmedName,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        schoolId: finalSchoolId,
        curriculumType: finalCurriculumType as any,
        calendarType: calendarType as any,
        ethiopianYear: getEthiopianYear(parsedStartDate),
      } as any,
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
        school: true,
      },
    });

    // Auto-create default terms based on curriculum type
    if (finalCurriculumType !== 'CUSTOM') {
      const periodConfig = DEFAULT_PERIOD_CONFIGS[finalCurriculumType];
      if (periodConfig) {
        const termsData = buildPeriodDateRanges(
          finalCurriculumType,
          parsedStartDate,
          parsedEndDate,
          periodConfig,
        ).map((config) => ({
          academicYearId: academicYear.id,
          name: config.name,
          order: config.order,
          percentageWeight: config.percentageWeight,
          startDate: config.startDate,
          endDate: config.endDate,
          isLocked: false,
        }));

        await this.prismaService.term.createMany({
          data: termsData,
        });
      }
    }

    await this.schoolSettingsService.ensureDefaultClassesForAcademicYear(
      finalSchoolId,
      academicYear.id,
    );

    // Return with terms
    return this.prismaService.academicYear.findUnique({
      where: { id: academicYear.id },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
        school: true,
      },
    });
  }

  async getAcademicYears(schoolId: string) {
    const finalSchoolId = this.requireSchoolId(schoolId);
    return this.prismaService.academicYear.findMany({
      where: { schoolId: finalSchoolId },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAcademicYearById(id: string, schoolId?: string) {
    const academicYear = await this.prismaService.academicYear.findUnique({
      where: { id },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
        school: true,
      },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    this.assertSchoolAccess(academicYear.schoolId, schoolId);

    return academicYear;
  }

  async getActiveAcademicYear(schoolId: string) {
    const finalSchoolId = this.requireSchoolId(schoolId);
    // Attempt to get default from school settings
    const settings = await this.prismaService.schoolSettings.findUnique({
      where: { schoolId: finalSchoolId },
    });

    if (settings && settings.defaultAcademicYearId) {
      const defaultYear = await this.prismaService.academicYear.findUnique({
        where: { id: settings.defaultAcademicYearId },
        include: {
          terms: { orderBy: { order: 'asc' } },
        },
      });
      if (defaultYear) {
        return defaultYear;
      }
    }

    const activeYear = await this.prismaService.academicYear.findFirst({
      where: {
        schoolId: finalSchoolId,
        isActive: true,
      },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    if (activeYear) {
      return activeYear;
    }

    return this.prismaService.academicYear.findFirst({
      where: { schoolId: finalSchoolId },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async resolveAcademicYearId(
    schoolId: string,
    providedAcademicYearId?: string | null,
  ): Promise<string> {
    const finalSchoolId = this.requireSchoolId(schoolId);
    if (providedAcademicYearId) {
      await this.getAcademicYearById(providedAcademicYearId, finalSchoolId);
      return providedAcademicYearId;
    }

    // Attempt to get default from school settings
    const settings = await this.prismaService.schoolSettings.findUnique({
      where: { schoolId: finalSchoolId },
    });

    if (settings && settings.defaultAcademicYearId) {
      return settings.defaultAcademicYearId;
    }

    // Fallback to active academic year
    const activeInfo = await this.getActiveAcademicYear(finalSchoolId);
    if (!activeInfo) {
      throw new BadRequestException(
        'No academic year provided and no default/active academic year found for the school',
      );
    }

    return activeInfo.id;
  }

  async updateAcademicYear(
    id: string,
    updateDto: UpdateAcademicYearDto,
    schoolId?: string,
  ) {
    const academicYear = await this.getAcademicYearById(id, schoolId);
    const nextStartDate = updateDto.startDate
      ? parseValidDate(updateDto.startDate, 'Start date')
      : academicYear.startDate;
    const nextEndDate = updateDto.endDate
      ? parseValidDate(updateDto.endDate, 'End date')
      : academicYear.endDate;
    assertDateRange(nextStartDate, nextEndDate);

    if (
      updateDto.curriculumType &&
      !isCurriculumType(updateDto.curriculumType)
    ) {
      throw new BadRequestException('Invalid curriculum type');
    }
    if (updateDto.calendarType && !isCalendarType(updateDto.calendarType)) {
      throw new BadRequestException('Invalid calendar type');
    }

    // If updating name, check for duplicates
    const trimmedName = updateDto.name?.trim();
    if (updateDto.name !== undefined && !trimmedName) {
      throw new BadRequestException('Academic year name is required');
    }
    if (trimmedName && trimmedName !== academicYear.name) {
      const existing = await this.prismaService.academicYear.findUnique({
        where: {
          schoolId_name: {
            schoolId: academicYear.schoolId,
            name: trimmedName,
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          'Academic year with this name already exists for this school',
        );
      }
    }

    // If curriculumType is being updated, use the specialized method for validation and term regeneration
    if (
      updateDto.curriculumType &&
      updateDto.curriculumType !== academicYear.curriculumType
    ) {
      await this.updateCurriculumType(
        id,
        {
          curriculumType: updateDto.curriculumType,
        },
        schoolId,
      );
    }

    return this.prismaService.academicYear.update({
      where: { id },
      data: {
        ...(trimmedName && { name: trimmedName }),
        ...(updateDto.startDate && {
          startDate: nextStartDate,
          ethiopianYear: getEthiopianYear(nextStartDate),
        }),
        ...(updateDto.endDate && { endDate: nextEndDate }),
        ...(updateDto.calendarType && {
          calendarType: updateDto.calendarType as any,
        }),
      },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateCurriculumType(
    id: string,
    dto: UpdateCurriculumTypeDto,
    schoolId?: string,
  ) {
    if (!isCurriculumType(dto.curriculumType)) {
      throw new BadRequestException('Invalid curriculum type');
    }

    const academicYear = await this.getAcademicYearById(id, schoolId);

    // Check if grading has already started for this academic year
    const existingGrades = await this.prismaService.subjectGrade.findFirst({
      where: {
        academicYear: academicYear.name,
        schoolId: academicYear.schoolId,
      },
    });

    if (existingGrades) {
      throw new ForbiddenException(
        'Cannot change curriculum type after grading has begun. Please contact system administrator.',
      );
    }

    // Check if terms have grades
    const termsWithGrades = await this.prismaService.term.findFirst({
      where: {
        academicYearId: id,
        subjectGrades: {
          some: {},
        },
      },
      include: {
        subjectGrades: true,
      },
    });

    if (termsWithGrades && termsWithGrades.subjectGrades.length > 0) {
      throw new ForbiddenException(
        'Cannot change curriculum type after terms have grades. Please contact system administrator.',
      );
    }

    return this.prismaService.$transaction(async (tx) => {
      await tx.term.deleteMany({
        where: { academicYearId: id },
      });

      if (dto.curriculumType !== 'CUSTOM') {
        const periodConfig = DEFAULT_PERIOD_CONFIGS[dto.curriculumType];
        if (periodConfig) {
          await tx.term.createMany({
            data: buildPeriodDateRanges(
              dto.curriculumType,
              academicYear.startDate,
              academicYear.endDate,
              periodConfig,
            ).map((config) => ({
              academicYearId: id,
              name: config.name,
              order: config.order,
              percentageWeight: config.percentageWeight,
              startDate: config.startDate,
              endDate: config.endDate,
              isLocked: false,
            })),
          });
        }
      }

      return tx.academicYear.update({
        where: { id },
        data: { curriculumType: dto.curriculumType as any },
        include: {
          terms: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });
  }

  async activateAcademicYear(id: string, schoolId?: string) {
    const academicYear = await this.getAcademicYearById(id, schoolId);
    const weightsValid = await this.validatePeriodWeights(id, schoolId);
    if (!weightsValid) {
      throw new BadRequestException(
        'Period weights must total 100% before activating an academic year',
      );
    }

    const activated = await this.prismaService.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: {
          schoolId: academicYear.schoolId,
          id: { not: id },
        },
        data: { isActive: false },
      });

      const updated = await tx.academicYear.update({
        where: { id },
        data: { isActive: true },
        include: {
          terms: {
            orderBy: { order: 'asc' },
          },
        },
      });

      await tx.schoolSettings.update({
        where: { schoolId: academicYear.schoolId },
        data: { defaultAcademicYearId: id },
      });

      return updated;
    });

    await this.schoolSettingsService.ensureDefaultClassesForAcademicYear(
      academicYear.schoolId,
      activated.id,
    );

    return activated;
  }

  async deleteAcademicYear(id: string, schoolId?: string) {
    const academicYear = await this.getAcademicYearById(id, schoolId);

    if (academicYear.endDate < new Date()) {
      throw new ForbiddenException(
        'Cannot delete a past academic year. Past academic years are locked to preserve historical records.',
      );
    }

    return this.prismaService.$transaction(async (tx) => {
      // Nullify timetable slots before deleting (optional relation, no cascade)
      await tx.timetableSlot.updateMany({
        where: { academicYearId: id },
        data: { academicYearId: null },
      });

      // Delete enrollments linked by name (no FK constraint)
      await tx.enrollment.deleteMany({
        where: {
          academicYear: academicYear.name,
          schoolId: academicYear.schoolId,
        },
      });

      // Delete the academic year.
      // Prisma cascades: Term, Class, ClassSubject, Assessment,
      // FeeStructure, StudentFee, EnrollmentRequest, Content
      return tx.academicYear.delete({
        where: { id },
      });
    });
  }

  async getCurrentTerm(schoolId: string) {
    const finalSchoolId = this.requireSchoolId(schoolId);
    const now = new Date();

    const schoolSettings = await this.prismaService.schoolSettings.findUnique({
      where: { schoolId: finalSchoolId },
    });

    const activeYear = schoolSettings?.defaultAcademicYearId
      ? await this.prismaService.academicYear.findUnique({
          where: { id: schoolSettings.defaultAcademicYearId },
        })
      : await this.prismaService.academicYear.findFirst({
          where: {
            schoolId: finalSchoolId,
            isActive: true,
          },
          orderBy: { startDate: 'desc' },
        });

    const fallbackYear =
      activeYear ||
      (await this.prismaService.academicYear.findFirst({
        where: { schoolId: finalSchoolId },
        orderBy: { startDate: 'desc' },
      }));

    if (!fallbackYear) {
      return null;
    }

    const currentTerm = await this.prismaService.term.findFirst({
      where: {
        academicYearId: fallbackYear.id,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { order: 'asc' },
      include: {
        academicYear: true,
      },
    });

    if (currentTerm) {
      return currentTerm;
    }

    return this.prismaService.term.findFirst({
      where: {
        academicYearId: fallbackYear.id,
      },
      orderBy: { order: 'asc' },
      include: {
        academicYear: true,
      },
    });
  }

  /**
   * Get periods with their weights for an academic year
   * Used for grade calculations
   */
  async getPeriodWeights(id: string, schoolId?: string) {
    const academicYear = await this.getAcademicYearById(id, schoolId);

    return academicYear.terms.map((term) => ({
      id: term.id,
      name: term.name,
      order: term.order,
      percentageWeight: term.percentageWeight,
      isLocked: term.isLocked,
    }));
  }

  /**
   * Check if period weights total 100%
   */
  async validatePeriodWeights(id: string, schoolId?: string): Promise<boolean> {
    const academicYear = await this.getAcademicYearById(id, schoolId);
    const totalWeight = academicYear.terms.reduce(
      (sum, term) => sum + term.percentageWeight,
      0,
    );
    return Math.abs(totalWeight - 100) < 0.01; // Allow small floating point difference
  }

  /**
   * Create a custom term/period for an academic year
   * Used for CUSTOM curriculum type or adding extra periods
   */
  async createTerm(
    academicYearId: string,
    dto: CreateTermDto,
    schoolId?: string,
  ) {
    const academicYear = await this.getAcademicYearById(
      academicYearId,
      schoolId,
    );
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Period name is required');
    }
    if (!Number.isInteger(dto.order) || dto.order < 1) {
      throw new BadRequestException('Period order must be a positive integer');
    }
    this.assertPeriodWeight(dto.percentageWeight);
    const startDate = parseValidDate(dto.startDate, 'Start date');
    const endDate = parseValidDate(dto.endDate, 'End date');
    assertDateRange(startDate, endDate);

    // Check if term with same name already exists
    const existingTerm = await this.prismaService.term.findFirst({
      where: {
        academicYearId,
        name,
      },
    });

    if (existingTerm) {
      throw new BadRequestException('A period with this name already exists');
    }

    // Validate dates are within academic year
    if (startDate < academicYear.startDate || endDate > academicYear.endDate) {
      throw new BadRequestException(
        'Term dates must be within the academic year',
      );
    }
    await this.assertTermDatesDoNotOverlap(academicYearId, startDate, endDate);
    await this.assertTotalWeightDoesNotExceed100(
      academicYearId,
      dto.percentageWeight,
    );

    // Validate order is unique
    const existingOrder = await this.prismaService.term.findFirst({
      where: {
        academicYearId,
        order: dto.order,
      },
    });

    if (existingOrder) {
      throw new BadRequestException(
        'A period with this order number already exists',
      );
    }

    return this.prismaService.term.create({
      data: {
        academicYearId,
        name,
        order: dto.order,
        percentageWeight: dto.percentageWeight,
        startDate,
        endDate,
        isLocked: false,
      },
    });
  }

  /**
   * Update a term/period
   */
  async updateTerm(termId: string, dto: UpdateTermDto, schoolId?: string) {
    const term = await this.assertTermSchoolAccess(termId, schoolId);

    // Check if term is locked - cannot modify locked terms
    if (term.isLocked) {
      throw new ForbiddenException(
        'Cannot modify a locked period. Please unlock it first.',
      );
    }
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Period name is required');
    }
    if (
      dto.order !== undefined &&
      (!Number.isInteger(dto.order) || dto.order < 1)
    ) {
      throw new BadRequestException('Period order must be a positive integer');
    }
    this.assertPeriodWeight(dto.percentageWeight);

    const nextStartDate = dto.startDate
      ? parseValidDate(dto.startDate, 'Start date')
      : term.startDate;
    const nextEndDate = dto.endDate
      ? parseValidDate(dto.endDate, 'End date')
      : term.endDate;
    assertDateRange(nextStartDate, nextEndDate);

    if (
      nextStartDate < term.academicYear.startDate ||
      nextEndDate > term.academicYear.endDate
    ) {
      throw new BadRequestException(
        'Term dates must be within the academic year',
      );
    }

    await this.assertTermDatesDoNotOverlap(
      term.academicYearId,
      nextStartDate,
      nextEndDate,
      termId,
    );

    if (name && name !== term.name) {
      const existingName = await this.prismaService.term.findFirst({
        where: {
          academicYearId: term.academicYearId,
          name,
          id: { not: termId },
        },
      });

      if (existingName) {
        throw new BadRequestException('A period with this name already exists');
      }
    }

    // Check if term has grades - prevent weight changes if grades exist
    if (dto.percentageWeight !== undefined) {
      const hasGrades = await this.prismaService.subjectGrade.findFirst({
        where: { termId },
      });

      if (hasGrades) {
        throw new ForbiddenException(
          'Cannot change weight after grading has begun',
        );
      }
      await this.assertTotalWeightDoesNotExceed100(
        term.academicYearId,
        dto.percentageWeight,
        termId,
      );
    }

    // If updating order, check uniqueness
    if (dto.order !== undefined) {
      const existingOrder = await this.prismaService.term.findFirst({
        where: {
          academicYearId: term.academicYearId,
          order: dto.order,
          id: { not: termId },
        },
      });

      if (existingOrder) {
        throw new BadRequestException(
          'A period with this order number already exists',
        );
      }
    }

    return this.prismaService.term.update({
      where: { id: termId },
      data: {
        ...(name && { name }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.percentageWeight !== undefined && {
          percentageWeight: dto.percentageWeight,
        }),
        ...(dto.startDate && { startDate: nextStartDate }),
        ...(dto.endDate && { endDate: nextEndDate }),
      },
    });
  }

  /**
   * Lock or unlock a term/period
   * Locking prevents further modifications
   */
  async lockTerm(termId: string, isLocked: boolean, schoolId?: string) {
    await this.assertTermSchoolAccess(termId, schoolId);

    return this.prismaService.term.update({
      where: { id: termId },
      data: { isLocked },
    });
  }

  /**
   * Delete a term/period
   * Only allowed if no grades exist and term is not locked
   */
  async deleteTerm(termId: string, schoolId?: string) {
    const term = await this.assertTermSchoolAccess(termId, schoolId);

    if (term.isLocked) {
      throw new ForbiddenException('Cannot delete a locked period');
    }

    // Check if term has grades
    const hasGrades = await this.prismaService.subjectGrade.findFirst({
      where: { termId },
    });

    if (hasGrades) {
      throw new ForbiddenException('Cannot delete a period that has grades');
    }

    return this.prismaService.term.delete({
      where: { id: termId },
    });
  }

  /**
   * Get a specific term by ID
   */
  async getTermById(termId: string, schoolId?: string) {
    return this.assertTermSchoolAccess(termId, schoolId);
  }
}
