import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentScoreStatus,
  AssessmentStatus,
  AssessmentType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  AddAssessmentSubjectsDto,
  CreateAssessmentDto,
  CreateAssessmentSubjectDto,
  SaveAssessmentScoresDto,
  UpdateAssessmentWeightsDto,
} from './dto/assessments.dto';

const DEFAULT_ASSESSMENT_WEIGHTS: Record<AssessmentType, number> = {
  QUIZ: 15,
  TEST: 25,
  MID: 20,
  FINAL: 30,
  ATTENDANCE: 10,
};

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

    if (score >= 90) return { gradeLetter: 'A', gradePoint: 4.0 };
    if (score >= 80) return { gradeLetter: 'B', gradePoint: 3.5 };
    if (score >= 70) return { gradeLetter: 'C', gradePoint: 3.0 };
    if (score >= 60) return { gradeLetter: 'D', gradePoint: 2.5 };
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
        ![AssessmentType.QUIZ, AssessmentType.TEST].some(
          (t) => t === assessment.type,
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

    const typeScores = new Map<AssessmentType, number[]>();
    for (const type of Object.values(AssessmentType)) {
      typeScores.set(type, []);
    }

    for (const row of scoreRows) {
      if (row.isAbsent || row.score === null || row.score === undefined) {
        continue;
      }

      const normalized =
        row.assessmentSubject.maxScore > 0
          ? (row.score / row.assessmentSubject.maxScore) * 100
          : 0;
      typeScores
        .get(row.assessmentSubject.assessment.type)!
        .push(Math.max(0, Math.min(100, normalized)));
    }

    const average = (values: number[]) =>
      values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;

    const quizAverage = average(typeScores.get(AssessmentType.QUIZ)!);
    const testAverage = average(typeScores.get(AssessmentType.TEST)!);
    const midAverage = average(typeScores.get(AssessmentType.MID)!);
    const finalAverage = average(typeScores.get(AssessmentType.FINAL)!);
    const attendanceAverage = average(
      typeScores.get(AssessmentType.ATTENDANCE)!,
    );

    const weights = await this.getWeightMap(
      assessmentSubject.assessment.schoolId,
    );
    const weightedTotal =
      (quizAverage ?? 0) * (weights.QUIZ / 100) +
      (testAverage ?? 0) * (weights.TEST / 100) +
      (midAverage ?? 0) * (weights.MID / 100) +
      (finalAverage ?? 0) * (weights.FINAL / 100) +
      (attendanceAverage ?? 0) * (weights.ATTENDANCE / 100);

    const hasAnyScore = [
      quizAverage,
      testAverage,
      midAverage,
      finalAverage,
      attendanceAverage,
    ].some((value) => value !== null);
    const totalScore = hasAnyScore
      ? Math.round(weightedTotal * 100) / 100
      : null;

    const { gradeLetter, gradePoint } =
      totalScore === null
        ? { gradeLetter: null, gradePoint: null }
        : await this.getGradeFromScore(
            assessmentSubject.assessment.schoolId,
            totalScore,
          );

    const caNumerator =
      (quizAverage ?? 0) * weights.QUIZ + (testAverage ?? 0) * weights.TEST;
    const caDenominator =
      (quizAverage !== null ? weights.QUIZ : 0) +
      (testAverage !== null ? weights.TEST : 0);
    const caScore =
      caDenominator > 0
        ? Math.round((caNumerator / caDenominator) * 100) / 100
        : null;

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
        caScore,
        midScore: midAverage,
        finalScore: finalAverage,
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
        caScore,
        midScore: midAverage,
        finalScore: finalAverage,
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
    const created: Array<
      ReturnType<typeof this.prisma.assessmentSubject.create>
    > = [];

    for (const item of subjects) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: item.subjectId },
        select: { id: true },
      });

      const classRecord = await this.prisma.class.findUnique({
        where: { id: item.classId },
        select: { id: true, gradeId: true },
      });

      if (!subject) throw new NotFoundException('Subject not found');
      if (!classRecord) throw new NotFoundException('Class not found');

      if (item.sectionId) {
        const section = await this.prisma.section.findFirst({
          where: { id: item.sectionId, classId: item.classId },
          select: { id: true },
        });
        if (!section) {
          throw new NotFoundException('Section not found for class');
        }
      }

      const teacherId =
        role === 'TEACHER'
          ? await this.resolveTeacherAssignment(actorId, academicYearId, item)
          : item.teacherId;

      created.push(
        this.prisma.assessmentSubject.create({
          data: {
            assessmentId,
            subjectId: item.subjectId,
            classId: item.classId,
            sectionId: item.sectionId,
            gradeLevelId: item.gradeLevelId ?? classRecord.gradeId ?? undefined,
            teacherId,
            maxScore: item.maxScore,
            passMark: item.passMark,
          },
        }),
      );
    }

    await this.prisma.$transaction(created);

    return created;
  }

  async createAssessment(
    schoolId: string,
    userId: string,
    role: string,
    dto: CreateAssessmentDto,
  ) {
    if (
      role === 'TEACHER' &&
      ![AssessmentType.QUIZ, AssessmentType.TEST].some((t) => t === dto.type)
    ) {
      throw new ForbiddenException(
        'Teachers can only create quizzes and tests',
      );
    }

    await this.validateAssessmentContext(schoolId, dto);

    const assessment = await this.prisma.assessment.create({
      data: {
        schoolId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        title: dto.title,
        type: dto.type,
        status: AssessmentStatus.ACTIVE,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdBy: userId,
      },
    });

    if (dto.subjects?.length) {
      const createdSubjects = await this.createAssessmentSubjects(
        assessment.id,
        dto.academicYearId,
        dto.subjects,
        userId,
        role,
      );

      // Get unique teacher IDs and send notifications
      const teacherMap = new Map<string, { className: string; subjectName: string }>();
      for (const item of dto.subjects) {
        const teacherId = item.teacherId;
        if (teacherId && !teacherMap.has(teacherId)) {
          const classRec = await this.prisma.class.findUnique({ where: { id: item.classId }, select: { name: true } });
          const subjectRec = await this.prisma.subject.findUnique({ where: { id: item.subjectId }, select: { name: true } });
          teacherMap.set(teacherId, { 
            className: classRec?.name || 'Unknown Class', 
            subjectName: subjectRec?.name || 'Unknown Subject' 
          });
        }
      }

      // Send notifications to all assigned teachers
      for (const [teacherId, data] of teacherMap) {
        await this.notificationService.notifyAssessmentCreated(
          schoolId,
          [teacherId],
          dto.title,
          dto.type,
          data.className,
          data.subjectName,
        );
      }
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

    // Get unique teacher IDs and send notifications
    const teacherMap = new Map<string, { className: string; subjectName: string }>();
    for (const item of dto.subjects) {
      const teacherId = item.teacherId;
      if (teacherId && !teacherMap.has(teacherId)) {
        const classRec = await this.prisma.class.findUnique({ where: { id: item.classId }, select: { name: true } });
        const subjectRec = await this.prisma.subject.findUnique({ where: { id: item.subjectId }, select: { name: true } });
        teacherMap.set(teacherId, { 
          className: classRec?.name || 'Unknown Class', 
          subjectName: subjectRec?.name || 'Unknown Subject' 
        });
      }
    }

    // Send notifications to all newly assigned teachers
    for (const [teacherId, data] of teacherMap) {
      await this.notificationService.notifyAssessmentCreated(
        schoolId,
        [teacherId],
        assessment.title,
        assessment.type,
        data.className,
        data.subjectName,
      );
    }

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

  async listAssessments(schoolId: string, query: Record<string, string>) {
    const where: any = { schoolId };
    if (query.academicYearId) where.academicYearId = query.academicYearId;
    if (query.termId) where.termId = query.termId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    return this.prisma.assessment.findMany({
      where,
      include: {
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        subjects: {
          include: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            _count: { select: { scores: true } },
          },
        },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getTeacherAssessments(
    teacherId: string,
    schoolId: string,
    query: Record<string, string>,
  ) {
    const assignments = await this.prisma.teacherSubjectAssignment.findMany({
      where: { teacherId, schoolId, isActive: true },
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
      const baseKey = `${assignment.classId}:${assignment.subjectId}`;
      const nullSectionKey = `${baseKey}:null`;
      const sectionKey = `${baseKey}:${assignment.sectionId}`;

      if (!assignmentCriteriaMap.has(nullSectionKey)) {
        assignmentCriteriaMap.set(nullSectionKey, {
          subjectId: assignment.subjectId,
          classId: assignment.classId,
          sectionId: null,
        });
      }

      if (!assignmentCriteriaMap.has(sectionKey)) {
        assignmentCriteriaMap.set(sectionKey, {
          subjectId: assignment.subjectId,
          classId: assignment.classId,
          sectionId: assignment.sectionId,
        });
      }
    }

    const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
      where: {
        assessment: {
          schoolId,
          ...(query.academicYearId
            ? { academicYearId: query.academicYearId }
            : {}),
          ...(query.termId ? { termId: query.termId } : {}),
          ...(query.type ? { type: query.type as AssessmentType } : {}),
        },
        OR: [
          { teacherId },
          ...Array.from(assignmentCriteriaMap.values()).map((assignment) => ({
            subjectId: assignment.subjectId,
            classId: assignment.classId,
            ...(assignment.sectionId === null
              ? {}
              : { sectionId: assignment.sectionId }),
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

    return assessmentSubjects.map((item) => {
      const scoreInfo = scoreStatusMap.get(item.id);
      let scoreStatus = 'NOT_STARTED';
      if (scoreInfo) {
        scoreStatus = scoreInfo.status;
      }
      
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
        maxScore: item.maxScore,
        startDate: item.assessment.startDate,
        endDate: item.assessment.endDate,
        scoreEntries: item._count.scores,
        scoreStatus: scoreStatus,
        canCreate: [AssessmentType.QUIZ, AssessmentType.TEST].some(
          (t) => t === item.assessment.type,
        ),
        canEditScores: item.assessment.status !== AssessmentStatus.LOCKED,
        isReadOnly: [AssessmentType.MID, AssessmentType.FINAL].some(
          (t) => t === item.assessment.type,
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

    // Debug: Check studentClass records
    const allRecords = await this.prisma.studentClass.findMany({
      where: { classId: assessmentSubject.classId },
      take: 10,
      include: {
        student: { select: { name: true } },
        section: { select: { name: true } },
      },
    });

    const existing = await this.prisma.studentAssessmentScore.findMany({
      where: { assessmentSubjectId },
    });
    const existingMap = new Map<string, (typeof existing)[number]>(
      existing.map((row) => [row.studentId, row]),
    );

    return {
      id: assessmentSubject.id,
      maxScore: assessmentSubject.maxScore,
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
        score.score > assessmentSubject.maxScore
      ) {
        throw new BadRequestException(
          `Score cannot exceed ${assessmentSubject.maxScore}`,
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

    for (const row of dto.scores) {
      await this.syncSubjectGradeForStudent(assessmentSubjectId, row.studentId);
    }

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

  async getMissingMarks(schoolId: string, query: Record<string, string>) {
    const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
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
    });

    const results: Array<{
      assessmentSubjectId: string;
      assessmentId: string;
      title: string;
      type: AssessmentType;
      subject: string;
      className: string;
      sectionName: string | null;
      expectedEntries: number;
      enteredEntries: number;
      missingEntries: number;
      isLocked: boolean;
    }> = [];
    for (const item of assessmentSubjects) {
      const studentCount = await this.prisma.studentClass.count({
        where: {
          academicYear: item.assessment.academicYearId,
          classId: item.classId,
          ...(item.sectionId ? { sectionId: item.sectionId } : {}),
        },
      });

      results.push({
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
      });
    }

    return results;
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
              type: row.type,
            },
          },
          update: {
            percentage: row.percentage,
            isActive: true,
          },
          create: {
            schoolId,
            type: row.type,
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
      const byType = new Map<AssessmentType, number[]>();
      for (const type of Object.values(AssessmentType)) byType.set(type, []);

      for (const item of group.assessments) {
        const typed = item as {
          type: AssessmentType;
          score: number | null;
          maxScore: number;
          isAbsent: boolean;
        };

        if (typed.isAbsent || typed.score === null) continue;
        byType.get(typed.type)!.push((typed.score / typed.maxScore) * 100);
      }

      const avg = (values: number[]) =>
        values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : null;

      const quiz = avg(byType.get(AssessmentType.QUIZ)!);
      const test = avg(byType.get(AssessmentType.TEST)!);
      const mid = avg(byType.get(AssessmentType.MID)!);
      const final = avg(byType.get(AssessmentType.FINAL)!);
      const attendance = avg(byType.get(AssessmentType.ATTENDANCE)!);

      const total =
        (quiz ?? 0) * (weights.QUIZ / 100) +
        (test ?? 0) * (weights.TEST / 100) +
        (mid ?? 0) * (weights.MID / 100) +
        (final ?? 0) * (weights.FINAL / 100) +
        (attendance ?? 0) * (weights.ATTENDANCE / 100);

      const hasAny = [quiz, test, mid, final, attendance].some(
        (value) => value !== null,
      );
      const summary =
        hasAny && group.assessments.length
          ? await this.getGradeFromScore(schoolId, total)
          : { gradeLetter: null, gradePoint: null };

      response.push({
        ...group,
        summary: {
          quizAverage: quiz,
          testAverage: test,
          midAverage: mid,
          finalAverage: final,
          totalScore: hasAny ? Math.round(total * 100) / 100 : null,
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
