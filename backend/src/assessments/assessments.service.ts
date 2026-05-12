import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentScoreStatus,
  AssessmentStatus,
  Prisma,
} from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  AddAssessmentSubjectsDto,
  CreateAssessmentDto,
  CreateAssessmentSubjectDto,
  ListAssessmentsFilterDto,
  SaveAssessmentScoresDto,
  UpdateAssessmentWeightsDto,
} from './dto/assessments.dto';

const DEFAULT_ASSESSMENT_WEIGHTS: Record<string, number> = {
  QUIZ: 20,
  TEST: 20,
  MID: 30,
  FINAL: 30,
  ATTENDANCE: 0,
};

const TEACHER_MANAGED_ASSESSMENT_TYPES = new Set(['QUIZ', 'TEST']);
const READ_ONLY_ASSESSMENT_TYPES = new Set(['MID', 'FINAL']);
const CALENDAR_DEFAULT_ASSESSMENT_TYPES = new Set([
  'MID',
  'MID_EXAM',
  'FINAL',
  'FINAL_EXAM',
  'TEST',
]);

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private async getWeightMap(schoolId: string) {
    const configured = await this.prisma.assessmentWeight.findMany({
      where: { schoolId, isActive: true },
    });

    const merged = { ...DEFAULT_ASSESSMENT_WEIGHTS };
    for (const row of configured) {
      merged[row.type] = row.percentage;
    }

    return merged;
  }

  private getEffectiveMaxScore(
    storedMaxScore: number,
    assessmentType: string,
    weights: Record<string, number>,
  ) {
    const configuredMax = weights[String(assessmentType).toUpperCase()];
    if (
      storedMaxScore === 100 &&
      configuredMax !== undefined &&
      configuredMax > 0 &&
      configuredMax <= 100
    ) {
      return configuredMax;
    }

    return storedMaxScore;
  }

  private buildTypeScoreMap(
    items: Array<{ type: string; score: number | null; maxScore: number; isAbsent: boolean }>,
  ) {
    const byType = new Map<string, number[]>();

    for (const item of items) {
      if (item.isAbsent || item.score === null) continue;
      const normalizedType = String(item.type).toUpperCase();
      const normalizedScore =
        item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0;
      const bucket = byType.get(normalizedType) ?? [];
      bucket.push(Math.max(0, Math.min(100, normalizedScore)));
      byType.set(normalizedType, bucket);
    }

    return byType;
  }

  private average(values: number[]) {
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  }

  private isAssessmentDue(startDate: Date) {
    return startDate.getTime() <= Date.now();
  }

  private shouldAddAssessmentToCalendar(
    type: string,
    addToCalendar?: boolean,
  ) {
    if (typeof addToCalendar === 'boolean') {
      return addToCalendar;
    }

    return CALENDAR_DEFAULT_ASSESSMENT_TYPES.has(
      String(type).toUpperCase(),
    );
  }

  private formatAssessmentTypeLabel(type: string) {
    return String(type)
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private async notifyTeachersForAssessmentStart(
    schoolId: string,
    assessment: {
      id: string;
      title: string;
      type: string;
      startDate: Date;
    },
    subjects: Array<{
      id: string;
      teacherId: string | null;
      className: string;
      subjectName: string;
    }>,
  ) {
    if (!this.isAssessmentDue(assessment.startDate)) {
      return;
    }

    for (const item of subjects) {
      if (!item.teacherId) continue;

      const existing = await this.prisma.notification.findFirst({
        where: {
          schoolId,
          userId: item.teacherId,
          type: 'ASSESSMENT_CREATED',
          metadata: {
            contains: `"assessmentSubjectId":"${item.id}"`,
          },
        },
        select: { id: true },
      });

      if (existing) continue;

      await this.notificationService.notifyAssessmentStarted(
        schoolId,
        [item.teacherId],
        assessment.title,
        assessment.type,
        item.className,
        item.subjectName,
        {
          assessmentId: assessment.id,
          assessmentSubjectId: item.id,
          startDate: assessment.startDate.toISOString(),
        },
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async notifyDueAssessmentStarts() {
    const dueSubjects = await this.prisma.assessmentSubject.findMany({
      where: {
        teacherId: { not: null },
        assessment: {
          status: AssessmentStatus.ACTIVE,
          startDate: { lte: new Date() },
        },
      },
      include: {
        assessment: {
          select: {
            id: true,
            schoolId: true,
            title: true,
            type: true,
            startDate: true,
          },
        },
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    for (const item of dueSubjects) {
      await this.notifyTeachersForAssessmentStart(
        item.assessment.schoolId,
        item.assessment,
        [
          {
            id: item.id,
            teacherId: item.teacherId,
            className: item.class.name,
            subjectName: item.subject.name,
          },
        ],
      );
    }
  }

  private computeWeightedAssessmentSummary(
    byType: Map<string, number[]>,
    weights: Record<string, number>,
  ) {
    let total = 0;
    let hasAny = false;

    for (const [type, percentage] of Object.entries(weights)) {
      const average = this.average(byType.get(String(type).toUpperCase()) ?? []);
      if (average !== null) {
        hasAny = true;
        total += average * (percentage / 100);
      }
    }

    const quizAverage = this.average(byType.get('QUIZ') ?? []);
    const testAverage = this.average(byType.get('TEST') ?? []);
    const midAverage = this.average(byType.get('MID') ?? []);
    const finalAverage = this.average(byType.get('FINAL') ?? []);

    const caContributors = Array.from(byType.entries()).filter(
      ([type]) => !['MID', 'FINAL', 'ATTENDANCE'].includes(type),
    );
    const caWeightedTotal = caContributors.reduce((sum, [type, values]) => {
      const average = this.average(values);
      const weight = weights[type] ?? 0;
      return average === null ? sum : sum + average * weight;
    }, 0);
    const caWeightTotal = caContributors.reduce(
      (sum, [type, values]) =>
        this.average(values) === null ? sum : sum + (weights[type] ?? 0),
      0,
    );

    return {
      totalScore: hasAny ? Math.round(total * 100) / 100 : null,
      caScore:
        caWeightTotal > 0
          ? Math.round((caWeightedTotal / caWeightTotal) * 100) / 100
          : null,
      midScore: midAverage !== null ? Math.round(midAverage * 100) / 100 : null,
      finalScore:
        finalAverage !== null ? Math.round(finalAverage * 100) / 100 : null,
      quizAverage,
      testAverage,
      midAverage,
      finalAverage,
      hasAny,
    };
  }

  private async getGradeFromScore(schoolId: string, score: number) {
    const customScale = await this.prisma.gradeScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { minScore: 'desc' },
    });

    const match = customScale.find(
      (scale) => score >= scale.minScore && score <= scale.maxScore,
    );
    if (match) {
      return {
        gradeLetter: match.gradeLetter,
        gradePoint: match.gradePoint,
      };
    }

    if (score >= 85) return { gradeLetter: 'A', gradePoint: 4.0 };
    if (score >= 75) return { gradeLetter: 'B', gradePoint: 3.0 };
    if (score >= 60) return { gradeLetter: 'C', gradePoint: 2.0 };
    if (score >= 50) return { gradeLetter: 'D', gradePoint: 1.0 };
    return { gradeLetter: 'F', gradePoint: 0 };
  }

  private async resolveChildStudentForParent(
    parentUserId: string,
    childIdOrUserId: string,
  ) {
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId: parentUserId },
      select: { id: true },
    });

    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
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

    return studentProfile.userId;
  }

  private async validateAssessmentContext(
    schoolId: string,
    dto: CreateAssessmentDto,
  ) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId },
      select: { id: true },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    if (dto.termId) {
      const term = await this.prisma.term.findFirst({
        where: { id: dto.termId, academicYearId: dto.academicYearId },
        select: { id: true },
      });

      if (!term) {
        throw new NotFoundException('Term not found for academic year');
      }
    }

    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date cannot be before start date');
    }
  }

  private async resolveTeacherAssignment(
    teacherId: string,
    academicYearId: string,
    subject: CreateAssessmentSubjectDto,
  ) {
    const explicit = await this.prisma.teacherSubjectAssignment.findFirst({
      where: {
        teacherId,
        academicYear: academicYearId,
        classId: subject.classId,
        sectionId: subject.sectionId,
        subjectId: subject.subjectId,
        isActive: true,
      },
      select: { id: true },
    });

    if (explicit) return teacherId;

    const classSubject = await this.prisma.classSubject.findFirst({
      where: {
        academicYear: academicYearId,
        classId: subject.classId,
        sectionId: subject.sectionId,
        subjectId: subject.subjectId,
        teacherId,
      },
      select: { id: true },
    });

    if (classSubject) return teacherId;

    throw new ForbiddenException(
      'You are not assigned to one or more selected subjects',
    );
  }

  private async ensureAssessmentWriteAccess(
    schoolId: string,
    userId: string,
    role: string,
    assessmentId: string,
  ) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.status === AssessmentStatus.LOCKED) {
      throw new ForbiddenException('Assessment is locked');
    }

