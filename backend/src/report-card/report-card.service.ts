import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationService, NotificationType } from '../notification/notification.service';
import { SCHOOL_SETTING_KEYS } from '../school-settings/school-settings.service';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import archiver from 'archiver';
import { TemplatesService } from '../templates/templates.service';

export enum ReportCardStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

interface GenerateReportCardParams {
  schoolId: string;
  studentId: string;
  classId: string;
  sectionId: string;
  academicYear: string;
  termId: string;
  termName: string;
  generatedById: string;
}

interface BulkGenerateParams {
  schoolId: string;
  classId: string;
  sectionId: string;
  academicYear: string;
  termId: string;
  termName: string;
  generatedById: string;
}

interface PromotionParams {
  schoolId: string;
  studentId: string;
  fromClassId: string;
  fromAcademicYear: string;
  toClassId?: string | null;
  toAcademicYear: string;
  status: 'PROMOTED' | 'RETAINED' | 'GRADUATED';
}

interface BulkPromotionParams {
  schoolId: string;
  fromClassId: string;
  toClassId?: string | null;
  fromAcademicYear: string;
  toAcademicYear: string;
  studentIds: string[];
  promoteAll: boolean;
  minAverageGrade?: number;
  minAttendance?: number;
}

interface PromotionCriteria {
  minAverageGrade: number;
  minAttendance: number;
  allowFailedSubjects: number;
}

interface PromotionReadinessParams {
  schoolId: string;
  fromClassId: string;
  fromAcademicYear: string;
  studentIds?: string[];
  promoteAll?: boolean;
  criteria?: PromotionCriteria;
}

