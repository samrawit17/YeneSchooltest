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
  toClassId: string;
  toAcademicYear: string;
  status: 'PROMOTED' | 'RETAINED' | 'GRADUATED';
}

interface BulkPromotionParams {
  schoolId: string;
  fromClassId: string;
  toClassId: string;
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

@Injectable()
export class ReportCardService {
  constructor(private prisma: PrismaService) {}

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
          select: { id: true, name: true, avatarUrl: true },
        },
      },
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

    for (const sc of students) {
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
          student: sc.student,
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
        student: sc.student,
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
      totalStudents: students.length,
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

    const toClass = await this.prisma.class.findUnique({
      where: { id: toClassId },
    });
    if (!toClass) {
      throw new NotFoundException('Target class not found');
    }

    const existingEnrollment = await this.prisma.studentClass.findFirst({
      where: { studentId, academicYear: toAcademicYear },
    });

    const sectionId = await this.getSectionIdForClass(toClassId);

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

  private async getSectionIdForClass(classId: string): Promise<string> {
    const section = await this.prisma.section.findFirst({
      where: { classId },
      select: { id: true },
    });
    return section?.id || '';
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

    const toClass = await this.prisma.class.findUnique({
      where: { id: toClassId },
    });
    if (!toClass) {
      throw new NotFoundException('Target class not found');
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

        let shouldPromote = promoteAll;

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
            toClassId,
            toAcademicYear,
            status: toClass.grade ? 'PROMOTED' : 'GRADUATED',
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
