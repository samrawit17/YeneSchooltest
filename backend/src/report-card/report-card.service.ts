import { HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationService, NotificationType } from '../notification/notification.service';
import { SCHOOL_SETTING_KEYS } from '../school-settings/school-settings.service';
import { StorageService } from '../storage/storage.service';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import PDFKitDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const { ZipArchive } = require('archiver');

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
  fromClassId?: string;
  fromGrade?: number;
  toClassId?: string | null;
  toGrade?: number | null;
  fromAcademicYear: string;
  toAcademicYear: string;
  studentIds: string[];
  promoteAll: boolean;
  minAverageGrade?: number;
  minAttendance?: number;
  streams?: Record<string, string>;
}

interface PromotionCriteria {
  minAverageGrade?: number;
  minAttendance?: number;
  allowFailedSubjects: number;
}

interface PromotionReadinessParams {
  schoolId: string;
  fromClassId?: string;
  fromGrade?: number;
  fromAcademicYear: string;
  studentIds?: string[];
  promoteAll?: boolean;
  criteria?: PromotionCriteria;
}

interface AssessmentPublishReadiness {
  assessmentSubjects: number;
  expectedScores: number;
  enteredScores: number;
  missingScores: number;
}

@Injectable()
export class ReportCardService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private storageService: StorageService,
  ) {}

  private async resolveAcademicYearName(schoolId: string, academicYearId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true, name: true },
    });
    if (!year) throw new LocalizedException('report_card.academic_year_not_found_561c725b', undefined, HttpStatus.NOT_FOUND, 'Academic year not found');
    return year.name;
  }

  private async resolveTerm(
    schoolId: string,
    termId: string,
    academicYearId?: string,
  ) {
    const term = await this.prisma.term.findFirst({
      where: {
        id: termId,
        ...(academicYearId ? { academicYearId } : {}),
        academicYear: { schoolId },
      },
      select: { id: true, name: true, academicYearId: true },
    });
    if (!term) throw new LocalizedException('report_card.term_not_found_f9401991', undefined, HttpStatus.NOT_FOUND, 'Term not found');
    return term;
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

  private async resolveTermName(
    schoolId: string,
    termId: string,
    academicYearId?: string,
  ) {
    return (await this.resolveTerm(schoolId, termId, academicYearId)).name;
  }

  private buildAssessmentReadinessByClass(
    assessmentSubjects: Array<{
      classId: string;
      sectionId: string | null;
      scores: Array<{
        studentId: string;
        score: number | null;
        isAbsent: boolean;
        status: string;
      }>;
    }>,
    studentIdsByClass: Map<string, Set<string>>,
    studentIdsByClassSection: Map<string, Set<string>>,
  ) {
    const readinessByClass = new Map<string, AssessmentPublishReadiness>();
    for (const assessmentSubject of assessmentSubjects) {
      const classStudentIds = studentIdsByClass.get(assessmentSubject.classId) ?? new Set<string>();
      const sectionStudentIds = assessmentSubject.sectionId
        ? studentIdsByClassSection.get(`${assessmentSubject.classId}:${assessmentSubject.sectionId}`) ?? new Set<string>()
        : classStudentIds;
      const expectedScoreStudentIds = sectionStudentIds.size > 0
        ? sectionStudentIds
        : classStudentIds;
      const enteredScoreStudentIds = new Set(
        assessmentSubject.scores
          .filter((score) => score.score !== null || score.isAbsent || score.status === 'SUBMITTED')
          .map((score) => score.studentId),
      );
      const readiness =
        readinessByClass.get(assessmentSubject.classId) ?? {
          assessmentSubjects: 0,
          expectedScores: 0,
          enteredScores: 0,
          missingScores: 0,
        };
      const expectedScores = expectedScoreStudentIds.size;
      const enteredScores = Array.from(expectedScoreStudentIds).filter(
        (studentId) => enteredScoreStudentIds.has(studentId),
      ).length;
      readiness.assessmentSubjects += 1;
      readiness.expectedScores += expectedScores;
      readiness.enteredScores += enteredScores;
      readiness.missingScores += Math.max(expectedScores - enteredScores, 0);
      readinessByClass.set(assessmentSubject.classId, readiness);
    }
    return readinessByClass;
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

  private async resolveReportCardGradeDetails(reportCard: {
    id: string;
    schoolId: string;
    studentId: string;
    classId: string;
    sectionId: string;
    academicYear: string;
    term: string;
    gradeDetails?: string | null;
  }): Promise<Array<Record<string, any>>> {
    const storedDetails = this.parseGradeDetails(reportCard.gradeDetails);
    if (storedDetails.length > 0) return storedDetails;

    const [academicYearRecord, termRecord] = await Promise.all([
      this.prisma.academicYear.findFirst({
        where: {
          schoolId: reportCard.schoolId,
          OR: [{ id: reportCard.academicYear }, { name: reportCard.academicYear }],
        },
        select: { id: true, name: true },
      }),
      this.prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId: reportCard.schoolId,
            OR: [{ id: reportCard.academicYear }, { name: reportCard.academicYear }],
          },
          name: reportCard.term,
        },
        select: { id: true, name: true },
      }),
    ]);

    const academicYearKeys = Array.from(
      new Set([academicYearRecord?.id, academicYearRecord?.name, reportCard.academicYear].filter(Boolean) as string[]),
    );

    if (termRecord) {
      const subjectGrades = await this.prisma.subjectGrade.findMany({
        where: {
          schoolId: reportCard.schoolId,
          studentId: reportCard.studentId,
          academicYear: { in: academicYearKeys },
          termId: termRecord.id,
        },
        include: {
          subject: { select: { id: true, name: true, code: true } },
          gradeScores: {
            include: {
              component: { select: { id: true, code: true, name: true } },
            },
            orderBy: [{ component: { createdAt: 'asc' } }],
          },
        },
        orderBy: [{ subject: { name: 'asc' } }],
      });

      const details = subjectGrades
        .sort((a, b) => {
          const bScore = Number(b.classId === reportCard.classId) + Number(b.sectionId === reportCard.sectionId);
          const aScore = Number(a.classId === reportCard.classId) + Number(a.sectionId === reportCard.sectionId);
          return bScore - aScore;
        })
        .filter((grade, index, allGrades) => {
          const firstIndex = allGrades.findIndex((item) => item.subjectId === grade.subjectId);
          if (firstIndex === index) return true;
          return false;
        })
        .filter((grade) => grade.totalScore !== null && grade.totalScore !== undefined)
        .map((grade) => ({
          subjectId: grade.subjectId,
          subjectName: grade.subject.name,
          subjectCode: grade.subject.code,
          assessmentBreakdown: (grade.gradeScores || []).map((item) => ({
            title: item.component?.name || item.component?.code || 'Assessment',
            type: item.component?.code || '',
            maxScore: item.maxScore,
            score: item.score ?? null,
            status: grade.status,
          })),
          caScore: grade.caScore,
          midScore: grade.midScore,
          finalScore: grade.finalScore,
          totalScore: grade.totalScore,
          gradeLetter: grade.gradeLetter,
          gradePoint: grade.gradePoint,
          status: grade.status,
        }));
      if (details.length > 0) return details;
    }

    const grades = await this.prisma.grade.findMany({
      where: {
        schoolId: reportCard.schoolId,
        studentId: reportCard.studentId,
        academicYear: { in: academicYearKeys },
        term: reportCard.term,
        OR: [{ reportCardId: reportCard.id }, { reportCardId: null }],
      },
      include: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: [{ subject: { name: 'asc' } }],
    });

    const gradeDetails = grades.map((grade) => ({
      subjectId: grade.subjectId,
      subjectName: grade.subject.name,
      subjectCode: grade.subject.code,
      assessmentBreakdown: [],
      totalScore: grade.marks,
      gradeLetter: grade.grade,
      gradePoint: grade.gradePoint,
    }));
    if (gradeDetails.length > 0) return gradeDetails;

    if (academicYearRecord?.id && termRecord) {
      const assessmentScores = await this.prisma.studentAssessmentScore.findMany({
        where: {
          studentId: reportCard.studentId,
          assessmentSubject: {
            assessment: {
              schoolId: reportCard.schoolId,
              academicYearId: academicYearRecord?.id,
              termId: termRecord.id,
            },
          },
        },
        include: {
          assessmentSubject: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
              assessment: { select: { id: true, title: true, type: true, startDate: true, endDate: true } },
            },
          },
        },
        orderBy: [{ assessmentSubject: { subject: { name: 'asc' } } }],
      });

      const scoresBySubject = new Map<string, typeof assessmentScores>();
      for (const score of assessmentScores) {
        const subjectId = score.assessmentSubject.subjectId;
        const bucket = scoresBySubject.get(subjectId) ?? [];
        bucket.push(score);
        scoresBySubject.set(subjectId, bucket);
      }

      const assessmentDetails: Array<Record<string, any>> = [];
      for (const [subjectId, scores] of scoresBySubject.entries()) {
        const first = scores[0];
        const totalScore = scores.reduce((sum, item) => sum + (item.score ?? 0), 0);
        const { letter, point } = await this.getGradeLetter(reportCard.schoolId, totalScore);
        assessmentDetails.push({
          subjectId,
          subjectName: first.assessmentSubject.subject.name,
          subjectCode: first.assessmentSubject.subject.code,
          assessmentBreakdown: scores.map((item) => ({
            assessmentSubjectId: item.assessmentSubjectId,
            assessmentId: item.assessmentSubject.assessment.id,
            title: item.assessmentSubject.assessment.title,
            type: item.assessmentSubject.assessment.type,
            maxScore: item.assessmentSubject.maxScore,
            score: item.score ?? null,
            isAbsent: item.isAbsent,
            status: item.status,
            remarks: item.remarks,
            startDate: item.assessmentSubject.assessment.startDate,
            endDate: item.assessmentSubject.assessment.endDate,
          })),
          totalScore,
          gradeLetter: letter,
          gradePoint: point,
          status: scores.every((item) => item.status === 'SUBMITTED') ? 'SUBMITTED' : 'DRAFT',
        });
      }
      if (assessmentDetails.length > 0) return assessmentDetails;
    }

    return [];
  }

  private average(values: Array<number | null | undefined>): number | null {
    const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10;
  }

  private formatNullablePercent(value: number | null): string {
    return value === null ? '-' : `${value}%`;
  }

  private async verifyParentChild(
    parentId: string,
    childId: string,
    schoolId: string,
  ) {
    const parentProfile = await this.prisma.parentProfile.findFirst({
      where: { userId: parentId, schoolId },
      select: { id: true, schoolId: true },
    });
    if (!parentProfile) throw new LocalizedException('report_card.parent_profile_not_found_ad089d27', undefined, HttpStatus.NOT_FOUND, 'Parent profile not found');

    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        OR: [{ id: childId }, { userId: childId }],
      },
      select: { id: true },
    });
    if (!studentProfile) throw new LocalizedException('report_card.student_profile_not_found_75599cef', undefined, HttpStatus.NOT_FOUND, 'Student profile not found');

    const link = await this.prisma.parentStudent.findFirst({
      where: { parentId: parentProfile.id, studentId: studentProfile.id },
      select: { id: true, student: { select: { userId: true } } },
    });
    if (!link?.student?.userId) throw new LocalizedException('report_card.you_are_not_linked_to_this_student_49797e72', undefined, undefined, 'You are not linked to this student');

    return {
      studentUserId: link.student.userId,
      schoolId,
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

  private async assertAcademicYearEnded(schoolId: string, academicYearName: string) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, name: academicYearName },
      select: { name: true, endDate: true },
    });

    if (!academicYear) throw new LocalizedException('report_card.academic_year_not_found_561c725b', undefined, HttpStatus.NOT_FOUND, 'Academic year not found');

    const endOfAcademicYear = new Date(academicYear.endDate);
    endOfAcademicYear.setHours(23, 59, 59, 999);

    if (new Date() <= endOfAcademicYear) {
      throw new BadRequestException(
        `Promotion is locked until academic year ${academicYear.name} ends`,
      );
    }
  }

  private getSectionNameByIndex(index: number) {
    let n = index;
    let name = '';
    do {
      name = String.fromCharCode(65 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return name;
  }

  private async getDefaultSectionCapacity(schoolId: string) {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'DEFAULT_SECTION_CAPACITY' } },
      select: { value: true },
    });
    const parsed = parseInt(String(setting?.value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }

  private async getPromotionMinAverageGrade(schoolId: string): Promise<number> {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: SCHOOL_SETTING_KEYS.PROMOTION_MIN_AVERAGE_GRADE } },
      select: { value: true },
    });
    const parsed = parseFloat(String(setting?.value || ''));
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 50;
  }

  private async getPromotionMinAttendance(schoolId: string): Promise<number> {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: SCHOOL_SETTING_KEYS.PROMOTION_MIN_ATTENDANCE } },
      select: { value: true },
    });
    const parsed = parseFloat(String(setting?.value || ''));
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 75;
  }

  private async getPromotionAllowFailedSubjects(schoolId: string): Promise<number> {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: SCHOOL_SETTING_KEYS.PROMOTION_ALLOW_FAILED_SUBJECTS } },
      select: { value: true },
    });
    const parsed = parseInt(String(setting?.value || ''), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2;
  }

  private async getSchoolGradeRange(schoolId: string) {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'grade_system' } },
      select: { value: true },
    });
    const ranges: Record<string, { min: number; max: number }> = {
      '1-8': { min: 1, max: 8 },
      '1-10': { min: 1, max: 10 },
      '1-12': { min: 1, max: 12 },
      'K-8': { min: 1, max: 8 },
      'K-12': { min: 1, max: 12 },
      'KG-12': { min: 1, max: 12 },
      KG_TO_12: { min: 1, max: 12 },
      'PRE-K-12': { min: 1, max: 12 },
      '9-12': { min: 9, max: 12 },
    };
    return ranges[String(setting?.value || '1-12').toUpperCase()] || ranges['1-12'];
  }

  private normalizePromotionStream(value?: string | null) {
    const stream = String(value || '').trim().toUpperCase();
    return ['NATURAL', 'SOCIAL'].includes(stream) ? stream : null;
  }

  private getPromotionSectionName(baseSectionName: string, stream?: string | null) {
    if (!stream) return baseSectionName;
    const label = stream === 'NATURAL' ? 'Natural' : 'Social';
    return `${label} ${baseSectionName}`;
  }

  private async getExistingPromotionRecord(input: {
    schoolId: string;
    studentId: string;
    fromAcademicYear: string;
    toAcademicYear: string;
  }) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT "id", "status"
      FROM "PromotionRecord"
      WHERE "schoolId" = ${input.schoolId}
        AND "studentId" = ${input.studentId}
        AND "fromAcademicYear" = ${input.fromAcademicYear}
        AND "toAcademicYear" = ${input.toAcademicYear}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;
    return rows[0] || null;
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

    if (!fromClassId) throw new LocalizedException('report_card.source_class_is_required_492e76aa', undefined, undefined, 'Source class is required');

    const classInfo = await this.prisma.class.findUnique({
      where: { id: fromClassId },
      select: {
        id: true,
        name: true,
        schoolId: true,
        academicYearId: true,
      },
    });

    if (!classInfo || classInfo.schoolId !== schoolId) throw new LocalizedException('report_card.source_class_not_found_38baffa4', undefined, HttpStatus.NOT_FOUND, 'Source class not found');

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

    if (enrollments.length === 0) throw new LocalizedException('report_card.no_students_found_for_this_promotion_batch_6b7606b6', undefined, undefined, 'No students found for this promotion batch');

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
    schoolId: string,
    studentId: string,
    classId: string,
    sectionId: string,
    termId: string,
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    percentage: number;
  }> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, academicYear: { schoolId } },
      select: { startDate: true, endDate: true },
    });

    if (!term) {
      return { totalDays: 0, presentDays: 0, absentDays: 0, percentage: 0 };
    }

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        schoolId,
        studentId,
        classId,
        sectionId,
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
    if (!academicYearRecord) throw new LocalizedException('report_card.academic_year_not_found_561c725b', undefined, HttpStatus.NOT_FOUND, 'Academic year not found');

    const academicYearId = academicYearRecord.id;
    const academicYearName = academicYearRecord.name;
    const termRecord = await this.resolveTerm(schoolId, termId, academicYearId);

    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) throw new LocalizedException('report_card.student_not_found_2525e0b2', undefined, HttpStatus.NOT_FOUND, 'Student not found');

    const [classRecord, sectionRecord, enrollment] = await Promise.all([
      this.prisma.class.findFirst({
        where: { id: classId, schoolId, academicYearId },
        select: { id: true },
      }),
      this.prisma.section.findFirst({
        where: { id: sectionId, classId },
        select: { id: true },
      }),
      this.prisma.studentClass.findFirst({
        where: {
          schoolId,
          studentId,
          classId,
          sectionId,
          academicYear: { in: [academicYearId, academicYearName] },
        },
        select: { id: true },
      }),
    ]);

    if (!classRecord) throw new LocalizedException('report_card.class_not_found_7fd09a97', undefined, HttpStatus.NOT_FOUND, 'Class not found');
    if (!sectionRecord) throw new LocalizedException('report_card.section_not_found_f649d604', undefined, HttpStatus.NOT_FOUND, 'Section not found');
    if (!enrollment) {
      throw new BadRequestException(
        'Student is not enrolled in this class and section for the selected academic year',
      );
    }

    const subjectGrades = await this.prisma.subjectGrade.findMany({
      where: {
        schoolId,
        studentId,
        classId,
        sectionId,
        academicYear: academicYearId,
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

    const attendance = await this.calculateAttendance(
      schoolId,
      studentId,
      classId,
      sectionId,
      termId,
    );

    // Group grades by subject to allow term-by-term comparison
    const gradesBySubject = new Map<string, any>();
    const gradeDetails: any[] = [];
    let totalMarks = 0;
    let subjectCount = 0;
    
    for (const sg of subjectGrades) {
      const subjectId = sg.subjectId;
      if (!gradesBySubject.has(subjectId)) {
        gradesBySubject.set(subjectId, {
          subjectId: sg.subjectId,
          subjectName: sg.subject.name,
          subjectCode: sg.subject.code,
          terms: {},
          yearlyTotal: 0,
          yearlyCount: 0,
        });
      }
      
      const subData = gradesBySubject.get(subjectId);
      const effectiveTotalScore = this.getEffectiveSubjectTotalScore(sg);
      
      if (effectiveTotalScore !== null) {
        const { letter, point } = await this.getGradeLetter(schoolId, effectiveTotalScore);
        
        subData.terms[sg.termId] = {
          score: effectiveTotalScore,
          grade: letter,
          point: point,
          status: sg.status,
          remark: sg.remark,
          // Only include assessment breakdown if it's the CURRENT term we are generating for
          assessmentBreakdown: sg.termId === termId ? (sg.gradeScores || []).map((item) => ({
            title: item.component?.name || item.component?.code || 'Assessment',
            type: item.component?.code || '',
            maxScore: item.maxScore,
            score: item.score ?? null,
          })) : [],
        };
        
        subData.yearlyTotal += effectiveTotalScore;
        subData.yearlyCount += 1;
      }
    }

    // Finalize gradeDetails with cumulative stats
    for (const sub of gradesBySubject.values()) {
      const yearlyAverage = sub.yearlyCount > 0 ? sub.yearlyTotal / sub.yearlyCount : 0;
      const { letter, point } = await this.getGradeLetter(schoolId, yearlyAverage);
      
      sub.yearlyAverage = Math.round(yearlyAverage * 100) / 100;
      sub.yearlyGrade = letter;
      sub.yearlyPoint = point;

      // Tracking the current term totals for the main report card summary
      const currentTermData = sub.terms[termId];
      if (currentTermData) {
        totalMarks += currentTermData.score;
        subjectCount++;
      }
      
      gradeDetails.push(sub);
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
        academicYear: academicYearName,
        term: termRecord.name,
      },
    });

    let reportCard;
    if (existingReportCard) {
      reportCard = await this.prisma.reportCard.update({
        where: { id: existingReportCard.id },
        data: {
          classId,
          sectionId,
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
          term: termRecord.name,
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
      generatedById,
    } = params;

    const academicYearRecord = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        OR: [{ id: academicYear }, { name: academicYear }],
      },
      select: { id: true, name: true },
    });
    if (!academicYearRecord) throw new LocalizedException('report_card.academic_year_not_found_561c725b', undefined, HttpStatus.NOT_FOUND, 'Academic year not found');
    const termRecord = await this.resolveTerm(
      schoolId,
      termId,
      academicYearRecord.id,
    );
    const [classRecord, sectionRecord] = await Promise.all([
      this.prisma.class.findFirst({
        where: { id: classId, schoolId, academicYearId: academicYearRecord.id },
        select: { id: true },
      }),
      this.prisma.section.findFirst({
        where: { id: sectionId, classId },
        select: { id: true },
      }),
    ]);
    if (!classRecord) throw new LocalizedException('report_card.class_not_found_7fd09a97', undefined, HttpStatus.NOT_FOUND, 'Class not found');
    if (!sectionRecord) throw new LocalizedException('report_card.section_not_found_f649d604', undefined, HttpStatus.NOT_FOUND, 'Section not found');
    const academicYearKeys = Array.from(
      new Set([academicYear, academicYearRecord?.id, academicYearRecord?.name].filter(Boolean) as string[]),
    );

    const students = await this.prisma.studentClass.findMany({
      where: {
        schoolId,
        classId,
        sectionId,
        academicYear: { in: academicYearKeys },
      },
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
          termName: termRecord.name,
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
      academicYearId?: string;
      academicYear?: string;
      termId?: string;
      term?: string;
      status?: ReportCardStatus;
      studentId?: string;
    },
  ) {
    const whereClause: any = { schoolId };

    if (filters.classId) whereClause.classId = filters.classId;
    if (filters.academicYearId) {
      const academicYearName = await this.resolveAcademicYearName(
        schoolId,
        filters.academicYearId,
      );
      whereClause.academicYear = {
        in: [filters.academicYearId, academicYearName],
      };
    } else if (filters.academicYear) {
      whereClause.academicYear = filters.academicYear;
    }
    if (filters.termId) {
      whereClause.term = await this.resolveTermName(
        schoolId,
        filters.termId,
        filters.academicYearId,
      );
    } else if (filters.term) {
      whereClause.term = filters.term;
    }
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
    schoolId: string,
    filters?: {
      academicYear?: string;
      term?: string;
    },
  ) {
    const { studentUserId, schoolId: validatedSchoolId } = await this.verifyParentChild(
      parentId,
      childId,
      schoolId,
    );
    await this.ensureParentGradeAccessEnabled(validatedSchoolId);
    await this.ensureCurrentPeriodFeesPaid(
      studentUserId,
      validatedSchoolId,
      filters?.academicYear,
      filters?.term,
    );

    const whereClause: any = {
      studentId: studentUserId,
      schoolId: validatedSchoolId,
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
      this.resolveTermName(schoolId, termId, academicYearId),
    ]);
    const academicYearKeys = Array.from(
      new Set([academicYearId, academicYearName].filter(Boolean)),
    );

    const [classes, enrollments, reportCards, assessmentSubjects, certificate] = await Promise.all([
      this.prisma.class.findMany({
        where: { schoolId, academicYearId },
        select: {
          id: true,
          name: true,
          grade: true,
          section: true,
          sections: { select: { id: true, name: true } },
        },
        orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.studentClass.findMany({
        where: {
          schoolId,
          academicYear: { in: academicYearKeys },
        },
        select: { classId: true, sectionId: true, studentId: true },
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
      this.prisma.assessmentSubject.findMany({
        where: {
          assessment: {
            schoolId,
            academicYearId,
            termId,
            status: { in: ['ACTIVE', 'COMPLETED'] },
          },
        },
        select: {
          id: true,
          classId: true,
          sectionId: true,
          scores: {
            select: {
              studentId: true,
              score: true,
              isAbsent: true,
              status: true,
            },
          },
        },
      }),
      this.getCertificateReadiness(schoolId),
    ]);

    const expectedByClass = new Map<string, number>();
    const expectedByClassSection = new Map<string, number>();
    const studentIdsByClass = new Map<string, Set<string>>();
    const studentIdsByClassSection = new Map<string, Set<string>>();
    for (const enrollment of enrollments) {
      const bucket =
        studentIdsByClass.get(enrollment.classId) ?? new Set<string>();
      bucket.add(enrollment.studentId);
      studentIdsByClass.set(enrollment.classId, bucket);

      const sectionKey = `${enrollment.classId}:${enrollment.sectionId ?? 'all'}`;
      const sectionBucket =
        studentIdsByClassSection.get(sectionKey) ?? new Set<string>();
      sectionBucket.add(enrollment.studentId);
      studentIdsByClassSection.set(sectionKey, sectionBucket);
    }
    for (const [classId, studentIds] of studentIdsByClass.entries()) {
      expectedByClass.set(classId, studentIds.size);
    }
    for (const [classSectionKey, studentIds] of studentIdsByClassSection.entries()) {
      expectedByClassSection.set(classSectionKey, studentIds.size);
    }

    const enrollmentStudentIdsByClassSection = new Map<string, Set<string>>();
    for (const enrollment of enrollments) {
      const key = `${enrollment.classId}:${enrollment.sectionId ?? 'all'}`;
      const bucket =
        enrollmentStudentIdsByClassSection.get(key) ?? new Set<string>();
      bucket.add(enrollment.studentId);
      enrollmentStudentIdsByClassSection.set(key, bucket);
    }

    const assessmentReadinessByClass = this.buildAssessmentReadinessByClass(
      assessmentSubjects,
      studentIdsByClass,
      enrollmentStudentIdsByClassSection,
    );

    const cardsByClass = new Map<string, typeof reportCards>();
    for (const card of reportCards) {
      const bucket = cardsByClass.get(card.classId) ?? [];
      bucket.push(card);
      cardsByClass.set(card.classId, bucket);
    }

    return classes.map((cls) => {
      const classCards = cardsByClass.get(cls.id) ?? [];
      const displaySectionId = cls.sections.find(
        (section) => section.name === cls.section,
      )?.id;
      const classSectionStudentIds = displaySectionId
        ? studentIdsByClassSection.get(`${cls.id}:${displaySectionId}`)
        : undefined;
      const expectedStudentIds =
        classSectionStudentIds ??
        (cls.section ? new Set<string>() : studentIdsByClass.get(cls.id) ?? new Set<string>());
      const expectedEntries = displaySectionId
        ? expectedByClassSection.get(`${cls.id}:${displaySectionId}`) ?? 0
        : cls.section
          ? 0
          : expectedByClass.get(cls.id) ?? 0;
      const generatedStudentIds = new Set(
        classCards
          .filter((card) => expectedStudentIds.has(card.studentId))
          .map((card) => card.studentId),
      );
      const publishedStudentIds = new Set(
        classCards
          .filter((card) => expectedStudentIds.has(card.studentId))
          .filter((card) => card.status === ReportCardStatus.PUBLISHED)
          .map((card) => card.studentId),
      );
      const publishedEntries = publishedStudentIds.size;
      const generatedEntries = generatedStudentIds.size;
      const missingEntries = Math.max(expectedEntries - generatedEntries, 0);
      const completeStudentIds = new Set(
        classCards
          .filter((card) => expectedStudentIds.has(card.studentId))
          .filter((card) => {
            return (
              card.percentage !== null &&
              card.totalMarks !== null
            );
          })
          .map((card) => card.studentId),
      );
      const incompleteEntries = Math.max(generatedEntries - completeStudentIds.size, 0);
      const hasIncompleteCards = incompleteEntries > 0;
      const rankingEntries = new Set(
        classCards
          .filter((card) => expectedStudentIds.has(card.studentId))
          .filter((card) => card.rankInClass !== null || card.rank !== null)
          .map((card) => card.studentId),
      ).size;
      const rankingMissingEntries = Math.max(expectedEntries - rankingEntries, 0);
      const assessmentReadiness =
        assessmentReadinessByClass.get(cls.id) ?? {
          assessmentSubjects: 0,
          expectedScores: 0,
          enteredScores: 0,
          missingScores: 0,
        };
      const issueReasons: string[] = [];
      if (expectedEntries === 0) {
        issueReasons.push('No enrolled students');
      }
      if (missingEntries > 0) {
        issueReasons.push(`${missingEntries} report cards not generated`);
      }
      if (incompleteEntries > 0) {
        issueReasons.push(`${incompleteEntries} report cards incomplete`);
      }
      if (assessmentReadiness.missingScores > 0) {
        issueReasons.push(`${assessmentReadiness.missingScores} assessment marks missing`);
      }
      let status: 'published' | 'ready' | 'has_issues' | 'no_students' =
        'has_issues';
      const allExpectedPublished = Array.from(expectedStudentIds).every(
        (studentId) => publishedStudentIds.has(studentId),
      );
      const allExpectedGenerated = Array.from(expectedStudentIds).every(
        (studentId) => generatedStudentIds.has(studentId),
      );
      if (expectedEntries === 0) {
        status = 'no_students';
      } else if (
        allExpectedPublished &&
        missingEntries === 0 &&
        !hasIncompleteCards
      ) {
        status = 'published';
      } else if (
        allExpectedGenerated &&
        missingEntries === 0 &&
        !hasIncompleteCards &&
        assessmentReadiness.missingScores === 0
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
        incompleteEntries,
        assessmentSubjects: assessmentReadiness.assessmentSubjects,
        assessmentExpectedScores: assessmentReadiness.expectedScores,
        assessmentEnteredScores: assessmentReadiness.enteredScores,
        assessmentMissingScores: assessmentReadiness.missingScores,
        rankingEntries,
        rankingMissingEntries,
        rankingMode: 'auto_on_publish' as const,
        certificateReady: certificate.certificateReady,
        certificateIssue: certificate.certificateIssue,
        issueReasons,
        status,
      };
    });
  }

  async getParentPresentationReport(
    schoolId: string,
    params: {
      academicYearId: string;
      fromTermId: string;
      toTermId: string;
      classId?: string;
    },
  ) {
    const [school, academicYearName, fromTermName, toTermName] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true, address: true, phone: true },
      }),
      this.resolveAcademicYearName(schoolId, params.academicYearId),
      this.resolveTermName(schoolId, params.fromTermId, params.academicYearId),
      this.resolveTermName(schoolId, params.toTermId, params.academicYearId),
    ]);
    const academicYearKeys = Array.from(
      new Set([params.academicYearId, academicYearName].filter(Boolean)),
    );

    const reportCards = await this.prisma.reportCard.findMany({
      where: {
        schoolId,
        academicYear: { in: academicYearKeys },
        term: { in: [fromTermName, toTermName] },
        status: ReportCardStatus.PUBLISHED,
        ...(params.classId ? { classId: params.classId } : {}),
      },
      include: {
        class: { select: { id: true, name: true, grade: true, section: true } },
        section: { select: { id: true, name: true } },
      },
    });

    const termGroups = {
      from: reportCards.filter((card) => card.term === fromTermName),
      to: reportCards.filter((card) => card.term === toTermName),
    };
    const summarizeCards = (cards: typeof reportCards) => {
      const average = this.average(cards.map((card) => card.percentage));
      const attendance = this.average(cards.map((card) => card.attendancePercentage));
      const passCount = cards.filter((card) => (card.percentage ?? 0) >= 50).length;
      return {
        students: new Set(cards.map((card) => card.studentId)).size,
        average,
        attendance,
        passRate: cards.length > 0 ? Math.round((passCount / cards.length) * 1000) / 10 : null,
      };
    };
    const fromSummary = summarizeCards(termGroups.from);
    const toSummary = summarizeCards(termGroups.to);

    const classIds = Array.from(new Set(reportCards.map((card) => card.classId)));
    const classSummaries = classIds
      .map((classId) => {
        const classCards = reportCards.filter((card) => card.classId === classId);
        const sample = classCards[0];
        const from = summarizeCards(classCards.filter((card) => card.term === fromTermName));
        const to = summarizeCards(classCards.filter((card) => card.term === toTermName));
        return {
          classId,
          className: sample?.class?.name ?? 'Unknown class',
          grade: sample?.class?.grade ?? null,
          sectionName: sample?.section?.name ?? sample?.class?.section ?? null,
          fromAverage: from.average,
          toAverage: to.average,
          change: from.average !== null && to.average !== null ? Math.round((to.average - from.average) * 10) / 10 : null,
          fromAttendance: from.attendance,
          toAttendance: to.attendance,
          attendanceChange:
            from.attendance !== null && to.attendance !== null
              ? Math.round((to.attendance - from.attendance) * 10) / 10
              : null,
          fromStudents: from.students,
          toStudents: to.students,
          passRate: to.passRate,
        };
      })
      .sort((a, b) => `${a.className} ${a.sectionName ?? ''}`.localeCompare(`${b.className} ${b.sectionName ?? ''}`));

    const subjects = new Map<
      string,
      { subjectId: string; subjectName: string; fromScores: number[]; toScores: number[] }
    >();
    for (const card of reportCards) {
      for (const detail of this.parseGradeDetails(card.gradeDetails)) {
        const subjectId = String(detail.subjectId || detail.subjectName || 'unknown');
        const item =
          subjects.get(subjectId) ?? {
            subjectId,
            subjectName: String(detail.subjectName || 'Unknown subject'),
            fromScores: [],
            toScores: [],
          };
        const score = Number(detail.totalScore);
        if (Number.isFinite(score)) {
          if (card.term === fromTermName) item.fromScores.push(score);
          if (card.term === toTermName) item.toScores.push(score);
        }
        subjects.set(subjectId, item);
      }
    }
    const subjectSummaries = Array.from(subjects.values())
      .map((subject) => {
        const fromAverage = this.average(subject.fromScores);
        const toAverage = this.average(subject.toScores);
        return {
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          fromAverage,
          toAverage,
          change:
            fromAverage !== null && toAverage !== null
              ? Math.round((toAverage - fromAverage) * 10) / 10
              : null,
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    const improvedClasses = classSummaries
      .filter((item) => item.change !== null && item.change > 0)
      .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
      .slice(0, 5);
    const decliningClasses = classSummaries
      .filter((item) => item.change !== null && item.change < 0)
      .sort((a, b) => (a.change ?? 0) - (b.change ?? 0))
      .slice(0, 5);
    const weakSubjects = subjectSummaries
      .filter((item) => item.toAverage !== null)
      .sort((a, b) => (a.toAverage ?? 0) - (b.toAverage ?? 0))
      .slice(0, 5);
    const improvedSubjects = subjectSummaries
      .filter((item) => item.change !== null && item.change > 0)
      .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
      .slice(0, 5);

    return {
      generatedAt: new Date().toISOString(),
      school,
      academicYear: { id: params.academicYearId, name: academicYearName },
      fromTerm: { id: params.fromTermId, name: fromTermName },
      toTerm: { id: params.toTermId, name: toTermName },
      filters: { classId: params.classId ?? null },
      summary: {
        from: fromSummary,
        to: toSummary,
        averageChange:
          fromSummary.average !== null && toSummary.average !== null
            ? Math.round((toSummary.average - fromSummary.average) * 10) / 10
            : null,
        attendanceChange:
          fromSummary.attendance !== null && toSummary.attendance !== null
            ? Math.round((toSummary.attendance - fromSummary.attendance) * 10) / 10
            : null,
      },
      classSummaries,
      subjectSummaries,
      insights: {
        improvedClasses,
        decliningClasses,
        weakSubjects,
        improvedSubjects,
      },
    };
  }

  async generateParentPresentationExcel(
    schoolId: string,
    params: { academicYearId: string; fromTermId: string; toTermId: string; classId?: string },
  ): Promise<Buffer> {
    const report = await this.getParentPresentationReport(schoolId, params);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'YeneSchool';
    workbook.created = new Date();

    const overview = workbook.addWorksheet('Overview');
    overview.columns = [
      { header: 'Metric', key: 'metric', width: 32 },
      { header: report.fromTerm.name, key: 'from', width: 18 },
      { header: report.toTerm.name, key: 'to', width: 18 },
      { header: 'Change', key: 'change', width: 18 },
    ];
    overview.addRows([
      {
        metric: 'Average result',
        from: this.formatNullablePercent(report.summary.from.average),
        to: this.formatNullablePercent(report.summary.to.average),
        change: report.summary.averageChange === null ? '-' : `${report.summary.averageChange > 0 ? '+' : ''}${report.summary.averageChange}%`,
      },
      {
        metric: 'Attendance',
        from: this.formatNullablePercent(report.summary.from.attendance),
        to: this.formatNullablePercent(report.summary.to.attendance),
        change: report.summary.attendanceChange === null ? '-' : `${report.summary.attendanceChange > 0 ? '+' : ''}${report.summary.attendanceChange}%`,
      },
      {
        metric: 'Pass rate',
        from: this.formatNullablePercent(report.summary.from.passRate),
        to: this.formatNullablePercent(report.summary.to.passRate),
        change: '-',
      },
    ]);

    const classes = workbook.addWorksheet('Classes');
    classes.columns = [
      { header: 'Class', key: 'className', width: 22 },
      { header: 'Section', key: 'sectionName', width: 14 },
      { header: `${report.fromTerm.name} Avg`, key: 'fromAverage', width: 16 },
      { header: `${report.toTerm.name} Avg`, key: 'toAverage', width: 16 },
      { header: 'Change', key: 'change', width: 12 },
      { header: `${report.toTerm.name} Attendance`, key: 'toAttendance', width: 20 },
      { header: 'Pass Rate', key: 'passRate', width: 14 },
    ];
    classes.addRows(report.classSummaries);

    const subjectsSheet = workbook.addWorksheet('Subjects');
    subjectsSheet.columns = [
      { header: 'Subject', key: 'subjectName', width: 28 },
      { header: `${report.fromTerm.name} Avg`, key: 'fromAverage', width: 16 },
      { header: `${report.toTerm.name} Avg`, key: 'toAverage', width: 16 },
      { header: 'Change', key: 'change', width: 12 },
    ];
    subjectsSheet.addRows(report.subjectSummaries);

    for (const sheet of workbook.worksheets) {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECEFF3' } };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateParentPresentationPdf(
    schoolId: string,
    params: { academicYearId: string; fromTermId: string; toTermId: string; classId?: string },
  ): Promise<Buffer> {
    const report = await this.getParentPresentationReport(schoolId, params);
    return new Promise((resolve, reject) => {
      const doc = new PDFKitDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Term Performance Brief', { align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(11).fillColor('#475569').text(report.school?.name || 'School', { align: 'center' });
      doc.text(`${report.academicYear.name} • ${report.fromTerm.name} vs ${report.toTerm.name}`, { align: 'center' });
      doc.moveDown(1.5);

      doc.fillColor('#111827').fontSize(14).text('Executive Summary');
      doc.moveDown(0.5);
      const summaryRows = [
        ['Average result', this.formatNullablePercent(report.summary.from.average), this.formatNullablePercent(report.summary.to.average), report.summary.averageChange],
        ['Attendance', this.formatNullablePercent(report.summary.from.attendance), this.formatNullablePercent(report.summary.to.attendance), report.summary.attendanceChange],
        ['Pass rate', this.formatNullablePercent(report.summary.from.passRate), this.formatNullablePercent(report.summary.to.passRate), null],
      ];
      for (const [metric, from, to, change] of summaryRows) {
        const changeLabel = typeof change === 'number' ? `${change > 0 ? '+' : ''}${change}%` : '-';
        doc.fontSize(10).text(`${metric}: ${from} -> ${to} (${changeLabel})`);
      }
      doc.moveDown(1);

      const writeList = (title: string, rows: Array<Record<string, any>>, valueKey: string) => {
        doc.fillColor('#111827').fontSize(13).text(title);
        doc.moveDown(0.3);
        if (rows.length === 0) {
          doc.fillColor('#64748b').fontSize(10).text('No data available.');
          doc.moveDown(0.6);
          return;
        }
        rows.forEach((row, index) => {
          const label = row.className
            ? `${row.className}${row.sectionName ? ` ${row.sectionName}` : ''}`
            : row.subjectName;
          const value = row[valueKey];
          doc.fillColor('#334155').fontSize(10).text(`${index + 1}. ${label}: ${value === null || value === undefined ? '-' : value}`);
        });
        doc.moveDown(0.8);
      };

      writeList('Top Improving Classes', report.insights.improvedClasses, 'change');
      writeList('Classes Needing Attention', report.insights.decliningClasses, 'change');
      writeList('Improving Subjects', report.insights.improvedSubjects, 'change');
      writeList('Weak Subjects', report.insights.weakSubjects, 'toAverage');

      doc.addPage();
      doc.fillColor('#111827').fontSize(14).text('Class Comparison');
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#475569');
      report.classSummaries.slice(0, 28).forEach((row) => {
        doc.text(
          `${row.className}${row.sectionName ? ` ${row.sectionName}` : ''}: ${this.formatNullablePercent(row.fromAverage)} -> ${this.formatNullablePercent(row.toAverage)} | change ${row.change === null ? '-' : `${row.change > 0 ? '+' : ''}${row.change}%`} | attendance ${this.formatNullablePercent(row.toAttendance)}`,
        );
      });

      doc.end();
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

    if (!reportCard) throw new LocalizedException('report_card.report_card_not_found_7ab38473', undefined, HttpStatus.NOT_FOUND, 'Report card not found');
    const gradeDetails = await this.resolveReportCardGradeDetails(reportCard);

    return {
      ...reportCard,
      gradeDetails,
    };
  }

  async getCertificateTemplate(schoolId: string) {
    const now = new Date();
    const [school, stored, curriculumSetting, activeAcademicYear, assessmentWeights] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, phone: true, address: true, logoUrl: true },
      }),
      this.prisma.schoolSetting.findFirst({
        where: { schoolId, key: SCHOOL_SETTING_KEYS.CERTIFICATE_SETTINGS },
        select: { value: true },
      }),
      this.prisma.schoolSetting.findFirst({
        where: { schoolId, key: SCHOOL_SETTING_KEYS.CURRICULUM_TYPE },
        select: { value: true },
      }),
      this.prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        include: { terms: { orderBy: { order: 'asc' } } },
      }),
      this.prisma.assessmentWeight.findMany({
        where: { schoolId, isActive: true },
        orderBy: { percentage: 'desc' },
      }),
    ]);

    let template: any = {};
    if (stored?.value) {
      try {
        template = JSON.parse(stored.value);
      } catch {
        template = {};
      }
    }
    const currentPeriod =
      activeAcademicYear?.terms.find((term) => term.startDate <= now && term.endDate >= now) ||
      activeAcademicYear?.terms[0] ||
      null;

    return {
      schoolId,
      curriculumType: String(curriculumSetting?.value || 'SEMESTER').toUpperCase(),
      currentPeriodName: currentPeriod?.name || '',
      activeAcademicYearName: activeAcademicYear?.name || '',
      assessmentColumns: assessmentWeights.map((weight) => ({
        code: weight.type,
        name: weight.type
          .toLowerCase()
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
        percentage: weight.percentage,
      })),
      title: template.title || 'Official Student Result Certificate',
      themeColor: template.themeColor || '#1B4F72',
      principalName: template.principalName || '',
      schoolName: template.schoolName || school?.name || '',
      schoolPhone: template.schoolPhone || school?.phone || '',
      schoolAddress: template.schoolAddress || school?.address || '',
      schoolLogoUrl: school?.logoUrl || '',
      showRank: template.showRank !== false,
      showAttendance: template.showAttendance === true,
      showGPA: template.showGPA === true,
      useCustomBackground: template.useCustomBackground === true,
      customBackgroundUrl: template.customBackgroundUrl || '',
    };
  }

  async saveCertificateTemplate(schoolId: string, value: Record<string, any>) {
    const normalized = {
      title: String(value.title || 'Official Student Result Certificate').trim(),
      themeColor: this.normalizeHexColor(value.themeColor, '#1B4F72'),
      principalName: String(value.principalName || '').trim(),
      schoolName: String(value.schoolName || '').trim(),
      schoolPhone: String(value.schoolPhone || '').trim(),
      schoolAddress: String(value.schoolAddress || '').trim(),
      showRank: value.showRank !== false,
      showAttendance: value.showAttendance === true,
      showGPA: value.showGPA === true,
      useCustomBackground: value.useCustomBackground === true,
      customBackgroundUrl: String(value.customBackgroundUrl || '').trim(),
    };

    const existing = await this.prisma.schoolSetting.findFirst({
      where: { schoolId, key: SCHOOL_SETTING_KEYS.CERTIFICATE_SETTINGS },
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
          key: SCHOOL_SETTING_KEYS.CERTIFICATE_SETTINGS,
          value: JSON.stringify(normalized),
        },
      });
    }

    return this.getCertificateTemplate(schoolId);
  }

  async uploadCertificateWatermark(schoolId: string, file: Express.Multer.File): Promise<string> {
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype)) throw new LocalizedException('report_card.watermark_must_be_a_png_jpg_or_webp_image_17a9de60', undefined, undefined, 'Watermark must be a PNG, JPG, or WEBP image');
    const extension =
      file.mimetype === 'image/png' ? '.png' :
      file.mimetype === 'image/webp' ? '.webp' :
      '.jpg';
    const storedFile = await this.storageService.upload(
      file.buffer,
      `${schoolId}-${Date.now()}${extension}`,
      file.mimetype,
      {
        schoolId,
        folder: 'certificate-watermarks',
        generateName: false,
      },
    );
    return storedFile.url;
  }

  async getCertificatePayload(reportCardId: string, schoolId: string) {
    const template = await this.getCertificateTemplate(schoolId);
    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id: reportCardId, schoolId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            studentProfile: { select: { studentCode: true, studentId: true } },
          },
        },
        class: { select: { id: true, name: true, section: true, grade: true } },
      },
    });

    if (!reportCard) throw new LocalizedException('report_card.report_card_not_found_7ab38473', undefined, HttpStatus.NOT_FOUND, 'Report card not found');
    const gradeDetails = await this.resolveReportCardGradeDetails(reportCard);
    const academicYearRecord = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        OR: [{ id: reportCard.academicYear }, { name: reportCard.academicYear }],
      },
      select: { id: true, name: true },
    });

    return {
      template,
      reportCard: {
        id: reportCard.id,
        term: reportCard.term,
        academicYear: reportCard.academicYear,
        academicYearId: academicYearRecord?.id || reportCard.academicYear,
        rank: reportCard.rank,
        rankInClass: reportCard.rankInClass,
        totalMarks: reportCard.totalMarks,
        percentage: reportCard.percentage,
        overallGrade: reportCard.overallGrade,
        attendancePercentage: reportCard.attendancePercentage,
        teacherRemarks: reportCard.teacherRemarks,
        principalRemarks: reportCard.principalRemarks,
        student: reportCard.student,
        class: reportCard.class,
        gradeDetails,
      },
    };
  }

  private async getCertificateReadiness(schoolId: string) {
    return {
      certificateReady: true,
      certificateIssue: null,
    };
  }

  private normalizeHexColor(value: any, fallback: string) {
    const raw = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
  }

  private toDownloadFileName(value: string | null | undefined, fallback: string) {
    const cleaned = String(value || '')
      .replace(/[<>:"/\\|?*\x00-\x1F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || fallback;
  }

  private hexToRgbColor(value: string) {
    const raw = this.normalizeHexColor(value, '#1B4F72').replace('#', '');
    return rgb(
      parseInt(raw.slice(0, 2), 16) / 255,
      parseInt(raw.slice(2, 4), 16) / 255,
      parseInt(raw.slice(4, 6), 16) / 255,
    );
  }

  private resolveBackendPublicAssetPath(urlPath: string): string | null {
    const raw = String(urlPath || '').trim();
    if (!raw) return null;
    if (path.isAbsolute(raw) && !raw.includes('..') && fs.existsSync(raw)) return raw;
    const clean = raw.replace(/^\/+/, '');
    if (!clean || clean.includes('..')) return null;
    const candidates = [
      path.join(process.cwd(), 'public', clean),
      path.join(process.cwd(), 'backend', 'public', clean),
      path.join(process.cwd(), 'frontend', 'public', clean),
      path.resolve(__dirname, '..', '..', 'public', clean),
      path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', clean),
      path.join(process.cwd(), '..', 'frontend', 'public', clean),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) || null;
  }

  async generateCertificatePdf(schoolId: string, reportCardId: string): Promise<Buffer> {
    const payload = await this.getCertificatePayload(reportCardId, schoolId);
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    const theme = this.hexToRgbColor(payload.template.themeColor);
    const darkText = rgb(0.08, 0.1, 0.14);
    const mutedText = rgb(0.38, 0.42, 0.48);
    const lightBorder = rgb(0.74, 0.84, 0.93);
    const surface = rgb(0.96, 0.98, 1);
    const margin = 32;
    const contentW = width - margin * 2;

    const pdfText = (text: any) =>
      String(text ?? '')
        .normalize('NFKD')
        .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '')
        .trim();
    const drawText = (text: string, x: number, y: number, size = 10, textFont = font, color = darkText) => {
      page.drawText(pdfText(text), { x, y, size, font: textFont, color });
    };
    const truncate = (text: any, maxWidth: number, size: number, textFont = font) => {
      const raw = pdfText(text);
      if (textFont.widthOfTextAtSize(raw, size) <= maxWidth) return raw;
      let value = raw;
      while (value.length > 1 && textFont.widthOfTextAtSize(`${value}...`, size) > maxWidth) {
        value = value.slice(0, -1);
      }
      return `${value}...`;
    };
    const drawCenteredText = (text: string, centerX: number, y: number, size = 10, textFont = font, color = darkText) => {
      const value = pdfText(text);
      page.drawText(value, {
        x: centerX - textFont.widthOfTextAtSize(value, size) / 2,
        y,
        size,
        font: textFont,
        color,
      });
    };
    const readImageBytes = async (url: string | undefined): Promise<Buffer | null> => {
      const clean = String(url || '').trim();
      if (!clean) return null;
      if (clean.startsWith('data:image/')) {
        const encoded = clean.split(',')[1];
        return encoded ? Buffer.from(encoded, 'base64') : null;
      }
      const assetPath = this.resolveBackendPublicAssetPath(clean);
      if (!assetPath || !fs.existsSync(assetPath)) return null;
      return fs.readFileSync(assetPath);
    };
    const embedImage = async (url: string | undefined) => {
      const bytes = await readImageBytes(url);
      if (!bytes) return null;
      try {
        const lower = String(url || '').toLowerCase();
        if (lower.endsWith('.png') || lower.includes('image/png')) return await pdfDoc.embedPng(bytes);
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.includes('image/jpeg') || lower.includes('image/jpg')) return await pdfDoc.embedJpg(bytes);
        return await pdfDoc.embedPng(await sharp(bytes).png().toBuffer());
      } catch {
        return null;
      }
    };
    const drawRemoteImage = async (url: string | undefined, x: number, y: number, w: number, h: number, opacity = 1) => {
      const image = await embedImage(url);
      if (!image) return;
      try {
        page.drawImage(image, { x, y, width: w, height: h });
        if (opacity < 1) page.drawRectangle({ x, y, width: w, height: h, opacity: 1 - opacity, color: rgb(1, 1, 1) });
      } catch {
        return;
      }
    };
    const drawWatermark = async () => {
      if (!payload.template.useCustomBackground || !payload.template.customBackgroundUrl) return;
      const image = await embedImage(payload.template.customBackgroundUrl);
      if (!image) return;
      const watermarkW = width * 0.58;
      const watermarkH = watermarkW * (image.height / image.width);
      page.drawImage(image, {
        x: (width - watermarkW) / 2,
        y: (height - watermarkH) / 2,
        width: watermarkW,
        height: watermarkH,
        opacity: 0.1,
      });
    };
    const gradeClassColor = (letter: string) => {
      const first = String(letter || '').charAt(0).toUpperCase();
      if (first === 'A') return { bg: rgb(0.92, 0.97, 0.87), fg: rgb(0.23, 0.43, 0.07) };
      if (first === 'B') return { bg: rgb(0.9, 0.95, 0.99), fg: rgb(0.09, 0.37, 0.65) };
      if (first === 'C') return { bg: rgb(0.98, 0.93, 0.86), fg: rgb(0.52, 0.31, 0.04) };
      if (first === 'D') return { bg: rgb(0.99, 0.92, 0.92), fg: rgb(0.64, 0.18, 0.18) };
      return { bg: rgb(0.96, 0.78, 0.78), fg: rgb(0.48, 0, 0) };
    };

    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    await drawWatermark();
    page.drawRectangle({ x: 0.5, y: 0.5, width: width - 1, height: height - 1, borderColor: rgb(0.86, 0.88, 0.9), borderWidth: 0.5 });

    const headerY = height - 86;
    await drawRemoteImage(payload.template.schoolLogoUrl, margin, headerY - 24, 68, 68);
    drawCenteredText(payload.template.schoolName || 'School Name', width / 2, headerY + 18, 16, bold, theme);
    drawCenteredText(
      [payload.template.schoolAddress, payload.template.schoolPhone].filter(Boolean).join('  •  '),
      width / 2,
      headerY + 2,
      10,
      font,
      mutedText,
    );
    drawText('Year', width - margin - 122, headerY + 15, 8.5, font, mutedText);
    drawText(String(payload.reportCard.academicYear || '-'), width - margin - 66, headerY + 15, 8.5, bold, theme);
    drawText('Period', width - margin - 122, headerY, 8.5, font, mutedText);
    drawText(String(payload.reportCard.term || '-'), width - margin - 66, headerY, 8.5, bold, theme);
    drawText('Issued', width - margin - 122, headerY - 15, 8.5, font, mutedText);
    drawText(new Date().toISOString().slice(0, 10), width - margin - 66, headerY - 15, 8.5, bold, theme);

    const titleY = headerY - 48;
    page.drawRectangle({ x: 0, y: titleY, width, height: 28, color: theme });
    drawCenteredText(payload.template.title || 'Student Report Card', width / 2, titleY + 9, 13, bold, rgb(1, 1, 1));

    const bodyTop = titleY - 24;
    const classLabel = [payload.reportCard.class?.name, payload.reportCard.class?.section].filter(Boolean).join(' ');
    const studentCode =
      payload.reportCard.student?.studentProfile?.studentCode ||
      payload.reportCard.student?.studentProfile?.studentId ||
      payload.reportCard.student?.id ||
      '-';
    const infoCells = [
      ['Full name', payload.reportCard.student?.name || '-'],
      ['Student ID', studentCode],
      ['Class', classLabel || '-'],
      ['Academic Year / Period', `${payload.reportCard.academicYear || '-'} / ${payload.reportCard.term || '-'}`],
      ['Issue Date', new Date().toISOString().slice(0, 10)],
    ];
    const cellW = contentW / 2;
    const cellH = 38;
    infoCells.forEach(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + col * cellW;
      const y = bodyTop - (row + 1) * cellH;
      page.drawRectangle({ x, y, width: cellW, height: cellH, borderColor: lightBorder, borderWidth: 0.5 });
      drawText(label.toUpperCase(), x + 12, y + 22, 8, font, mutedText);
      drawText(truncate(value, cellW - 24, 11, bold), x + 12, y + 8, 11, bold, darkText);
    });

    // Get all terms in the year to create dynamic columns
    const academicYearId = payload.reportCard.academicYearId || payload.reportCard.academicYear;
    const allTerms = await this.prisma.term.findMany({
      where: { academicYearId },
      orderBy: { order: 'asc' },
    });

    const termColumns = allTerms.map((t: any) => ({
      id: t.id,
      label: t.name,
    }));

    const tableX = margin;
    const tableTop = bodyTop - cellH * 3 - 22;
    const tableW = contentW;
    const rowH = 20;
    const noW = 26;
    const totalW = 54;
    const gradeW = 54;
    
    // Each term column width
    const termW = termColumns.length ? Math.min(50, Math.max(38, (tableW - noW - 140 - totalW - gradeW) / termColumns.length)) : 0;
    const subjectW = tableW - noW - totalW - gradeW - termW * termColumns.length;
    
    page.drawRectangle({ x: tableX, y: tableTop, width: tableW, height: rowH, color: theme });
    let cursorX = tableX;
    drawCenteredText('#', cursorX + noW / 2, tableTop + 7, 9, bold, rgb(1, 1, 1)); cursorX += noW;
    drawText('Subject', cursorX + 8, tableTop + 7, 9, bold, rgb(1, 1, 1)); cursorX += subjectW;
    
    termColumns.forEach((term) => {
      drawCenteredText(truncate(term.label, termW - 4, 8, bold), cursorX + termW / 2, tableTop + 7, 8, bold, rgb(1, 1, 1));
      cursorX += termW;
    });
    
    drawCenteredText('Y. Avg', cursorX + totalW / 2, tableTop + 7, 9, bold, rgb(1, 1, 1)); cursorX += totalW;
    drawCenteredText('Y. Grade', cursorX + gradeW / 2, tableTop + 7, 9, bold, rgb(1, 1, 1));
    
    let rowY = tableTop - rowH;
    const grades = payload.reportCard.gradeDetails || [];
    for (const [index, grade] of grades.slice(0, 16).entries()) {
      page.drawRectangle({
        x: tableX,
        y: rowY,
        width: tableW,
        height: rowH,
        color: index % 2 === 0 ? rgb(1, 1, 1) : surface,
        borderColor: lightBorder,
        borderWidth: 0.5,
      });
      cursorX = tableX;
      drawCenteredText(String(index + 1), cursorX + noW / 2, rowY + 7, 8.5, font, darkText); cursorX += noW;
      drawText(truncate(grade.subjectName || '', subjectW - 12, 9, font), cursorX + 8, rowY + 7, 9, font, darkText); cursorX += subjectW;
      
      termColumns.forEach((term) => {
        const termData = grade.terms?.[term.id];
        drawCenteredText(termData?.score !== undefined ? String(termData.score) : '-', cursorX + termW / 2, rowY + 7, 8.5, font, darkText);
        cursorX += termW;
      });
      
      drawCenteredText(String(grade.yearlyAverage ?? '-'), cursorX + totalW / 2, rowY + 7, 9, bold, darkText); cursorX += totalW;
      const gradeText = String(grade.yearlyGrade || '-');
      const colors = gradeClassColor(gradeText);
      page.drawRectangle({ x: cursorX + 12, y: rowY + 4, width: gradeW - 24, height: 14, color: colors.bg });
      drawCenteredText(gradeText, cursorX + gradeW / 2, rowY + 7, 8.5, bold, colors.fg);
      rowY -= rowH;
    }

    const footerTop = 108;
    const summaryY = footerTop + 82;
    page.drawRectangle({ x: tableX, y: summaryY, width: tableW, height: rowH, color: rgb(0.92, 0.96, 0.99), borderColor: lightBorder, borderWidth: 0.5 });
    drawText('Average', tableX + noW + 8, summaryY + 7, 9, bold, mutedText);
    drawCenteredText(String(payload.reportCard.percentage ?? '-'), tableX + tableW - gradeW - totalW / 2, summaryY + 7, 9, bold, theme);
    drawCenteredText(String(payload.reportCard.overallGrade || '-'), tableX + tableW - gradeW / 2, summaryY + 7, 9, bold, theme);

    const bottomY = footerTop + 18;
    const boxW = (contentW - 12) / 2;
    page.drawRectangle({ x: margin, y: bottomY, width: boxW, height: 52, borderColor: lightBorder, borderWidth: 0.5 });
    drawText('SUMMARY', margin + 12, bottomY + 35, 8, font, theme);
    const summaryItems = [
      ['Average', `${payload.reportCard.percentage ?? '-'}%`],
      payload.template.showRank ? ['Rank', `${payload.reportCard.rank ?? payload.reportCard.rankInClass ?? '-'}`] : null,
      ['Grade', payload.reportCard.overallGrade || '-'],
      payload.template.showAttendance ? ['Attendance', `${payload.reportCard.attendancePercentage ?? '-'}%`] : null,
      payload.template.showGPA ? ['GPA', '-'] : null,
    ].filter(Boolean) as string[][];
    summaryItems.forEach(([label, value], index) => {
      const x = margin + 12 + (index % 3) * 92;
      const y = bottomY + 20 - Math.floor(index / 3) * 14;
      drawText(`${label}:`, x, y, 8, bold, mutedText);
      drawText(value, x + 46, y, 8.5, bold, theme);
    });

    page.drawRectangle({ x: margin + boxW + 12, y: bottomY, width: boxW, height: 52, borderColor: lightBorder, borderWidth: 0.5 });
    const teacherRem = payload.reportCard.teacherRemarks || 'No remark provided by teacher.';
    const principalRem = payload.reportCard.principalRemarks || 'No remark provided by principal.';
    
    drawText('REMARKS', margin + boxW + 24, bottomY + 35, 8, font, theme);
    drawText(truncate(`Teacher: ${teacherRem}`, boxW - 32, 8, font), margin + boxW + 24, bottomY + 21, 8, font, darkText);
    drawText(truncate(`Principal: ${principalRem}`, boxW - 32, 8, font), margin + boxW + 24, bottomY + 8, 8, font, darkText);

    page.drawRectangle({ x: margin, y: 86, width: contentW, height: 16, color: surface, borderColor: lightBorder, borderWidth: 0.5 });
    drawCenteredText(
      'This certificate is valid only with the principal signature and official school stamp.',
      width / 2,
      91,
      7.5,
      font,
      mutedText,
    );

    const sigY = 36;
    page.drawLine({ start: { x: margin + 8, y: sigY + 28 }, end: { x: margin + 170, y: sigY + 28 }, thickness: 0.6, color: theme });
    page.drawLine({ start: { x: width / 2 - 80, y: sigY + 28 }, end: { x: width / 2 + 80, y: sigY + 28 }, thickness: 0.6, color: theme });
    page.drawLine({ start: { x: width - margin - 170, y: sigY + 28 }, end: { x: width - margin - 8, y: sigY + 28 }, thickness: 0.6, color: theme });
    drawCenteredText('Prepared By', margin + 89, sigY + 13, 9, bold, theme);
    drawCenteredText(payload.template.principalName || 'Principal', width / 2, sigY + 13, 9, bold, theme);
    drawCenteredText('School Stamp', width - margin - 89, sigY + 13, 9, bold, theme);
    drawCenteredText('Registrar / Class Teacher', margin + 89, sigY, 8, font, mutedText);
    drawCenteredText('Principal Signature', width / 2, sigY, 8, font, mutedText);
    drawCenteredText('Official Seal', width - margin - 89, sigY, 8, font, mutedText);
    drawCenteredText(`RC-${payload.reportCard.id}`, width / 2, 12, 7.5, font, rgb(0.65, 0.65, 0.65));

    return Buffer.from(await pdfDoc.save());
  }

  async generateCertificateBulkZip(schoolId: string, reportCardIds: string[]): Promise<Buffer> {
    const ids = (reportCardIds || []).filter(Boolean);
    if (!ids.length) throw new LocalizedException('report_card.no_report_card_ids_provided_cc8a09f6', undefined, undefined, 'No report card IDs provided');
    const reportCards = await this.prisma.reportCard.findMany({
      where: { id: { in: ids }, schoolId },
      select: {
        id: true,
        student: { select: { name: true } },
      },
    });
    const reportCardNameById = new Map(
      reportCards.map((card) => [
        card.id,
        this.toDownloadFileName(card.student?.name, `report-card-${card.id}`),
      ]),
    );
    const chunks: Buffer[] = [];
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const done = new Promise<Buffer>((resolve, reject) => {
      archive.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      archive.on('warning', (err) => {
        if ((err as any).code === 'ENOENT') return;
        reject(err);
      });
      archive.on('error', reject);
      archive.on('end', () => resolve(Buffer.concat(chunks)));
    });
    const failures: string[] = [];
    const usedFileNames = new Map<string, number>();
    for (const id of ids) {
      try {
        const pdf = await this.generateCertificatePdf(schoolId, id);
        const baseName = reportCardNameById.get(id) || `report-card-${id}`;
        const nextCount = (usedFileNames.get(baseName) || 0) + 1;
        usedFileNames.set(baseName, nextCount);
        const fileName = nextCount === 1 ? `${baseName}.pdf` : `${baseName}-${nextCount}.pdf`;
        archive.append(pdf, { name: fileName });
      } catch (error: any) {
        failures.push(`${id}: ${error?.message || 'Failed to generate PDF'}`);
      }
    }
    if (failures.length === ids.length) throw new LocalizedException('report_card.no_report_card_pdfs_could_be_generated_78c9110c', undefined, undefined, 'No report card PDFs could be generated');
    if (failures.length) {
      archive.append(failures.join('\n'), { name: 'download-errors.txt' });
    }
    await archive.finalize();
    return done;
  }

  async getCertificateDownloadFileName(schoolId: string, reportCardId: string) {
    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id: reportCardId, schoolId },
      select: {
        id: true,
        student: { select: { name: true } },
      },
    });
    return this.toDownloadFileName(reportCard?.student?.name, `report-card-${reportCardId}`);
  }

  /**
   * Publish report cards
   */
  async publishReportCards(ids: string[], schoolId: string) {
    const reportCards = await this.prisma.reportCard.findMany({
      where: { id: { in: ids }, schoolId },
    });

    if (reportCards.length === 0) throw new LocalizedException('report_card.no_report_cards_found_f68bd5ef', undefined, HttpStatus.NOT_FOUND, 'No report cards found');

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
      this.resolveTermName(schoolId, termId, academicYearId),
      this.prisma.class.findFirst({
        where: { id: classId, schoolId, academicYearId },
        select: { id: true, name: true, grade: true, section: true },
      }),
    ]);
    const academicYearKeys = Array.from(
      new Set([academicYearId, academicYearName].filter(Boolean)),
    );

    if (!classRecord) throw new LocalizedException('report_card.class_not_found_7fd09a97', undefined, HttpStatus.NOT_FOUND, 'Class not found');

    const [enrollments, reportCards, assessmentSubjects] = await Promise.all([
      this.prisma.studentClass.findMany({
        where: {
          schoolId,
          classId,
          academicYear: { in: academicYearKeys },
        },
        select: { studentId: true, classId: true, sectionId: true },
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
      this.prisma.assessmentSubject.findMany({
        where: {
          classId,
          assessment: {
            schoolId,
            academicYearId,
            termId,
            status: { in: ['ACTIVE', 'COMPLETED'] },
          },
        },
        select: {
          id: true,
          classId: true,
          sectionId: true,
          scores: {
            select: {
              studentId: true,
              score: true,
              isAbsent: true,
              status: true,
            },
          },
        },
      }),
    ]);
    const uniqueEnrollmentStudentIds = new Set(
      enrollments.map((enrollment) => enrollment.studentId),
    );

    if (uniqueEnrollmentStudentIds.size === 0) throw new LocalizedException('report_card.no_enrolled_students_found_for_this_class_1f5e0688', undefined, undefined, 'No enrolled students found for this class');

    const studentIdsByClass = new Map<string, Set<string>>();
    const studentIdsByClassSection = new Map<string, Set<string>>();
    for (const enrollment of enrollments) {
      const classBucket = studentIdsByClass.get(enrollment.classId) ?? new Set<string>();
      classBucket.add(enrollment.studentId);
      studentIdsByClass.set(enrollment.classId, classBucket);

      const sectionKey = `${enrollment.classId}:${enrollment.sectionId ?? 'all'}`;
      const sectionBucket = studentIdsByClassSection.get(sectionKey) ?? new Set<string>();
      sectionBucket.add(enrollment.studentId);
      studentIdsByClassSection.set(sectionKey, sectionBucket);
    }
    const assessmentReadiness =
      this.buildAssessmentReadinessByClass(
        assessmentSubjects,
        studentIdsByClass,
        studentIdsByClassSection,
      ).get(classId) ?? {
        assessmentSubjects: 0,
        expectedScores: 0,
        enteredScores: 0,
        missingScores: 0,
      };

    if (assessmentReadiness.missingScores > 0) {
      throw new BadRequestException(
        `Results cannot be published yet because ${assessmentReadiness.missingScores} assessment marks are missing`,
      );
    }

    const enrolledReportCards = reportCards.filter((card) =>
      uniqueEnrollmentStudentIds.has(card.studentId),
    );
    const reportCardStudentIds = new Set(
      enrolledReportCards.map((card) => card.studentId),
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
      return (
        card.percentage !== null &&
        card.totalMarks !== null
      );
    };

    const completeCardsByStudent = new Map<string, (typeof reportCards)[number]>();
    for (const card of enrolledReportCards) {
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

    const reportCardIds = rankedReportCards.map((card) => card.id);
    await this.prisma.reportCard.updateMany({
      where: { id: { in: reportCardIds }, schoolId },
      data: {
        status: ReportCardStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    const classLabel = classRecord.section
      ? `${classRecord.name} ${classRecord.section}`
      : classRecord.name;

    const studentUserIds = Array.from(
      new Set(rankedReportCards.map((card) => card.studentId).filter(Boolean)),
    );
    const parentUserIds = Array.from(
      new Set(
        rankedReportCards.flatMap((card) =>
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
      internalRemarks?: string;
      coCurricular?: string;
      behavior?: string;
    },
  ) {
    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id, schoolId },
    });
    if (!reportCard) throw new LocalizedException('report_card.report_card_not_found_7ab38473', undefined, HttpStatus.NOT_FOUND, 'Report card not found');

    return this.prisma.reportCard.update({
      where: { id },
      data: {
        teacherRemarks: data.teacherRemarks,
        principalRemarks: data.principalRemarks,
        internalRemarks: data.internalRemarks,
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
    if (!reportCard) throw new LocalizedException('report_card.report_card_not_found_7ab38473', undefined, HttpStatus.NOT_FOUND, 'Report card not found');

    if (reportCard.status === ReportCardStatus.PUBLISHED) throw new LocalizedException('report_card.cannot_delete_a_published_report_card_3110b7a6', undefined, undefined, 'Cannot delete a published report card');

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

    if (!classInfo) throw new LocalizedException('report_card.class_not_found_7fd09a97', undefined, HttpStatus.NOT_FOUND, 'Class not found');

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
        criteria?.minAverageGrade !== undefined &&
        averageGrade < criteria.minAverageGrade
      ) {
        status = 'RETAINED';
        reasons.push(
          `Average grade ${averageGrade.toFixed(1)} below minimum ${criteria.minAverageGrade}`,
        );
      }

      if (
        criteria?.minAttendance !== undefined &&
        attendance < criteria.minAttendance
      ) {
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

  async getPromotionCandidatesByGrade(
    schoolId: string,
    grade: number,
    academicYear: string,
    criteria?: PromotionCriteria,
  ) {
    const enrollments = await this.prisma.studentClass.findMany({
      where: {
        schoolId,
        academicYear,
        class: { grade },
      },
      include: {
        class: { select: { id: true, name: true, grade: true } },
        section: { select: { id: true, name: true } },
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            studentProfile: { select: { rollNumber: true } },
          },
        },
      },
    });

    const sortedEnrollments = enrollments.slice().sort((a, b) => {
      const sectionCompare = (a.section?.name || '').localeCompare(b.section?.name || '', undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      if (sectionCompare !== 0) return sectionCompare;
      const aRoll = Number.parseInt(a.student.studentProfile?.rollNumber || '', 10);
      const bRoll = Number.parseInt(b.student.studentProfile?.rollNumber || '', 10);
      const aRank = Number.isNaN(aRoll) ? Number.POSITIVE_INFINITY : aRoll;
      const bRank = Number.isNaN(bRoll) ? Number.POSITIVE_INFINITY : bRoll;
      if (aRank !== bRank) return aRank - bRank;
      return a.student.name.localeCompare(b.student.name, undefined, { sensitivity: 'base' });
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

    for (const enrollment of sortedEnrollments) {
      const latestReportCard = await this.prisma.reportCard.findFirst({
        where: {
          schoolId,
          studentId: enrollment.studentId,
          academicYear,
          status: ReportCardStatus.PUBLISHED,
          class: { grade },
        },
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      });

      if (!latestReportCard) {
        candidates.push({
          student: {
            id: enrollment.student.id,
            name: enrollment.student.name,
            avatarUrl: enrollment.student.avatarUrl,
            rollNumber: enrollment.student.studentProfile?.rollNumber ?? null,
          },
          status: 'NO_DATA',
          reason: 'No report card generated',
          reasons: ['No published report card'],
          averageGrade: 0,
          attendance: 0,
        });
        continue;
      }

      const averageGrade = latestReportCard.percentage || 0;
      const attendance = latestReportCard.attendancePercentage || 0;
      let status = 'PROMOTED';
      const reasons: string[] = [];

      if (criteria?.minAverageGrade && averageGrade < criteria.minAverageGrade) {
        status = 'RETAINED';
        reasons.push(`Average grade ${averageGrade.toFixed(1)} below minimum ${criteria.minAverageGrade}`);
      }
      if (criteria?.minAttendance && attendance < criteria.minAttendance) {
        status = 'RETAINED';
        reasons.push(`Attendance ${attendance.toFixed(1)}% below minimum ${criteria.minAttendance}%`);
      }

      candidates.push({
        student: {
          id: enrollment.student.id,
          name: enrollment.student.name,
          avatarUrl: enrollment.student.avatarUrl,
          rollNumber: enrollment.student.studentProfile?.rollNumber ?? null,
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
      className: `Grade ${grade}`,
      academicYear,
      totalStudents: sortedEnrollments.length,
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

    if (!currentClass) throw new LocalizedException('report_card.class_not_found_7fd09a97', undefined, HttpStatus.NOT_FOUND, 'Class not found');

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

  async getNextGradeOptions(schoolId: string, grade: number, toAcademicYear?: string) {
    const range = await this.getSchoolGradeRange(schoolId);
    if (grade < range.min || grade > range.max) throw new LocalizedException('report_card.grade_is_not_available_in_this_schools_grade_system_bb8e19de', undefined, undefined, 'Grade ${grade} is not available in this school\'s grade system');
    if (grade >= range.max) {
      return { currentGrade: grade, nextGrades: [], isLastGrade: true, graduationEnabled: true };
    }

    return {
      currentGrade: grade,
      nextGrades: [{ grade: grade + 1, name: `Grade ${grade + 1}` }],
      isLastGrade: false,
      graduationEnabled: false,
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

    await this.assertAcademicYearEnded(schoolId, fromAcademicYear);

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

    const [minAverageGrade, minAttendance, allowFailedSubjects] = await Promise.all([
      this.getPromotionMinAverageGrade(schoolId),
      this.getPromotionMinAttendance(schoolId),
      this.getPromotionAllowFailedSubjects(schoolId),
    ]);

    await this.ensurePromotionReadiness({
      schoolId,
      fromClassId,
      fromAcademicYear,
      studentIds: [studentId],
      promoteAll: false,
      criteria: { minAverageGrade, minAttendance, allowFailedSubjects },
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
    if (!toClass) throw new LocalizedException('report_card.target_class_not_found_460a51f1', undefined, HttpStatus.NOT_FOUND, 'Target class not found');
    if (toClass.id === fromClassId) throw new LocalizedException('report_card.target_class_must_be_different_from_source_class_4e71febc', undefined, undefined, 'Target class must be different from source class');

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
      schoolId,
      toClassId,
      sourceEnrollment?.section?.name,
    );
    const targetSection = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { name: true, capacity: true },
    });
    const targetEnrollmentCount = await this.prisma.studentClass.count({
      where: {
        sectionId,
        academicYear: toAcademicYear,
        studentId: { not: studentId },
      },
    });
    if (
      targetSection?.capacity &&
      targetEnrollmentCount >= targetSection.capacity
    ) {
      throw new BadRequestException(
        `Section ${targetSection.name} is already at capacity`,
      );
    }

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
    schoolId: string,
    classId: string,
    preferredSectionName?: string | null,
  ): Promise<string> {
    const targetClass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        sections: true,
      },
    });

    if (!targetClass) throw new LocalizedException('report_card.target_class_not_found_460a51f1', undefined, HttpStatus.NOT_FOUND, 'Target class not found');

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

      const defaultCapacity = await this.getDefaultSectionCapacity(schoolId);
      const createdSection = await this.prisma.section.create({
        data: {
          classId: targetClass.id,
          name: targetClass.section,
          capacity: defaultCapacity,
        },
      });
      return createdSection.id;
    }

    const firstSection = targetClass.sections[0];
    if (firstSection) {
      return firstSection.id;
    }

    const defaultCapacity = await this.getDefaultSectionCapacity(schoolId);
    const createdSection = await this.prisma.section.create({
      data: {
        classId: targetClass.id,
        name: 'A',
        capacity: defaultCapacity,
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
      fromGrade,
      toClassId,
      toGrade,
      fromAcademicYear,
      toAcademicYear,
      studentIds,
      promoteAll,
      minAverageGrade,
      minAttendance,
      streams,
    } = params;

    await this.assertAcademicYearEnded(schoolId, fromAcademicYear);

    if (fromGrade) {
      return this.bulkPromoteGradeStudents({
        schoolId,
        fromGrade,
        toGrade,
        fromAcademicYear,
        toAcademicYear,
        studentIds,
        promoteAll,
        minAverageGrade,
        minAttendance,
        streams: streams || {},
      });
    }

    if (!fromClassId) throw new LocalizedException('report_card.source_class_is_required_492e76aa', undefined, undefined, 'Source class is required');

    const allowFailedSubjects = await this.getPromotionAllowFailedSubjects(schoolId);

    await this.ensurePromotionReadiness({
      schoolId,
      fromClassId,
      fromAcademicYear,
      studentIds,
      promoteAll,
      criteria: {
        ...(minAverageGrade !== undefined ? { minAverageGrade } : {}),
        ...(minAttendance !== undefined ? { minAttendance } : {}),
        allowFailedSubjects,
      },
    });

    const isGraduation = !toClassId || toClassId === 'graduation';

    const toClass = !isGraduation
      ? await this.prisma.class.findUnique({
          where: { id: toClassId! },
        })
      : null;
    if (!isGraduation && !toClass) throw new LocalizedException('report_card.target_class_not_found_460a51f1', undefined, HttpStatus.NOT_FOUND, 'Target class not found');
    if (!isGraduation && toClassId === fromClassId) throw new LocalizedException('report_card.target_class_must_be_different_from_source_class_4e71febc', undefined, undefined, 'Target class must be different from source class');

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
        ...(minAverageGrade !== undefined ? { minAverageGrade } : {}),
        ...(minAttendance !== undefined ? { minAttendance } : {}),
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

  private async bulkPromoteGradeStudents(params: {
    schoolId: string;
    fromGrade: number;
    toGrade?: number | null;
    fromAcademicYear: string;
    toAcademicYear: string;
    studentIds: string[];
    promoteAll: boolean;
    minAverageGrade?: number;
    minAttendance?: number;
    streams?: Record<string, string>;
  }) {
    const {
      schoolId,
      fromGrade,
      toGrade,
      fromAcademicYear,
      toAcademicYear,
      studentIds,
      promoteAll,
      minAverageGrade,
      minAttendance,
      streams = {},
    } = params;

    const isGraduation = !toGrade;
    const gradeRange = await this.getSchoolGradeRange(schoolId);
    if (fromGrade < gradeRange.min || fromGrade > gradeRange.max) throw new LocalizedException('report_card.grade_is_not_available_in_this_schools_grade_system_f6a4f7cc', undefined, undefined, 'Grade ${fromGrade} is not available in this school\'s grade system');
    if (!isGraduation && (toGrade! < gradeRange.min || toGrade! > gradeRange.max)) throw new LocalizedException('report_card.grade_is_not_available_in_this_schools_grade_system_c24f1045', undefined, undefined, 'Grade ${toGrade} is not available in this school\'s grade system');
    if (fromGrade >= gradeRange.max && !isGraduation) throw new LocalizedException('report_card.grade_is_the_final_grade_for_this_school_and_must_graduate_84ef154e', undefined, undefined, 'Grade ${fromGrade} is the final grade for this school and must graduate');
    if (!isGraduation && toGrade !== fromGrade + 1) throw new LocalizedException('report_card.destination_grade_must_be_the_next_grade_level_c8166e61', undefined, undefined, 'Destination grade must be the next grade level');
    const [defaultMinAvg, allowFailedSubjects] = await Promise.all([
      this.getPromotionMinAverageGrade(schoolId),
      this.getPromotionAllowFailedSubjects(schoolId),
    ]);
    const criteria = {
      minAverageGrade: minAverageGrade ?? defaultMinAvg,
      ...(minAttendance !== undefined ? { minAttendance } : {}),
      allowFailedSubjects,
    };
    const candidateResponse = await this.getPromotionCandidatesByGrade(schoolId, fromGrade, fromAcademicYear, criteria);
    const candidateMap = new Map(candidateResponse.candidates.map((candidate) => [candidate.student.id, candidate]));

    const sourceEnrollments = await this.prisma.studentClass.findMany({
      where: {
        schoolId,
        academicYear: fromAcademicYear,
        class: { grade: fromGrade },
        ...(promoteAll ? {} : { studentId: { in: studentIds } }),
      },
      include: {
        class: true,
        student: { select: { id: true, name: true, studentProfile: true } },
      },
    });

    const results = { promoted: 0, retained: 0, failed: 0, errors: [] as string[] };
    const eligible = sourceEnrollments.filter((enrollment) => {
      const candidate = candidateMap.get(enrollment.studentId);
      const selected = promoteAll || studentIds.includes(enrollment.studentId);
      return selected && candidate?.status === 'PROMOTED';
    });

    if (isGraduation) {
      for (const enrollment of sourceEnrollments) {
        const candidate = candidateMap.get(enrollment.studentId);
        const selected = promoteAll || studentIds.includes(enrollment.studentId);
        if (!selected || candidate?.status !== 'PROMOTED') {
          results.retained++;
          continue;
        }
        const existingRecord = await this.getExistingPromotionRecord({
          schoolId,
          studentId: enrollment.studentId,
          fromAcademicYear,
          toAcademicYear,
        });
        if (existingRecord?.status === 'GRADUATED') {
          results.promoted++;
          continue;
        }
        const latestReportCard = await this.prisma.reportCard.findFirst({
          where: {
            schoolId,
            studentId: enrollment.studentId,
            academicYear: fromAcademicYear,
            status: ReportCardStatus.PUBLISHED,
            class: { grade: fromGrade },
          },
          orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
        });
        await this.recordPromotionHistory({
          schoolId,
          studentId: enrollment.studentId,
          fromClassId: enrollment.classId,
          toClassId: null,
          fromAcademicYear,
          toAcademicYear,
          status: 'GRADUATED',
          reportCardId: latestReportCard?.id,
          averageGrade: latestReportCard?.percentage ?? null,
          attendance: latestReportCard?.attendancePercentage ?? null,
        });
        results.promoted++;
      }
      return results;
    }

    const targetAcademicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, name: toAcademicYear },
      select: { id: true, name: true },
    });
    if (!targetAcademicYear) throw new LocalizedException('report_card.target_academic_year_not_found_cda5a09c', undefined, HttpStatus.NOT_FOUND, 'Target academic year not found');

    const gradeLevel = await this.prisma.gradeLevel.findFirst({
      where: { schoolId, level: toGrade },
      select: { id: true, name: true },
    });
    const targetClassName = gradeLevel?.name || `Grade ${toGrade}`;
    const sectionCapacity = await this.getDefaultSectionCapacity(schoolId);
    const orderedEligible = eligible.slice().sort((a, b) =>
      a.student.name.localeCompare(b.student.name, undefined, { sensitivity: 'base' }),
    );

    if ([11, 12].includes(toGrade!)) {
      const missingStreams = orderedEligible
        .filter((enrollment) => {
          const assignedStream =
            toGrade === 11
              ? this.normalizePromotionStream(streams[enrollment.studentId])
              : this.normalizePromotionStream(
                  enrollment.student.studentProfile?.stream ||
                    streams[enrollment.studentId],
                );
          return !assignedStream;
        })
        .map((enrollment) => enrollment.student.name);

      if (missingStreams.length > 0) {
        throw new BadRequestException(
          `Promotion blocked: stream is required for ${missingStreams.slice(0, 5).join(', ')}${missingStreams.length > 5 ? ' and others' : ''}`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      let targetClass = await tx.class.findFirst({
        where: {
          schoolId,
          academicYearId: targetAcademicYear.id,
          grade: toGrade,
        },
        orderBy: { section: 'asc' },
      });
      if (!targetClass) {
        targetClass = await tx.class.create({
          data: {
            schoolId,
            academicYearId: targetAcademicYear.id,
            name: targetClassName,
            section: '',
            grade: toGrade,
            gradeId: gradeLevel?.id,
          },
        });
      }

      const sectionCounters = new Map<string, number>();
      for (const enrollment of orderedEligible) {
        const targetStream = [11, 12].includes(toGrade!)
          ? toGrade === 11
            ? this.normalizePromotionStream(streams[enrollment.studentId])
            : this.normalizePromotionStream(
                enrollment.student.studentProfile?.stream ||
                  streams[enrollment.studentId],
              )
          : null;
        if ([11, 12].includes(toGrade!) && !targetStream) throw new LocalizedException('report_card.is_missing_stream_for_grade_c8b0c50d', undefined, undefined, '${enrollment.student.name} is missing stream for Grade ${toGrade}');
        const groupKey = targetStream || 'GENERAL';
        const groupIndex = sectionCounters.get(groupKey) || 0;
        sectionCounters.set(groupKey, groupIndex + 1);
        const baseSectionName = this.getSectionNameByIndex(Math.floor(groupIndex / sectionCapacity));
        const sectionName = this.getPromotionSectionName(baseSectionName, targetStream);
        let section = await tx.section.findFirst({
          where: { classId: targetClass.id, name: sectionName, ...(targetStream ? { stream: targetStream } : {}) },
        });
        if (!section) {
          section = await tx.section.create({
            data: { classId: targetClass.id, name: sectionName, stream: targetStream, capacity: sectionCapacity },
          });
        } else if (section.capacity !== sectionCapacity || section.stream !== targetStream) {
          section = await tx.section.update({ where: { id: section.id }, data: { capacity: sectionCapacity, stream: targetStream } });
        }

        const existingTarget = await tx.studentClass.findFirst({
          where: { studentId: enrollment.studentId, academicYear: toAcademicYear },
        });
        if (existingTarget) {
          await tx.studentClass.update({
            where: { id: existingTarget.id },
            data: { classId: targetClass.id, sectionId: section.id },
          });
        } else {
          await tx.studentClass.create({
            data: {
              studentId: enrollment.studentId,
              classId: targetClass.id,
              sectionId: section.id,
              schoolId,
              academicYear: toAcademicYear,
            },
          });
        }

        const rollNumber = String((groupIndex % sectionCapacity) + 1);
        const profile = enrollment.student.studentProfile;
        if (profile) {
          await tx.studentProfile.update({
            where: { id: profile.id },
            data: {
              academicYear: toAcademicYear,
              className: targetClassName,
              section: sectionName,
              stream: targetStream,
              rollNumber,
            },
          });
        }

        const latestReportCard = await tx.reportCard.findFirst({
          where: {
            schoolId,
            studentId: enrollment.studentId,
            academicYear: fromAcademicYear,
            status: ReportCardStatus.PUBLISHED,
            class: { grade: fromGrade },
          },
          orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
        });
        const existingRecord = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "PromotionRecord"
          WHERE "schoolId" = ${schoolId}
            AND "studentId" = ${enrollment.studentId}
            AND "fromAcademicYear" = ${fromAcademicYear}
            AND "toAcademicYear" = ${toAcademicYear}
          LIMIT 1
        `;
        if (existingRecord.length === 0) {
          await tx.$executeRaw`
            INSERT INTO "PromotionRecord"
              ("id", "schoolId", "studentId", "fromClassId", "toClassId", "fromAcademicYear", "toAcademicYear", "status", "reportCardId", "averageGrade", "attendance", "promotedAt", "createdAt", "updatedAt")
            VALUES
              (gen_random_uuid()::text, ${schoolId}, ${enrollment.studentId}, ${enrollment.classId}, ${targetClass.id}, ${fromAcademicYear}, ${toAcademicYear}, ${'PROMOTED'}, ${latestReportCard?.id ?? null}, ${latestReportCard?.percentage ?? null}, ${latestReportCard?.attendancePercentage ?? null}, NOW(), NOW(), NOW())
          `;
        }
      }
    });

    results.promoted = orderedEligible.length;
    results.retained = sourceEnrollments.length - orderedEligible.length;

    if (results.promoted > 0) {
      try {
        const promotedStudentIds = orderedEligible.map((e) => e.studentId);
        const studentProfiles = await this.prisma.studentProfile.findMany({
          where: { userId: { in: promotedStudentIds }, schoolId },
          select: { id: true },
        });
        const profileIds = studentProfiles.map((sp) => sp.id);
        const parentRelations = await this.prisma.parentStudent.findMany({
          where: { studentId: { in: profileIds } },
          select: { parent: { select: { userId: true } } },
        });
        const parentUserIds = [
          ...new Set(parentRelations.map((pr) => pr.parent.userId)),
        ];
        if (parentUserIds.length > 0) {
          await this.notificationService.createBulkNotifications({
            schoolId,
            userIds: parentUserIds,
            title: 'Child Promoted',
            message: `Your child has been promoted from ${fromAcademicYear} Grade ${fromGrade} to ${toAcademicYear} Grade ${toGrade}.`,
            type: NotificationType.RESULT_PUBLISHED,
            actionUrl: '/parent/children',
            metadata: { fromGrade, toGrade, fromAcademicYear, toAcademicYear },
          });
        }
      } catch (e) {
        console.error('Failed to send promotion notifications to parents:', e);
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
