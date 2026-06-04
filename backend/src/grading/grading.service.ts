import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { 
  AssessmentStatus, 
  AssessmentScoreStatus, 
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicYearService } from '../academic-year/academic-year.service';
import {
  CreateGradeDto,
  UpdateGradeDto,
  BulkGradeEntryDto,
  GradeFilterDto,
  ApproveGradeDto,
  GradingComponentDto,
  GradeScaleDto,
  TeacherAssignmentDto,
  GradeStatus,
} from './dto/grading.dto';
import { CacheService } from '../infrastructure/cache/cache.service';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';
import { SCHOOL_SETTING_KEYS } from '../school-settings/school-settings.service';

// Default grading scale (Ethiopian context)
const DEFAULT_GRADE_SCALE = [
  { letter: 'A', min: 90, max: 100, point: 4.0, desc: 'Excellent' },
  { letter: 'B', min: 80, max: 89, point: 3.5, desc: 'Very Good' },
  { letter: 'C', min: 70, max: 79, point: 3.0, desc: 'Good' },
  { letter: 'D', min: 60, max: 69, point: 2.5, desc: 'Satisfactory' },
  { letter: 'F', min: 0, max: 59, point: 0.0, desc: 'Fail' },
];

// Default grading components (Ethiopian context)
const DEFAULT_GRADING_COMPONENTS = [
  { name: 'Continuous Assessment', code: 'CA', percentage: 30 },
  { name: 'Mid Exam', code: 'MID', percentage: 20 },
  { name: 'Final Exam', code: 'FINAL', percentage: 50 },
];

@Injectable()
export class GradingService {
  constructor(
    private prisma: PrismaService,
    private academicYearService: AcademicYearService,
    private cacheService: CacheService,
    private notificationService: NotificationService,
  ) {}

  private getStudentGradesNamespace(studentId: string) {
    return `grades:student:${studentId}`;
  }

  private getTeacherGradesNamespace(teacherId: string) {
    return `grades:teacher:${teacherId}`;
  }

  private getSchoolGradesNamespace(schoolId: string) {
    return `grades:school:${schoolId}`;
  }

  private parseSettingValue(rawValue: string | null | undefined) {
    if (rawValue === null || rawValue === undefined) return null;
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }

  private async ensureParentGradeAccessEnabled(schoolId: string) {
    const settings = await this.prisma.schoolSetting.findMany({
      where: {
        schoolId,
        key: { in: [SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES, 'PARENT_VIEW_GRADES'] },
      },
      select: { key: true, value: true },
    });
    const setting =
      settings.find((item) => item.key === SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES) ||
      settings[0];
    const value = this.parseSettingValue(setting?.value);

    if (value === false || value === 'false') {
      throw new ForbiddenException(
        'Parent grade viewing is disabled for this school.',
      );
    }
  }

  private async getSchoolGradingComponentsMap(schoolId: string) {
    const assessmentTypesRaw = await this.getAssessmentTypes(schoolId);
    const assessmentTypes: Array<{
      code: string;
      name: string;
      percentage: number;
    }> = Array.isArray(assessmentTypesRaw)
      ? assessmentTypesRaw.flatMap((item) => {
          if (
            item &&
            typeof item === 'object' &&
            'code' in item &&
            'name' in item &&
            'percentage' in item
          ) {
            return [
              {
                code: String(item.code),
                name: String(item.name),
                percentage: Number(item.percentage),
              },
            ];
          }
          return [];
        })
      : [];
    const componentMap = new Map<string, any>();

    for (const item of assessmentTypes) {
      const code = String(item.code).toUpperCase();
      const component = await this.prisma.gradingComponent.upsert({
        where: {
          schoolId_code: {
            schoolId,
            code,
          },
        },
        update: {
          name: item.name,
          percentage: item.percentage,
          isActive: true,
        },
        create: {
          schoolId,
          code,
          name: item.name,
          percentage: item.percentage,
          isActive: true,
        },
      });
      componentMap.set(code, component);
    }

    return componentMap;
  }

  private getEffectiveAssessmentMaxScore(
    storedMaxScore: number,
    componentPercentage?: number | null,
  ) {
    if (
      storedMaxScore === 100 &&
      componentPercentage !== undefined &&
      componentPercentage !== null &&
      componentPercentage > 0 &&
      componentPercentage <= 100
    ) {
      return Number(componentPercentage);
    }

    return Number(storedMaxScore);
  }

  private buildLegacyScoresFromComponents(
    componentScores: Array<{ code: string; score: number | null | undefined }>,
  ) {
    let caScore = 0;
    let midScore = 0;
    let finalScore = 0;

    for (const item of componentScores) {
      const score = item.score ?? 0;
      const code = String(item.code).toUpperCase();
      if (code === 'FINAL') {
        finalScore += score;
      } else if (code === 'MID') {
        midScore += score;
      } else {
        caScore += score;
      }
    }

    return {
      caScore: caScore > 0 ? caScore : null,
      midScore: midScore > 0 ? midScore : null,
      finalScore: finalScore > 0 ? finalScore : null,
    };
  }

  private async normalizeComponentPayload(
    schoolId: string,
    componentScores?: Array<{
      code: string;
      score?: number | null;
      assessmentSubjectId?: string;
    }>,
    context?: {
      teacherId: string;
      academicYear: string;
      termId: string;
      classId: string;
      sectionId: string;
      subjectId: string;
    },
  ) {
    if (!componentScores || componentScores.length === 0) {
      return [];
    }

    const componentMap = await this.getSchoolGradingComponentsMap(schoolId);
    const dedupedComponentScores = Array.from(
      componentScores
        .filter((item) => item && item.code)
        .reduce((map, item) => {
          map.set(String(item.code).toUpperCase(), item);
          return map;
        }, new Map<string, { code: string; score?: number | null; assessmentSubjectId?: string }>())
        .values(),
    );

    return Promise.all(dedupedComponentScores
      .map(async (item) => {
        const code = String(item.code).toUpperCase();
        const component = componentMap.get(code);
        if (!component) {
          throw new BadRequestException(
            `${code} is not configured for this school`,
          );
        }

        let maxScore = Number(component.percentage);
        const score = item.score ?? null;

        if (context && score !== null && !item.assessmentSubjectId) {
          throw new BadRequestException(
            `${code} is not scheduled for this class, section, subject, and term`,
          );
        }

        if (item.assessmentSubjectId) {
          const assessmentSubject = await this.prisma.assessmentSubject.findFirst({
            where: {
              id: item.assessmentSubjectId,
              assessment: {
                schoolId,
                type: code as any,
                ...(context
                  ? {
                      academicYearId: context.academicYear,
                      termId: context.termId,
                    }
                  : {}),
              },
              ...(context
                ? {
                    classId: context.classId,
                    sectionId: context.sectionId,
                    subjectId: context.subjectId,
                  }
                : {}),
            },
            select: {
              maxScore: true,
              teacherId: true,
              assessment: {
                select: {
                  status: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          });

          if (!assessmentSubject) {
            throw new BadRequestException(
              `${code} is not scheduled for this class, section, subject, and term`,
            );
          }

          if (
            context &&
            assessmentSubject.teacherId &&
            assessmentSubject.teacherId !== context.teacherId
          ) {
            throw new ForbiddenException(
              `You are not assigned to this ${code} assessment`,
            );
          }

          if (assessmentSubject.assessment.status === AssessmentStatus.LOCKED) {
            throw new ForbiddenException(`${code} assessment is locked`);
          }

          if (assessmentSubject.assessment.startDate > new Date()) {
            throw new ForbiddenException(`${code} assessment has not started yet`);
          }

          if (
            assessmentSubject.assessment.status === AssessmentStatus.COMPLETED ||
            assessmentSubject.assessment.endDate < new Date()
          ) {
            throw new ForbiddenException(`${code} assessment entry period is over`);
          }

          maxScore = this.getEffectiveAssessmentMaxScore(
            assessmentSubject.maxScore,
            component?.percentage,
          );
        }

        if (score !== null && (score < 0 || score > maxScore)) {
          throw new BadRequestException(`${code} max score is ${maxScore}`);
        }

        return {
          code,
          score,
          maxScore,
          componentId: component?.id ?? null,
        };
      }));
  }

  private calculateTotalFromComponentScores(
    componentScores: Array<{ score: number | null | undefined }>,
  ) {
    const hasAny = componentScores.some((item) => item.score !== null && item.score !== undefined);
    if (!hasAny) return null;

    const total = componentScores.reduce((sum, item) => sum + (item.score ?? 0), 0);
    return Math.round(total * 100) / 100;
  }

  private mergeComponentScores(
    existingScores: Array<{
      code: string;
      score: number | null | undefined;
      maxScore: number;
      componentId: string | null;
    }>,
    incomingScores: Array<{
      code: string;
      score: number | null | undefined;
      maxScore: number;
      componentId: string | null;
    }>,
  ) {
    const byCode = new Map<
      string,
      {
        code: string;
        score: number | null | undefined;
        maxScore: number;
        componentId: string | null;
      }
    >();

    for (const item of existingScores) {
      byCode.set(String(item.code).toUpperCase(), {
        ...item,
        code: String(item.code).toUpperCase(),
      });
    }

    for (const item of incomingScores) {
      byCode.set(String(item.code).toUpperCase(), {
        ...item,
        code: String(item.code).toUpperCase(),
      });
    }

    return Array.from(byCode.values());
  }

  private async upsertGradeScores(
    client: Prisma.TransactionClient | PrismaService,
    subjectGradeId: string,
    componentScores: Array<{
      score: number | null | undefined;
      maxScore: number;
      componentId: string | null;
    }>,
  ) {
    const rows = componentScores.filter((item) => item.componentId);

    for (const item of rows) {
      await client.gradeScore.upsert({
        where: {
          subjectGradeId_gradingComponentId: {
            subjectGradeId,
            gradingComponentId: item.componentId as string,
          },
        },
        update: {
          score: item.score ?? null,
          maxScore: item.maxScore,
        },
        create: {
          subjectGradeId,
          gradingComponentId: item.componentId as string,
          score: item.score ?? null,
          maxScore: item.maxScore,
        },
      });
    }
  }

  private buildMergedLegacyScores(
    mergedComponentScores: Array<{ code: string; score: number | null | undefined }>,
    existingGrade?: {
      caScore: number | null;
      midScore: number | null;
      finalScore: number | null;
      gradeScores?: Array<{ component: { code: string } }>;
    } | null,
  ) {
    if (mergedComponentScores.length === 0) {
      return {
        caScore: existingGrade?.caScore ?? null,
        midScore: existingGrade?.midScore ?? null,
        finalScore: existingGrade?.finalScore ?? null,
      };
    }

    const derived = this.buildLegacyScoresFromComponents(mergedComponentScores);
    const componentCodes = new Set(
      mergedComponentScores.map((item) => String(item.code).toUpperCase()),
    );
    const hasContinuousComponents = Array.from(componentCodes).some(
      (code) => code !== 'MID' && code !== 'FINAL',
    );

    return {
      caScore:
        hasContinuousComponents
          ? derived.caScore
          : existingGrade?.caScore ?? derived.caScore,
      midScore:
        componentCodes.has('MID')
          ? derived.midScore
          : existingGrade?.midScore ?? derived.midScore,
      finalScore:
        componentCodes.has('FINAL')
          ? derived.finalScore
          : existingGrade?.finalScore ?? derived.finalScore,
    };
  }

  private calculateTotalFromLegacyScores(scores: {
    caScore: number | null;
    midScore: number | null;
    finalScore: number | null;
  }) {
    const hasAny =
      scores.caScore !== null ||
      scores.midScore !== null ||
      scores.finalScore !== null;

    if (!hasAny) return null;

    return Math.round(
      ((scores.caScore ?? 0) + (scores.midScore ?? 0) + (scores.finalScore ?? 0)) * 100,
    ) / 100;
  }

  private normalizeAssessmentComponentCode(code: string): string {
    const normalized = code.toUpperCase().trim();
    if (normalized === 'MID_EXAM' || normalized === 'MIDTERM') return 'MID';
    if (normalized === 'FINAL_EXAM') return 'FINAL';
    return normalized;
  }

  private getEffectiveGradeTotalScore(grade: {
    caScore?: number | null;
    midScore?: number | null;
    finalScore?: number | null;
    totalScore?: number | null;
  }) {
    const componentSum =
      (grade.caScore ?? 0) + (grade.midScore ?? 0) + (grade.finalScore ?? 0);
    const storedTotal = grade.totalScore ?? null;

    if (storedTotal === null || storedTotal === undefined) {
      return componentSum > 0 ? componentSum : null;
    }

    if (componentSum > 0 && storedTotal < componentSum) {
      return componentSum;
    }

    return storedTotal;
  }

  private async invalidateGradeCaches(input: {
    schoolId: string;
    teacherId?: string | null;
    studentIds?: string[];
  }) {
    await this.cacheService.bumpVersion(
      this.getSchoolGradesNamespace(input.schoolId),
    );
    await this.cacheService.bumpVersion(`dashboard:school:${input.schoolId}`);

    if (input.teacherId) {
      await this.cacheService.bumpVersion(
        this.getTeacherGradesNamespace(input.teacherId),
      );
      await this.cacheService.bumpVersion(`dashboard:user:${input.teacherId}`);
    }

    for (const studentId of input.studentIds || []) {
      await this.cacheService.bumpVersion(
        this.getStudentGradesNamespace(studentId),
      );
      await this.cacheService.bumpVersion(`dashboard:user:${studentId}`);
    }
  }

  /**
   * Calculate total score and grade letter based on CA, Mid, and Final scores
   * Uses dynamic weights from GradingComponent table, falls back to defaults
   */
  async calculateGrade(
    schoolId: string,
    caScore?: number,
    midScore?: number,
    finalScore?: number,
  ): Promise<{
    totalScore: number;
    gradeLetter: string;
    gradePoint: number;
  }> {
    // Fetch grading components from DB for this school
    const components = await this.prisma.gradingComponent.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    // Use DB weights if available, otherwise fall back to defaults
    const weights =
      components.length > 0
        ? components.reduce(
            (acc, comp) => {
              acc[comp.code] = comp.percentage / 100;
              return acc;
            },
            {} as Record<string, number>,
          )
        : { CA: 0.3, MID: 0.2, FINAL: 0.5 };

    const ca = caScore ?? 0;
    const mid = midScore ?? 0;
    const final = finalScore ?? 0;

    // Calculate weighted total using dynamic weights
    const totalScore =
      ca * (weights.CA || 0) +
      mid * (weights.MID || 0) +
      final * (weights.FINAL || 0);

    // Determine grade letter and point
    const { gradeLetter, gradePoint } = await this.getGradeFromScore(
      schoolId,
      totalScore,
    );

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      gradeLetter,
      gradePoint,
    };
  }

  /**
   * Get grade letter and point from total score using school's grade scale
   */
  private async getGradeFromScore(
    schoolId: string,
    score: number,
  ): Promise<{ gradeLetter: string; gradePoint: number }> {
    // Try to fetch custom grade scale from DB
    const gradeScales = await this.prisma.gradeScale.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      orderBy: { minScore: 'desc' },
    });

    // Use custom scale if available
    if (gradeScales.length > 0) {
      const matchingScale = gradeScales.find(
        (scale) => score >= scale.minScore && score <= scale.maxScore,
      );
      if (matchingScale) {
        return {
          gradeLetter: matchingScale.gradeLetter,
          gradePoint: matchingScale.gradePoint,
        };
      }
    }

    // Fall back to default scale
    if (score >= 90) return { gradeLetter: 'A', gradePoint: 4.0 };
    if (score >= 80) return { gradeLetter: 'B', gradePoint: 3.5 };
    if (score >= 70) return { gradeLetter: 'C', gradePoint: 3.0 };
    if (score >= 60) return { gradeLetter: 'D', gradePoint: 2.5 };
    return { gradeLetter: 'F', gradePoint: 0.0 };
  }

