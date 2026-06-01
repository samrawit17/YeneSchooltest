import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { DEFAULT_CACHE_TTL_SECONDS } from '../infrastructure/cache/cache.constants';
import { CredentialService } from '../credential/credential.service';
import * as fs from 'fs';
import * as path from 'path';

// Curriculum type enum
type CurriculumType = 'SEMESTER' | 'QUARTER' | 'TERM' | 'CUSTOM';

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

const buildPeriodDateRanges = (
  startDate: Date,
  endDate: Date,
  periodConfig: Array<{
    name: string;
    order: number;
    percentageWeight: number;
  }>,
) => {
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const totalDuration = endMs - startMs;
  let currentStart = startMs;

  return periodConfig.map((config, index) => {
    const isLastPeriod = index === periodConfig.length - 1;
    const duration = totalDuration * (config.percentageWeight / 100);
    const periodStart = new Date(currentStart);
    const periodEnd = isLastPeriod
      ? new Date(endMs)
      : new Date(currentStart + duration);

    currentStart = periodEnd.getTime();

    return {
      ...config,
      startDate: periodStart,
      endDate: periodEnd,
    };
  });
};

// School setting keys
export const SCHOOL_SETTING_KEYS = {
  CURRICULUM_TYPE: 'curriculum_type',
  CALENDAR_TYPE: 'calendar_type',
  GRADE_SYSTEM: 'grade_system',
  FEE_STRUCTURE_MODE: 'fee_structure_mode',
  FEE_PAYMENT_DUE_DAY: 'fee_payment_due_day',
  FEE_DAILY_PENALTY_AMOUNT: 'fee_daily_penalty_amount',
  FAMILY_DISCOUNT_ENABLED: 'family_discount_enabled',
  FAMILY_DISCOUNT_MIN_STUDENTS: 'family_discount_min_students',
  FAMILY_DISCOUNT_PERCENT: 'family_discount_percent',
  FAMILY_DISCOUNT_FEE_TYPES: 'family_discount_fee_types',
  PARENT_VIEW_GRADES: 'parent_view_grades',
  ATTENDANCE_CUTOFF_TIME: 'ATTENDANCE_CUTOFF_TIME',
  DEFAULT_SECTION_CAPACITY: 'DEFAULT_SECTION_CAPACITY',
  SCHOOL_NAME: 'school_name',
  SCHOOL_ADDRESS: 'school_address',
  SCHOOL_PHONE: 'school_phone',
  SCHOOL_EMAIL: 'school_email',
  LOGO_URL: 'logo_url',
  LOGIN_IMAGE_URL: 'login_image_url',
  THEME_COLOR: 'theme_color',
  BRAND_COLOR_IN_NAVIGATION: 'BRAND_COLOR_IN_NAVIGATION',
  CERTIFICATE_SETTINGS: 'CERTIFICATE_SETTINGS',
  CERTIFICATE_TEMPLATE: 'certificate_template',
  ID_CARD_TEMPLATE: 'id_card_template',
  TEACHER_PORTAL_ACCESS: 'TEACHER_PORTAL_ACCESS',
  STUDENT_PORTAL_ACCESS: 'STUDENT_PORTAL_ACCESS',
  PARENT_PORTAL_ACCESS: 'PARENT_PORTAL_ACCESS',
  FINANCE_PORTAL_ACCESS: 'FINANCE_PORTAL_ACCESS',
  REGISTRAR_PORTAL_ACCESS: 'REGISTRAR_PORTAL_ACCESS',
} as const;

const SCHOOL_SETTING_KEY_ALIASES: Record<string, string> = {
  PARENT_VIEW_GRADES: SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES,
};