@Injectable()
export class ReportCardService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private templatesService: TemplatesService,
  ) {}

  private async resolveAcademicYearName(schoolId: string, academicYearId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true, name: true },
    });
    if (!year) {
      throw new NotFoundException('Academic year not found');
    }
    return year.name;
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
    const setting = await this.prisma.schoolSetting.findUnique({
      where: {
        schoolId_key: {
          schoolId,
          key: SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES,
        },
      },
      select: { value: true },
    });
    const value = this.parseSettingValue(setting?.value);

    if (value === false || value === 'false') {
      throw new BadRequestException(
        'Parent grade viewing is disabled for this school.',
      );
    }
  }

  private async ensureCurrentPeriodFeesPaid(
    studentId: string,
    schoolId: string,
    academicYearName?: string,
    termName?: string,
  ) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: academicYearName
        ? { schoolId, name: academicYearName }
        : { schoolId, isActive: true },
      select: { id: true },
    });

    if (!academicYear?.id) return;

    const term = termName
      ? await this.prisma.term.findFirst({
          where: { academicYearId: academicYear.id, name: termName },
          select: { id: true },
        })
      : await this.resolveCurrentTerm(academicYear.id);

    if (!term?.id) return;

    const clearance = await this.verifyFinancialClearanceForPeriod(
      studentId,
      schoolId,
      academicYear.id,
      term.id,
    );

    if (!clearance) {
      throw new ForbiddenException(
        'Results are locked until the current term or semester fees are paid.',
      );
    }
  }

  private async resolveCurrentTerm(academicYearId: string) {
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

    if (currentTerm) return currentTerm;

    return this.prisma.term.findFirst({
      where: { academicYearId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
  }

  private async verifyFinancialClearanceForPeriod(
    studentId: string,
    schoolId: string,
    academicYearId: string,
    termId: string,
  ) {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        OR: [{ id: studentId }, { userId: studentId }],
      },
      select: { id: true, userId: true },
    });

    if (!studentProfile) return false;

    const outstandingFees = await this.prisma.studentFee.findMany({
      where: {
        studentId: {
          in: [studentProfile.id, studentProfile.userId].filter(Boolean) as string[],
        },
        schoolId,
        academicYearId,
        status: { not: 'PAID' },
      },
      include: { payments: true },
    });

    const terms = await this.prisma.term.findMany({
      where: { academicYearId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    const periodCount = terms.length || 1;
    const termBoundOutstanding = outstandingFees.filter(
      (fee) => fee.termId && fee.termId === termId,
    );
    const annualBlockingFees = outstandingFees
      .filter((fee) => !fee.termId)
      .filter((fee) => {
        const paidAmount =
          fee.payments
            ?.filter((payment) => payment.termId === termId)
            .reduce((sum, payment) => sum + payment.amountPaid, 0) || 0;
        const requiredPerPeriod =
          Number(fee.finalAmount || 0) / Math.max(periodCount, 1);
        return paidAmount + 0.0001 < requiredPerPeriod;
      });

    return termBoundOutstanding.length === 0 && annualBlockingFees.length === 0;
  }

  private async resolveTermName(termId: string) {
    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      select: { id: true, name: true },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    return term.name;
  }

  private parseGradeDetails(gradeDetails?: string | null): Array<Record<string, any>> {
    if (!gradeDetails) return [];
    try {
      const parsed = JSON.parse(gradeDetails);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async verifyParentChild(parentId: string, childId: string) {
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId: parentId },
      select: { id: true, schoolId: true },
    });
    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: { OR: [{ id: childId }, { userId: childId }] },
      select: { id: true },
    });
    if (!studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const link = await this.prisma.parentStudent.findFirst({
      where: { parentId: parentProfile.id, studentId: studentProfile.id },
      select: { id: true, student: { select: { userId: true } } },
    });
    if (!link?.student?.userId) {
      throw new BadRequestException('You are not linked to this student');
    }

    return {
      studentUserId: link.student.userId,
      schoolId: parentProfile.schoolId,
    };
  }

  private async recordPromotionHistory(input: {
    schoolId: string;
    studentId: string;
    fromClassId: string;
    toClassId?: string | null;
    fromAcademicYear: string;
    toAcademicYear: string;
    status: string;
    reportCardId?: string | null;
    averageGrade?: number | null;
    attendance?: number | null;
  }) {
    await this.prisma.$executeRaw`
      INSERT INTO "PromotionRecord"
        ("id", "schoolId", "studentId", "fromClassId", "toClassId", "fromAcademicYear", "toAcademicYear", "status", "reportCardId", "averageGrade", "attendance", "promotedAt", "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid()::text, ${input.schoolId}, ${input.studentId}, ${input.fromClassId}, ${input.toClassId ?? null}, ${input.fromAcademicYear}, ${input.toAcademicYear}, ${input.status}, ${input.reportCardId ?? null}, ${input.averageGrade ?? null}, ${input.attendance ?? null}, NOW(), NOW(), NOW())
    `;
  }

  private getEffectiveSubjectTotalScore(grade: {
    caScore?: number | null;
    midScore?: number | null;
    finalScore?: number | null;
    totalScore?: number | null;
  }): number | null {
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

  private async ensurePromotionReadiness(params: PromotionReadinessParams) {
    const {
      schoolId,
      fromClassId,
      fromAcademicYear,
      studentIds = [],
      promoteAll = false,
      criteria,
    } = params;

    const classInfo = await this.prisma.class.findUnique({
      where: { id: fromClassId },
      select: {
        id: true,
        name: true,
        schoolId: true,
        academicYearId: true,
      },
    });

    if (!classInfo || classInfo.schoolId !== schoolId) {
      throw new NotFoundException('Source class not found');
    }

    const enrollments = await this.prisma.studentClass.findMany({
      where: {
        classId: fromClassId,
        academicYear: fromAcademicYear,
        ...(promoteAll ? {} : { studentId: { in: studentIds } }),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (enrollments.length === 0) {
      throw new BadRequestException('No students found for this promotion batch');
    }

    if (!promoteAll && studentIds.length !== enrollments.length) {
      throw new BadRequestException(
        'Some selected students are not enrolled in the chosen source class',
      );
    }

    const candidateResponse = await this.getPromotionCandidates(
      fromClassId,
      fromAcademicYear,
      criteria,
    );
    const candidateMap = new Map(
      candidateResponse.candidates.map((candidate) => [
        candidate.student.id,
        candidate,
      ]),
    );

    const blockedStudents: string[] = [];
    const missingReportCards: string[] = [];
    const incompleteAssessments: string[] = [];

    for (const enrollment of enrollments) {
      const candidate = candidateMap.get(enrollment.studentId);
      if (!candidate || candidate.status !== 'PROMOTED') {
        blockedStudents.push(enrollment.student.name);
        continue;
      }

      const reportCard = await this.prisma.reportCard.findFirst({
        where: {
          schoolId,
          studentId: enrollment.studentId,
          classId: fromClassId,
          academicYear: fromAcademicYear,
          status: ReportCardStatus.PUBLISHED,
        },
        orderBy: [
          { publishedAt: 'desc' },
          { updatedAt: 'desc' },
        ],
      });

      if (!reportCard) {
        missingReportCards.push(enrollment.student.name);
        continue;
      }

      const gradeDetails = this.parseGradeDetails(reportCard.gradeDetails);
      if (
        gradeDetails.length === 0 ||
        reportCard.percentage === null ||
        reportCard.attendancePercentage === null
      ) {
        incompleteAssessments.push(enrollment.student.name);
        continue;
      }

      const expectedSubjects = await this.prisma.classSubject.findMany({
        where: {
          classId: fromClassId,
          sectionId: enrollment.sectionId,
          academicYear: classInfo.academicYearId,
        },
        select: {
          subjectId: true,
        },
      });

      const expectedSubjectIds = new Set(
        expectedSubjects.map((subject) => subject.subjectId),
      );

      const reportedSubjectIds = new Set(
        gradeDetails
          .map((detail) => String(detail.subjectId || '').trim())
          .filter(Boolean),
      );

      if (
        expectedSubjectIds.size > 0 &&
        reportedSubjectIds.size < expectedSubjectIds.size
      ) {
        incompleteAssessments.push(enrollment.student.name);
        continue;
      }

      const approvedGrades = await this.prisma.subjectGrade.findMany({
        where: {
          schoolId,
          studentId: enrollment.studentId,
          classId: fromClassId,
          sectionId: enrollment.sectionId,
          academicYear: fromAcademicYear,
          status: { in: ['SUBMITTED', 'APPROVED'] as any },
          totalScore: { not: null },
        },
        select: {
          subjectId: true,
        },
      });

      const approvedSubjectIds = new Set(
        approvedGrades.map((grade) => grade.subjectId),
      );

      if (
        expectedSubjectIds.size > 0 &&
        approvedSubjectIds.size < expectedSubjectIds.size
      ) {
        incompleteAssessments.push(enrollment.student.name);
      }
    }

    if (missingReportCards.length > 0) {
      throw new BadRequestException(
        `Promotion blocked: published report cards are missing for ${missingReportCards.slice(0, 5).join(', ')}${missingReportCards.length > 5 ? ' and others' : ''}`,
      );
    }

    if (incompleteAssessments.length > 0) {
      throw new BadRequestException(
        `Promotion blocked: some assessments or subject grades are incomplete for ${incompleteAssessments.slice(0, 5).join(', ')}${incompleteAssessments.length > 5 ? ' and others' : ''}`,
      );
    }

    if (blockedStudents.length > 0) {
      throw new BadRequestException(
        `Promotion blocked: these students are not currently eligible for promotion: ${blockedStudents.slice(0, 5).join(', ')}${blockedStudents.length > 5 ? ' and others' : ''}`,
      );
    }

    return { classInfo, enrollments };
  }

  /**
   * Get grade letter from grade scale
   */
  private async getGradeLetter(
    schoolId: string,
    score: number,
  ): Promise<{ letter: string; point: number }> {
    const gradeScale = await this.prisma.gradeScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { minScore: 'desc' },
    });

    if (gradeScale.length === 0) {
      const defaultScale = [
        { letter: 'A', min: 90, point: 4.0 },
        { letter: 'B', min: 80, point: 3.5 },
        { letter: 'C', min: 70, point: 3.0 },
        { letter: 'D', min: 60, point: 2.5 },
        { letter: 'F', min: 0, point: 0.0 },
      ];
      for (const grade of defaultScale) {
        if (score >= grade.min) {
          return { letter: grade.letter, point: grade.point };
        }
      }
    }

    for (const grade of gradeScale) {
      if (score >= grade.minScore) {
        return { letter: grade.gradeLetter, point: grade.gradePoint };
      }
    }

    return { letter: 'F', point: 0.0 };
  }

  /**
   * Calculate attendance percentage for a student in a term
   */
  private async calculateAttendance(
    studentId: string,
    termId: string,
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    percentage: number;
  }> {
    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      select: { startDate: true, endDate: true },
    });

    if (!term) {
      return { totalDays: 0, presentDays: 0, absentDays: 0, percentage: 0 };
    }

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        studentId,
        date: {
          gte: term.startDate,
          lte: term.endDate,
        },
      },
    });

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (a) => a.status === 'PRESENT',
    ).length;
    const absentDays = attendanceRecords.filter(
      (a) => a.status === 'ABSENT',
    ).length;
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return { totalDays, presentDays, absentDays, percentage };
  }

  /**
   * Generate a single student's report card
   */
  async generateReportCard(params: GenerateReportCardParams) {
    const {
      schoolId,
      studentId,
      classId,
      sectionId,
      academicYear,
      termId,
      termName,
      generatedById,
    } = params;

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

    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const subjectGrades = await this.prisma.subjectGrade.findMany({
      where: {
        studentId,
        classId,
        academicYear: academicYearId,
        termId,
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        gradeScores: {
          include: {
            component: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: [{ component: { createdAt: 'asc' } }],
        },
      },
    });

    const attendance = await this.calculateAttendance(studentId, termId);

    let totalMarks = 0;
    let subjectCount = 0;
    const gradeDetails: Record<string, any>[] = [];

    for (const sg of subjectGrades) {
      const effectiveTotalScore = this.getEffectiveSubjectTotalScore(sg);
      if (effectiveTotalScore !== null && effectiveTotalScore !== undefined) {
        const { letter, point } = await this.getGradeLetter(
          schoolId,
          effectiveTotalScore,
        );
        gradeDetails.push({
          subjectId: sg.subjectId,
          subjectName: sg.subject.name,
          subjectCode: sg.subject.code,
          assessmentBreakdown: (sg.gradeScores || []).map((item) => ({
            assessmentSubjectId: item.id,
            title: item.component?.name || item.component?.code || 'Assessment',
            type: item.component?.code || '',
            maxScore: item.maxScore,
            score: item.score ?? null,
            status: sg.status,
          })),
          caScore: sg.caScore,
          midScore: sg.midScore,
          finalScore: sg.finalScore,
          totalScore: effectiveTotalScore,
          gradeLetter: letter,
          gradePoint: point,
          status: sg.status,
        });
        totalMarks += effectiveTotalScore;
        subjectCount++;
      }
    }

    const percentage = subjectCount > 0 ? totalMarks / subjectCount : 0;
    const { letter: overallGrade } = await this.getGradeLetter(
      schoolId,
      percentage,
    );

    const existingReportCard = await this.prisma.reportCard.findFirst({
      where: {
        schoolId,
        studentId,
        classId,
        sectionId,
        academicYear: academicYearName,
        term: termName,
      },
    });

    let reportCard;
    if (existingReportCard) {
      reportCard = await this.prisma.reportCard.update({
        where: { id: existingReportCard.id },
        data: {
          totalMarks,
          percentage,
          overallGrade,
          totalDays: attendance.totalDays,
          presentDays: attendance.presentDays,
          absentDays: attendance.absentDays,
          attendancePercentage: attendance.percentage,
          gradeDetails: JSON.stringify(gradeDetails),
          generatedById,
        },
      });
    } else {
      reportCard = await this.prisma.reportCard.create({
        data: {
          schoolId,
          studentId,
          classId,
          sectionId,
          academicYear: academicYearName,
          term: termName,
          status: ReportCardStatus.DRAFT,
          totalMarks,
          percentage,
          overallGrade,
          totalDays: attendance.totalDays,
          presentDays: attendance.presentDays,
          absentDays: attendance.absentDays,
          attendancePercentage: attendance.percentage,
          gradeDetails: JSON.stringify(gradeDetails),
          generatedById,
        },
      });
    }

    return reportCard;
  }

  /**
   * Bulk generate report cards for a class
   */
  async bulkGenerate(params: BulkGenerateParams) {
    const {
      schoolId,
      classId,
      sectionId,
      academicYear,
      termId,
      termName,
      generatedById,
    } = params;

    const students = await this.prisma.studentClass.findMany({
      where: { schoolId, classId, sectionId, academicYear },
      include: {
        student: { select: { id: true, name: true } },
      },
    });

    const results = {
      generated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const sc of students) {
      try {
        await this.generateReportCard({
          schoolId,
          studentId: sc.studentId,
          classId,
          sectionId,
          academicYear,
          termId,
          termName,
          generatedById,
        });
        results.generated++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${sc.student.name}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get report cards with filters
   */
  async getReportCards(
    schoolId: string,
    filters: {
      classId?: string;
      academicYear?: string;
      term?: string;
      status?: ReportCardStatus;
      studentId?: string;
    },
  ) {
    const whereClause: any = { schoolId };

    if (filters.classId) whereClause.classId = filters.classId;
    if (filters.academicYear) whereClause.academicYear = filters.academicYear;
    if (filters.term) whereClause.term = filters.term;
    if (filters.status) whereClause.status = filters.status;
    if (filters.studentId) whereClause.studentId = filters.studentId;

    const reportCards = await this.prisma.reportCard.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, name: true, avatarUrl: true },
        },
        class: {
          select: { id: true, name: true, section: true, grade: true },
        },
        generatedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ class: { name: 'asc' } }, { percentage: 'desc' }],
    });

    return reportCards.map((rc) => ({
      ...rc,
      gradeDetails: rc.gradeDetails ? JSON.parse(rc.gradeDetails) : [],
    }));
  }

  async getPublishedReportCardsForParent(
    parentId: string,
    childId: string,
    filters?: {
      academicYear?: string;
      term?: string;
    },
  ) {
    const { studentUserId, schoolId } = await this.verifyParentChild(
      parentId,
      childId,
    );
    await this.ensureParentGradeAccessEnabled(schoolId);
    await this.ensureCurrentPeriodFeesPaid(
      studentUserId,
      schoolId,
      filters?.academicYear,
      filters?.term,
    );

    const whereClause: any = {
      studentId: studentUserId,
      schoolId,
      status: ReportCardStatus.PUBLISHED,
    };

    if (filters?.academicYear) whereClause.academicYear = filters.academicYear;
    if (filters?.term) whereClause.term = filters.term;

    const reportCards = await this.prisma.reportCard.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, name: true, avatarUrl: true },
        },
        class: {
          select: { id: true, name: true, section: true, grade: true },
        },
        generatedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { publishedAt: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return reportCards.map((rc) => ({
      ...rc,
      gradeDetails: rc.gradeDetails ? JSON.parse(rc.gradeDetails) : [],
    }));
  }

  async getPublishedReportCardsForStudent(
    schoolId: string,
    studentId: string,
    filters?: {
      academicYear?: string;
      term?: string;
    },
  ) {
    const whereClause: any = {
      schoolId,
      studentId,
      status: ReportCardStatus.PUBLISHED,
    };

    if (filters?.academicYear) whereClause.academicYear = filters.academicYear;
    if (filters?.term) whereClause.term = filters.term;

    const reportCards = await this.prisma.reportCard.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, name: true, avatarUrl: true },
        },
        class: {
          select: { id: true, name: true, section: true, grade: true },
        },
        generatedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { publishedAt: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return reportCards.map((rc) => ({
      ...rc,
      gradeDetails: rc.gradeDetails ? JSON.parse(rc.gradeDetails) : [],
    }));
  }

  async getPublishSummary(
    schoolId: string,
    academicYearId: string,
    termId: string,
  ) {
    const [academicYearName, termName] = await Promise.all([
      this.resolveAcademicYearName(schoolId, academicYearId),
      this.resolveTermName(termId),
    ]);
    const academicYearKeys = Array.from(
      new Set([academicYearId, academicYearName].filter(Boolean)),
    );

    const [classes, enrollments, reportCards] = await Promise.all([
      this.prisma.class.findMany({
        where: { schoolId, academicYearId },
        select: { id: true, name: true, grade: true, section: true },
        orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.studentClass.findMany({
        where: {
          schoolId,
          academicYear: { in: academicYearKeys },
        },
        select: { classId: true, studentId: true },
      }),
      this.prisma.reportCard.findMany({
        where: {
          schoolId,
          academicYear: { in: academicYearKeys },
          term: termName,
        },
        include: {
          class: {
            select: { id: true, name: true, grade: true, section: true },
          },
        },
      }),
    ]);

    const expectedByClass = new Map<string, number>();
    const studentIdsByClass = new Map<string, Set<string>>();
    for (const enrollment of enrollments) {
      const bucket =
        studentIdsByClass.get(enrollment.classId) ?? new Set<string>();
      bucket.add(enrollment.studentId);
      studentIdsByClass.set(enrollment.classId, bucket);
    }
    for (const [classId, studentIds] of studentIdsByClass.entries()) {
      expectedByClass.set(classId, studentIds.size);
    }

    const cardsByClass = new Map<string, typeof reportCards>();
    for (const card of reportCards) {
      const bucket = cardsByClass.get(card.classId) ?? [];
      bucket.push(card);
      cardsByClass.set(card.classId, bucket);
    }

    return classes.map((cls) => {
      const classCards = cardsByClass.get(cls.id) ?? [];
      const expectedEntries = expectedByClass.get(cls.id) ?? 0;
      const generatedStudentIds = new Set(
        classCards.map((card) => card.studentId),
      );
      const publishedStudentIds = new Set(
        classCards
          .filter((card) => card.status === ReportCardStatus.PUBLISHED)
          .map((card) => card.studentId),
      );
      const publishedEntries = publishedStudentIds.size;
      const generatedEntries = generatedStudentIds.size;
      const missingEntries = Math.max(expectedEntries - generatedEntries, 0);
      const completeStudentIds = new Set(
        classCards
          .filter((card) => {
            const details = this.parseGradeDetails(card.gradeDetails);
            return (
              details.length > 0 &&
              card.percentage !== null &&
              card.totalMarks !== null &&
              card.attendancePercentage !== null
            );
          })
          .map((card) => card.studentId),
      );
      const hasIncompleteCards = completeStudentIds.size < expectedEntries;

      let status: 'published' | 'ready' | 'has_issues' | 'no_students' =
        'has_issues';
      const expectedStudentIds = studentIdsByClass.get(cls.id) ?? new Set<string>();
      const allExpectedPublished = Array.from(expectedStudentIds).every(
        (studentId) => publishedStudentIds.has(studentId),
      );
      const allExpectedGenerated = Array.from(expectedStudentIds).every(
        (studentId) => generatedStudentIds.has(studentId),
      );
      if (expectedEntries === 0) {
        status = 'no_students';
      } else if (allExpectedPublished) {
        status = 'published';
      } else if (
        allExpectedGenerated &&
        missingEntries === 0 &&
        !hasIncompleteCards
      ) {
        status = 'ready';
      }

      return {
        classId: cls.id,
        className: cls.name,
        grade: cls.grade,
        sectionName: cls.section ?? null,
        expectedEntries,
        generatedEntries,
        publishedEntries,
        draftEntries: Math.max(generatedEntries - publishedEntries, 0),
        missingEntries,
        status,
      };
    });
  }

  /**
   * Get single report card by ID
   */
  async getReportCardById(id: string, schoolId: string) {
    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id, schoolId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
            phone: true,
          },
        },
        class: {
          select: { id: true, name: true, section: true, grade: true },
        },
        generatedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found');
    }

    return {
      ...reportCard,
      gradeDetails: reportCard.gradeDetails
        ? JSON.parse(reportCard.gradeDetails)
        : [],
    };
  }

  async getCertificateTemplate(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, phone: true, address: true, logoUrl: true },
    });

    const stored = await this.prisma.schoolSetting.findFirst({
      where: { schoolId, key: SCHOOL_SETTING_KEYS.CERTIFICATE_TEMPLATE },
      select: { value: true },
    });

    let template: any = {};
    if (stored?.value) {
      try {
        template = JSON.parse(stored.value);
      } catch {
        template = {};
      }
    }

    return {
      schoolId,
      title: template.title || 'Student Result Certificate',
      themeColor: template.themeColor || '#1f2937',
      templateBackgroundUrl: template.templateBackgroundUrl || '',
      principalName: template.principalName || '',
      schoolName: template.schoolName || school?.name || '',
      schoolPhone: template.schoolPhone || school?.phone || '',
      schoolAddress: template.schoolAddress || school?.address || '',
      schoolLogoUrl: template.schoolLogoUrl || school?.logoUrl || '',
    };
  }

  async saveCertificateTemplate(schoolId: string, value: Record<string, any>) {
    const normalized = {
      title: String(value.title || 'Student Result Certificate').trim(),
      themeColor: String(value.themeColor || '#1f2937').trim(),
      templateBackgroundUrl: String(value.templateBackgroundUrl || '').trim(),
      principalName: String(value.principalName || '').trim(),
      schoolName: String(value.schoolName || '').trim(),
      schoolPhone: String(value.schoolPhone || '').trim(),
      schoolAddress: String(value.schoolAddress || '').trim(),
      schoolLogoUrl: String(value.schoolLogoUrl || '').trim(),
    };

    const existing = await this.prisma.schoolSetting.findFirst({
      where: { schoolId, key: SCHOOL_SETTING_KEYS.CERTIFICATE_TEMPLATE },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.schoolSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(normalized) },
      });
    } else {
      await this.prisma.schoolSetting.create({
        data: {
          schoolId,
          key: SCHOOL_SETTING_KEYS.CERTIFICATE_TEMPLATE,
          value: JSON.stringify(normalized),
        },
      });
    }

    return this.getCertificateTemplate(schoolId);
  }

  async getCertificatePayload(reportCardId: string, schoolId: string) {
    const template = await this.getCertificateTemplate(schoolId);
    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id: reportCardId, schoolId },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true } },
        class: { select: { id: true, name: true, section: true, grade: true } },
      },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found');
    }

    return {
      template,
      reportCard: {
        id: reportCard.id,
        term: reportCard.term,
        academicYear: reportCard.academicYear,
        rankInClass: reportCard.rankInClass,
        totalMarks: reportCard.totalMarks,
        percentage: reportCard.percentage,
        overallGrade: reportCard.overallGrade,
        student: reportCard.student,
        class: reportCard.class,
        gradeDetails: this.parseGradeDetails(reportCard.gradeDetails),
      },
    };
  }

  async uploadCertificateTemplate(
    schoolId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const backendPublicDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'certificate-templates',
    );
    const frontendPublicDir = path.join(
      process.cwd(),
      '..',
      'frontend',
      'public',
      'uploads',
      'certificate-templates',
    );

    if (!fs.existsSync(backendPublicDir)) {
      fs.mkdirSync(backendPublicDir, { recursive: true });
    }
    if (!fs.existsSync(frontendPublicDir)) {
      fs.mkdirSync(frontendPublicDir, { recursive: true });
    }

    const fileName = `${schoolId}-${Date.now()}${path.extname(file.originalname)}`;
    const backendFilePath = path.join(backendPublicDir, fileName);
    const frontendFilePath = path.join(frontendPublicDir, fileName);

    fs.writeFileSync(backendFilePath, file.buffer);
    fs.copyFileSync(backendFilePath, frontendFilePath);

    return `/uploads/certificate-templates/${fileName}`;
  }

  private resolvePublicAssetPath(urlPath: string): string {
    const clean = String(urlPath || '').trim().replace(/^\/+/, '');
    return path.join(process.cwd(), '..', 'frontend', 'public', clean);
  }

  async generateCertificatePdf(schoolId: string, reportCardId: string): Promise<Buffer> {
    const activeTemplate = await this.templatesService.getActiveTemplate(schoolId, 'CERTIFICATE');
    if (!activeTemplate?.backgroundUrl) {
      throw new BadRequestException('Activate a certificate template first');
    }
    const templatePath = this.resolvePublicAssetPath(activeTemplate.backgroundUrl);
    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException('Certificate template file not found');
    }

    const payload = await this.getCertificatePayload(reportCardId, schoolId);
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPage(0);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    const fieldMap: any[] = (() => {
      try {
        return activeTemplate.fieldMapJson ? JSON.parse(activeTemplate.fieldMapJson) : [];
      } catch {
        return [];
      }
    })();

    const valueFor = (key: string) => {
      const studentName = payload.reportCard.student?.name || '';
      const className = payload.reportCard.class?.name || '';
      const year = payload.reportCard.academicYear || '';
      const term = payload.reportCard.term || '';
      const totalMarks = payload.reportCard.totalMarks ?? '-';
      const percentage = payload.reportCard.percentage ?? '-';
      const grade = payload.reportCard.overallGrade ?? '-';
      const rank = payload.reportCard.rankInClass ?? '-';
      const schoolName = payload.template.schoolName || '';
      switch (key) {
        case 'student_name': return studentName;
        case 'class':
        case 'grade': return className;
        case 'section': return payload.reportCard.class?.section || '';
        case 'academic_year': return year;
        case 'issue_date': return new Date().toISOString().slice(0, 10);
        case 'cert_id': return payload.reportCard.id || '';
        case 'school_name': return schoolName;
        case 'term': return term;
        case 'total_marks': return String(totalMarks);
        case 'percentage': return String(percentage);
        case 'grade': return String(grade);
        case 'ranking':
        case 'rank': return String(rank);
        case 'school_address': return payload.template.schoolAddress || '';
        case 'school_phone': return payload.template.schoolPhone || '';
        case 'school_email': return '';
        case 'title': return payload.template.title || 'Student Result Certificate';
        case 'principal_name': return payload.template.principalName || '';
        default: return '';
      }
    };

    const templateConfig = fieldMap.reduce<Record<string, string>>((acc, field) => {
      if (field?.field_key && field.value !== undefined) {
        acc[String(field.field_key)] = String(field.value);
      }
      return acc;
    }, {});
    const renderTemplateText = (input: string) =>
      String(input || '').replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => valueFor(key));
    const drawWrappedText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      size: number,
      textFont = font,
      lineHeight = size * 1.35,
    ) => {
      const words = renderTemplateText(text).split(/\s+/).filter(Boolean);
      let line = '';
      let cursorY = y;
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (textFont.widthOfTextAtSize(next, size) > maxWidth && line) {
          page.drawText(line, { x, y: cursorY, size, font: textFont, color: rgb(0, 0, 0) });
          cursorY -= lineHeight;
          line = word;
        } else {
          line = next;
        }
      }
      if (line) {
        page.drawText(line, { x, y: cursorY, size, font: textFont, color: rgb(0, 0, 0) });
      }
    };

    const drawAlignedText = (
      text: string,
      x: number,
      y: number,
      boxWidth: number,
      size: number,
      align: 'left' | 'center' | 'right',
      textFont = font,
    ) => {
      const rendered = renderTemplateText(text);
      if (!rendered) return;
      const textWidth = textFont.widthOfTextAtSize(rendered, size);
      const resolvedX =
        align === 'center' ? x + (boxWidth - textWidth) / 2 : align === 'right' ? x + boxWidth - textWidth : x;
      page.drawText(rendered, { x: resolvedX, y, size, font: textFont, color: rgb(0, 0, 0) });
    };

    const hasContentConfig = [
      'headerLeftText',
      'headerCenterText',
      'headerRightText',
      'bodyText',
      'footerLeftText',
      'footerCenterText',
      'footerRightText',
    ].some((key) => templateConfig[key]);

    if (hasContentConfig) {
      const marginX = width * 0.06;
      const innerWidth = width - marginX * 2;
      const headerTopY = height * 0.92;
      const bodyTopY = height * (1 - (Number(templateConfig.headerHeight || 18) + 8) / 100);
      const footerY = height * 0.08;
      const colWidth = innerWidth / 3;
      drawAlignedText(templateConfig.headerLeftText || '', marginX, headerTopY, colWidth, 9, 'left', font);
      drawAlignedText(templateConfig.headerCenterText || '', marginX + colWidth, headerTopY, colWidth, 14, 'center', bold);
      drawAlignedText(templateConfig.headerRightText || '', marginX + colWidth * 2, headerTopY, colWidth, 9, 'right', font);
      drawWrappedText(
        templateConfig.bodyText || '',
        width * ((100 - Number(templateConfig.bodyWidth || 82)) / 200),
        bodyTopY,
        width * (Number(templateConfig.bodyWidth || 82) / 100),
        12,
        font,
        17,
      );
      drawAlignedText(templateConfig.footerLeftText || '', marginX, footerY, colWidth, 9, 'left', font);
      drawAlignedText(templateConfig.footerCenterText || '', marginX + colWidth, footerY, colWidth, 9, 'center', font);
      drawAlignedText(templateConfig.footerRightText || '', marginX + colWidth * 2, footerY, colWidth, 9, 'right', font);
    }

    const drawGradesTable = (x: number, yTop: number, w: number, h: number) => {
      const startY = yTop;
      const bottomY = yTop - h;
      let rowY = startY;
      const col1 = x;
      const col2 = x + w * 0.66;
      const col3 = x + w * 0.84;
      page.drawText('Subject', { x: col1, y: rowY, size: 10, font: bold });
      page.drawText('Total', { x: col2, y: rowY, size: 10, font: bold });
      page.drawText('Grade', { x: col3, y: rowY, size: 10, font: bold });
      rowY -= 14;
      for (const g of (payload.reportCard.gradeDetails || []).slice(0, 24)) {
        if (rowY < bottomY + 10) break;
        page.drawText(String(g.subjectName || ''), { x: col1, y: rowY, size: 9, font });
        page.drawText(String(g.totalScore ?? ''), { x: col2, y: rowY, size: 9, font });
        page.drawText(String(g.gradeLetter || ''), { x: col3, y: rowY, size: 9, font });
        rowY -= 12;
      }
    };

    if (Array.isArray(fieldMap) && fieldMap.length > 0) {
      for (const f of fieldMap) {
        const x = width * (Number(f.x_percent ?? 0) / 100);
        const y = height * (1 - Number(f.y_percent ?? 0) / 100);
        const w = width * (Number(f.width_percent ?? 0) / 100 || 0.16);
        const h = height * (Number(f.height_percent ?? 0) / 100 || 0.14);
        const size = Number(f.font_size ?? 10);
        const raw = String(f.font_color || '#000000').replace('#', '');
        const r = parseInt(raw.slice(0, 2) || '00', 16) / 255;
        const g = parseInt(raw.slice(2, 4) || '00', 16) / 255;
        const b = parseInt(raw.slice(4, 6) || '00', 16) / 255;
        const key = String(f.field_key || '');

        if (key === 'marks_table') {
          drawGradesTable(x, y, w, h);
          continue;
        }

        if (key === 'school_logo' && payload.template.schoolLogoUrl) {
          try {
            const logoPath = this.resolvePublicAssetPath(payload.template.schoolLogoUrl);
            if (fs.existsSync(logoPath)) {
              const logoBytes = fs.readFileSync(logoPath);
              const isPng = payload.template.schoolLogoUrl.toLowerCase().endsWith('.png');
              const img = isPng ? await pdfDoc.embedPng(logoBytes) : await pdfDoc.embedJpg(logoBytes);
              page.drawImage(img, { x, y: y - h, width: w, height: h });
            }
          } catch {}
          continue;
        }

        const text = String(valueFor(key));
        if (!text) continue;
        page.drawText(text, {
          x,
          y,
          size,
          font: f.bold ? bold : font,
          color: rgb(r, g, b),
        });
      }
    } else {
      page.drawText(payload.template.title || 'Student Result Certificate', {
        x: width * 0.07, y: height * 0.9, size: 16, font: bold, color: rgb(0, 0, 0),
      });
      page.drawText(payload.template.schoolName || '', { x: width * 0.07, y: height * 0.865, size: 11, font });
      page.drawText(`${payload.template.schoolAddress || ''} ${payload.template.schoolPhone || ''}`.trim(), {
        x: width * 0.07, y: height * 0.845, size: 9, font,
      });

      page.drawText(`Student: ${payload.reportCard.student?.name || ''}`, { x: width * 0.07, y: height * 0.78, size: 12, font: bold });
      page.drawText(`Class: ${payload.reportCard.class?.name || ''}`, { x: width * 0.07, y: height * 0.755, size: 10, font });
      page.drawText(`Academic Year: ${payload.reportCard.academicYear || ''}`, { x: width * 0.07, y: height * 0.735, size: 10, font });
      page.drawText(`Term: ${payload.reportCard.term || ''}`, { x: width * 0.07, y: height * 0.715, size: 10, font });
      page.drawText(`Total Marks: ${payload.reportCard.totalMarks ?? '-'}`, { x: width * 0.07, y: height * 0.695, size: 10, font });
      page.drawText(`Rank: ${payload.reportCard.rankInClass ?? '-'}`, { x: width * 0.07, y: height * 0.675, size: 10, font });
      drawGradesTable(width * 0.07, height * 0.62, width * 0.78, height * 0.5);
    }

    return Buffer.from(await pdfDoc.save());
  }

  async generateCertificateBulkZip(schoolId: string, reportCardIds: string[]): Promise<Buffer> {
    const ids = (reportCardIds || []).filter(Boolean);
    if (!ids.length) throw new BadRequestException('No report card IDs provided');
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', (d) => chunks.push(d));
    await Promise.all(ids.map(async (id) => {
      const pdf = await this.generateCertificatePdf(schoolId, id);
      archive.append(pdf, { name: `certificate-${id}.pdf` });
    }));
    await archive.finalize();
    return await new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });
  }

  /**
   * Publish report cards
   */
  async publishReportCards(ids: string[], schoolId: string) {
    const reportCards = await this.prisma.reportCard.findMany({
      where: { id: { in: ids }, schoolId },
    });

    if (reportCards.length === 0) {
      throw new NotFoundException('No report cards found');
    }

    const updated = await this.prisma.reportCard.updateMany({
      where: { id: { in: ids }, schoolId },
      data: {
        status: ReportCardStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    return { published: updated.count };
  }

  async publishResultsForClass(params: {
    schoolId: string;
    academicYearId: string;
    termId: string;
    classId: string;
    notifyStudents?: boolean;
    notifyParents?: boolean;
  }) {
    const {
      schoolId,
      academicYearId,
      termId,
      classId,
      notifyStudents = true,
      notifyParents = true,
    } = params;

    const [academicYearName, termName, classRecord] = await Promise.all([
      this.resolveAcademicYearName(schoolId, academicYearId),
      this.resolveTermName(termId),
      this.prisma.class.findFirst({
        where: { id: classId, schoolId, academicYearId },
        select: { id: true, name: true, grade: true, section: true },
      }),
    ]);
    const academicYearKeys = Array.from(
      new Set([academicYearId, academicYearName].filter(Boolean)),
    );

    if (!classRecord) {
      throw new NotFoundException('Class not found');
    }

    const [enrollments, reportCards] = await Promise.all([
      this.prisma.studentClass.findMany({
        where: {
          schoolId,
          classId,
          academicYear: { in: academicYearKeys },
        },
        select: { studentId: true },
      }),
      this.prisma.reportCard.findMany({
        where: {
          schoolId,
          classId,
          academicYear: { in: academicYearKeys },
          term: termName,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentProfile: {
                select: {
                  id: true,
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
      }),
    ]);
    const uniqueEnrollmentStudentIds = new Set(
      enrollments.map((enrollment) => enrollment.studentId),
    );

    if (uniqueEnrollmentStudentIds.size === 0) {
      throw new BadRequestException('No enrolled students found for this class');
    }

    const reportCardStudentIds = new Set(
      reportCards.map((card) => card.studentId),
    );
    const missingReportCardStudentIds = Array.from(
      uniqueEnrollmentStudentIds,
    ).filter((studentId) => !reportCardStudentIds.has(studentId));

    if (missingReportCardStudentIds.length > 0) {
      throw new BadRequestException(
        'Results cannot be published yet because some students are still missing report cards',
      );
    }

    const isCompleteReportCard = (card: (typeof reportCards)[number]) => {
      const details = this.parseGradeDetails(card.gradeDetails);
      return (
        details.length > 0 &&
        card.percentage !== null &&
        card.totalMarks !== null &&
        card.attendancePercentage !== null
      );
    };

    const completeCardsByStudent = new Map<string, (typeof reportCards)[number]>();
    for (const card of reportCards) {
      if (!isCompleteReportCard(card)) continue;
      const existing = completeCardsByStudent.get(card.studentId);
      if (
        !existing ||
        new Date(card.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
      ) {
        completeCardsByStudent.set(card.studentId, card);
      }
    }

    const incompleteStudentIds = Array.from(uniqueEnrollmentStudentIds).filter(
      (studentId) => !completeCardsByStudent.has(studentId),
    );

    if (incompleteStudentIds.length > 0) {
      throw new BadRequestException(
        'Results cannot be published yet because some report cards are incomplete',
      );
    }

    const rankedReportCards = Array.from(completeCardsByStudent.values()).sort((a, b) => {
      const percentageDiff = (b.percentage ?? 0) - (a.percentage ?? 0);
      if (percentageDiff !== 0) return percentageDiff;
      return a.student.name.localeCompare(b.student.name);
    });

    for (const [index, card] of rankedReportCards.entries()) {
      const rank = index + 1;
      await this.prisma.reportCard.update({
        where: { id: card.id },
        data: {
          rank,
          rankInClass: rank,
        },
      });
    }

    const reportCardIds = reportCards.map((card) => card.id);
    await this.prisma.reportCard.updateMany({
      where: { id: { in: reportCardIds } },
      data: {
        status: ReportCardStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    const classLabel = classRecord.section
      ? `${classRecord.name} ${classRecord.section}`
      : classRecord.name;

    const studentUserIds = Array.from(
      new Set(reportCards.map((card) => card.studentId).filter(Boolean)),
    );
    const parentUserIds = Array.from(
      new Set(
        reportCards.flatMap((card) =>
          card.student.studentProfile?.parents.map((relation) => relation.parent.userId) ?? [],
        ),
      ),
    );

    if (notifyStudents && studentUserIds.length > 0) {
      await this.notificationService.createBulkNotifications({
        schoolId,
        userIds: studentUserIds,
        title: 'Results Published',
        message: `Your ${termName} results for ${classLabel} have been published.`,
        type: NotificationType.RESULT_PUBLISHED,
        actionUrl: '/student/grades',
        metadata: { term: termName, className: classLabel, classId },
      });
    }

    if (notifyParents && parentUserIds.length > 0) {
      await this.notificationService.createBulkNotifications({
        schoolId,
        userIds: parentUserIds,
        title: 'Child Results Published',
        message: `${termName} results for ${classLabel} have been published.`,
        type: NotificationType.RESULT_PUBLISHED,
        actionUrl: '/parent/children',
        metadata: { term: termName, className: classLabel, classId },
      });
    }

    return {
      published: reportCardIds.length,
      ranked: rankedReportCards.length,
      notifiedStudents: notifyStudents ? studentUserIds.length : 0,
      notifiedParents: notifyParents ? parentUserIds.length : 0,
    };
  }

  /**
   * Unpublish report cards (revert to draft)
   */
  async unpublishReportCards(ids: string[], schoolId: string) {
    const updated = await this.prisma.reportCard.updateMany({
      where: { id: { in: ids }, schoolId },
      data: {
        status: ReportCardStatus.DRAFT,
        publishedAt: null,
      },
    });

    return { unpublished: updated.count };
  }

  /**
   * Calculate and update ranks for a class in a term
   */
  async calculateRanks(
    schoolId: string,
    classId: string,
    academicYear: string,
    term: string,
  ) {
    const reportCards = await this.prisma.reportCard.findMany({
      where: { schoolId, classId, academicYear, term },
      orderBy: { percentage: 'desc' },
    });

    let rank = 1;
    for (const rc of reportCards) {
      await this.prisma.reportCard.update({
        where: { id: rc.id },
        data: { rank },
      });
      rank++;
    }

    const rankedReportCards = await this.prisma.reportCard.findMany({
      where: { schoolId, classId, academicYear, term },
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: { rank: 'asc' },
    });

    for (const rc of rankedReportCards) {
      const classRank =
        rankedReportCards
          .filter((other) => other.percentage === rc.percentage)
          .findIndex((other) => other.id === rc.id) + 1;

      await this.prisma.reportCard.update({
        where: { id: rc.id },
        data: { rankInClass: classRank },
      });
    }

    return reportCards.length;
  }

  /**
   * Update remarks for a report card
   */
  async updateRemarks(
    id: string,
    schoolId: string,
    data: {
      teacherRemarks?: string;
      principalRemarks?: string;
      coCurricular?: string;
      behavior?: string;
    },
  ) {
    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id, schoolId },
    });
    if (!reportCard) {
      throw new NotFoundException('Report card not found');
    }

    return this.prisma.reportCard.update({
      where: { id },
      data: {
        teacherRemarks: data.teacherRemarks,
        principalRemarks: data.principalRemarks,
        coCurricular: data.coCurricular,
        behavior: data.behavior,
      },
    });
  }

  /**
   * Delete report card
   */
  async deleteReportCard(id: string, schoolId: string) {
    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id, schoolId },
    });
    if (!reportCard) {
      throw new NotFoundException('Report card not found');
    }

    if (reportCard.status === ReportCardStatus.PUBLISHED) {
      throw new BadRequestException('Cannot delete a published report card');
    }

    await this.prisma.reportCard.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Get promotion candidates for a class
   */
  async getPromotionCandidates(
    classId: string,
    academicYear: string,
    criteria?: PromotionCriteria,
  ) {
    const classInfo = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        academicYear: { select: { name: true } },
      },
    });

    if (!classInfo) {
      throw new NotFoundException('Class not found');
    }

    const students = await this.prisma.studentClass.findMany({
      where: { classId, academicYear },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            studentProfile: {
              select: {
                rollNumber: true,
              },
            },
          },
        },
      },
    });

    const sortedStudents = students.slice().sort((a, b) => {
      const aRoll = Number.parseInt(a.student.studentProfile?.rollNumber || '', 10);
      const bRoll = Number.parseInt(b.student.studentProfile?.rollNumber || '', 10);
      const aRank = Number.isNaN(aRoll) ? Number.POSITIVE_INFINITY : aRoll;
      const bRank = Number.isNaN(bRoll) ? Number.POSITIVE_INFINITY : bRoll;

      if (aRank !== bRank) return aRank - bRank;

      const aLabel = a.student.studentProfile?.rollNumber || '';
      const bLabel = b.student.studentProfile?.rollNumber || '';
      if (aLabel !== bLabel) {
        return aLabel.localeCompare(bLabel, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return a.student.name.localeCompare(b.student.name, undefined, {
        sensitivity: 'base',
      });
    });

    const candidates: Array<{
      student: any;
      status: string;
      reason?: string;
      reasons?: string[];
      averageGrade: number;
      attendance: number;
      overallGrade?: string | null;
      reportCardId?: string;
    }> = [];

    for (const sc of sortedStudents) {
      const reportCardWhere: any = {
        studentId: sc.studentId,
        classId,
        academicYear,
        status: ReportCardStatus.PUBLISHED,
      };

      const reportCards = await this.prisma.reportCard.findMany({
        where: reportCardWhere,
      });

      const latestReportCard = reportCards[reportCards.length - 1];
      if (!latestReportCard) {
        candidates.push({
          student: {
            id: sc.student.id,
            name: sc.student.name,
            avatarUrl: sc.student.avatarUrl,
            rollNumber: sc.student.studentProfile?.rollNumber ?? null,
          },
          status: 'NO_DATA',
          reason: 'No report card generated',
          averageGrade: 0,
          attendance: 0,
        });
        continue;
      }

      const averageGrade = latestReportCard.percentage || 0;
      const attendance = latestReportCard.attendancePercentage || 0;

      let status = 'PROMOTED';
      const reasons: string[] = [];

      if (
        criteria?.minAverageGrade &&
        averageGrade < criteria.minAverageGrade
      ) {
        status = 'RETAINED';
        reasons.push(
          `Average grade ${averageGrade.toFixed(1)} below minimum ${criteria.minAverageGrade}`,
        );
      }

      if (criteria?.minAttendance && attendance < criteria.minAttendance) {
        status = 'RETAINED';
        reasons.push(
          `Attendance ${attendance.toFixed(1)}% below minimum ${criteria.minAttendance}%`,
        );
      }

      if (criteria?.minAttendance && attendance < criteria.minAttendance) {
        status = 'RETAINED';
        reasons.push(
          `Attendance ${attendance.toFixed(1)}% below minimum ${criteria.minAttendance}%`,
        );
      }

      candidates.push({
        student: {
          id: sc.student.id,
          name: sc.student.name,
          avatarUrl: sc.student.avatarUrl,
          rollNumber: sc.student.studentProfile?.rollNumber ?? null,
        },
        status,
        reasons,
        averageGrade,
        attendance,
        overallGrade: latestReportCard.overallGrade,
        reportCardId: latestReportCard.id,
      });
    }

    return {
      className: classInfo.name,
      academicYear: classInfo.academicYear.name,
      totalStudents: sortedStudents.length,
      candidates,
    };
  }

  /**
   * Get next class options for promotion
   */
  async getNextClassOptions(classId: string, toAcademicYear?: string) {
    const currentClass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        academicYear: { select: { id: true, name: true } },
        gradeLevel: { select: { id: true, name: true, level: true } },
      },
    });

    if (!currentClass) {
      throw new NotFoundException('Class not found');
    }

    const schoolId = currentClass.schoolId;
    const targetAcademicYearName =
      toAcademicYear || String((parseInt(currentClass.academicYear.name, 10) || 0) + 1);
    const targetAcademicYear = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        name: targetAcademicYearName,
      },
      select: { id: true, name: true },
    });

    const nextClasses = await this.prisma.class.findMany({
      where: {
        schoolId,
        academicYearId: targetAcademicYear?.id || currentClass.academicYearId,
        grade: currentClass.grade ? { gt: currentClass.grade } : undefined,
        ...(currentClass.section ? { section: currentClass.section } : {}),
      },
      orderBy: { grade: 'asc' },
    });

    const isLastGrade = nextClasses.length === 0;

    return {
      currentClass: {
        id: currentClass.id,
        name: currentClass.name,
        grade: currentClass.grade,
      },
      nextClasses: nextClasses.map((c) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
      })),
      isLastGrade,
      graduationEnabled: isLastGrade,
    };
  }

  /**
   * Promote single student
   */
  async promoteStudent(params: PromotionParams) {
    const {
      schoolId,
      studentId,
      fromClassId,
      fromAcademicYear,
      toClassId,
      toAcademicYear,
      status,
    } = params;

    const latestReportCard = await this.prisma.reportCard.findFirst({
      where: {
        schoolId,
        studentId,
        classId: fromClassId,
        academicYear: fromAcademicYear,
        status: ReportCardStatus.PUBLISHED,
      },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    await this.ensurePromotionReadiness({
      schoolId,
      fromClassId,
      fromAcademicYear,
      studentIds: [studentId],
      promoteAll: false,
      criteria: {
        minAverageGrade: 50,
        minAttendance: 75,
        allowFailedSubjects: 2,
      },
    });

    if (status === 'GRADUATED' || !toClassId) {
      await this.recordPromotionHistory({
        schoolId,
        studentId,
        fromClassId,
        toClassId: null,
        fromAcademicYear,
        toAcademicYear,
        status: 'GRADUATED',
        reportCardId: latestReportCard?.id,
        averageGrade: latestReportCard?.percentage ?? null,
        attendance: latestReportCard?.attendancePercentage ?? null,
      });
      return {
        studentId,
        fromClassId,
        toClassId: null,
        status: 'GRADUATED',
        promotedAt: new Date(),
      };
    }

    const toClass = await this.prisma.class.findUnique({
      where: { id: toClassId },
      include: { sections: true },
    });
    if (!toClass) {
      throw new NotFoundException('Target class not found');
    }
    if (toClass.id === fromClassId) {
      throw new BadRequestException('Target class must be different from source class');
    }

    const sourceEnrollment = await this.prisma.studentClass.findFirst({
      where: {
        studentId,
        classId: fromClassId,
        academicYear: fromAcademicYear,
      },
      include: {
        section: {
          select: { name: true },
        },
      },
    });

    const existingEnrollment = await this.prisma.studentClass.findFirst({
      where: { studentId, academicYear: toAcademicYear },
    });

    const sectionId = await this.getSectionIdForClass(
      toClassId,
      sourceEnrollment?.section?.name,
    );

    if (existingEnrollment) {
      await this.prisma.studentClass.update({
        where: { id: existingEnrollment.id },
        data: {
          classId: toClassId,
          sectionId,
        },
      });
    } else {
      await this.prisma.studentClass.create({
        data: {
          studentId,
          classId: toClassId,
          sectionId,
          schoolId,
          academicYear: toAcademicYear,
        },
      });
    }

    await this.recordPromotionHistory({
      schoolId,
      studentId,
      fromClassId,
      toClassId,
      fromAcademicYear,
      toAcademicYear,
      status,
      reportCardId: latestReportCard?.id,
      averageGrade: latestReportCard?.percentage ?? null,
      attendance: latestReportCard?.attendancePercentage ?? null,
    });

    return {
      studentId,
      fromClassId,
      toClassId,
      status,
      promotedAt: new Date(),
    };
  }

  private async getSectionIdForClass(
    classId: string,
    preferredSectionName?: string | null,
  ): Promise<string> {
    const targetClass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        sections: true,
      },
    });

    if (!targetClass) {
      throw new NotFoundException('Target class not found');
    }

    if (preferredSectionName) {
      const matchedSection = targetClass.sections.find(
        (section) =>
          section.name.toLowerCase() === preferredSectionName.toLowerCase(),
      );
      if (matchedSection) {
        return matchedSection.id;
      }
    }

    if (targetClass.section) {
      const classSection = targetClass.sections.find(
        (section) =>
          section.name.toLowerCase() === targetClass.section.toLowerCase(),
      );
      if (classSection) {
        return classSection.id;
      }

      const createdSection = await this.prisma.section.create({
        data: {
          classId: targetClass.id,
          name: targetClass.section,
          capacity: 40,
        },
      });
      return createdSection.id;
    }

    const firstSection = targetClass.sections[0];
    if (firstSection) {
      return firstSection.id;
    }

    const createdSection = await this.prisma.section.create({
      data: {
        classId: targetClass.id,
        name: 'A',
        capacity: 40,
      },
    });
    return createdSection.id;
  }

  /**
   * Bulk promote students
   */
  async bulkPromoteStudents(params: BulkPromotionParams) {
    const {
      schoolId,
      fromClassId,
      toClassId,
      fromAcademicYear,
      toAcademicYear,
      studentIds,
      promoteAll,
      minAverageGrade,
      minAttendance,
    } = params;

    await this.ensurePromotionReadiness({
      schoolId,
      fromClassId,
      fromAcademicYear,
      studentIds,
      promoteAll,
      criteria: {
        minAverageGrade: minAverageGrade || 50,
        minAttendance: minAttendance || 75,
        allowFailedSubjects: 2,
      },
    });

    const isGraduation = !toClassId || toClassId === 'graduation';

    const toClass = !isGraduation
      ? await this.prisma.class.findUnique({
          where: { id: toClassId! },
        })
      : null;
    if (!isGraduation && !toClass) {
      throw new NotFoundException('Target class not found');
    }
    if (!isGraduation && toClassId === fromClassId) {
      throw new BadRequestException('Target class must be different from source class');
    }

    const results = {
      promoted: 0,
      retained: 0,
      failed: 0,
      errors: [] as string[],
    };

    const students = promoteAll
      ? await this.prisma.studentClass.findMany({
          where: { classId: fromClassId, academicYear: fromAcademicYear },
          include: { student: { select: { id: true, name: true } } },
        })
      : await this.prisma.studentClass.findMany({
          where: {
            classId: fromClassId,
            academicYear: fromAcademicYear,
            studentId: { in: studentIds },
          },
          include: { student: { select: { id: true, name: true } } },
        });

    const candidateResponse = await this.getPromotionCandidates(
      fromClassId,
      fromAcademicYear,
      {
        minAverageGrade: minAverageGrade || 50,
        minAttendance: minAttendance || 75,
        allowFailedSubjects: 2,
      },
    );
    const candidateMap = new Map(
      candidateResponse.candidates.map((candidate) => [
        candidate.student.id,
        candidate,
      ]),
    );

    for (const sc of students) {
      try {
        const candidate = candidateMap.get(sc.studentId);
        const explicitlySelected = studentIds.includes(sc.studentId);
        const shouldPromote = promoteAll
          ? candidate?.status === 'PROMOTED'
          : explicitlySelected && candidate?.status === 'PROMOTED';

        if (shouldPromote) {
          await this.promoteStudent({
            schoolId,
            studentId: sc.studentId,
            fromClassId,
            fromAcademicYear,
            toClassId: isGraduation ? null : toClassId,
            toAcademicYear,
            status:
              isGraduation || !toClass?.grade ? 'GRADUATED' : 'PROMOTED',
          });
          results.promoted++;
        } else {
          results.retained++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${sc.student.name}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get promotion history
   */
  async getPromotionHistory(
    schoolId: string,
    filters: {
      academicYear?: string;
      classId?: string;
      status?: string;
    },
  ) {
    const whereClause: any = { schoolId };

    if (filters.academicYear) {
      whereClause.fromAcademicYear = filters.academicYear;
    }
    if (filters.classId) {
      whereClause.fromClassId = filters.classId;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }

    const conditions: Prisma.Sql[] = [Prisma.sql`pr."schoolId" = ${schoolId}`];
    if (filters.academicYear) {
      conditions.push(Prisma.sql`pr."fromAcademicYear" = ${filters.academicYear}`);
    }
    if (filters.classId) {
      conditions.push(Prisma.sql`pr."fromClassId" = ${filters.classId}`);
    }
    if (filters.status) {
      conditions.push(Prisma.sql`pr."status" = ${filters.status}`);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    return this.prisma.$queryRaw(
      Prisma.sql`
        SELECT
          pr.*,
          json_build_object('id', u.id, 'name', u.name, 'avatarUrl', u."avatarUrl", 'username', u.username) AS student,
          json_build_object('id', fc.id, 'name', fc.name, 'section', fc.section, 'grade', fc.grade) AS "fromClass",
          CASE
            WHEN tc.id IS NULL THEN NULL
            ELSE json_build_object('id', tc.id, 'name', tc.name, 'section', tc.section, 'grade', tc.grade)
          END AS "toClass",
          CASE
            WHEN rc.id IS NULL THEN NULL
            ELSE json_build_object('id', rc.id, 'overallGrade', rc."overallGrade", 'percentage', rc.percentage)
          END AS "reportCard"
        FROM "PromotionRecord" pr
        JOIN "User" u ON u.id = pr."studentId"
        JOIN "Class" fc ON fc.id = pr."fromClassId"
        LEFT JOIN "Class" tc ON tc.id = pr."toClassId"
        LEFT JOIN "ReportCard" rc ON rc.id = pr."reportCardId"
        ${whereSql}
        ORDER BY pr."promotedAt" DESC
      `,
    );
  }
}