  private async assertTermIsOpen(termId: string, bypassLock = false) {
    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      select: { id: true, isLocked: true },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    if (term.isLocked && !bypassLock) {
      throw new ForbiddenException('This term is locked for grading');
    }
  }

  private async assertStudentInClassSection(
    studentId: string,
    schoolId: string,
    classId: string,
    sectionId: string,
    academicYear: string,
  ) {
    const enrollment = await this.prisma.studentClass.findFirst({
      where: {
        schoolId,
        studentId,
        classId,
        sectionId,
        academicYear,
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new BadRequestException(
        'Student is not enrolled in the selected class/section for this academic year',
      );
    }
  }

  private async getProfileRosterWhere(
    client: Prisma.TransactionClient | PrismaService,
    input: {
      studentId?: string;
      schoolId: string;
      classId: string;
      sectionId: string;
      academicYear: string;
    },
  ) {
    const [classData, sectionData, academicYearData] = await Promise.all([
      client.class.findFirst({
        where: {
          id: input.classId,
          schoolId: input.schoolId,
        },
        select: { name: true },
      }),
      client.section.findFirst({
        where: {
          id: input.sectionId,
          classId: input.classId,
        },
        select: { name: true },
      }),
      client.academicYear.findFirst({
        where: {
          id: input.academicYear,
          schoolId: input.schoolId,
        },
        select: { id: true, name: true, ethiopianYear: true },
      }),
    ]);

    if (!classData || !sectionData) return null;

    const className = classData.name || '';
    const sectionName = sectionData.name || '';
    const possibleClassNames = [
      className,
      className.replace('Grade ', ''),
      `Grade ${className.replace('Grade ', '')}`,
    ].filter((value, index, values) => value && values.indexOf(value) === index);
    const possibleSections = [
      sectionName,
      sectionName.toUpperCase(),
      sectionName.toLowerCase(),
    ].filter((value, index, values) => value && values.indexOf(value) === index);
    const possibleAcademicYears = [
      academicYearData?.id,
      academicYearData?.name,
      academicYearData?.ethiopianYear?.toString(),
    ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

    return {
      schoolId: input.schoolId,
      deletedAt: null,
      ...(input.studentId ? { userId: input.studentId } : {}),
      ...(possibleAcademicYears.length > 0
        ? { academicYear: { in: possibleAcademicYears } }
        : {}),
      OR: possibleClassNames.flatMap((classNameCandidate) =>
        possibleSections.length > 0
          ? possibleSections.map((sectionCandidate) => ({
              className: classNameCandidate,
              section: sectionCandidate,
            }))
          : [{ className: classNameCandidate }],
      ),
    };
  }

  private async assertStudentInGradeEntryRoster(
    client: Prisma.TransactionClient | PrismaService,
    input: {
      studentId: string;
      schoolId: string;
      classId: string;
      sectionId: string;
      academicYear: string;
    },
  ) {
    const enrollment = await client.studentClass.findFirst({
      where: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        classId: input.classId,
        sectionId: input.sectionId,
        academicYear: input.academicYear,
      },
      select: { id: true },
    });

    if (enrollment) return;

    const profileWhere = await this.getProfileRosterWhere(client, input);
    if (profileWhere) {
      const profile = await client.studentProfile.findFirst({
        where: profileWhere,
        select: { id: true },
      });

      if (profile) return;
    }

    throw new BadRequestException(
      'Student is not enrolled in the selected class/section for this academic year',
    );
  }

  private assertReviewStatus(status: GradeStatus) {
    if (status !== GradeStatus.APPROVED && status !== GradeStatus.REJECTED) {
      throw new BadRequestException(
        'Registrar review status must be APPROVED or REJECTED',
      );
    }
  }

  private async resolveTeacherGradingAccess(
    teacherId: string,
    schoolId: string,
    academicYear: string,
    classId: string,
    sectionId: string,
    subjectId: string,
  ): Promise<{ schoolId: string }> {
    const explicitAssignment =
      await this.prisma.teacherSubjectAssignment.findFirst({
        where: {
          teacherId,
          schoolId,
          academicYear,
          classId,
          sectionId,
          subjectId,
          isActive: true,
        },
        select: {
          schoolId: true,
        },
      });

    if (explicitAssignment) {
      return { schoolId };
    }

    const classSubjectAssignment = await this.prisma.classSubject.findFirst({
      where: {
        teacherId,
        academicYear,
        classId,
        sectionId,
        subjectId,
        class: { schoolId },
      },
      select: {
        class: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (classSubjectAssignment?.class?.schoolId) {
      return { schoolId };
    }

    const homeroomClass = await this.prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
        homeroomTeacherId: teacherId,
        academicYearId: academicYear,
      },
      select: {
        schoolId: true,
      },
    });

    if (homeroomClass?.schoolId) {
      return { schoolId };
    }

    const homeroomSection = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        classId,
        homeroomTeacherId: teacherId,
        class: {
          schoolId,
          academicYearId: academicYear,
        },
      },
      select: {
        class: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (homeroomSection?.class?.schoolId) {
      return { schoolId };
    }

    throw new ForbiddenException(
      'You are not assigned to this subject/class/section',
    );
  }

  private ensureConsistentBulkPayload(grades: CreateGradeDto[]) {
    const [first] = grades;
    if (!first) return;

    const inconsistent = grades.find(
      (grade) =>
        grade.academicYear !== first.academicYear ||
        grade.termId !== first.termId ||
        grade.classId !== first.classId ||
        grade.sectionId !== first.sectionId ||
        grade.subjectId !== first.subjectId,
    );

    if (inconsistent) {
      throw new BadRequestException(
        'All rows in bulk grading must target the same academic year, term, class, section, and subject',
      );
    }
  }

  private async syncGradeLockStatus(
    studentId: string,
    schoolId: string,
    academicYearId: string,
  ): Promise<boolean> {
    const { isCleared } = await this.verifyFinancialClearance(
      studentId,
      schoolId,
      academicYearId,
      undefined,
      true,
    );

    await this.prisma.subjectGrade.updateMany({
      where: {
        studentId,
        academicYear: academicYearId,
      },
      data: {
        isLocked: !isCleared,
      },
    });

    return isCleared;
  }

  private maskLockedGradeForPortal<
    T extends {
      isLocked: boolean;
      caScore: number | null;
      midScore: number | null;
      finalScore: number | null;
      totalScore: number | null;
      gradeLetter: string | null;
      gradePoint?: number | null;
      remark?: string | null;
    },
  >(grade: T): T & { financeLockMessage?: string | null } {
    if (!grade.isLocked) {
      return grade;
    }

    return {
      ...grade,
      caScore: null,
      midScore: null,
      finalScore: null,
      totalScore: null,
      gradeLetter: null,
      gradePoint: null,
      remark: null,
      financeLockMessage:
        'Grade is locked due to outstanding balance. Please contact finance.',
    };
  }

  private async resolveChildStudentForParent(
    parentUserId: string,
    schoolId: string,
    childIdOrUserId: string,
  ): Promise<{ studentUserId: string; studentProfileId: string }> {
    const parentProfile = await this.prisma.parentProfile.findFirst({
      where: { userId: parentUserId, schoolId },
      select: { id: true },
    });

    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        OR: [{ id: childIdOrUserId }, { userId: childIdOrUserId }],
      },
      select: { id: true, userId: true },
    });

    if (!studentProfile) {
      throw new NotFoundException('Student not found');
    }

    const parentStudent = await this.prisma.parentStudent.findFirst({
      where: {
        parentId: parentProfile.id,
        studentId: studentProfile.id,
      },
      select: { id: true },
    });

    if (!parentStudent) {
      throw new ForbiddenException('You are not linked to this student');
    }