@Injectable()
export class SchoolSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly credentialService: CredentialService,
  ) {}

  private readonly allowedCalendarTypes = ['GREGORIAN', 'ETHIOPIAN'] as const;
  private readonly allowedCurriculumTypes = [
    'SEMESTER',
    'QUARTER',
    'TERM',
    'CUSTOM',
  ] as const;
  private readonly allowedGradeSystems = [
    '1-8',
    '1-10',
    '1-12',
    'K-8',
    'K-12',
    'PRE-K-12',
    '9-12',
  ] as const;
  private readonly allowedFeeStructureModes = [
    'MONTHLY',
    'QUARTERLY',
    'SEMESTER',
    'TERM',
    'YEARLY',
  ] as const;

  private getSectionNameByIndex(index: number) {
    let current = index;
    let name = '';

    do {
      name = String.fromCharCode(65 + (current % 26)) + name;
      current = Math.floor(current / 26) - 1;
    } while (current >= 0);

    return name;
  }

  private normalizeStudentName(name?: string | null) {
    return String(name || '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  private readonly booleanKeys = new Set([
    SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES,
    SCHOOL_SETTING_KEYS.BRAND_COLOR_IN_NAVIGATION,
    'ALLOW_SELF_ENROLLMENT',
    'ATTENDANCE_TRACKING',
    'LATE_MARKING',
    'ANNOUNCEMENTS_ENABLED',
    SCHOOL_SETTING_KEYS.TEACHER_PORTAL_ACCESS,
    SCHOOL_SETTING_KEYS.STUDENT_PORTAL_ACCESS,
    SCHOOL_SETTING_KEYS.PARENT_PORTAL_ACCESS,
    SCHOOL_SETTING_KEYS.FINANCE_PORTAL_ACCESS,
    SCHOOL_SETTING_KEYS.REGISTRAR_PORTAL_ACCESS,
    SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_ENABLED,
    'PARENT_VIEW_ATTENDANCE',
    'SELF_ENROLLMENT_ACTIVE',
  ]);

  private getSettingCacheKey(schoolId: string, key: string) {
    return `school-settings:${schoolId}:key:${key}`;
  }

  private getAllSettingsCacheKey(schoolId: string) {
    return `school-settings:${schoolId}:all`;
  }

  private async invalidateCache(schoolId: string, keys: string[] = []) {
    await this.cacheService.del(
      this.getAllSettingsCacheKey(schoolId),
      ...keys.map((key) => this.getSettingCacheKey(schoolId, key)),
    );
  }

  private parseStoredValue(rawValue: string) {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }

  private serializeSettingValue(value: any): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  private canonicalizeSettingKey(key: string) {
    return SCHOOL_SETTING_KEY_ALIASES[key] || key;
  }

  private getSettingKeyAliases(key: string) {
    const canonicalKey = this.canonicalizeSettingKey(key);
    return [
      canonicalKey,
      ...Object.entries(SCHOOL_SETTING_KEY_ALIASES)
        .filter(([, value]) => value === canonicalKey)
        .map(([alias]) => alias),
    ];
  }

  private normalizeSettingValue(key: string, value: any) {
    key = this.canonicalizeSettingKey(key);

    if (this.booleanKeys.has(key)) {
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 'false') return value === 'true';
      throw new BadRequestException(`Invalid boolean value for ${key}`);
    }

    if (key === SCHOOL_SETTING_KEYS.CALENDAR_TYPE) {
      const normalizedValue = String(value || '')
        .trim()
        .toUpperCase();
      if (
        !this.allowedCalendarTypes.includes(
          normalizedValue as (typeof this.allowedCalendarTypes)[number],
        )
      ) {
        throw new BadRequestException(
          `Invalid calendar type. Allowed values: ${this.allowedCalendarTypes.join(', ')}`,
        );
      }
      return normalizedValue;
    }

    if (key === SCHOOL_SETTING_KEYS.CURRICULUM_TYPE) {
      const normalizedValue = String(value || '')
        .trim()
        .toUpperCase();
      if (
        !this.allowedCurriculumTypes.includes(
          normalizedValue as (typeof this.allowedCurriculumTypes)[number],
        )
      ) {
        throw new BadRequestException(
          `Invalid curriculum type. Allowed values: ${this.allowedCurriculumTypes.join(', ')}`,
        );
      }
      return normalizedValue;
    }

    if (key === SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
      const normalizedValue = String(value || '')
        .trim()
        .toUpperCase();
      if (
        !this.allowedGradeSystems.includes(
          normalizedValue as (typeof this.allowedGradeSystems)[number],
        )
      ) {
        throw new BadRequestException(
          `Invalid grade system. Allowed values: ${this.allowedGradeSystems.join(', ')}`,
        );
      }
      return normalizedValue;
    }

    if (key === SCHOOL_SETTING_KEYS.FEE_STRUCTURE_MODE) {
      const normalizedValue = String(value || '')
        .trim()
        .toUpperCase();
      if (
        !this.allowedFeeStructureModes.includes(
          normalizedValue as (typeof this.allowedFeeStructureModes)[number],
        )
      ) {
        throw new BadRequestException(
          `Invalid fee structure mode. Allowed values: ${this.allowedFeeStructureModes.join(', ')}`,
        );
      }
      return normalizedValue;
    }

    if (key === SCHOOL_SETTING_KEYS.FEE_PAYMENT_DUE_DAY) {
      const day = Number(value);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        throw new BadRequestException(
          `${key} must be an integer between 1 and 31`,
        );
      }
      return day;
    }

    if (key === SCHOOL_SETTING_KEYS.FEE_DAILY_PENALTY_AMOUNT) {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new BadRequestException(
          'fee_daily_penalty_amount must be a number greater than or equal to 0',
        );
      }
      return Math.round(amount * 100) / 100;
    }

    if (key === SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_MIN_STUDENTS) {
      const count = Number(value);
      if (!Number.isInteger(count) || count < 2 || count > 20) {
        throw new BadRequestException(
          'family_discount_min_students must be an integer between 2 and 20',
        );
      }
      return count;
    }

    if (key === SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_PERCENT) {
      const percent = Number(value);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new BadRequestException(
          'family_discount_percent must be a number between 0 and 100',
        );
      }
      return Math.round(percent * 100) / 100;
    }

    if (key === SCHOOL_SETTING_KEYS.FAMILY_DISCOUNT_FEE_TYPES) {
      const rawValues = Array.isArray(value)
        ? value
        : String(value || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
      const normalizedValues = Array.from(
        new Set(rawValues.map((item) => String(item).trim().toUpperCase())),
      );
      if (normalizedValues.length === 0) {
        throw new BadRequestException(
          'family_discount_fee_types must include at least one fee type',
        );
      }
      return normalizedValues.join(',');
    }

    if (key === SCHOOL_SETTING_KEYS.DEFAULT_SECTION_CAPACITY) {
      const capacity = Number(value);
      if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 200) {
        throw new BadRequestException(
          'DEFAULT_SECTION_CAPACITY must be an integer between 1 and 200',
        );
      }
      return capacity;
    }

    if (key === SCHOOL_SETTING_KEYS.ATTENDANCE_CUTOFF_TIME) {
      const normalizedValue = String(value || '').trim();
      const isValidTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedValue);
      if (!isValidTime) {
        throw new BadRequestException(
          'ATTENDANCE_CUTOFF_TIME must be in 24-hour HH:mm format',
        );
      }
      return normalizedValue;
    }

    if (key === SCHOOL_SETTING_KEYS.THEME_COLOR) {
      const normalizedValue = String(value || '').trim();
      const isValidHexColor = /^#([0-9A-Fa-f]{6})$/.test(normalizedValue);
      if (!isValidHexColor) {
        throw new BadRequestException(
          `${key} must be a valid hex color in #RRGGBB format`,
        );
      }
      return normalizedValue;
    }

    if (key === SCHOOL_SETTING_KEYS.LOGIN_IMAGE_URL) {
      const normalizedValue = String(value || '').trim();
      if (!normalizedValue) return '';
      const isValidRelativeUpload = /^\/uploads\/[A-Za-z0-9._~/-]+$/.test(
        normalizedValue,
      );
      const isValidHttpUrl = /^https?:\/\/\S+$/i.test(normalizedValue);
      if (!isValidRelativeUpload && !isValidHttpUrl) {
        throw new BadRequestException(
          `${key} must be an uploaded image path or a valid URL`,
        );
      }
      return normalizedValue;
    }

    return value;
  }

  async uploadLoginImage(
    schoolId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (
      !['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(
        file.mimetype,
      )
    ) {
      throw new BadRequestException(
        'Login image must be PNG, JPG, JPEG, or WEBP',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Login image must be less than 5MB');
    }

    const extension =
      file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg';
    const relativeDir = path.join('uploads', 'schools', schoolId, 'branding');
    const backendPublicDir = path.join(process.cwd(), 'public', relativeDir);

    if (!fs.existsSync(backendPublicDir)) {
      fs.mkdirSync(backendPublicDir, { recursive: true });
    }

    const fileName = `login-${Date.now()}${extension}`;
    const filePath = path.join(backendPublicDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const url = `/${relativeDir.replace(/\\/g, '/')}/${fileName}`;
    await this.setSetting(schoolId, SCHOOL_SETTING_KEYS.LOGIN_IMAGE_URL, url);
    return url;
  }

  private async validateCalendarTypeOneTimeChange(
    schoolId: string,
    incomingValue: string,
  ) {
    const existingCalendarType = await this.getSetting(
      schoolId,
      SCHOOL_SETTING_KEYS.CALENDAR_TYPE,
    );
    if (existingCalendarType === null || existingCalendarType === undefined) {
      return;
    }

    const existingYears = await this.prisma.academicYear.count({
      where: { schoolId },
    });
    if (existingYears > 0) {
      throw new BadRequestException(
        'Cannot change after academic year is created. This protects existing academic records and years.',
      );
    }

    if (String(existingCalendarType).toUpperCase() !== incomingValue) {
      throw new BadRequestException(
        'Calendar type is locked and can only be set once. Changing it later can corrupt date consistency.',
      );
    }
  }

  private async validateGradeSystemOneTimeChange(
    schoolId: string,
    incomingValue: string,
  ) {
    const existingGradeSystem = await this.getSetting(
      schoolId,
      SCHOOL_SETTING_KEYS.GRADE_SYSTEM,
    );
    if (existingGradeSystem === null || existingGradeSystem === undefined) {
      return;
    }

    if (String(existingGradeSystem).toUpperCase() !== incomingValue) {
      throw new BadRequestException(
        'Grade system is locked and can only be set once. Changing it later can affect existing grade levels and classes.',
      );
    }
  }

  private async validateCurriculumTypeOneTimeChange(
    schoolId: string,
    incomingValue: string,
  ) {
    const existingCurriculumType = await this.getSetting(
      schoolId,
      SCHOOL_SETTING_KEYS.CURRICULUM_TYPE,
    );
    if (
      existingCurriculumType !== null &&
      existingCurriculumType !== undefined &&
      String(existingCurriculumType).toUpperCase() !== incomingValue
    ) {
      throw new BadRequestException(
        'Curriculum system is locked and can only be set once. Changing it later can affect terms, grading, fees, and academic records.',
      );
    }

    const existingFees = await this.prisma.studentFee.count({
      where: { schoolId },
    });

    if (existingFees > 0) {
      throw new BadRequestException(
        'Cannot change curriculum type after fees have been generated. This would disrupt existing fee records and payments. Please set this at the start of the academic year.',
      );
    }
  }

  // Get a single school setting by schoolId and key
  async getSetting(schoolId: string, key: string) {
    const canonicalKey = this.canonicalizeSettingKey(key);
    const keyAliases = this.getSettingKeyAliases(canonicalKey);

    return this.cacheService.getOrSet(
      this.getSettingCacheKey(schoolId, canonicalKey),
      DEFAULT_CACHE_TTL_SECONDS,
      async () => {
        const settings = await this.prisma.schoolSetting.findMany({
          where: {
            schoolId,
            key: { in: keyAliases },
          },
        });
        const setting =
          settings.find((item) => item.key === canonicalKey) || settings[0];
        return setting ? this.parseStoredValue(setting.value) : null;
      },
    );
  }

  // Get all settings for a school
  async getAllSettings(schoolId: string) {
    return this.cacheService.getOrSet(
      this.getAllSettingsCacheKey(schoolId),
      DEFAULT_CACHE_TTL_SECONDS,
      async () => {
        const settings = await this.prisma.schoolSetting.findMany({
          where: { schoolId },
        });
        const result: Record<string, any> = {};
        for (const setting of settings) {
          const canonicalKey = this.canonicalizeSettingKey(setting.key);
          const parsedValue = this.parseStoredValue(setting.value);
          if (result[canonicalKey] === undefined || canonicalKey === setting.key) {
            result[canonicalKey] = parsedValue;
          }
          if (canonicalKey !== setting.key) {
            result[setting.key] = parsedValue;
          }
        }
        return result;
      },
    );
  }

  // Upsert a school setting
  async setSetting(schoolId: string, key: string, value: any) {
    const canonicalKey = this.canonicalizeSettingKey(key);
    const normalizedValue = this.normalizeSettingValue(canonicalKey, value);
    const serializedValue = this.serializeSettingValue(normalizedValue);

    if (canonicalKey === SCHOOL_SETTING_KEYS.CALENDAR_TYPE) {
      await this.validateCalendarTypeOneTimeChange(schoolId, normalizedValue);
    }

    if (canonicalKey === SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
      await this.validateGradeSystemOneTimeChange(schoolId, normalizedValue);
    }

    if (canonicalKey === SCHOOL_SETTING_KEYS.CURRICULUM_TYPE) {
      await this.validateCurriculumTypeOneTimeChange(schoolId, normalizedValue);
    }

    const setting = await this.prisma.schoolSetting.upsert({
      where: {
        schoolId_key: {
          schoolId,
          key: canonicalKey,
        },
      },
      update: { value: serializedValue },
      create: { schoolId, key: canonicalKey, value: serializedValue },
    });

    const legacyAliases = this.getSettingKeyAliases(canonicalKey).filter(
      (item) => item !== canonicalKey,
    );
    if (legacyAliases.length > 0) {
      await this.prisma.schoolSetting.deleteMany({
        where: { schoolId, key: { in: legacyAliases } },
      });
    }

    // If CURRICULUM_TYPE is changed, auto-create terms for all academic years
    if (
      canonicalKey === SCHOOL_SETTING_KEYS.CURRICULUM_TYPE &&
      normalizedValue !== 'CUSTOM'
    ) {
      await this.autoCreateTermsForAcademicYears(
        schoolId,
        normalizedValue as CurriculumType,
      );
    }

    // If GRADE_SYSTEM is changed, auto-create grade levels
    if (canonicalKey === SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
      await this.autoCreateGradeLevels(schoolId, normalizedValue as string);
    }

    // If DEFAULT_SECTION_CAPACITY is changed, sync all sections to use the new capacity
    if (canonicalKey === SCHOOL_SETTING_KEYS.DEFAULT_SECTION_CAPACITY) {
      const newCapacity =
        typeof normalizedValue === 'number'
          ? normalizedValue
          : parseInt(normalizedValue as string, 10);
      if (!isNaN(newCapacity) && newCapacity > 0) {
        await this.syncSectionCapacities(schoolId, newCapacity);
      }
    }

    await this.invalidateCache(schoolId, this.getSettingKeyAliases(canonicalKey));

    return {
      ...setting,
      value: normalizedValue,
    };
  }

  // Sync all section capacities to match the new DEFAULT_SECTION_CAPACITY setting
  private async syncSectionCapacities(schoolId: string, capacity: number) {
    const studentClasses = await this.prisma.studentClass.findMany({
      where: { schoolId },
      include: {
        student: { select: { id: true, name: true } },
        class: {
          select: {
            id: true,
            name: true,
            academicYearId: true,
            academicYear: { select: { name: true } },
            grade: true,
            gradeId: true,
          },
        },
      },
    });

    const groupedByGradeYear = new Map<string, typeof studentClasses>();
    for (const row of studentClasses) {
      const key = `${row.class.academicYearId}:${row.class.name}`;
      if (!groupedByGradeYear.has(key)) groupedByGradeYear.set(key, []);
      groupedByGradeYear.get(key)!.push(row);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [, group] of groupedByGradeYear) {
        const orderedStudents = [...group].sort((left, right) =>
          this.normalizeStudentName(left.student?.name).localeCompare(
            this.normalizeStudentName(right.student?.name),
            undefined,
            { sensitivity: 'base' },
          ),
        );
        const totalSections = Math.max(
          1,
          Math.ceil(orderedStudents.length / capacity),
        );

        if (orderedStudents.length === 0) continue;

        const sampleClass = orderedStudents[0].class;
        let defaultClassConsumed = false;

        for (let index = 0; index < orderedStudents.length; index++) {
          const item = orderedStudents[index];
          const sectionName = this.getSectionNameByIndex(index % totalSections);

          let cls = await tx.class.findFirst({
            where: {
              schoolId,
              academicYearId: sampleClass.academicYearId,
              name: sampleClass.name,
              section: sectionName,
            },
          });

          if (!cls && !defaultClassConsumed) {
            const emptyClass = await tx.class.findFirst({
              where: {
                schoolId,
                academicYearId: sampleClass.academicYearId,
                name: sampleClass.name,
                section: '',
              },
            });

            if (emptyClass) {
              cls = await tx.class.update({
                where: { id: emptyClass.id },
                data: {
                  section: sectionName,
                  grade: sampleClass.grade ?? undefined,
                  gradeId: sampleClass.gradeId ?? undefined,
                },
              });
              defaultClassConsumed = true;
            }
          }

          if (!cls) {
            cls = await tx.class.create({
              data: {
                schoolId,
                academicYearId: sampleClass.academicYearId,
                name: sampleClass.name,
                section: sectionName,
                grade: sampleClass.grade ?? undefined,
                gradeId: sampleClass.gradeId ?? undefined,
              },
            });
          }

          let sec = await tx.section.findFirst({
            where: { classId: cls.id, name: sectionName },
          });

          if (!sec) {
            sec = await tx.section.create({
              data: {
                classId: cls.id,
                name: sectionName,
                capacity,
              },
            });
          } else if (sec.capacity !== capacity) {
            sec = await tx.section.update({
              where: { id: sec.id },
              data: { capacity },
            });
          }

          await tx.studentClass.update({
            where: { id: item.id },
            data: {
              classId: cls.id,
              sectionId: sec.id,
            },
          });

          await tx.studentProfile.updateMany({
            where: { userId: item.studentId },
            data: {
              className: cls.name,
              section: sec.name,
              rollNumber: '0',
            },
          });
        }
      }

      const sections = await tx.section.findMany({
        where: { class: { schoolId } },
      });

      for (const section of sections) {
        if (section.capacity !== capacity) {
          await tx.section.update({
            where: { id: section.id },
            data: { capacity },
          });
        }
      }
    });

    const academicYears = await this.prisma.academicYear.findMany({
      where: { schoolId },
      select: { name: true },
    });

    for (const academicYear of academicYears) {
      await this.credentialService.assignRollNumbersByAlphabet(
        schoolId,
        academicYear.name,
      );
    }
  }

  // Auto-create terms for all academic years when curriculum type changes
  private async autoCreateTermsForAcademicYears(
    schoolId: string,
    curriculumType: CurriculumType,
  ) {
    // Get all academic years for this school
    const academicYears = await this.prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        terms: {
          include: { subjectGrades: true },
        },
      },
    });

    const periodConfig = DEFAULT_PERIOD_CONFIGS[curriculumType];
    if (!periodConfig) return;

    for (const academicYear of academicYears) {
      // Check if academic year already has terms with grades - skip those
      const hasTermsWithGrades = academicYear.terms.some(
        (term) => term.subjectGrades && term.subjectGrades.length > 0,
      );

      if (hasTermsWithGrades) {
        // Only update curriculum type, don't modify terms
        await this.prisma.academicYear.update({
          where: { id: academicYear.id },
          data: { curriculumType },
        });
        continue;
      }

      // Delete existing terms without grades
      await this.prisma.term.deleteMany({
        where: {
          academicYearId: academicYear.id,
          subjectGrades: { none: {} },
        },
      });

      // Update curriculum type
      await this.prisma.academicYear.update({
        where: { id: academicYear.id },
        data: { curriculumType },
      });

      // Create new terms with default configuration
      await this.prisma.term.createMany({
        data: buildPeriodDateRanges(
          academicYear.startDate,
          academicYear.endDate,
          periodConfig,
        ).map((config) => ({
          academicYearId: academicYear.id,
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

  // Auto-create grade levels based on grade system range
  // Note: Grade levels are independent of academic years
  private async autoCreateGradeLevels(
    schoolId: string,
    range: string,
    academicYearId?: string,
  ) {
    const grades = this.buildGradeLevelsFromRange(range);

    if (grades.length === 0) return;

    // Classes are optional - grade levels can exist without academic years.
    // We create default classes (with empty section) for either:
    // - a specific academic year (when requested), or
    // - the currently active academic year (when grade system is set/locked).
    const targetYearIds: string[] = [];
    if (academicYearId) {
      targetYearIds.push(academicYearId);
    } else {
      const activeYear = await this.prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true },
      });
      if (activeYear?.id) targetYearIds.push(activeYear.id);
    }

    for (const grade of grades) {
      const gradeLevel = await this.prisma.gradeLevel.upsert({
        where: {
          schoolId_level: {
            schoolId,
            level: grade.level,
          },
        },
        update: { name: grade.name },
        create: {
          schoolId,
          name: grade.name,
          level: grade.level,
        },
      });

      // Create default classes for this grade only if we have a target academic year.
      // Note: Only create the empty default class when no class for this grade/year exists yet.
      // If a sectioned class already exists, skip the empty seed row and clean up any stale one.
      for (const yearId of targetYearIds) {
        const matchingClasses = await this.prisma.class.findMany({
          where: {
            schoolId,
            academicYearId: yearId,
            OR: [
              { name: grade.name },
              { gradeId: gradeLevel.id },
              { grade: gradeLevel.level },
            ],
          },
          include: {
            sections: { select: { id: true } },
            _count: {
              select: {
                sections: true,
                studentClasses: true,
                ClassSubject: true,
                teacherAssignments: true,
                timetableSlots: true,
                timetables: true,
                assessmentSubjects: true,
                contents: true,
                enrollmentRequests: true,
                attendances: true,
                attendanceSessions: true,
                exams: true,
                communications: true,
                reportCards: true,
                subjectGrades: true,
              },
            },
          },
        });

        const emptyDefaultClass = matchingClasses.find(
          (cls) => cls.name === grade.name && cls.section === '',
        );
        const hasRealClassForGrade = matchingClasses.some(
          (cls) =>
            cls.id !== emptyDefaultClass?.id &&
            (cls.section !== '' || cls.sections.length > 0),
        );

        if (!emptyDefaultClass && !hasRealClassForGrade) {
          await this.prisma.class.create({
            data: {
              schoolId,
              academicYearId: yearId,
              name: grade.name,
              section: '',
              gradeId: gradeLevel.id,
              grade: gradeLevel.level,
            },
          });
          continue;
        }

        if (emptyDefaultClass) {
          await this.prisma.class.update({
            where: { id: emptyDefaultClass.id },
            data: {
              gradeId: gradeLevel.id,
              grade: gradeLevel.level,
            },
          });
        }

        for (const existingClass of matchingClasses) {
          if (
            existingClass.gradeId !== gradeLevel.id ||
            existingClass.grade !== gradeLevel.level
          ) {
            await this.prisma.class.update({
              where: { id: existingClass.id },
              data: {
                gradeId: gradeLevel.id,
                grade: gradeLevel.level,
              },
            });
          }
        }

        if (emptyDefaultClass && hasRealClassForGrade) {
          const dependencyCount =
            emptyDefaultClass._count.sections +
            emptyDefaultClass._count.studentClasses +
            emptyDefaultClass._count.ClassSubject +
            emptyDefaultClass._count.teacherAssignments +
            emptyDefaultClass._count.timetableSlots +
            emptyDefaultClass._count.timetables +
            emptyDefaultClass._count.assessmentSubjects +
            emptyDefaultClass._count.contents +
            emptyDefaultClass._count.enrollmentRequests +
            emptyDefaultClass._count.attendances +
            emptyDefaultClass._count.attendanceSessions +
            emptyDefaultClass._count.exams +
            emptyDefaultClass._count.communications +
            emptyDefaultClass._count.reportCards +
            emptyDefaultClass._count.subjectGrades;

          if (dependencyCount === 0) {
            await this.prisma.class.delete({
              where: { id: emptyDefaultClass.id },
            });
          }
        }
      }
    }

    await this.prisma.gradeLevel.deleteMany({
      where: {
        schoolId,
        level: { notIn: grades.map((g) => g.level) },
        classes: { none: {} },
      },
    });
  }

  async ensureDefaultClassesForAcademicYear(
    schoolId: string,
    academicYearId: string,
  ) {
    const gradeSystem = await this.getSetting(
      schoolId,
      SCHOOL_SETTING_KEYS.GRADE_SYSTEM,
    );
    if (gradeSystem === null || gradeSystem === undefined) {
      return {
        message: 'Grade system not set; skipped default class creation',
      };
    }

    const normalizedRange = String(gradeSystem || '')
      .trim()
      .toUpperCase();
    await this.autoCreateGradeLevels(schoolId, normalizedRange, academicYearId);
    return { message: 'Default grade classes ensured for academic year' };
  }

  private buildGradeLevelsFromRange(range: string) {
    const grades: { name: string; level: number }[] = [];
    const pushGradeRange = (start: number, end: number) => {
      for (let i = start; i <= end; i++)
        grades.push({ name: `Grade ${i}`, level: i });
    };

    switch (range) {
      case '1-8':
        pushGradeRange(1, 8);
        break;
      case '1-10':
        pushGradeRange(1, 10);
        break;
      case '1-12':
        pushGradeRange(1, 12);
        break;
      case 'K-8':
        grades.push({ name: 'Kindergarten', level: 0 });
        pushGradeRange(1, 8);
        break;
      case 'K-12':
        grades.push({ name: 'Kindergarten', level: 0 });
        pushGradeRange(1, 12);
        break;
      case 'PRE-K-12':
        grades.push({ name: 'Pre-Kindergarten', level: -1 });
        grades.push({ name: 'Kindergarten', level: 0 });
        pushGradeRange(1, 12);
        break;
      case '9-12':
        pushGradeRange(9, 12);
        break;
      default:
        throw new BadRequestException('Unsupported grade system');
    }

    return grades;
  }

  async getGradeLevelsForSchool(schoolId: string) {
    const gradeSystem = await this.getGradeSystem(schoolId);
    return this.buildGradeLevelsFromRange(gradeSystem);
  }

  // Delete a school setting
  async deleteSetting(schoolId: string, key: string) {
    const canonicalKey = this.canonicalizeSettingKey(key);
    if (
      canonicalKey === SCHOOL_SETTING_KEYS.CALENDAR_TYPE ||
      canonicalKey === SCHOOL_SETTING_KEYS.CURRICULUM_TYPE ||
      canonicalKey === SCHOOL_SETTING_KEYS.GRADE_SYSTEM
    ) {
      throw new BadRequestException(
        'This academic setting cannot be deleted after being set. It is locked to preserve data consistency.',
      );
    }

    await this.prisma.schoolSetting.deleteMany({
      where: {
        schoolId,
        key: { in: this.getSettingKeyAliases(canonicalKey) },
      },
    });
    await this.invalidateCache(schoolId, this.getSettingKeyAliases(canonicalKey));
    return { message: 'Setting deleted successfully' };
  }

  // Get effective setting value (school setting → platform setting → system default)
  async getEffectiveSetting(
    schoolId: string,
    key: string,
    platformValue: any = null,
    systemDefault: any = null,
  ) {
    // First try school setting
    const schoolValue = await this.getSetting(schoolId, key);
    if (schoolValue !== null) {
      return schoolValue;
    }

    // Then try platform setting
    if (platformValue !== null) {
      return platformValue;
    }

    // Fallback to system default
    return systemDefault;
  }

  // Batch update multiple settings for a school
  async batchUpdate(schoolId: string, settings: Record<string, any>) {
    const results: any[] = [];
    for (const [key, value] of Object.entries(settings)) {
      const result = await this.setSetting(schoolId, key, value);
      results.push(result);
    }
    await this.invalidateCache(
      schoolId,
      Object.keys(settings).flatMap((key) => this.getSettingKeyAliases(key)),
    );
    return results;
  }

  // Get curriculum type for a school (from active academic year or school settings)
  async getCurriculumType(schoolId: string): Promise<string> {
    // First try to get from active academic year
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });

    if (activeYear) {
      return activeYear.curriculumType;
    }

    // Fallback to school setting
    const setting = await this.getSetting(
      schoolId,
      SCHOOL_SETTING_KEYS.CURRICULUM_TYPE,
    );
    return (setting as string) || 'SEMESTER'; // Default to SEMESTER
  }

  // Get grade system for a school
  async getGradeSystem(schoolId: string): Promise<string> {
    const setting = await this.getSetting(
      schoolId,
      SCHOOL_SETTING_KEYS.GRADE_SYSTEM,
    );
    return (setting as string) || '1-12'; // Default to 1-12
  }

  // Get full academic configuration (curriculum + grade system)
  async getAcademicConfiguration(schoolId: string): Promise<{
    curriculumType: string;
    gradeSystem: string;
    activeAcademicYear: any;
    periods: any[];
  }> {
    const [curriculumType, gradeSystem, activeYear] = await Promise.all([
      this.getCurriculumType(schoolId),
      this.getGradeSystem(schoolId),
      this.prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        include: {
          terms: { orderBy: { order: 'asc' } },
        },
      }),
    ]);

    return {
      curriculumType,
      gradeSystem,
      activeAcademicYear: activeYear,
      periods: activeYear?.terms || [],
    };
  }
}
