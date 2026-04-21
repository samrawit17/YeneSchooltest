import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SchoolSettingsService } from '../school-settings/school-settings.service';

// Curriculum type enum - matches schema.prisma
type CurriculumType = 'SEMESTER' | 'QUARTER' | 'TERM' | 'CUSTOM';
type CalendarType = 'GREGORIAN' | 'ETHIOPIAN';

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

  async createAcademicYear(createDto: CreateAcademicYearDto) {
    const {
      name,
      startDate,
      endDate,
      schoolId,
      curriculumType,
      calendarType = 'ETHIOPIAN',
    } = createDto;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check if academic year with same name exists for this school
    const existing = await this.prismaService.academicYear.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Academic year with this name already exists for this school',
      );
    }

    // Get curriculum type from school settings if not provided
    let finalCurriculumType = curriculumType || 'QUARTER';
    if (!curriculumType) {
      const schoolSetting = await this.schoolSettingsService.getSetting(
        schoolId,
        'CURRICULUM_TYPE',
      );
      if (schoolSetting) {
        finalCurriculumType = schoolSetting;
      }
    }

    // Create academic year with curriculum type
    const academicYear = await this.prismaService.academicYear.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schoolId,
        curriculumType: finalCurriculumType as any,
        calendarType: calendarType as any,
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
          new Date(startDate),
          new Date(endDate),
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
      schoolId,
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
    return this.prismaService.academicYear.findMany({
      where: { schoolId },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAcademicYearById(id: string) {
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

    return academicYear;
  }

  async getActiveAcademicYear(schoolId: string) {
    // Attempt to get default from school settings
    const settings = await this.prismaService.schoolSettings.findUnique({
      where: { schoolId },
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
        schoolId,
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
      where: { schoolId },
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
    if (providedAcademicYearId) {
      return providedAcademicYearId;
    }

    // Attempt to get default from school settings
    const settings = await this.prismaService.schoolSettings.findUnique({
      where: { schoolId },
    });

    if (settings && settings.defaultAcademicYearId) {
      return settings.defaultAcademicYearId;
    }

    // Fallback to active academic year
    const activeInfo = await this.getActiveAcademicYear(schoolId);
    if (!activeInfo) {
      throw new BadRequestException(
        'No academic year provided and no default/active academic year found for the school',
      );
    }

    return activeInfo.id;
  }

  async updateAcademicYear(id: string, updateDto: UpdateAcademicYearDto) {
    const academicYear = await this.getAcademicYearById(id);

    if (updateDto.startDate && updateDto.endDate) {
      if (new Date(updateDto.startDate) >= new Date(updateDto.endDate)) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    // If updating name, check for duplicates
    if (updateDto.name && updateDto.name !== academicYear.name) {
      const existing = await this.prismaService.academicYear.findUnique({
        where: {
          schoolId_name: {
            schoolId: academicYear.schoolId,
            name: updateDto.name,
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          'Academic year with this name already exists for this school',
        );
      }
    }

    return this.prismaService.academicYear.update({
      where: { id },
      data: {
        ...updateDto,
        ...(updateDto.startDate && {
          startDate: new Date(updateDto.startDate),
        }),
        ...(updateDto.endDate && { endDate: new Date(updateDto.endDate) }),
      },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateCurriculumType(id: string, dto: UpdateCurriculumTypeDto) {
    const academicYear = await this.getAcademicYearById(id);

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

    // Delete existing terms and create new ones based on new curriculum type
    await this.prismaService.term.deleteMany({
      where: { academicYearId: id },
    });

    // Create new terms with default configuration
    if (dto.curriculumType !== 'CUSTOM') {
      const periodConfig = DEFAULT_PERIOD_CONFIGS[dto.curriculumType];
      if (periodConfig) {
        await this.prismaService.term.createMany({
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

    return this.prismaService.academicYear.update({
      where: { id },
      data: { curriculumType: dto.curriculumType as any },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async activateAcademicYear(id: string) {
    const academicYear = await this.getAcademicYearById(id);

    // Deactivate all other academic years for this school
    await this.prismaService.academicYear.updateMany({
      where: {
        schoolId: academicYear.schoolId,
        id: { not: id },
      },
      data: { isActive: false },
    });

    // Activate the specified academic year
    const activated = await this.prismaService.academicYear.update({
      where: { id },
      data: { isActive: true },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
      },
    });

    await this.schoolSettingsService.ensureDefaultClassesForAcademicYear(
      academicYear.schoolId,
      activated.id,
    );

    return activated;
  }

  async deleteAcademicYear(id: string) {
    await this.getAcademicYearById(id); // Verify exists

    return this.prismaService.academicYear.delete({
      where: { id },
    });
  }

  /**
   * Get periods with their weights for an academic year
   * Used for grade calculations
   */
  async getPeriodWeights(id: string) {
    const academicYear = await this.getAcademicYearById(id);

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
  async validatePeriodWeights(id: string): Promise<boolean> {
    const academicYear = await this.getAcademicYearById(id);
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
  async createTerm(academicYearId: string, dto: CreateTermDto) {
    const academicYear = await this.getAcademicYearById(academicYearId);

    // Check if term with same name already exists
    const existingTerm = await this.prismaService.term.findFirst({
      where: {
        academicYearId,
        name: dto.name,
      },
    });

    if (existingTerm) {
      throw new BadRequestException('A period with this name already exists');
    }

    // Validate dates are within academic year
    if (
      new Date(dto.startDate) < academicYear.startDate ||
      new Date(dto.endDate) > academicYear.endDate
    ) {
      throw new BadRequestException(
        'Term dates must be within the academic year',
      );
    }

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
        name: dto.name,
        order: dto.order,
        percentageWeight: dto.percentageWeight,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isLocked: false,
      },
    });
  }

  /**
   * Update a term/period
   */
  async updateTerm(termId: string, dto: UpdateTermDto) {
    const term = await this.prismaService.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Check if term is locked - cannot modify locked terms
    if (term.isLocked) {
      throw new ForbiddenException(
        'Cannot modify a locked period. Please unlock it first.',
      );
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
        ...(dto.name && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.percentageWeight !== undefined && {
          percentageWeight: dto.percentageWeight,
        }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
    });
  }

  /**
   * Lock or unlock a term/period
   * Locking prevents further modifications
   */
  async lockTerm(termId: string, isLocked: boolean) {
    const term = await this.prismaService.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    return this.prismaService.term.update({
      where: { id: termId },
      data: { isLocked },
    });
  }

  /**
   * Delete a term/period
   * Only allowed if no grades exist and term is not locked
   */
  async deleteTerm(termId: string) {
    const term = await this.prismaService.term.findUnique({
      where: { id: termId },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

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
  async getTermById(termId: string) {
    const term = await this.prismaService.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    return term;
  }
}