    return {
      studentUserId: studentProfile.userId,
      studentProfileId: studentProfile.id,
    };
  }

  /**
   * Teacher: Get students for grade entry
   */
  async getStudentsForGradeEntry(
    teacherId: string,
    schoolId: string,
    academicYear: string,
    termId: string,
    classId: string,
    sectionId: string,
    subjectId: string,
  ) {
    await this.assertTermIsOpen(termId, true);
    const access = await this.resolveTeacherGradingAccess(
      teacherId,
      schoolId,
      academicYear,
      classId,
      sectionId,
      subjectId,
    );

    return this.cacheService.getOrSetVersioned(
      this.getTeacherGradesNamespace(teacherId),
      JSON.stringify({
        mode: 'grade-entry',
        academicYear,
        termId,
        classId,
        sectionId,
        subjectId,
      }),
      120,
      async () => {
        const gradingComponentMap = await this.getSchoolGradingComponentsMap(
          access.schoolId,
        );
        const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
          where: {
            classId,
            sectionId,
            subjectId,
            assessment: {
              schoolId: access.schoolId,
              academicYearId: academicYear,
              termId,
            },
          },
          include: {
            assessment: {
              select: {
                type: true,
                startDate: true,
                endDate: true,
                status: true,
              },
            },
          },
          orderBy: [{ assessment: { startDate: 'asc' } }],
        });

        const componentAvailability = Array.from(
          assessmentSubjects.reduce((map, item) => {
            const code = String(item.assessment.type).toUpperCase();
            const now = new Date();
            const started = item.assessment.startDate <= now;
            const ended = item.assessment.endDate < now;
            const existing = map.get(code);
            const isOpen =
              started &&
              !ended &&
              item.assessment.status === AssessmentStatus.ACTIVE;
            const existingOpen =
              Boolean(existing) &&
              existing!.started &&
              !existing!.ended &&
              existing!.status === AssessmentStatus.ACTIVE;
            const existingStart = existing
              ? new Date(existing.startDate)
              : null;
            const useThisAssessment =
              !existing ||
              (!existingOpen && isOpen) ||
              (existing.ended && !ended) ||
              (!existing.started && started) ||
              (
                existing.started === started &&
                existing.ended === ended &&
                existingStart !== null &&
                item.assessment.startDate > existingStart
              );

            if (useThisAssessment) {
              const component = gradingComponentMap.get(code);
              map.set(code, {
                code,
                assessmentSubjectId: item.id,
                startDate: item.assessment.startDate.toISOString(),
                endDate: item.assessment.endDate.toISOString(),
                status: item.assessment.status,
                started,
                ended,
                maxScore: this.getEffectiveAssessmentMaxScore(
                  item.maxScore,
                  component?.percentage,
                ),
              });
            }

            return map;
          }, new Map<string, {
            code: string;
            assessmentSubjectId: string;
            startDate: string;
            endDate: string;
            status: string;
            started: boolean;
            ended: boolean;
            maxScore: number;
          }>()),
        ).map(([_, value]) => value);

        const studentClasses = await this.prisma.studentClass.findMany({
          where: {
            schoolId: access.schoolId,
            academicYear,
            classId,
            sectionId,
          },
          include: {
            student: {
              include: {
                studentProfile: true,
              },
            },
          },
        });

        const existingGrades = await this.prisma.subjectGrade.findMany({
          where: {
            academicYear,
            termId,
            subjectId,
            classId,
            sectionId,
            teacherId,
          },
          include: {
            gradeScores: {
              include: {
                component: true,
              },
            },
          },
        });

        // If no studentClasses, fallback to StudentProfile matching
        if (studentClasses.length === 0) {
          const profileWhere = await this.getProfileRosterWhere(this.prisma, {
            schoolId: access.schoolId,
            classId,
            sectionId,
            academicYear,
          });
          if (profileWhere) {
            const profileStudents = await this.prisma.studentProfile.findMany({
              where: profileWhere,
              include: { user: { select: { id: true, name: true } } },
              orderBy: { rollNumber: 'asc' },
            });

            const students = profileStudents.map((sp) => {
              const grade = existingGrades.find((g) => g.studentId === sp.userId);
              return {
                studentId: sp.userId,
                studentName: sp.user.name,
                rollNumber: sp.rollNumber,
                caScore: grade?.caScore ?? null,
                midScore: grade?.midScore ?? null,
                finalScore: grade?.finalScore ?? null,
                totalScore: grade?.totalScore ?? null,
                gradeLetter: grade?.gradeLetter ?? null,
                remark: grade?.remark ?? null,
                status: grade?.status ?? null,
                registrarComment: grade?.registrarComment ?? null,
                isLocked: grade?.isLocked ?? false,
                gradeId: grade?.id ?? null,
                componentScores:
                  grade?.gradeScores?.map((item) => ({
                    code: item.component.code,
                    score: item.score,
                    maxScore: item.maxScore,
                  })) ?? [],
              };
            });
            return { students, componentAvailability };
          }
          return { students: [], componentAvailability };
        }

        const students = studentClasses.map((sc) => {
          const grade = existingGrades.find((g) => g.studentId === sc.studentId);
          return {
            studentId: sc.studentId,
            studentName: sc.student.name,
            rollNumber: sc.student.studentProfile?.rollNumber,
            caScore: grade?.caScore ?? null,
            midScore: grade?.midScore ?? null,
            finalScore: grade?.finalScore ?? null,
            totalScore: grade?.totalScore ?? null,
            gradeLetter: grade?.gradeLetter ?? null,
            remark: grade?.remark ?? null,
            status: grade?.status ?? null,
            registrarComment: grade?.registrarComment ?? null,
            isLocked: grade?.isLocked ?? false,
            gradeId: grade?.id ?? null,
            componentScores:
              grade?.gradeScores?.map((item) => ({
                code: item.component.code,
                score: item.score,
                maxScore: item.maxScore,
              })) ?? [],
          };
        });
        return { students, componentAvailability };
      },
    );
  }

  // ==================== AUDIT LOGGING ====================

  /**
   * Log a grade change to the audit trail
   */
  private async logGradeChange(
    tx: any,
    gradeId: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
    changedById: string,
    reason?: string,
  ) {
    await tx.gradeChangeLog.create({
      data: {
        gradeId,
        fieldName,
        oldValue: oldValue !== undefined ? String(oldValue) : null,
        newValue: newValue !== undefined ? String(newValue) : null,
        changedById,
        reason,
      },
    });
  }

  // ==================== FINANCIAL CLEARANCE ====================

  /**
   * Verify student has no outstanding fees before releasing grades
   * Grade Lock Mechanic: Blocks grade release if fees are unpaid after due date
   */
  async verifyFinancialClearance(
    studentId: string,
    schoolId: string,
    academicYearId: string,
    termId?: string,
    checkOverdueOnly: boolean = true,
  ): Promise<{ isCleared: boolean; outstandingFees: any[] }> {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        OR: [{ id: studentId }, { userId: studentId }],
      },
      select: { id: true, userId: true },
    });

    if (!studentProfile) {
      throw new NotFoundException('Student not found');
    }

    const whereClause: any = {
      studentId: {
        in: [studentProfile.id, studentProfile.userId].filter(Boolean) as string[],
      },
      schoolId,
      academicYearId,
      status: { not: 'PAID' },
    };

    // Only lock if due date has passed (overdue fees)
    if (checkOverdueOnly) {
      whereClause.dueDate = { lt: new Date() };
    }

    const outstandingFees = await this.prisma.studentFee.findMany({
      where: whereClause,
      include: {
        payments: true,
      },
    });

    if (termId) {
      const academicYear = await this.prisma.academicYear.findUnique({
        where: { id: academicYearId, schoolId },
        select: {
          schoolId: true,
        },
      });

      const terms = await this.prisma.term.findMany({
        where: { academicYearId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });

      const schoolSettings = academicYear?.schoolId
        ? await this.prisma.schoolSetting.findFirst({
            where: {
              schoolId: academicYear.schoolId,
              key: 'curriculum_type',
            },
            select: { value: true },
          })
        : null;

      const curriculumTypeMap: Record<string, number> = {
        QUARTER: 4,
        QUARTERLY: 4,
        SEMESTER: 2,
        TERM: 3,
        MONTH: 12,
        MONTHLY: 12,
        YEAR: 1,
        YEARLY: 1,
      };

      const configuredPeriodCount =
        curriculumTypeMap[String(schoolSettings?.value || '').toUpperCase()] || 0;
      const periodCount = terms.length || configuredPeriodCount || 1;

      const termBoundOutstanding = outstandingFees.filter(
        (fee) => fee.termId && fee.termId === termId,
      );
      const annualOutstanding = outstandingFees.filter((fee) => !fee.termId);

      const annualBlockingFees = annualOutstanding.filter((fee) => {
        const paidAmount =
          fee.payments
            ?.filter((payment) => payment.termId === termId)
            .reduce((sum, payment) => sum + payment.amountPaid, 0) || 0;
        const requiredPerPeriod =
          periodCount > 0 ? Number(fee.finalAmount || 0) / periodCount : Number(fee.finalAmount || 0);
        return paidAmount + 0.0001 < requiredPerPeriod;
      });

      const filteredOutstandingFees = [
        ...termBoundOutstanding,
        ...annualBlockingFees,
      ];

      return {
        isCleared: filteredOutstandingFees.length === 0,
        outstandingFees: filteredOutstandingFees,
      };
    }

    return {
      isCleared: outstandingFees.length === 0,
      outstandingFees,
    };
  }

  /**
   * Check and lock/unlock grades based on payment status
   * Called when a payment is recorded
   */
  async updateGradeLockStatus(
    studentId: string,
    schoolId: string,
    academicYearId: string,
  ): Promise<void> {
    const { isCleared } = await this.verifyFinancialClearance(
      studentId,
      schoolId,
      academicYearId,
      undefined,
      false, // Check all unpaid, not just overdue
    );

    await this.prisma.subjectGrade.updateMany({
      where: {
        studentId,
        schoolId,
        academicYear: academicYearId,
      },
      data: {
        isLocked: !isCleared,
      },
    });
  }

  /**
   * Teacher: Enter or update grades for a student
   */
  async enterGrade(teacherId: string, schoolId: string, dto: CreateGradeDto) {
    await this.assertTermIsOpen(dto.termId, true);
    const access = await this.resolveTeacherGradingAccess(
      teacherId,
      schoolId,
      dto.academicYear,
      dto.classId,
      dto.sectionId,
      dto.subjectId,
    );

    await this.assertStudentInGradeEntryRoster(this.prisma, {
      studentId: dto.studentId,
      schoolId: access.schoolId,
      classId: dto.classId,
      sectionId: dto.sectionId,
      academicYear: dto.academicYear,
    });

    const normalizedComponentScores = await this.normalizeComponentPayload(
      access.schoolId,
      dto.componentScores,
      {
        teacherId,
        academicYear: dto.academicYear,
        termId: dto.termId,
        classId: dto.classId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
      },
    );

    const derivedLegacyScores =
      normalizedComponentScores.length > 0
        ? this.buildLegacyScoresFromComponents(normalizedComponentScores)
        : {
            caScore: dto.caScore ?? null,
            midScore: dto.midScore ?? null,
            finalScore: dto.finalScore ?? null,
          };

    const componentTotal =
      normalizedComponentScores.length > 0
        ? this.calculateTotalFromComponentScores(normalizedComponentScores)
        : null;
    const hasLegacyValue =
      derivedLegacyScores.caScore !== null ||
      derivedLegacyScores.midScore !== null ||
      derivedLegacyScores.finalScore !== null;

    const totalScore =
      componentTotal ??
      (hasLegacyValue
        ? (derivedLegacyScores.caScore ?? 0) +
          (derivedLegacyScores.midScore ?? 0) +
          (derivedLegacyScores.finalScore ?? 0)
        : null);

    const { gradeLetter, gradePoint } =
      totalScore === null
        ? { gradeLetter: null, gradePoint: null }
        : await this.getGradeFromScore(access.schoolId, totalScore);

    // Check if grade already exists
    const existingGrade = await this.prisma.subjectGrade.findUnique({
      where: {
        studentId_subjectId_academicYear_termId: {
          studentId: dto.studentId,
          subjectId: dto.subjectId,
          academicYear: dto.academicYear,
          termId: dto.termId,
        },
      },
      include: {
        gradeScores: {
          include: {
            component: true,
          },
        },
      },
    });

    if (existingGrade) {
      if (existingGrade.isLocked) {
        throw new ForbiddenException(
          'This grade is locked and cannot be edited',
        );
      }

      if (existingGrade.status === GradeStatus.APPROVED) {
        throw new ForbiddenException(
          'Cannot edit grades that are already approved',
        );
      }

      const existingComponentScores =
        existingGrade.gradeScores?.map((item) => ({
          code: item.component.code,
          score: item.score,
          maxScore: item.maxScore,
          componentId: item.gradingComponentId,
        })) ?? [];
      const mergedComponentScores =
        normalizedComponentScores.length > 0
          ? this.mergeComponentScores(existingComponentScores, normalizedComponentScores)
          : normalizedComponentScores;
      const updateLegacyScores =
        normalizedComponentScores.length > 0
          ? this.buildMergedLegacyScores(mergedComponentScores, existingGrade)
          : derivedLegacyScores;
      const updateTotalScore =
        normalizedComponentScores.length > 0
          ? this.calculateTotalFromLegacyScores(updateLegacyScores)
          : totalScore;
      const {
        gradeLetter: updateGradeLetter,
        gradePoint: updateGradePoint,
      } =
        updateTotalScore === null
          ? { gradeLetter: null, gradePoint: null }
          : await this.getGradeFromScore(access.schoolId, updateTotalScore);

      // Update existing grade with audit logging
      const updated = await this.prisma.$transaction(async (tx) => {
        // Log changes for each field
        if (existingGrade.caScore !== updateLegacyScores.caScore) {
          await this.logGradeChange(
            tx,
            existingGrade.id,
            'caScore',
            existingGrade.caScore,
            updateLegacyScores.caScore,
            teacherId,
          );
        }
        if (existingGrade.midScore !== updateLegacyScores.midScore) {
          await this.logGradeChange(
            tx,
            existingGrade.id,
            'midScore',
            existingGrade.midScore,
            updateLegacyScores.midScore,
            teacherId,
          );
        }
        if (existingGrade.finalScore !== updateLegacyScores.finalScore) {
          await this.logGradeChange(
            tx,
            existingGrade.id,
            'finalScore',
            existingGrade.finalScore,
            updateLegacyScores.finalScore,
            teacherId,
          );
        }
        if (existingGrade.totalScore !== updateTotalScore) {
          await this.logGradeChange(
            tx,
            existingGrade.id,
            'totalScore',
            existingGrade.totalScore,
            updateTotalScore,
            teacherId,
          );
        }
        if (existingGrade.gradeLetter !== updateGradeLetter) {
          await this.logGradeChange(
            tx,
            existingGrade.id,
            'gradeLetter',
            existingGrade.gradeLetter,
            updateGradeLetter,
            teacherId,
          );
        }

        const updated = await tx.subjectGrade.update({
          where: { id: existingGrade.id },
          data: {
            caScore: updateLegacyScores.caScore,
            midScore: updateLegacyScores.midScore,
            finalScore: updateLegacyScores.finalScore,
            totalScore: updateTotalScore,
            gradeLetter: updateGradeLetter,
            gradePoint: updateGradePoint,
            remark: dto.remark,
            teacherId,
            status: GradeStatus.DRAFT,
            submittedById: null,
            approvedById: null,
            registrarComment: null,
          },
          include: {
            student: true,
            subject: true,
          },
        });

        if (normalizedComponentScores.length > 0) {
          await this.upsertGradeScores(tx, updated.id, mergedComponentScores);
        }

        return updated;
      });

      await this.invalidateGradeCaches({
        schoolId: access.schoolId,
        teacherId,
        studentIds: [dto.studentId],
      });
      return updated;
    }

    // Create new grade
    const grade = await this.prisma.subjectGrade.create({
      data: {
        schoolId: access.schoolId,
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        classId: dto.classId,
        sectionId: dto.sectionId,
        academicYear: dto.academicYear,
        termId: dto.termId,
        caScore: derivedLegacyScores.caScore,
        midScore: derivedLegacyScores.midScore,
        finalScore: derivedLegacyScores.finalScore,
        totalScore,
        gradeLetter,
        gradePoint,
        remark: dto.remark,
        teacherId,
        status: GradeStatus.DRAFT,
      },
      include: {
        student: true,
        subject: true,
      },
    });

    if (normalizedComponentScores.length > 0) {
      if (normalizedComponentScores.some((item) => item.componentId)) {
        await this.prisma.gradeScore.createMany({
          data: normalizedComponentScores
            .filter((item) => item.componentId)
            .map((item) => ({
              subjectGradeId: grade.id,
              gradingComponentId: item.componentId as string,
              score: item.score ?? null,
              maxScore: item.maxScore,
            })),
        });
      }
    }

    await this.invalidateGradeCaches({
      schoolId: access.schoolId,
      teacherId,
      studentIds: [dto.studentId],
    });
    return grade;
  }

  /**
   * Teacher: Bulk entry for multiple students with atomic transaction
   * Uses $transaction to ensure all-or-nothing semantics
   */
  async bulkEnterGrades(
    teacherId: string,
    schoolId: string,
    dto: BulkGradeEntryDto,
  ) {
    // First, verify teacher is assigned (outside transaction)
    const firstGrade = dto.grades[0];
    if (!firstGrade) {
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    this.ensureConsistentBulkPayload(dto.grades);
    await this.assertTermIsOpen(firstGrade.termId, true);

    const access = await this.resolveTeacherGradingAccess(
      teacherId,
      schoolId,
      firstGrade.academicYear,
      firstGrade.classId,
      firstGrade.sectionId,
      firstGrade.subjectId,
    );

    // Use transaction for atomic bulk operation
    const results = await this.prisma.$transaction(async (tx) => {
      const gradeResults: {
        success: boolean;
        studentId?: string;
        data?: any;
        error?: string;
      }[] = [];

      for (const gradeDto of dto.grades) {
        await this.assertStudentInGradeEntryRoster(tx, {
          studentId: gradeDto.studentId,
          schoolId: access.schoolId,
          classId: gradeDto.classId,
          sectionId: gradeDto.sectionId,
          academicYear: gradeDto.academicYear,
        });

        const normalizedComponentScores = await this.normalizeComponentPayload(
          access.schoolId,
          gradeDto.componentScores,
          {
            teacherId,
            academicYear: gradeDto.academicYear,
            termId: gradeDto.termId,
            classId: gradeDto.classId,
            sectionId: gradeDto.sectionId,
            subjectId: gradeDto.subjectId,
          },
        );
        const derivedLegacyScores =
          normalizedComponentScores.length > 0
            ? this.buildLegacyScoresFromComponents(normalizedComponentScores)
            : {
                caScore: gradeDto.caScore ?? null,
                midScore: gradeDto.midScore ?? null,
                finalScore: gradeDto.finalScore ?? null,
              };
        const hasLegacyValue =
          derivedLegacyScores.caScore !== null ||
          derivedLegacyScores.midScore !== null ||
          derivedLegacyScores.finalScore !== null;
        const componentTotal =
          normalizedComponentScores.length > 0
            ? this.calculateTotalFromComponentScores(normalizedComponentScores)
            : null;
        const totalScore = componentTotal ?? (hasLegacyValue
          ? (derivedLegacyScores.caScore ?? 0) +
            (derivedLegacyScores.midScore ?? 0) +
            (derivedLegacyScores.finalScore ?? 0)
          : null);
        const { gradeLetter, gradePoint } =
          totalScore === null
            ? { gradeLetter: null, gradePoint: null }
            : await this.getGradeFromScore(access.schoolId, totalScore);

        // Check if grade exists
        const existingGrade = await tx.subjectGrade.findUnique({
          where: {
            studentId_subjectId_academicYear_termId: {
              studentId: gradeDto.studentId,
              subjectId: gradeDto.subjectId,
              academicYear: gradeDto.academicYear,
              termId: gradeDto.termId,
            },
          },
          include: {
            gradeScores: {
              include: {
                component: true,
              },
            },
          },
        });

        if (existingGrade) {
          if (existingGrade.isLocked) {
            throw new ForbiddenException(
              `Cannot edit grade for student ${gradeDto.studentId} - grade is locked`,
            );
          }

          if (existingGrade.status === GradeStatus.APPROVED) {
            throw new ForbiddenException(
              `Cannot save draft for student ${gradeDto.studentId} - grade is already approved`,
            );
          }

          const existingComponentScores =
            existingGrade.gradeScores?.map((item) => ({
              code: item.component.code,
              score: item.score,
              maxScore: item.maxScore,
              componentId: item.gradingComponentId,
            })) ?? [];
          const mergedComponentScores =
            normalizedComponentScores.length > 0
              ? this.mergeComponentScores(existingComponentScores, normalizedComponentScores)
              : normalizedComponentScores;
          const updateLegacyScores =
            normalizedComponentScores.length > 0
              ? this.buildMergedLegacyScores(mergedComponentScores, existingGrade)
              : derivedLegacyScores;
          const updateTotalScore =
            normalizedComponentScores.length > 0
              ? this.calculateTotalFromLegacyScores(updateLegacyScores)
              : totalScore;
          const {
            gradeLetter: updateGradeLetter,
            gradePoint: updateGradePoint,
          } =
            updateTotalScore === null
              ? { gradeLetter: null, gradePoint: null }
              : await this.getGradeFromScore(access.schoolId, updateTotalScore);

          const updated = await tx.subjectGrade.update({
            where: { id: existingGrade.id },
            data: {
              caScore: updateLegacyScores.caScore,
              midScore: updateLegacyScores.midScore,
              finalScore: updateLegacyScores.finalScore,
              totalScore: updateTotalScore,
              gradeLetter: updateGradeLetter,
              gradePoint: updateGradePoint,
              remark: gradeDto.remark,
              teacherId,
              status: GradeStatus.DRAFT,
              submittedById: null,
              approvedById: null,
              registrarComment: null,
            },
          });
          if (normalizedComponentScores.length > 0) {
            await this.upsertGradeScores(tx, existingGrade.id, mergedComponentScores);
          }
          gradeResults.push({
            success: true,
            studentId: gradeDto.studentId,
            data: updated,
          });
        } else {
          const grade = await tx.subjectGrade.create({
            data: {
              schoolId: access.schoolId,
              studentId: gradeDto.studentId,
              subjectId: gradeDto.subjectId,
              classId: gradeDto.classId,
              sectionId: gradeDto.sectionId,
              academicYear: gradeDto.academicYear,
              termId: gradeDto.termId,
              caScore: derivedLegacyScores.caScore,
              midScore: derivedLegacyScores.midScore,
              finalScore: derivedLegacyScores.finalScore,
              totalScore,
              gradeLetter,
              gradePoint,
              remark: gradeDto.remark,
              teacherId,
              status: GradeStatus.DRAFT,
            },
          });
          if (
            normalizedComponentScores.length > 0 &&
            normalizedComponentScores.some((item) => item.componentId)
          ) {
            await tx.gradeScore.createMany({
              data: normalizedComponentScores
                .filter((item) => item.componentId)
                .map((item) => ({
                  subjectGradeId: grade.id,
                  gradingComponentId: item.componentId as string,
                  score: item.score ?? null,
                  maxScore: item.maxScore,
                })),
            });
          }
          gradeResults.push({
            success: true,
            studentId: gradeDto.studentId,
            data: grade,
          });
        }
      }

      return gradeResults;
    });

    await this.invalidateGradeCaches({
      schoolId: access.schoolId,
      teacherId,
      studentIds: dto.grades.map((grade) => grade.studentId),
    });

    return {
      total: dto.grades.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Teacher: Save as draft
   */
  async saveDraft(teacherId: string, schoolId: string, gradeId: string) {
    const grade = await this.prisma.subjectGrade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (grade.schoolId !== schoolId) {
      throw new ForbiddenException('You can only edit grades in your school');
    }

    if (grade.teacherId !== teacherId) {
      throw new ForbiddenException('You can only edit your own grades');
    }

    if (
      grade.status !== GradeStatus.DRAFT &&
      grade.status !== GradeStatus.REJECTED
    ) {
      throw new ForbiddenException(
        'Can only save draft for DRAFT or REJECTED grades',
      );
    }

    if (grade.isLocked) {
      throw new ForbiddenException(
        'This grade is locked and cannot be modified',
      );
    }

    const updated = await this.prisma.subjectGrade.update({
      where: { id: gradeId },
      data: { status: GradeStatus.DRAFT },
    });
    await this.invalidateGradeCaches({
      schoolId: grade.schoolId,
      teacherId,
      studentIds: [grade.studentId],
    });
    return updated;
  }

  /**
   * Teacher: Submit grades to registrar
   */
  async submitToRegistrar(
    teacherId: string,
    schoolId: string,
    gradeId: string,
  ) {
    const grade = await this.prisma.subjectGrade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (grade.schoolId !== schoolId) {
      throw new ForbiddenException('You can only submit grades in your school');
    }

    if (grade.teacherId !== teacherId) {
      throw new ForbiddenException('You can only submit your own grades');
    }

    if (
      grade.status !== GradeStatus.DRAFT &&
      grade.status !== GradeStatus.REJECTED
    ) {
      throw new ForbiddenException('Can only submit DRAFT or REJECTED grades');
    }

    await this.assertTermIsOpen(grade.termId, true);

    if (grade.isLocked) {
      throw new ForbiddenException(
        'This grade is locked and cannot be submitted',
      );
    }

    const updated = await this.prisma.subjectGrade.update({
      where: { id: gradeId },
      data: { status: GradeStatus.SUBMITTED, submittedById: teacherId },
    });
    await this.invalidateGradeCaches({
      schoolId: grade.schoolId,
      teacherId,
      studentIds: [grade.studentId],
    });
    return updated;
  }

  /**
   * Teacher: Submit all grades for a subject/class/term
   */
  async submitAllToRegistrar(
    teacherId: string,
    schoolId: string,
    academicYear: string,
    termId: string,
    classId: string,
    sectionId: string,
    subjectId: string,
  ) {
    await this.assertTermIsOpen(termId, true);
    await this.resolveTeacherGradingAccess(
      teacherId,
      schoolId,
      academicYear,
      classId,
      sectionId,
      subjectId,
    );

    // Get all DRAFT/REJECTED grades for this subject
    const grades = await this.prisma.subjectGrade.findMany({
      where: {
        academicYear,
        schoolId,
        termId,
        classId,
        sectionId,
        subjectId,
        teacherId,
        status: { in: [GradeStatus.DRAFT, GradeStatus.REJECTED] },
      },
    });

    if (grades.length === 0) {
      throw new BadRequestException('No grades to submit');
    }

    // Submit all grades
    const result = await this.prisma.subjectGrade.updateMany({
      where: {
        id: { in: grades.map((g) => g.id) },
      },
      data: { status: GradeStatus.SUBMITTED, submittedById: teacherId },
    });
    await this.invalidateGradeCaches({
      schoolId: grades[0].schoolId,
      teacherId,
      studentIds: grades.map((grade) => grade.studentId),
    });
    return result;
  }

  /**
   * Registrar: Get all submitted grades for review
   */
  async getGradesForReview(schoolId: string, filter: GradeFilterDto) {
    const where: any = {
      schoolId,
      status: filter.status || GradeStatus.SUBMITTED,
    };

    if (filter.academicYear) where.academicYear = filter.academicYear;
    if (filter.termId) where.termId = filter.termId;
    if (filter.classId) where.classId = filter.classId;
    if (filter.sectionId) where.sectionId = filter.sectionId;
    if (filter.subjectId) where.subjectId = filter.subjectId;
    if (filter.teacherId) where.teacherId = filter.teacherId;

    return this.cacheService.getOrSetVersioned(
      this.getSchoolGradesNamespace(schoolId),
      JSON.stringify({ mode: 'review', filter }),
      120,
      async () =>
        this.prisma.subjectGrade.findMany({
          where,
          include: {
            student: true,
            subject: true,
            class: true,
            section: true,
            term: true,
            teacher: true,
          },
          orderBy: [
            { class: { name: 'asc' } },
            { section: { name: 'asc' } },
            { subject: { name: 'asc' } },
            { student: { name: 'asc' } },
          ],
        }),
    );
  }

  /**
   * Registrar: Approve or reject grades
   */
  async reviewGrade(
    registrarId: string,
    schoolId: string,
    gradeId: string,
    dto: ApproveGradeDto,
  ) {
    this.assertReviewStatus(dto.status);

    if (dto.status === GradeStatus.REJECTED && !dto.registrarComment?.trim()) {
      throw new BadRequestException(
        'Registrar comment is required when rejecting a grade',
      );
    }

    const grade = await this.prisma.subjectGrade.findUnique({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (grade.schoolId !== schoolId) {
      throw new ForbiddenException(
        'You are not allowed to review grades from another school',
      );
    }

    if (grade.status !== GradeStatus.SUBMITTED) {
      throw new ForbiddenException('Can only review SUBMITTED grades');
    }

    const updated = await this.prisma.subjectGrade.update({
      where: { id: gradeId },
      data: {
        status: dto.status,
        registrarComment: dto.registrarComment?.trim() || null,
        approvedById: registrarId,
      },
      include: {
        student: true,
        subject: true,
        teacher: true,
      },
    });
    await this.invalidateGradeCaches({
      schoolId,
      teacherId: grade.teacherId,
      studentIds: [grade.studentId],
    });
    return updated;
  }

  /**
   * Registrar: Bulk approve grades
   */
  async bulkApproveGrades(
    registrarId: string,
    schoolId: string,
    gradeIds: string[],
  ) {
    if (gradeIds.length === 0) {
      throw new BadRequestException('At least one grade ID is required');
    }

    const result = await this.prisma.subjectGrade.updateMany({
      where: {
        id: { in: gradeIds },
        schoolId,
        status: GradeStatus.SUBMITTED,
      },
      data: {
        status: GradeStatus.APPROVED,
        approvedById: registrarId,
      },
    });
    const grades = await this.prisma.subjectGrade.findMany({
      where: { id: { in: gradeIds }, schoolId },
      select: { studentId: true, teacherId: true },
    });
    await this.invalidateGradeCaches({
      schoolId,
      teacherId: grades[0]?.teacherId,
      studentIds: grades.map((grade) => grade.studentId),
    });
    return result;
  }

  /**
   * Registrar: Bulk reject grades
   */
  async bulkRejectGrades(
    registrarId: string,
    schoolId: string,
    gradeIds: string[],
    comment: string,
  ) {
    if (gradeIds.length === 0) {
      throw new BadRequestException('At least one grade ID is required');
    }

    if (!comment?.trim()) {
      throw new BadRequestException(
        'Comment is required when rejecting grades',
      );
    }

    const result = await this.prisma.subjectGrade.updateMany({
      where: {
        id: { in: gradeIds },
        schoolId,
        status: GradeStatus.SUBMITTED,
      },
      data: {
        status: GradeStatus.REJECTED,
        registrarComment: comment.trim(),
        approvedById: registrarId,
      },
    });
    const grades = await this.prisma.subjectGrade.findMany({
      where: { id: { in: gradeIds }, schoolId },
      select: { studentId: true, teacherId: true },
    });
    await this.invalidateGradeCaches({
      schoolId,
      teacherId: grades[0]?.teacherId,
      studentIds: grades.map((grade) => grade.studentId),
    });
    return result;
  }

  /**
   * Student: View own grades
   */
  async getStudentGrades(
    studentId: string,
    schoolId: string,
    academicYear?: string,
    termId?: string,
  ) {
    // Students/parents should see grades that are at least submitted by teachers.
    // (DRAFT grades are not visible; REJECTED grades are not shown.)
    const visiblePortalStatuses: GradeStatus[] = [
      GradeStatus.SUBMITTED,
      GradeStatus.APPROVED,
    ];

    if (academicYear) {
      await this.syncGradeLockStatus(studentId, schoolId, academicYear);
    } else {
      const academicYears = await this.prisma.subjectGrade.findMany({
        where: {
          studentId,
          schoolId,
          status: { in: visiblePortalStatuses },
        },
        select: { academicYear: true },
        distinct: ['academicYear'],
      });
      await Promise.all(
        academicYears.map((row) =>
          this.syncGradeLockStatus(studentId, schoolId, row.academicYear),
        ),
      );
    }

    return this.cacheService.getOrSetVersioned(
      this.getStudentGradesNamespace(studentId),
      JSON.stringify({ mode: 'grades', academicYear, termId }),
      60,
      async () => {
        const grades = await this.prisma.subjectGrade.findMany({
          where: {
            studentId,
            schoolId,
            status: { in: visiblePortalStatuses },
            ...(academicYear ? { academicYear } : {}),
            ...(termId ? { termId } : {}),
          },
          include: {
            subject: true,
            class: true,
            section: true,
            term: true,
          },
          orderBy: [{ term: { order: 'asc' } }, { subject: { name: 'asc' } }],
        });

        return grades.map((grade) => this.maskLockedGradeForPortal(grade));
      },
    );
  }

  /**
   * Parent: View child's grades
   */
  async getChildGrades(
    parentId: string,
    childId: string,
    schoolId: string,
    academicYear?: string,
    termId?: string,
  ) {
    const { studentUserId } = await this.resolveChildStudentForParent(
      parentId,
      schoolId,
      childId,
    );
    return this.getStudentGrades(studentUserId, schoolId, academicYear, termId);
  }

  /**
   * Parent: View child's final grades with period breakdown
   */
  async getChildFinalGradesWithClass(
    parentId: string,
    childId: string,
    schoolId: string,
    academicYear: string,
    classId?: string,
  ) {
    await this.ensureParentGradeAccessEnabled(schoolId);

    const { studentUserId } = await this.resolveChildStudentForParent(
      parentId,
      schoolId,
      childId,
    );
    await this.ensureCurrentPeriodFeesPaid(studentUserId, schoolId, academicYear);

    return this.getStudentFinalGrades(
      studentUserId,
      schoolId,
      academicYear,
      classId,
      true,
    );
  }

  /**
   * Get teacher's assigned subjects and homeroom classes
   */
  async getTeacherAssignments(
    teacherId: string,
    schoolId: string,
    academicYear: string,
  ) {
    return this.cacheService.getOrSetVersioned(
      this.getTeacherGradesNamespace(teacherId),
      JSON.stringify({ mode: 'assignments', academicYear }),
      120,
      async () => {
        const teacherSubjectAssignments =
          await this.prisma.teacherSubjectAssignment.findMany({
            where: {
              teacherId,
              schoolId,
              academicYear,
              isActive: true,
            },
            include: {
              subject: true,
              class: true,
              section: true,
            },
          });

        const classSubjectAssignments = await this.prisma.classSubject.findMany(
          {
            where: {
              teacherId,
              academicYear,
              class: { schoolId },
            },
            include: {
              subject: true,
              class: true,
              section: true,
            },
          },
        );

        const subjectAssignmentsMap = new Map<
          string,
          {
            id: string;
            subject: any;
            class: any;
            section: any;
          }
        >();

        for (const assignment of teacherSubjectAssignments) {
          const key = `${assignment.classId}:${assignment.sectionId}:${assignment.subjectId}:${assignment.academicYear}`;
          subjectAssignmentsMap.set(key, assignment as any);
        }

        for (const assignment of classSubjectAssignments) {
          const key = `${assignment.classId}:${assignment.sectionId}:${assignment.subjectId}:${assignment.academicYear}`;
          if (!subjectAssignmentsMap.has(key)) {
            subjectAssignmentsMap.set(key, assignment as any);
          }
        }

        const homeroomSections = await this.prisma.section.findMany({
          where: {
            homeroomTeacherId: teacherId,
            class: {
              schoolId,
              academicYearId: academicYear,
            },
          },
          include: {
            class: {
              include: {
                gradeLevel: true,
              },
            },
            classSubjects: {
              include: {
                subject: true,
              },
            },
          },
        });

        return {
          subjectAssignments: Array.from(subjectAssignmentsMap.values()),
          homeroomAssignments: homeroomSections.map((section) => ({
            id: `homeroom-${section.id}`,
            isHomeroom: true,
            sectionId: section.id,
            section,
            class: section.class,
            subjects: section.classSubjects.map((cs: any) => ({
              subject: cs.subject,
              classSubjectId: cs.id,
            })),
          })),
        };
      },
    );
  }

  /**
   * Create grading components for a school
   */
  async createGradingComponents(
    schoolId: string,
    components: GradingComponentDto[],
  ) {
    const results: any[] = [];

    for (const comp of components) {
      const result = await this.prisma.gradingComponent.upsert({
        where: {
          schoolId_code: {
            schoolId,
            code: comp.code,
          },
        },
        update: {
          name: comp.name,
          percentage: comp.percentage,
        },
        create: {
          schoolId,
          name: comp.name,
          code: comp.code,
          percentage: comp.percentage,
        },
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Create grade scale for a school
   */
  async createGradeScales(schoolId: string, scales: GradeScaleDto[]) {
    const results: any[] = [];

    for (const scale of scales) {
      const result = await this.prisma.gradeScale.upsert({
        where: {
          schoolId_gradeLetter: {
            schoolId,
            gradeLetter: scale.gradeLetter,
          },
        },
        update: {
          minScore: scale.minScore,
          maxScore: scale.maxScore,
          gradePoint: scale.gradePoint,
          description: scale.description,
        },
        create: {
          schoolId,
          gradeLetter: scale.gradeLetter,
          minScore: scale.minScore,
          maxScore: scale.maxScore,
          gradePoint: scale.gradePoint,
          description: scale.description,
        },
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Get grading components for a school
   */
  async getGradingComponents(schoolId: string) {
    // First try to get from database
    const components = await this.prisma.gradingComponent.findMany({
      where: { schoolId, isActive: true },
      orderBy: { percentage: 'desc' },
    });
    
    if (components.length > 0) {
      return components;
    }
    
    // Fall back to SchoolSettings JSON field
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });
    
    // Also check if gradingComponents is in JSON field
    const gradingComponentsFromSettings = (settings as any)?.gradingComponents;
    if (gradingComponentsFromSettings) {
      return gradingComponentsFromSettings;
    }
    
    // Default Ethiopian grading
    return [
      { code: 'CA', name: 'Continuous Assessment', percentage: 30 },
      { code: 'MID', name: 'Mid Exam', percentage: 20 },
      { code: 'FINAL', name: 'Final Exam', percentage: 50 },
    ];
  }

  /**
   * Get grade scale for a school
   */
  async getGradeScale(schoolId: string) {
    return this.prisma.gradeScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { minScore: 'desc' },
    });
  }

  /**
   * Get assessment types config for a school
   */
  async getAssessmentTypes(schoolId: string) {
    // First try to get from AssessmentWeight table
    const weights = await this.prisma.assessmentWeight.findMany({
      where: { schoolId, isActive: true },
      orderBy: { percentage: 'desc' },
    });
    
    if (weights.length > 0) {
      return weights.map(w => ({
        code: w.type,
        name: w.type
          .toLowerCase()
          .split('_')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
        percentage: w.percentage,
      }));
    }
    
    // Fall back to SchoolSettings JSON field
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });
    
    if (settings?.assessmentTypes) {
      return settings.assessmentTypes;
    }
    
    // Fall back to default values
    return [
      { code: 'QUIZ', name: 'Quiz', percentage: 15 },
      { code: 'TEST', name: 'Test', percentage: 25 },
      { code: 'MID', name: 'Mid Exam', percentage: 20 },
      { code: 'FINAL', name: 'Final Exam', percentage: 30 },
      { code: 'ATTENDANCE', name: 'Attendance', percentage: 10 },
    ];
  }

  /**
   * Create assessment types config
   */
  async createAssessmentTypes(
    schoolId: string,
    types: { code: string; name: string; percentage: number }[],
  ) {
    // Save to AssessmentWeight table
    const results: any[] = [];
    for (const type of types) {
      // Check if exists first
      const existing = await this.prisma.assessmentWeight.findUnique({
        where: {
          schoolId_type: {
            schoolId,
            type: type.code as never,
          },
        },
      });
      
      let result;
      if (existing) {
        result = await this.prisma.assessmentWeight.update({
          where: { id: existing.id },
          data: {
            percentage: type.percentage,
            isActive: true,
          },
        });
      } else {
        result = await this.prisma.assessmentWeight.create({
          data: {
            schoolId,
            type: type.code as never,
            percentage: type.percentage,
            isActive: true,
          },
        });
      }
      results.push(result);
    }
    return results;
  }

  /**
   * Assign teacher to subject/class/section
   */
  async assignTeacher(schoolId: string, dto: TeacherAssignmentDto) {
    // Get school ID from class
    const classData = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    return this.prisma.teacherSubjectAssignment.upsert({
      where: {
        teacherId_subjectId_classId_sectionId_academicYear: {
          teacherId: dto.teacherId,
          subjectId: dto.subjectId,
          classId: dto.classId,
          sectionId: dto.sectionId,
          academicYear: dto.academicYear,
        },
      },
      update: { isActive: true },
      create: {
        schoolId,
        teacherId: dto.teacherId,
        subjectId: dto.subjectId,
        classId: dto.classId,
        sectionId: dto.sectionId,
        academicYear: dto.academicYear,
      },
    });
  }

  /**
   * Remove teacher assignment
   */
  async removeTeacherAssignment(schoolId: string, assignmentId: string) {
    return this.prisma.teacherSubjectAssignment.update({
      where: { id: assignmentId, schoolId },
      data: { isActive: false },
    });
  }

  /**
   * Get subject performance report
   */
  async getSubjectPerformanceReport(
    schoolId: string,
    academicYear: string,
    termId: string,
    subjectId: string,
  ) {
    const grades = await this.prisma.subjectGrade.findMany({
      where: {
        schoolId,
        academicYear,
        termId,
        subjectId,
        status: GradeStatus.APPROVED,
      },
      include: {
        student: true,
      },
    });

    if (grades.length === 0) {
      return { totalStudents: 0, average: 0, distribution: {} };
    }

    const totalScore = grades.reduce((sum, g) => sum + (g.totalScore ?? 0), 0);
    const average = totalScore / grades.length;

    // Calculate distribution
    const distribution = grades.reduce(
      (acc, g) => {
        const letter = g.gradeLetter ?? 'F';
        acc[letter] = (acc[letter] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalStudents: grades.length,
      average: Math.round(average * 100) / 100,
      distribution,
      highest: Math.max(...grades.map((g) => g.totalScore ?? 0)),
      lowest: Math.min(...grades.map((g) => g.totalScore ?? 0)),
    };
  }

  /**
   * Get class summary report
   */
  async getClassSummaryReport(
    schoolId: string,
    academicYear: string,
    termId: string,
    classId: string,
    sectionId: string,
  ) {
    const grades = await this.prisma.subjectGrade.findMany({
      where: {
        schoolId,
        academicYear,
        termId,
        classId,
        sectionId,
        status: GradeStatus.APPROVED,
      },
      include: {
        student: true,
        subject: true,
      },
    });

    // Group by student
    const studentMap = new Map();
    for (const grade of grades) {
      if (!studentMap.has(grade.studentId)) {
        studentMap.set(grade.studentId, {
          studentId: grade.studentId,
          studentName: grade.student.name,
          subjects: [],
          totalScore: 0,
        });
      }
      const studentData = studentMap.get(grade.studentId);
      studentData.subjects.push({
        subjectId: grade.subjectId,
        subjectName: grade.subject.name,
        score: grade.totalScore,
        grade: grade.gradeLetter,
      });
      studentData.totalScore += grade.totalScore ?? 0;
    }

    // Calculate averages and ranking
    const results = Array.from(studentMap.values()).map((s: any) => ({
      ...s,
      average: Math.round((s.totalScore / s.subjects.length) * 100) / 100,
    }));

    // Sort by average descending
    results.sort((a: any, b: any) => b.average - a.average);

    // Add rank
    return results.map((s: any, index: number) => ({
      ...s,
      rank: index + 1,
    }));
  }

  /**
   * Calculate final aggregated grade using period weights from academic year
   * Uses dynamic percentage weights from database - no hardcoding!
   *
   * Semester Mode: Final = (Sem1 × 0.5) + (Sem2 × 0.5)
   * Quarter Mode: Final = (Q1 × 0.25) + (Q2 × 0.25) + (Q3 × 0.25) + (Q4 × 0.25)
   * Custom Mode: Final = sum(period_score × period_weight/100) for all periods
   */
  async calculateFinalGrade(
    studentId: string,
    schoolId: string,
    subjectId: string,
    academicYear: string,
  ): Promise<{
    finalScore: number;
    gradeLetter: string;
    gradePoint: number;
    periodGrades: Array<{
      periodId: string;
      periodName: string;
      score: number;
      weight: number;
      weightedScore: number;
    }>;
    curriculumType: string;
  }> {
    // Get the academic year to find curriculum type and period weights
    const academicYearRecord = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        OR: [{ id: academicYear }, { name: academicYear }],
      },
      include: {
        terms: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!academicYearRecord) {
      throw new NotFoundException('Academic year not found');
    }

    // Get all grades for this student and subject across all periods
    const periodGrades = await this.prisma.subjectGrade.findMany({
      where: {
        studentId,
        schoolId,
        subjectId,
        academicYear,
        status: GradeStatus.APPROVED,
      },
      include: {
        term: true,
      },
    });

    if (periodGrades.length === 0) {
      return {
        finalScore: 0,
        gradeLetter: 'N/A',
        gradePoint: 0,
        periodGrades: [],
        curriculumType: academicYearRecord.curriculumType,
      };
    }

    // Calculate weighted final grade using dynamic percentage weights
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const calculatedPeriodGrades: Array<{
      periodId: string;
      periodName: string;
      score: number;
      weight: number;
      weightedScore: number;
    }> = [];

    for (const term of academicYearRecord.terms) {
      // Find the grade for this period
      const periodGrade = periodGrades.find((pg) => pg.termId === term.id);

      const score = periodGrade?.totalScore ?? 0;
      const weight = term.percentageWeight;
      const weightedScore = (score * weight) / 100;

      totalWeightedScore += weightedScore;
      totalWeight += weight;

      calculatedPeriodGrades.push({
        periodId: term.id,
        periodName: term.name,
        score,
        weight,
        weightedScore,
      });
    }

    // If weights don't add up to 100, normalize the final score
    const finalScore =
      totalWeight > 0
        ? (totalWeightedScore / totalWeight) * 100
        : totalWeightedScore;

    // Get schoolId from student to fetch grade scale
    const { gradeLetter, gradePoint } = await this.getGradeFromScore(
      schoolId,
      finalScore,
    );

    return {
      finalScore: Math.round(finalScore * 100) / 100,
      gradeLetter,
      gradePoint,
      periodGrades: calculatedPeriodGrades,
      curriculumType: academicYearRecord.curriculumType,
    };
  }

  /**
   * Get final grades for all subjects for a student in an academic year
   * Returns period breakdown and final aggregated scores
   */
  async getStudentFinalGrades(
    studentId: string,
    schoolId: string,
    academicYear: string,
    classId?: string,
    hideLockedScores: boolean = false,
  ): Promise<
    Array<{
      subjectId: string;
      subjectName: string;
      classId: string;
      className: string;
      sectionId: string;
      sectionName: string;
      finalScore: number | null;
      gradeLetter: string | null;
      gradePoint: number | null;
      isLocked: boolean;
      financeLockMessage?: string | null;
      curriculumType: string;
      periodGrades: Array<{
        periodId: string;
        periodName: string;
        score: number;
        weight: number;
        weightedScore: number;
      }>;
    }>
  > {
    await this.syncGradeLockStatus(studentId, schoolId, academicYear);

    const finalGrades = await this.cacheService.getOrSetVersioned(
      this.getStudentGradesNamespace(studentId),
      JSON.stringify({
        mode: 'final-grades',
        academicYear,
        classId,
        hideLockedScores,
      }),
      60,
      async () => {
        const grades = await this.prisma.subjectGrade.findMany({
          where: {
            studentId,
            schoolId,
            academicYear,
            status: GradeStatus.APPROVED,
            ...(classId && { classId }),
          },
          include: {
            subject: true,
            class: true,
            section: true,
            term: true,
          },
        });

        const subjectIds = [...new Set(grades.map((g) => g.subjectId))];

        return Promise.all(
          subjectIds.map(async (subjectId) => {
            const subjectGrades = grades.filter(
              (g) => g.subjectId === subjectId,
            );
            const firstGrade = subjectGrades[0];

            const result = await this.calculateFinalGrade(
              studentId,
              schoolId,
              subjectId,
              academicYear,
            );

            return {
              subjectId,
              subjectName: firstGrade.subject.name,
              classId: firstGrade.classId,
              className: firstGrade.class.name,
              sectionId: firstGrade.sectionId,
              sectionName: firstGrade.section.name,
              finalScore: result.finalScore,
              gradeLetter: result.gradeLetter,
              gradePoint: result.gradePoint,
              isLocked: subjectGrades.some((grade) => grade.isLocked),
              curriculumType: result.curriculumType,
              periodGrades: result.periodGrades,
            };
          }),
        );
      },
    );

    if (!hideLockedScores) {
      return finalGrades;
    }

    return finalGrades.map((grade) => {
      if (!grade.isLocked) {
        return grade;
      }

      return {
        ...grade,
        finalScore: null,
        gradeLetter: null,
        gradePoint: null,
        financeLockMessage:
          'Final grade is locked due to outstanding balance. Please contact finance.',
      };
    });
  }

  /**
   * Verify parent-child relationship exists
   * Used for authorization when parent accesses child's records
   */
  async verifyParentChild(
    parentId: string,
    studentId: string,
    schoolId: string,
  ): Promise<boolean> {
    const parentProfile = await this.prisma.parentProfile.findFirst({
      where: { userId: parentId, schoolId },
      select: { id: true },
    });
    if (!parentProfile) return false;

    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: { schoolId, OR: [{ id: studentId }, { userId: studentId }] },
      select: { id: true },
    });
    if (!studentProfile) return false;

    const link = await this.prisma.parentStudent.findFirst({
      where: { parentId: parentProfile.id, studentId: studentProfile.id },
      select: { id: true },
    });
    return !!link;
  }

  /**
   * Get comprehensive child grades with GPA, ranking, and curriculum period breakdown
   */
  async getChildGradesWithAnalysis(
    parentId: string,
    childId: string,
    schoolId: string,
    academicYear?: string,
    termId?: string,
  ) {
    await this.ensureParentGradeAccessEnabled(schoolId);

    const { studentUserId, studentProfileId } =
      await this.resolveChildStudentForParent(parentId, schoolId, childId);

    // Get curriculum type from school settings
    const curriculumSetting = await this.prisma.schoolSetting.findUnique({
      where: {
        schoolId_key: { schoolId: schoolId || '', key: 'curriculum_type' },
      },
    });
    const curriculumType = curriculumSetting?.value || 'TERM';

    // Get curriculum period count
    const periodCountMap: Record<string, number> = {
      QUARTER: 4,
      QUARTERLY: 4,
      SEMESTER: 2,
      SEMESTERLY: 2,
      TERM: 3,
      TERMLY: 3,
      MONTHLY: 12,
      YEARLY: 1,
    };
    const periodCount = periodCountMap[curriculumType] || 3;

    // Get terms for the academic year
    const academicYearData = await this.prisma.academicYear.findFirst({
      where: academicYear
        ? { id: academicYear, schoolId }
        : { isActive: true, schoolId },
    });

    if (!academicYearData) {
      return {
        grades: [],
        periods: [],
        summary: {},
        curriculumType,
        periodCount,
      };
    }

    await this.ensureCurrentPeriodFeesPaid(
      studentUserId,
      schoolId,
      academicYearData.id,
      termId,
    );

    const terms = await this.prisma.term.findMany({
      where: { academicYearId: academicYearData.id },
      orderBy: { order: 'asc' },
    });

    // Get visible grades
    const visibleStatuses: GradeStatus[] = [
      GradeStatus.SUBMITTED,
      GradeStatus.APPROVED,
    ];

    const grades = await this.prisma.subjectGrade.findMany({
      where: {
        studentId: studentUserId,
        schoolId,
        academicYear: academicYearData.id,
        status: { in: visibleStatuses },
        ...(termId ? { termId } : {}),
      },
      include: {
        subject: true,
        class: true,
        section: true,
        term: true,
        gradeScores: {
          include: {
            component: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ term: { order: 'asc' } }, { subject: { name: 'asc' } }],
    });

    // Calculate GPA and average
    const gradedItems = grades.filter((g) => g.totalScore !== null);
    const totalScore = gradedItems.reduce(
      (sum, g) => sum + (g.totalScore || 0),
      0,
    );
    const average =
      gradedItems.length > 0
        ? Math.round((totalScore / gradedItems.length) * 100) / 100
        : 0;
    const gpa = this.calculateGPA(average);

    // Group by curriculum period
    const periods = terms.map((term, termIndex) => {
      const termGrades = grades.filter((g) => g.termId === term.id);
      const termGraded = termGrades.filter((g) => g.totalScore !== null);
      const termTotal = termGraded.reduce(
        (sum, g) => sum + (g.totalScore || 0),
        0,
      );
      const termAverage =
        termGraded.length > 0
          ? Math.round((termTotal / termGraded.length) * 100) / 100
          : 0;
      const termGPA = this.calculateGPA(termAverage);

      return {
        period: term.name,
        periodIndex: termIndex,
        termId: term.id,
        startDate: term.startDate,
        endDate: term.endDate,
        grades: termGrades,
        subjectCount: termGrades.length,
        average: termAverage,
        gpa: termGPA,
      };
    });

    const now = new Date();
    const currentPeriod =
      periods.find((period) => {
        const startDate = period.startDate ? new Date(period.startDate) : null;
        const endDate = period.endDate ? new Date(period.endDate) : null;
        return !!startDate && !!endDate && startDate <= now && endDate >= now;
      }) || null;

    // Calculate ranking (compare with other students in same class)
    let rank: number | null = null;
    let totalStudents = 0;

    if (grades.length > 0 && grades[0]?.classId) {
      const classGrades = await this.prisma.subjectGrade.findMany({
        where: {
          classId: grades[0].classId,
          schoolId,
          academicYear: academicYearData.id,
          termId: termId,
          status: { in: visibleStatuses },
          totalScore: { not: null },
        },
        select: { studentId: true, totalScore: true },
      });

      totalStudents = classGrades.length;
      const sortedGrades = classGrades
        .map((g) => ({ studentId: g.studentId, total: g.totalScore || 0 }))
        .sort((a, b) => b.total - a.total);

      const studentRank = sortedGrades.findIndex(
        (g) => g.studentId === studentUserId,
      );
      rank = studentRank >= 0 ? studentRank + 1 : null;
    }

    const summary = {
      totalSubjects: gradedItems.length,
      average,
      gpa,
      rank,
      totalStudents,
      highestScore:
        gradedItems.length > 0
          ? Math.max(...gradedItems.map((g) => g.totalScore || 0))
          : 0,
      lowestScore:
        gradedItems.length > 0
          ? Math.min(...gradedItems.map((g) => g.totalScore || 0))
          : 0,
    };

    return {
      grades,
      periods,
      summary,
      curriculumType,
      periodCount,
      academicYear: academicYearData,
      currentPeriodTermId: currentPeriod?.termId || null,
    };
  }

  private calculateGPA(average: number): string {
    if (average >= 90) return '4.0';
    if (average >= 80) return '3.5';
    if (average >= 70) return '3.0';
    if (average >= 60) return '2.5';
    if (average >= 50) return '2.0';
    return '0.0';
  }

  private async ensureCurrentPeriodFeesPaid(
    studentId: string,
    schoolId: string,
    academicYearId: string,
    termId?: string,
  ) {
    const effectiveTermId =
      termId || (await this.resolveCurrentTermId(academicYearId));

    if (!effectiveTermId) return;

    const clearance = await this.verifyFinancialClearance(
      studentId,
      schoolId,
      academicYearId,
      effectiveTermId,
      false,
    );

    if (!clearance.isCleared) {
      throw new ForbiddenException(
        'Results are locked until the current term or semester fees are paid.',
      );
    }
  }

  private async resolveCurrentTermId(academicYearId: string) {
    const now = new Date();
    const currentTerm = await this.prisma.term.findFirst({
      where: {
        academicYearId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    if (currentTerm?.id) return currentTerm.id;

    const firstTerm = await this.prisma.term.findFirst({
      where: { academicYearId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    return firstTerm?.id || null;
  }

  /**
   * Calculate rankings for all students when a curriculum period ends
   */
  async calculatePeriodRankings(
    academicYearId: string,
    termId?: string,
    classId?: string,
    sectionId?: string,
  ) {
    if (!classId) {
      throw new BadRequestException(
        'Class selection is required before calculating rankings',
      );
    }

    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const academicYearName = academicYear.name;
    const termName = termId
      ? (
          await this.prisma.term.findFirst({
            where: { id: termId, academicYearId },
            select: { name: true },
          })
        )?.name
      : null;

    const normalizedSectionId =
      sectionId && sectionId !== 'all' ? sectionId : undefined;
    const selectedGrade = classId ? Number(classId) : Number.NaN;
    const classSelector = classId
      ? Number.isInteger(selectedGrade)
        ? { grade: selectedGrade }
        : { id: classId }
      : {};

    // Get all classes in the school. The rankings page uses the shared
    // "Grade" filter, so classId may be either a real class id or a grade value.
    const classes = await this.prisma.class.findMany({
      where: {
        schoolId: academicYear.schoolId,
        academicYearId,
        ...classSelector,
      },
      include: {
        sections: { select: { name: true } },
      },
    });

    const results: any[] = [];

    for (const classItem of classes) {
      // Get approved/submitted grades for this class and term
      const gradeWhere: any = {
        classId: classItem.id,
        academicYear: academicYearId,
        status: { in: [GradeStatus.SUBMITTED, GradeStatus.APPROVED] },
        totalScore: { not: null },
      };

      if (termId) {
        gradeWhere.termId = termId;
      }
      if (normalizedSectionId) {
        gradeWhere.sectionId = normalizedSectionId;
      }

      const studentGrades = await this.prisma.subjectGrade.findMany({
        where: gradeWhere,
        select: {
          studentId: true,
          caScore: true,
          midScore: true,
          finalScore: true,
          totalScore: true,
        },
      });

// Get enrolled students for this class using the StudentClass model
      const studentClassesRaw = await this.prisma.studentClass.findMany({
        where: {
          classId: classItem.id,
          academicYear: academicYearName,
          ...(normalizedSectionId ? { sectionId: normalizedSectionId } : {}),
        },
        include: {
          student: {
            include: {
              studentProfile: {
                select: {
                  rollNumber: true,
                },
              },
            },
          },
          section: true,
        },
      });

      const studentMap = new Map();
      for (const sc of studentClassesRaw) {
        const studentName = sc.student?.name || sc.student?.email || 'Unknown';
        studentMap.set(sc.studentId, {
          name: studentName,
          rollNumber: sc.student?.studentProfile?.rollNumber || '',
          sectionId: sc.sectionId,
          sectionName: sc.section?.name || '',
        });
      }

      // Group by student and calculate average
      const studentAverages = new Map<
        string,
        { total: number; count: number }
      >();

      for (const sg of studentGrades) {
        const effectiveTotal = this.getEffectiveGradeTotalScore(sg);
        if (effectiveTotal === null) {
          continue;
        }
        const current = studentAverages.get(sg.studentId) || {
          total: 0,
          count: 0,
        };
        studentAverages.set(sg.studentId, {
          total: current.total + effectiveTotal,
          count: current.count + 1,
        });
      }

      // Calculate rankings
      const rankings = await Promise.all(
        Array.from(studentAverages.entries()).map(async ([studentId, data]) => {
          const studentInfo = studentMap.get(studentId);
          const average = Math.round((data.total / data.count) * 100) / 100;
          const { gradeLetter, gradePoint } = await this.getGradeFromScore(
            academicYear.schoolId,
            average,
          );

          return {
            studentId,
            studentName: studentInfo?.name || 'Unknown',
            rollNumber: studentInfo?.rollNumber || '',
            className: classItem.name,
            classId: classItem.id,
            sectionId: studentInfo?.sectionId || '',
            sectionName: studentInfo?.sectionName || '',
            average,
            gradeLetter,
            gradePoint,
          };
        }),
      ).then((rows) => rows.sort((a, b) => b.average - a.average));

      // Add rank to results
      rankings.forEach((rank, index) => {
        results.push({
          classId: rank.classId,
          className: rank.className,
          sectionId: rank.sectionId,
          sectionName: rank.sectionName,
          studentId: rank.studentId,
          studentName: rank.studentName,
          rollNumber: rank.rollNumber,
          academicYear: academicYearId,
          termId: termId || null,
          rank: index + 1,
          totalStudents: rankings.length,
          average: rank.average,
          gradeLetter: rank.gradeLetter,
          gradePoint: rank.gradePoint,
        });
      });
    }

    const filteredResults = normalizedSectionId
      ? results.filter((result) => result.sectionId === normalizedSectionId)
      : results;

    const allStudentAverages = filteredResults.map((r) => r.average);
    const classAverage =
      allStudentAverages.length > 0
        ? Math.round(
            (allStudentAverages.reduce((a, b) => a + b, 0) /
              allStudentAverages.length) *
              100,
          ) / 100
        : 0;
    const totalStudents = filteredResults.length;
    const passRate =
      allStudentAverages.length > 0
        ? Math.round(
            (allStudentAverages.filter((a) => a >= 50).length /
              allStudentAverages.length) *
              100,
          )
        : 0;

    const topStudents = filteredResults
      .sort((a, b) => b.average - a.average)
      .slice(0, 10)
      .map((r, index) => ({
        id: r.studentId,
        name: r.studentName,
        rank: index + 1,
        average: r.average,
        attendance: 0, // Would need to fetch from attendance
      }));

    let updatedReportCards = 0;
    let notifiedParents = 0;
    if (termName) {
      const academicYearKeys = Array.from(
        new Set([academicYearId, academicYearName].filter(Boolean)),
      );
      const parentUserIds = new Set<string>();

      for (const result of filteredResults) {
        const updateResult = await this.prisma.reportCard.updateMany({
          where: {
            studentId: result.studentId,
            classId: result.classId,
            academicYear: { in: academicYearKeys },
            term: termName,
            ...(normalizedSectionId
              ? { sectionId: normalizedSectionId }
              : {}),
          },
          data: {
            rank: result.rank,
            rankInClass: result.rank,
          },
        });
        updatedReportCards += updateResult.count;
      }

      if (updatedReportCards > 0) {
        const updatedCards = await this.prisma.reportCard.findMany({
          where: {
            studentId: {
              in: filteredResults.map((result) => result.studentId),
            },
            classId: {
              in: Array.from(
                new Set(filteredResults.map((result) => result.classId)),
              ),
            },
            academicYear: { in: academicYearKeys },
            term: termName,
            ...(normalizedSectionId
              ? { sectionId: normalizedSectionId }
              : {}),
          },
          select: {
            student: {
              select: {
                studentProfile: {
                  select: {
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
                },
              },
            },
          },
        });

        for (const card of updatedCards) {
          for (const relation of card.student.studentProfile?.parents ?? []) {
            if (relation.parent.userId) {
              parentUserIds.add(relation.parent.userId);
            }
          }
        }

        if (parentUserIds.size > 0) {
          const notification = await this.notificationService.createBulkNotifications({
            schoolId: academicYear.schoolId,
            userIds: Array.from(parentUserIds),
            title: 'Student Ranking Updated',
            message: `${termName} rankings have been calculated and are available in your child results.`,
            type: NotificationType.GRADE_UPDATED,
            actionUrl: '/parent/children',
            metadata: {
              academicYearId,
              academicYear: academicYearName,
              termId,
              term: termName,
              classId: classId || null,
              sectionId: normalizedSectionId || null,
            },
          });
          notifiedParents = notification.count;
        }
      }
    }

    return {
      calculated: new Date().toISOString(),
      academicYear: academicYear.name,
      termId: termId || 'All Terms',
      termName: termName || 'All Terms',
      results: filteredResults,
      topStudents,
      totalStudents,
      classAverage,
      passRate,
      updatedReportCards,
      notifiedParents,
    };
  }

  /**
   * Bulk upload grades from CSV data
   */
  async bulkUploadFromCsv(
    teacherId: string,
    schoolId: string,
    data: {
      csvData: string;
      academicYear: string;
      termId: string;
      classId: string;
      sectionId: string;
      subjectId: string;
      assessmentType: string;
    },
  ) {
    const lines = data.csvData.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV file is empty or missing headers');
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const studentIdIdx = headers.findIndex((h) =>
      h.toLowerCase().includes('id'),
    );
    const caIdx = headers.findIndex((h) => h.toLowerCase().includes('ca'));
    const midIdx = headers.findIndex((h) => h.toLowerCase().includes('mid'));
    const finalIdx = headers.findIndex((h) =>
      h.toLowerCase().includes('final'),
    );

    if (studentIdIdx === -1) {
      throw new BadRequestException('CSV must include a Student ID column');
    }

    const grades: CreateGradeDto[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((v) => v.trim().replace(/^"(.*)"$/, '$1'));
      if (row.length < headers.length) continue;

      const studentId = row[studentIdIdx];
      if (!studentId) continue;

      grades.push({
        studentId,
        academicYear: data.academicYear,
        termId: data.termId,
        classId: data.classId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        caScore: caIdx !== -1 ? parseFloat(row[caIdx]) || 0 : undefined,
        midScore: midIdx !== -1 ? parseFloat(row[midIdx]) || 0 : undefined,
        finalScore:
          finalIdx !== -1 ? parseFloat(row[finalIdx]) || 0 : undefined,
      });
    }

    return this.bulkEnterGrades(teacherId, schoolId, { grades });
  }

  /**
   * Generate CSV template for grade entry
   */
  async generateGradeTemplate(
    teacherId: string,
    schoolId: string,
    classId: string,
    sectionId: string,
    subjectId: string,
    academicYear: string,
  ) {
    await this.resolveTeacherGradingAccess(
      teacherId,
      schoolId,
      academicYear,
      classId,
      sectionId,
      subjectId,
    );

    const students = await this.prisma.studentClass.findMany({
      where: { schoolId, classId, sectionId, academicYear },
      include: { student: true },
    });

    let csv = 'Student ID,Student Name,CA Score,Mid Score,Final Score\n';
    students.forEach((sc) => {
      csv += `${sc.studentId},"${sc.student.name}",,,\n`;
    });

    return csv;
  }

  /**
   * Registrar: Get assessment scores for review
   */
  async getAssessmentScoresForReview(schoolId: string, filter: GradeFilterDto) {
    const where: any = {
      assessmentSubject: {
        assessment: {
          schoolId,
        },
      },
    };

    if (filter.academicYear)
      where.assessmentSubject.assessment.academicYearId = filter.academicYear;
    if (filter.termId)
      where.assessmentSubject.assessment.termId = filter.termId;
    if (filter.classId) where.assessmentSubject.classId = filter.classId;
    if (filter.sectionId) where.assessmentSubject.sectionId = filter.sectionId;
    if (filter.subjectId) where.assessmentSubject.subjectId = filter.subjectId;
    if (filter.status) where.status = filter.status;

    return this.prisma.studentAssessmentScore.findMany({
      where,
      include: {
        student: true,
        assessmentSubject: {
          include: {
            assessment: true,
            subject: true,
            class: true,
            section: true,
          },
        },
      },
    });
  }

  /**
   * Admin: Get mark entry progress
   */
  async getEntryProgress(
    schoolId: string,
    academicYear: string,
    term: string,
  ) {
    const academicYearRecord = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        OR: [{ id: academicYear }, { name: academicYear }],
      },
      select: {
        id: true,
        name: true,
      },
    });

    const academicYearId = academicYearRecord?.id ?? academicYear;
    const academicYearName = academicYearRecord?.name ?? academicYear;

    const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
      where: {
        assessment: {
          schoolId,
          academicYearId,
          termId: term,
          status: { in: ['ACTIVE', 'COMPLETED'] },
        },
      },
      include: {
        assessment: {
          select: {
            type: true,
            academicYearId: true,
          },
        },
        subject: true,
        class: true,
        section: true,
        teacher: { select: { id: true, name: true } },
      },
    });

    const studentCountByClassSection = new Map<string, number>();
    const getStudentCount = async (classId: string, sectionId: string | null) => {
      const key = `${classId}:${sectionId ?? 'all'}`;
      if (!studentCountByClassSection.has(key)) {
        const count = await this.prisma.studentClass.count({
          where: {
            schoolId,
            classId,
            ...(sectionId ? { sectionId } : {}),
            academicYear: {
              in: Array.from(new Set([academicYearId, academicYearName])),
            },
          },
        });
        studentCountByClassSection.set(key, count);
      }
      return studentCountByClassSection.get(key) ?? 0;
    };

    const assignmentKey = (item: {
      academicYear: string;
      classId: string;
      sectionId?: string | null;
      subjectId: string;
    }) =>
      [
        item.academicYear,
        item.classId,
        item.sectionId ?? 'all',
        item.subjectId,
      ].join(':');

    const missingTeacherCriteria = assessmentSubjects
      .filter((item) => !item.teacherId && item.sectionId)
      .map((item) => ({
        academicYear: item.assessment.academicYearId,
        classId: item.classId,
        sectionId: item.sectionId!,
        subjectId: item.subjectId,
      }));

    const fallbackTeacherMap = new Map<string, { id: string; name: string }>();
    if (missingTeacherCriteria.length > 0) {
      const [teacherAssignments, classSubjectAssignments] = await Promise.all([
        this.prisma.teacherSubjectAssignment.findMany({
          where: {
            schoolId,
            isActive: true,
            OR: missingTeacherCriteria,
          },
          include: { teacher: { select: { id: true, name: true } } },
        }),
        this.prisma.classSubject.findMany({
          where: {
            teacherId: { not: null },
            class: { schoolId },
            OR: missingTeacherCriteria,
          },
          include: { teacher: { select: { id: true, name: true } } },
        }),
      ]);

      for (const assignment of teacherAssignments) {
        fallbackTeacherMap.set(assignmentKey(assignment), assignment.teacher);
      }
      for (const assignment of classSubjectAssignments) {
        if (assignment.teacher) {
          fallbackTeacherMap.set(assignmentKey(assignment), assignment.teacher);
        }
      }
    }

    const progressByAssignment = new Map<
      string,
      {
        teacherId: string;
        teacherName: string | null;
        subjectId: string;
        classId: string;
        sectionId: string | null;
        subject: string;
        class: string;
        section: string | null;
        totalStudents: number;
        enteredGrades: number;
        requiredComponents: Set<string>;
      }
    >();

    for (const assessmentSubject of assessmentSubjects) {
      const fallbackTeacher = fallbackTeacherMap.get(
        assignmentKey({
          academicYear: assessmentSubject.assessment.academicYearId,
          classId: assessmentSubject.classId,
          sectionId: assessmentSubject.sectionId,
          subjectId: assessmentSubject.subjectId,
        }),
      );
      const teacherId =
        assessmentSubject.teacherId ?? fallbackTeacher?.id ?? 'unassigned';
      const componentCode = this.normalizeAssessmentComponentCode(
        assessmentSubject.assessment.type,
      );
      const key = [
        teacherId,
        assessmentSubject.subjectId,
        assessmentSubject.classId,
        assessmentSubject.sectionId ?? 'all',
      ].join(':');
      const totalStudents = await getStudentCount(
        assessmentSubject.classId,
        assessmentSubject.sectionId,
      );
      const existing = progressByAssignment.get(key) ?? {
        teacherId,
        teacherName: assessmentSubject.teacher?.name ?? fallbackTeacher?.name ?? null,
        subjectId: assessmentSubject.subjectId,
        classId: assessmentSubject.classId,
        sectionId: assessmentSubject.sectionId ?? null,
        subject: assessmentSubject.subject.name,
        class: assessmentSubject.class.name,
        section: assessmentSubject.section?.name ?? null,
        totalStudents: 0,
        enteredGrades: 0,
        requiredComponents: new Set<string>(),
      };

      if (!existing.requiredComponents.has(componentCode)) {
        existing.requiredComponents.add(componentCode);
        existing.totalStudents += totalStudents;
      }
      progressByAssignment.set(key, existing);
    }

    const progressRows = Array.from(progressByAssignment.values());
    await Promise.all(
      progressRows.map(async (row) => {
        if (row.totalStudents === 0 || row.requiredComponents.size === 0) return;

        const grades = await this.prisma.subjectGrade.findMany({
          where: {
            schoolId,
            OR: [{ academicYear: academicYearId }, { academicYear: academicYearName }],
            termId: term,
            classId: row.classId,
            ...(row.sectionId ? { sectionId: row.sectionId } : {}),
            subjectId: row.subjectId,
            ...(row.teacherId !== 'unassigned' ? { teacherId: row.teacherId } : {}),
          },
          include: {
            gradeScores: {
              include: {
                component: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        });

        const enteredStudentComponents = new Set<string>();
        grades.forEach((grade) => {
          row.requiredComponents.forEach((code) => {
            const componentScore = grade.gradeScores.find(
              (item) => item.component.code.toUpperCase() === code,
            );
            const hasComponentScore =
              componentScore?.score !== null && componentScore?.score !== undefined;
            const hasLegacyScore =
              (code === 'CA' && grade.caScore !== null) ||
              (code === 'MID' && grade.midScore !== null) ||
              (code === 'FINAL' && grade.finalScore !== null);

            if (hasComponentScore || hasLegacyScore) {
              enteredStudentComponents.add(`${grade.studentId}:${code}`);
            }
          });
        });
        row.enteredGrades = enteredStudentComponents.size;
      }),
    );

    const progress = progressRows.map((row) => {
      const enteredGrades =
        row.totalStudents > 0 ? Math.min(row.enteredGrades, row.totalStudents) : row.enteredGrades;
      return {
        teacherId: row.teacherId,
        teacherName: row.teacherName,
        subjectId: row.subjectId,
        classId: row.classId,
        sectionId: row.sectionId,
        subject: row.subject,
        class: row.class,
        section: row.section,
        totalStudents: row.totalStudents,
        enteredGrades,
        percentage:
          row.totalStudents > 0 ? Math.round((enteredGrades / row.totalStudents) * 100) : 100,
      };
    });

    return progress;
  }

  /**
   * Admin: Send reminder to teachers
   */
  async sendReminder(schoolId: string, academicYear: string, term: string) {
    const progress = await this.getEntryProgress(schoolId, academicYear, term);
    const pendingTeachers = progress.filter(
      (p) => p.percentage < 100 && p.teacherId !== 'unassigned',
    );
    const teacherIds = Array.from(new Set(pendingTeachers.map((p) => p.teacherId)));

    const notification =
      teacherIds.length > 0
        ? await this.notificationService.createBulkNotifications({
            schoolId,
            userIds: teacherIds,
            title: 'Marks entry reminder',
            message:
              'Some marks are still missing for the selected term. Please complete and submit your marks before the deadline.',
            type: NotificationType.WARNING,
            actionUrl: `/teacher/grading?academicYear=${encodeURIComponent(academicYear)}&termId=${encodeURIComponent(term)}`,
            metadata: {
              academicYear,
              term,
              source: 'entry-progress',
              pendingRows: pendingTeachers.length,
            },
          })
        : { count: 0 };

    return {
      remindersSent: notification.count,
      teachers: teacherIds,
      skippedUnassigned: progress.filter(
        (p) => p.percentage < 100 && p.teacherId === 'unassigned',
      ).length,
    };
  }

  /**
   * Admin: Get publish checklist
   */
  async getPublishChecklist(
    schoolId: string,
    academicYear: string,
    term: string,
  ) {
    const subjectGrades = await this.prisma.subjectGrade.findMany({
      where: {
        schoolId,
        academicYear,
        termId: term,
      },
      include: {
        subject: true,
        class: true,
        section: true,
      },
    });

    const grouped = new Map<string, any>();
    
    for (const sg of subjectGrades) {
      const key = `${sg.subjectId}-${sg.classId}-${sg.sectionId}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          subject: sg.subject?.name || '',
          class: sg.class?.name || '',
          section: sg.section?.name || '',
          totalStudents: 0,
          enteredGrades: 0,
        });
      }
      const existing = grouped.get(key);
      existing.enteredGrades += 1;
      existing.totalStudents = Math.max(existing.totalStudents, 1);
    }

    const checklist = Array.from(grouped.values()).map(item => ({
      ...item,
      isReady: item.enteredGrades > 0,
      status: item.enteredGrades > 0 ? 'READY' : 'DRAFT',
    }));

    return checklist;
  }

  /**
   * Admin: Bulk publish results
   */
  async bulkPublish(
    schoolId: string,
    assessmentIds: string[],
    notifyParents: boolean,
  ) {
    return this.prisma.assessment.updateMany({
      where: { id: { in: assessmentIds }, schoolId },
      data: { status: AssessmentStatus.COMPLETED },
    });
  }

  /**
   * Admin: Get promotion list
   */
  async getPromotionList(schoolId: string, academicYear: string) {
    const students = await this.prisma.studentClass.findMany({
      where: { schoolId, academicYear },
      include: { student: { include: { studentProfile: true } }, class: true },
    });

    const promotionList = await Promise.all(
      students.map(async (sc) => {
        const finalGrades = await this.getStudentFinalGrades(
          sc.studentId,
          schoolId,
          academicYear,
        );
        const avgGPA =
          finalGrades.length > 0
            ? finalGrades.reduce((acc, g) => acc + (g.gradePoint || 0), 0) /
              finalGrades.length
            : 0;

        return {
          studentId: sc.studentId,
          studentName: sc.student.name,
          currentClass: sc.class.name,
          gpa: avgGPA,
          recommendation: avgGPA >= 2.0 ? 'PROMOTED' : 'RETAINED',
        };
      }),
    );

    return promotionList;
  }

  /**
   * Admin: Override promotion
   */
  async overridePromotion(
    schoolId: string,
    studentId: string,
    recommendation: string,
  ) {
    return { studentId, recommendation, status: 'OVERRIDDEN' };
  }

  /**
   * Admin: Confirm promotions
   */
  async confirmPromotions(
    schoolId: string,
    academicYear: string,
    notifyParents: boolean,
  ) {
    return { success: true, message: 'Promotions confirmed' };
  }

  /**
   * Admin: Bulk confirm promotions
   */
  async bulkConfirmPromotions(
    schoolId: string,
    academicYear: string,
    notifyParents: boolean,
  ) {
    return { success: true, message: 'All promotions confirmed' };
  }
}
