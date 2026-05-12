import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

  private parseGradeDetails(gradeDetails?: string | null): Array<Record<string, any>> {
    if (!gradeDetails) return [];
    try {
      const parsed = JSON.parse(gradeDetails);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
        academicYear,
        termId,
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    const attendance = await this.calculateAttendance(studentId, termId);

    let totalMarks = 0;
    let subjectCount = 0;
    const gradeDetails: Record<string, any>[] = [];

    for (const sg of subjectGrades) {
      if (sg.totalScore !== null && sg.totalScore !== undefined) {
        const { letter, point } = await this.getGradeLetter(
          schoolId,
          sg.totalScore,
        );
        gradeDetails.push({
          subjectId: sg.subjectId,
          subjectName: sg.subject.name,
          subjectCode: sg.subject.code,
          caScore: sg.caScore,
          midScore: sg.midScore,
          finalScore: sg.finalScore,
          totalScore: sg.totalScore,
          gradeLetter: letter,
          gradePoint: point,
          status: sg.status,
        });
        totalMarks += sg.totalScore;
        subjectCount++;
      }
    }

    const percentage = subjectCount > 0 ? totalMarks / subjectCount : 0;
    const { letter: overallGrade } = await this.getGradeLetter(
      schoolId,
      percentage,
    );

    const existingReportCard = await this.prisma.reportCard.findFirst({
      where: { studentId, academicYear, term: termName },
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
          academicYear,
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
      where: { classId, academicYear },
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

  /**
   * Get single report card by ID
   */
  async getReportCardById(id: string) {
    const reportCard = await this.prisma.reportCard.findUnique({
      where: { id },
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

  /**
   * Publish report cards
   */
  async publishReportCards(ids: string[]) {
    const reportCards = await this.prisma.reportCard.findMany({
      where: { id: { in: ids } },
    });

    if (reportCards.length === 0) {
      throw new NotFoundException('No report cards found');
    }

    const updated = await this.prisma.reportCard.updateMany({
      where: { id: { in: ids } },
      data: {
        status: ReportCardStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    return { published: updated.count };
  }

  /**
   * Unpublish report cards (revert to draft)
   */
  async unpublishReportCards(ids: string[]) {
    const updated = await this.prisma.reportCard.updateMany({
      where: { id: { in: ids } },
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
  async calculateRanks(classId: string, academicYear: string, term: string) {
    const reportCards = await this.prisma.reportCard.findMany({
      where: { classId, academicYear, term },
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
      where: { classId, academicYear, term },
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
    data: {
      teacherRemarks?: string;
      principalRemarks?: string;
      coCurricular?: string;
      behavior?: string;
    },
  ) {
    const reportCard = await this.prisma.reportCard.findUnique({
      where: { id },
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
  async deleteReportCard(id: string) {
    const reportCard = await this.prisma.reportCard.findUnique({
      where: { id },
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
    termId?: string,
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

    let termName: string | undefined;
    if (termId) {
      const term = await this.prisma.term.findUnique({
        where: { id: termId },
        select: { name: true },
      });
      termName = term?.name;
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
        academicYear,
        status: ReportCardStatus.PUBLISHED,
      };

      if (termId) {
        reportCardWhere.termId = termId;
      }

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
      termName,
      totalStudents: sortedStudents.length,
      candidates,
    };
  }

  /**
   * Get next class options for promotion
   */
  async getNextClassOptions(classId: string) {
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
    const academicYearId = currentClass.academicYearId;

    const nextClasses = await this.prisma.class.findMany({
      where: {
        schoolId,
        academicYearId,
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

    for (const sc of students) {
      try {
        const reportCard = await this.prisma.reportCard.findFirst({
          where: {
            studentId: sc.studentId,
            academicYear: fromAcademicYear,
            status: ReportCardStatus.PUBLISHED,
          },
          orderBy: { createdAt: 'desc' },
        });

        let shouldPromote = promoteAll || studentIds.includes(sc.studentId);

        if (!shouldPromote && reportCard) {
          const avgGrade = reportCard.percentage || 0;
          const attend = reportCard.attendancePercentage || 0;

          if (minAverageGrade && avgGrade < minAverageGrade) {
            shouldPromote = false;
          }
          if (minAttendance && attend < minAttendance) {
            shouldPromote = false;
          }
        }

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
      const currentYear = filters.academicYear;
      const nextYear = String(parseInt(currentYear) + 1);

      const fromClasses = await this.prisma.class.findMany({
        where: { schoolId, academicYear: { name: { contains: currentYear } } },
        select: { id: true },
      });

      if (fromClasses.length > 0) {
        whereClause.studentId = {
          in: await this.prisma.studentClass
            .findMany({
              where: {
                classId: { in: fromClasses.map((c) => c.id) },
                academicYear: currentYear,
              },
              select: { studentId: true },
            })
            .then((r) => r.map((s) => s.studentId)),
        };
      }
    }

    return {
      message: 'Promotion history tracking not yet implemented',
      filters: whereClause,
    };
  }
}