if (
      role === 'TEACHER' &&
      (assessment.createdBy !== userId ||
        !TEACHER_MANAGED_ASSESSMENT_TYPES.has(
          String(assessment.type).toUpperCase(),
        ))
    ) {
      throw new ForbiddenException(
        'Teachers can only manage their own quiz and test assessments',
      );
    }

    return assessment;
  }

  private async ensureTeacherCanScore(
    teacherId: string,
    assessmentSubjectId: string,
    schoolId: string,
  ) {
    const assessmentSubject = await this.prisma.assessmentSubject.findFirst({
      where: {
        id: assessmentSubjectId,
        assessment: { schoolId },
      },
      include: {
        assessment: true,
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });

    if (!assessmentSubject) {
      throw new NotFoundException('Assessment subject not found');
    }

    if (assessmentSubject.teacherId === teacherId) {
      return assessmentSubject;
    }

    // Get teacher's assignment to find the section
    const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
      where: {
        teacherId,
        academicYear: assessmentSubject.assessment.academicYearId,
        subjectId: assessmentSubject.subjectId,
        classId: assessmentSubject.classId,
        isActive: true,
      },
      select: { sectionId: true },
    });

    // If teacher has a section assignment, use it
    if (assignment?.sectionId) {
      const section = await this.prisma.section.findUnique({
        where: { id: assignment.sectionId },
        select: { id: true, name: true },
      });
      return { ...assessmentSubject, section };
    }

    await this.resolveTeacherAssignment(
      teacherId,
      assessmentSubject.assessment.academicYearId,
      {
        subjectId: assessmentSubject.subjectId,
        classId: assessmentSubject.classId,
        sectionId: assessmentSubject.sectionId ?? undefined,
        gradeLevelId: assessmentSubject.gradeLevelId ?? undefined,
        maxScore: assessmentSubject.maxScore,
      },
    );

    return assessmentSubject;
  }

  private async syncSubjectGradeForStudent(
    assessmentSubjectId: string,
    studentId: string,
  ) {
    const assessmentSubject = await this.prisma.assessmentSubject.findUnique({
      where: { id: assessmentSubjectId },
      include: {
        assessment: true,
      },
    });

    if (!assessmentSubject?.assessment.termId) {
      return null;
    }

    const academicYearRecord = await this.prisma.academicYear.findUnique({
      where: { id: assessmentSubject.assessment.academicYearId },
      select: { name: true },
    });

    const studentClass = await this.prisma.studentClass.findFirst({
      where: {
        studentId,
        classId: assessmentSubject.classId,
        academicYear: academicYearRecord?.name || assessmentSubject.assessment.academicYearId,
      },
      select: { sectionId: true },
    });

    const resolvedSectionId =
      assessmentSubject.sectionId ?? studentClass?.sectionId;
    if (!resolvedSectionId) {
      throw new BadRequestException(
        'Student section could not be resolved for subject grade sync',
      );
    }

    const scoreRows = await this.prisma.studentAssessmentScore.findMany({
      where: {
        studentId,
        assessmentSubject: {
          subjectId: assessmentSubject.subjectId,
          classId: assessmentSubject.classId,
          sectionId: assessmentSubject.sectionId,
          assessment: {
            schoolId: assessmentSubject.assessment.schoolId,
            academicYearId: assessmentSubject.assessment.academicYearId,
            termId: assessmentSubject.assessment.termId,
          },
        },
      },
      include: {
        assessmentSubject: {
          include: {
            assessment: true,
          },
        },
      },
    });

    const weights = await this.getWeightMap(
      assessmentSubject.assessment.schoolId,
    );
    const summary = this.computeWeightedAssessmentSummary(
      this.buildTypeScoreMap(
        scoreRows.map((row) => ({
          type: row.assessmentSubject.assessment.type,
          score: row.score,
          maxScore: row.assessmentSubject.maxScore,
          isAbsent: row.isAbsent,
        })),
      ),
      weights,
    );
    const totalScore = summary.totalScore;

    const { gradeLetter, gradePoint } =
      totalScore === null
        ? { gradeLetter: null, gradePoint: null }
        : await this.getGradeFromScore(
            assessmentSubject.assessment.schoolId,
            totalScore,
          );

    return this.prisma.subjectGrade.upsert({
      where: {
        studentId_subjectId_academicYear_termId: {
          studentId,
          subjectId: assessmentSubject.subjectId,
          academicYear: assessmentSubject.assessment.academicYearId,
          termId: assessmentSubject.assessment.termId,
        },
      },
      update: {
        classId: assessmentSubject.classId,
        sectionId: resolvedSectionId,
        teacherId: assessmentSubject.teacherId,
        caScore: summary.caScore,
        midScore: summary.midScore,
        finalScore: summary.finalScore,
        totalScore,
        gradeLetter,
        gradePoint,
      },
      create: {
        schoolId: assessmentSubject.assessment.schoolId,
        studentId,
        subjectId: assessmentSubject.subjectId,
        classId: assessmentSubject.classId,
        sectionId: resolvedSectionId,
        academicYear: assessmentSubject.assessment.academicYearId,
        termId: assessmentSubject.assessment.termId,
        teacherId: assessmentSubject.teacherId,
        caScore: summary.caScore,
        midScore: summary.midScore,
        finalScore: summary.finalScore,
        totalScore,
        gradeLetter,
        gradePoint,
      },
    });
  }

  private async createAssessmentSubjects(
    assessmentId: string,
    academicYearId: string,
    subjects: CreateAssessmentSubjectDto[],
    actorId: string,
    role: string,
  ) {
    const subjectIds = subjects.map((s) => s.subjectId);
    const classIds = subjects.map((s) => s.classId);
    const sectionIds = subjects.filter((s) => s.sectionId).map((s) => s.sectionId!);

    const [subjectsFound, classesFound] = await Promise.all([
      this.prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true },
      }),
      this.prisma.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, gradeId: true },
      }),
    ]);

    const subjectSet = new Set(subjectsFound.map((s) => s.id));
    const classMap = new Map(classesFound.map((c) => [c.id, c]));

    for (const item of subjects) {
      if (!subjectSet.has(item.subjectId)) {
        throw new NotFoundException('Subject not found');
      }
      const classRecord = classMap.get(item.classId);
      if (!classRecord) {
        throw new NotFoundException('Class not found');
      }
    }

    let sectionsFound: { id: string; classId: string }[] = [];
    if (sectionIds.length > 0) {
      sectionsFound = await this.prisma.section.findMany({
        where: { id: { in: sectionIds } },
        select: { id: true, classId: true },
      });
    }
    const sectionMap = new Map(sectionsFound.map((s) => [s.id, s]));

    const classNamesMap = new Map<string, string>();
    const subjectNamesMap = new Map<string, string>();

    if (role === 'TEACHER') {
      for (const item of subjects) {
        await this.resolveTeacherAssignment(actorId, academicYearId, item);
      }
    }

    const [subjectsWithNames, classesWithNames] = await Promise.all([
      this.prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      }),
      this.prisma.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, name: true },
      }),
    ]);

    for (const s of subjectsWithNames) {
      subjectNamesMap.set(s.id, s.name);
    }
    for (const c of classesWithNames) {
      classNamesMap.set(c.id, c.name);
    }

    const createdRecords = await this.prisma.$transaction(
      subjects.map((item) => {
        const classRecord = classMap.get(item.classId)!;
        return this.prisma.assessmentSubject.create({
          data: {
            assessmentId,
            subjectId: item.subjectId,
            classId: item.classId,
            sectionId: item.sectionId,
            gradeLevelId: item.gradeLevelId ?? classRecord.gradeId ?? undefined,
            teacherId: role === 'TEACHER' ? actorId : item.teacherId,
            maxScore: item.maxScore,
            passMark: item.passMark,
          },
        });
      })
    );

    return createdRecords.map((c) => ({
      id: c.id,
      classId: c.classId,
      subjectId: c.subjectId,
      teacherId: c.teacherId,
      className: classNamesMap.get(c.classId) ?? 'Unknown Class',
      subjectName: subjectNamesMap.get(c.subjectId) ?? 'Unknown Subject',
    }));
  }

  private async attachFallbackTeachersToAssessments(assessments: any[]) {
    const missing = assessments.flatMap((assessment) =>
      (assessment.subjects || [])
        .filter((subject: any) => !subject.teacherId)
        .map((subject: any) => ({
          subjectId: subject.subjectId,
          classId: subject.classId,
          sectionId: subject.sectionId ?? null,
          academicYearId: assessment.academicYearId,
        })),
    );

    if (missing.length === 0) {
      return assessments;
    }

    const fallbackAssignments = await Promise.all(
      missing.map((item) =>
        this.prisma.classSubject.findFirst({
          where: {
            academicYear: item.academicYearId,
            classId: item.classId,
            sectionId: item.sectionId ?? undefined,
            subjectId: item.subjectId,
            teacherId: { not: null },
          },
          include: {
            teacher: {
              select: { id: true, name: true },
            },
          },
        }),
      ),
    );

    const fallbackMap = new Map<string, { id: string; name: string }>();
    for (let index = 0; index < missing.length; index += 1) {
      const assignment = fallbackAssignments[index];
      if (!assignment?.teacher) continue;
      const item = missing[index];
      const key = `${item.academicYearId}:${item.classId}:${item.sectionId ?? "null"}:${item.subjectId}`;
      fallbackMap.set(key, assignment.teacher);
    }

    return assessments.map((assessment) => ({
      ...assessment,
      subjects: (assessment.subjects || []).map((subject: any) => {
        if (subject.teacher) return subject;
        const key = `${assessment.academicYearId}:${subject.classId}:${subject.sectionId ?? "null"}:${subject.subjectId}`;
        const teacher = fallbackMap.get(key);
        return teacher ? { ...subject, teacherId: teacher.id, teacher } : subject;
      }),
    }));
  }

  async createAssessment(
    schoolId: string,
    userId: string,
    role: string,
    dto: CreateAssessmentDto,
  ) {
    if (
      role === 'TEACHER' &&
      !TEACHER_MANAGED_ASSESSMENT_TYPES.has(String(dto.type).toUpperCase())
    ) {
      throw new ForbiddenException(
        'Teachers can only create quizzes and tests',
      );
    }

    await this.validateAssessmentContext(schoolId, dto);

    const assessmentData: Prisma.AssessmentUncheckedCreateInput = {
      schoolId,
      academicYearId: dto.academicYearId,
      termId: dto.termId ?? null,
      title: dto.title,
      type: dto.type,
      status: AssessmentStatus.ACTIVE,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      createdBy: userId,
    };

    const assessment = await this.prisma.$transaction(async (tx) => {
      const createdAssessment = await tx.assessment.create({
        data: assessmentData,
      });

      if (!this.shouldAddAssessmentToCalendar(dto.type, dto.addToCalendar)) {
        return createdAssessment;
      }

      const calendarEvent = await tx.schoolEvent.create({
        data: {
          schoolId,
          createdById: userId,
          title: dto.title,
          description: `${this.formatAssessmentTypeLabel(dto.type)} scheduled for score entry and school calendar visibility.`,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          audience: ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] as any,
          category: 'ACADEMIC',
          color: '#e35336',
        },
        select: { id: true },
      });

      return tx.assessment.update({
        where: { id: createdAssessment.id },
        data: { calendarEventId: calendarEvent.id },
      });
    });

    if (dto.subjects?.length) {
      const createdSubjects = await this.createAssessmentSubjects(
        assessment.id,
        dto.academicYearId,
        dto.subjects,
        userId,
        role,
      );

      await this.notifyTeachersForAssessmentStart(schoolId, assessment, createdSubjects);
    }

    return this.getAssessmentById(schoolId, assessment.id);
  }

  async addSubjects(
    schoolId: string,
    userId: string,
    role: string,
    assessmentId: string,
    dto: AddAssessmentSubjectsDto,
  ) {
    const assessment = await this.ensureAssessmentWriteAccess(
      schoolId,
      userId,
      role,
      assessmentId,
    );

    const createdSubjects = await this.createAssessmentSubjects(
      assessment.id,
      assessment.academicYearId,
      dto.subjects,
      userId,
      role,
    );

    await this.notifyTeachersForAssessmentStart(schoolId, assessment, createdSubjects);

    return this.getAssessmentById(schoolId, assessmentId);
  }

  async getAssessmentById(schoolId: string, id: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, schoolId },
      include: {
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true, order: true } },
        creator: { select: { id: true, name: true } },
        subjects: {
          include: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
            _count: { select: { scores: true } },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return assessment;
  }

  async listAssessments(schoolId: string, query: ListAssessmentsFilterDto) {
    const where: Prisma.AssessmentWhereInput = { schoolId };
    if (query.academicYearId) where.academicYearId = query.academicYearId;
    if (query.termId) where.termId = query.termId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const assessments = await this.prisma.assessment.findMany({
      where,
      include: {
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        subjects: {
          include: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
            _count: { select: { scores: true } },
          },
        },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    return this.attachFallbackTeachersToAssessments(assessments);
  }

  async getTeacherAssessments(
    teacherId: string,
    schoolId: string,
    query: ListAssessmentsFilterDto,
  ) {
    const assignments = await this.prisma.teacherSubjectAssignment.findMany({
      where: {
        teacherId,
        schoolId,
        isActive: true,
        ...(query.academicYearId
          ? { academicYear: query.academicYearId }
          : {}),
      },
      select: {
        subjectId: true,
        classId: true,
        sectionId: true,
        academicYear: true,
      },
    });

    if (!assignments.length) {
      return [];
    }

    const assignmentCriteriaMap = new Map<
      string,
      { subjectId: string; classId: string; sectionId: string | null }
    >();
    for (const assignment of assignments) {
      const sectionKey = `${assignment.classId}:${assignment.subjectId}:${assignment.sectionId}`;

      if (!assignmentCriteriaMap.has(sectionKey)) {
        assignmentCriteriaMap.set(sectionKey, {
          subjectId: assignment.subjectId,
          classId: assignment.classId,
          sectionId: assignment.sectionId,
        });
      }
    }

    const assessmentSubjectArgs = Prisma.validator<Prisma.AssessmentSubjectFindManyArgs>()({
      where: {
        assessment: {
          schoolId,
          ...(query.academicYearId
            ? { academicYearId: query.academicYearId }
            : {}),
          ...(query.termId ? { termId: query.termId } : {}),
          ...(query.type ? { type: query.type } : {}),
        },
        OR: [
          { teacherId },
          ...Array.from(assignmentCriteriaMap.values()).map((assignment) => ({
            subjectId: assignment.subjectId,
            classId: assignment.classId,
            sectionId: assignment.sectionId,
          })),
        ],
      },
      include: {
        assessment: {
          include: {
            academicYear: { select: { id: true, name: true } },
            term: { select: { id: true, name: true } },
          },
        },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { scores: true } },
      },
      orderBy: [{ assessment: { startDate: 'desc' } }],
    });

    const assessmentSubjects = await this.prisma.assessmentSubject.findMany(
      assessmentSubjectArgs,
    );

    // Get score status for each assessment
    const scoreStatusMap = new Map<string, { status: string; count: number }>();
    const assessmentIds = assessmentSubjects.map(s => s.id);
    
    if (assessmentIds.length > 0) {
      const scoreGroups = await this.prisma.studentAssessmentScore.groupBy({
        by: ['assessmentSubjectId', 'status'],
        where: { assessmentSubjectId: { in: assessmentIds } },
        _count: true,
      });
      
      for (const group of scoreGroups) {
        const existing = scoreStatusMap.get(group.assessmentSubjectId);
        // Prioritize SUBMITTED over DRAFT
        if (!existing || group.status === 'SUBMITTED') {
          scoreStatusMap.set(group.assessmentSubjectId, { 
            status: group.status, 
            count: group._count 
          });
        } else if (existing && existing.status === 'SUBMITTED') {
          existing.count += group._count;
        } else {
          scoreStatusMap.set(group.assessmentSubjectId, { 
            status: group.status, 
            count: group._count 
          });
        }
      }
    }

    const weights = await this.getWeightMap(schoolId);

    return assessmentSubjects.map((item) => {
      const scoreInfo = scoreStatusMap.get(item.id);
      let scoreStatus = 'NOT_STARTED';
      if (scoreInfo) {
        scoreStatus = scoreInfo.status;
      }
      const effectiveMaxScore = this.getEffectiveMaxScore(
        item.maxScore,
        item.assessment.type,
        weights,
      );
      
      return {
        id: item.id,
        assessmentId: item.assessmentId,
        title: item.assessment.title,
        type: item.assessment.type,
        status: item.assessment.status,
        academicYear: item.assessment.academicYear,
        term: item.assessment.term,
        class: item.class,
        section: item.section,
        subject: item.subject,
        maxScore: effectiveMaxScore,
        startDate: item.assessment.startDate,
        endDate: item.assessment.endDate,
        scoreEntries: item._count.scores,
        scoreStatus: scoreStatus,
        canCreate: TEACHER_MANAGED_ASSESSMENT_TYPES.has(
          String(item.assessment.type).toUpperCase(),
        ),
        canEditScores: item.assessment.status !== AssessmentStatus.LOCKED,
        isReadOnly: READ_ONLY_ASSESSMENT_TYPES.has(
          String(item.assessment.type).toUpperCase(),
        ),
      };
    });
  }

  async getScoreEntry(
    userId: string,
    role: string,
    schoolId: string,
    assessmentSubjectId: string,
  ) {
    let assessmentSubject = role === 'TEACHER'
      ? await this.ensureTeacherCanScore(userId, assessmentSubjectId, schoolId)
      : await this.prisma.assessmentSubject.findFirst({
          where: { id: assessmentSubjectId, assessment: { schoolId } },
          include: {
            assessment: true,
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
          },
        });

    if (!assessmentSubject) {
      throw new NotFoundException('Assessment subject not found');
    }

    // For teachers, get section from their assignment if assessment has no section
    let sectionId = assessmentSubject.sectionId;
    if (role === 'TEACHER' && !sectionId) {
      const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
        where: {
          teacherId: userId,
          academicYear: assessmentSubject.assessment.academicYearId,
          subjectId: assessmentSubject.subjectId,
          classId: assessmentSubject.classId,
          isActive: true,
        },
        select: { sectionId: true },
      });
      sectionId = assignment?.sectionId || null;
    }

    // Get the academic year name for the query
    const academicYearRecord = await this.prisma.academicYear.findUnique({
      where: { id: assessmentSubject.assessment.academicYearId },
      select: { name: true },
    });

    const students = await this.prisma.studentClass.findMany({
      where: {
        academicYear: academicYearRecord?.name || assessmentSubject.assessment.academicYearId,
        classId: assessmentSubject.classId,
        ...(sectionId ? { sectionId } : {}),
      },
      include: {
        student: {
          include: {
            studentProfile: { select: { rollNumber: true } },
          },
        },
        section: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const weights = await this.getWeightMap(schoolId);
    const effectiveMaxScore = this.getEffectiveMaxScore(
      assessmentSubject.maxScore,
      assessmentSubject.assessment.type,
      weights,
    );

    const existing = await this.prisma.studentAssessmentScore.findMany({
      where: { assessmentSubjectId },
    });
    const existingMap = new Map<string, (typeof existing)[number]>(
      existing.map((row) => [row.studentId, row]),
    );

    return {
      id: assessmentSubject.id,
      maxScore: effectiveMaxScore,
      subject: assessmentSubject.subject,
      class: assessmentSubject.class,
      section: assessmentSubject.section,
      assessment: assessmentSubject.assessment,
      students: students.map((entry) => ({
        studentId: entry.studentId,
        studentName: entry.student.name,
        rollNumber: entry.student.studentProfile?.rollNumber ?? null,
        sectionName: entry.section?.name ?? null,
        score: existingMap.get(entry.studentId)?.score ?? null,
        isAbsent: existingMap.get(entry.studentId)?.isAbsent ?? false,
        remarks: existingMap.get(entry.studentId)?.remarks ?? null,
        status: existingMap.get(entry.studentId)?.status ?? AssessmentScoreStatus.DRAFT,
      })),
    };
  }

  async saveScores(
    userId: string,
    role: string,
    schoolId: string,
    assessmentSubjectId: string,
    dto: SaveAssessmentScoresDto,
  ) {
    const assessmentSubject =
      role === 'TEACHER'
        ? await this.ensureTeacherCanScore(
            userId,
            assessmentSubjectId,
            schoolId,
          )
        : await this.prisma.assessmentSubject.findFirst({
            where: { id: assessmentSubjectId, assessment: { schoolId } },
            include: { assessment: true },
          });

    if (!assessmentSubject) {
      throw new NotFoundException('Assessment subject not found');
    }

    if (
      assessmentSubject.assessment.status === AssessmentStatus.LOCKED &&
      !(
        dto.registrarOverride &&
        ['REGISTRAR', 'ADMIN', 'SUPER_ADMIN'].includes(role)
      )
    ) {
      throw new ForbiddenException('Assessment scores are locked');
    }

    const weights = await this.getWeightMap(schoolId);
    const effectiveMaxScore = this.getEffectiveMaxScore(
      assessmentSubject.maxScore,
      assessmentSubject.assessment.type,
      weights,
    );

    const academicYearRecord = await this.prisma.academicYear.findUnique({
      where: { id: assessmentSubject.assessment.academicYearId },
      select: { name: true },
    });

    const validStudents = await this.prisma.studentClass.findMany({
      where: {
        academicYear: academicYearRecord?.name || assessmentSubject.assessment.academicYearId,
        classId: assessmentSubject.classId,
        ...(assessmentSubject.sectionId
          ? { sectionId: assessmentSubject.sectionId }
          : {}),
      },
      select: { studentId: true },
    });
    const validStudentIds = new Set(validStudents.map((row) => row.studentId));

    for (const score of dto.scores) {
      if (!validStudentIds.has(score.studentId)) {
        throw new BadRequestException(
          'One or more students are not in the class',
        );
      }
      if (
        score.score !== undefined &&
        score.score !== null &&
        score.score > effectiveMaxScore
      ) {
        throw new BadRequestException(
          `Score cannot exceed ${effectiveMaxScore}`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.scores.map((row) =>
        this.prisma.studentAssessmentScore.upsert({
          where: {
            assessmentSubjectId_studentId: {
              assessmentSubjectId,
              studentId: row.studentId,
            },
          },
          update: {
            score: row.isAbsent ? null : (row.score ?? null),
            isAbsent: row.isAbsent ?? false,
            remarks: row.remarks,
            status: dto.status ?? AssessmentScoreStatus.DRAFT,
            enteredBy: userId,
            enteredAt: new Date(),
          },
          create: {
            assessmentSubjectId,
            studentId: row.studentId,
            score: row.isAbsent ? null : (row.score ?? null),
            isAbsent: row.isAbsent ?? false,
            remarks: row.remarks,
            status: dto.status ?? AssessmentScoreStatus.DRAFT,
            enteredBy: userId,
          },
        }),
      ),
    );

    await Promise.all(
      dto.scores.map((row) =>
        this.syncSubjectGradeForStudent(assessmentSubjectId, row.studentId)
      )
    );

    return this.getScoreEntry(userId, role, schoolId, assessmentSubjectId);
  }

  async lockAssessment(schoolId: string, assessmentId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      select: { id: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.LOCKED,
        lockAt: new Date(),
      },
    });
  }

  async getMissingMarks(schoolId: string, query: ListAssessmentsFilterDto & { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [assessmentSubjects, total] = await Promise.all([
      this.prisma.assessmentSubject.findMany({
        where: {
          assessment: {
            schoolId,
            ...(query.academicYearId
              ? { academicYearId: query.academicYearId }
              : {}),
            ...(query.termId ? { termId: query.termId } : {}),
          },
        },
        include: {
          assessment: true,
          subject: { select: { name: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
          _count: { select: { scores: true } },
        },
        orderBy: [{ assessment: { startDate: 'desc' } }],
        skip,
        take: limit,
      }),
      this.prisma.assessmentSubject.count({
        where: {
          assessment: {
            schoolId,
            ...(query.academicYearId
              ? { academicYearId: query.academicYearId }
              : {}),
            ...(query.termId ? { termId: query.termId } : {}),
          },
        },
      }),
    ]);

    const studentCounts = await this.prisma.studentClass.groupBy({
      by: ['classId', 'sectionId'],
      where: {
        schoolId,
        ...(query.academicYearId
          ? { academicYear: query.academicYearId }
          : {}),
      },
      _count: { studentId: true },
    });
    const countMap = new Map(
      studentCounts.map((r) => [
        `${r.classId}:${r.sectionId ?? 'null'}`,
        r._count.studentId,
      ])
    );

    const data = assessmentSubjects.map((item) => {
      const studentCount =
        countMap.get(`${item.classId}:${item.sectionId ?? 'null'}`) ?? 0;
      return {
        assessmentSubjectId: item.id,
        assessmentId: item.assessmentId,
        title: item.assessment.title,
        type: item.assessment.type,
        subject: item.subject.name,
        className: item.class.name,
        sectionName: item.section?.name ?? null,
        expectedEntries: studentCount,
        enteredEntries: item._count.scores,
        missingEntries: Math.max(studentCount - item._count.scores, 0),
        isLocked: item.assessment.status === AssessmentStatus.LOCKED,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWeights(schoolId: string) {
    const weights = await this.getWeightMap(schoolId);
    return Object.entries(weights).map(([type, percentage]) => ({
      type,
      percentage,
    }));
  }

  async updateWeights(schoolId: string, dto: UpdateAssessmentWeightsDto) {
    const total = dto.weights.reduce((sum, row) => sum + row.percentage, 0);
    if (Math.round(total * 100) / 100 !== 100) {
      throw new BadRequestException('Assessment weights must total 100');
    }

    await this.prisma.$transaction(
      dto.weights.map((row) =>
        this.prisma.assessmentWeight.upsert({
          where: {
            schoolId_type: {
              schoolId,
              type: row.type as never,
            },
          },
          update: {
            percentage: row.percentage,
            isActive: true,
          },
          create: {
            schoolId,
            type: row.type as never,
            percentage: row.percentage,
          },
        }),
      ),
    );

    return this.getWeights(schoolId);
  }

  private async getStudentAcademicContext(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
  ) {
    const latestAssignment = await this.prisma.studentClass.findFirst({
      where: {
        studentId,
        schoolId,
        ...(academicYearId ? { academicYear: academicYearId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestAssignment) {
      return null;
    }

    return latestAssignment;
  }

  async getStudentUpcoming(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
  ) {
    const context = await this.getStudentAcademicContext(
      studentId,
      schoolId,
      academicYearId,
    );
    if (!context) return [];

    return this.prisma.assessmentSubject.findMany({
      where: {
        classId: context.classId,
        sectionId: context.sectionId,
        assessment: {
          schoolId,
          academicYearId: context.academicYear,
          startDate: { gte: new Date() },
        },
      },
      include: {
        assessment: true,
        subject: { select: { id: true, name: true } },
        scores: {
          where: { studentId },
          select: { score: true, status: true },
        },
      },
      orderBy: [{ assessment: { startDate: 'asc' } }],
    });
  }

  async getStudentResults(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
    termId?: string,
  ) {
    const context = await this.getStudentAcademicContext(
      studentId,
      schoolId,
      academicYearId,
    );
    if (!context) return [];

    const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
      where: {
        classId: context.classId,
        sectionId: context.sectionId,
        assessment: {
          schoolId,
          academicYearId: context.academicYear,
          ...(termId ? { termId } : {}),
        },
      },
      include: {
        assessment: {
          include: {
            term: { select: { id: true, name: true } },
          },
        },
        subject: { select: { id: true, name: true } },
        scores: {
          where: { studentId },
          select: { score: true, isAbsent: true, status: true, remarks: true },
        },
      },
      orderBy: [
        { subject: { name: 'asc' } },
        { assessment: { startDate: 'asc' } },
      ],
    });

    const weights = await this.getWeightMap(schoolId);
    const grouped = new Map<
      string,
      {
        subjectId: string;
        subjectName: string;
        termName: string | null;
        assessments: Array<Record<string, unknown>>;
      }
    >();

    for (const row of assessmentSubjects) {
      const score = row.scores[0];
      const key = `${row.subjectId}:${row.assessment.termId ?? 'no-term'}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          subjectId: row.subjectId,
          subjectName: row.subject.name,
          termName: row.assessment.term?.name ?? null,
          assessments: [],
        });
      }

      grouped.get(key)!.assessments.push({
        assessmentSubjectId: row.id,
        title: row.assessment.title,
        type: row.assessment.type,
        maxScore: row.maxScore,
        startDate: row.assessment.startDate,
        endDate: row.assessment.endDate,
        score: score?.score ?? null,
        isAbsent: score?.isAbsent ?? false,
        status: score?.status ?? 'PENDING',
        remarks: score?.remarks ?? null,
      });
    }

    const response: Array<{
      subjectId: string;
      subjectName: string;
      termName: string | null;
      assessments: Array<Record<string, unknown>>;
      summary: {
        quizAverage: number | null;
        testAverage: number | null;
        midAverage: number | null;
        finalAverage: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
      };
    }> = [];
    for (const group of grouped.values()) {
      const weightedSummary = this.computeWeightedAssessmentSummary(
        this.buildTypeScoreMap(
          group.assessments.map((item) => {
            const typed = item as {
              type: string;
              score: number | null;
              maxScore: number;
              isAbsent: boolean;
            };
            return typed;
          }),
        ),
        weights,
      );
      const total = weightedSummary.totalScore ?? 0;
      const hasAny = weightedSummary.hasAny;
      const summary =
        hasAny && group.assessments.length
          ? await this.getGradeFromScore(schoolId, total)
          : { gradeLetter: null, gradePoint: null };

      response.push({
        ...group,
        summary: {
          quizAverage: weightedSummary.quizAverage,
          testAverage: weightedSummary.testAverage,
          midAverage: weightedSummary.midAverage,
          finalAverage: weightedSummary.finalAverage,
          totalScore: weightedSummary.totalScore,
          gradeLetter: summary.gradeLetter,
          gradePoint: summary.gradePoint,
        },
      });
    }

    return response;
  }

  async getParentUpcoming(
    parentUserId: string,
    childId: string,
    schoolId: string,
    academicYearId?: string,
  ) {
    const studentId = await this.resolveChildStudentForParent(
      parentUserId,
      childId,
    );
    return this.getStudentUpcoming(studentId, schoolId, academicYearId);
  }

  async getParentResults(
    parentUserId: string,
    childId: string,
    schoolId: string,
    academicYearId?: string,
    termId?: string,
  ) {
    const studentId = await this.resolveChildStudentForParent(
      parentUserId,
      childId,
    );
    return this.getStudentResults(studentId, schoolId, academicYearId, termId);
  }
}
