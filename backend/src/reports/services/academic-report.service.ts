import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PerformanceReportQuery, PaginatedReportResponse, AcademicPerformanceRow, ReportSummary } from '../dto/reports.dto';

@Injectable()
export class AcademicReportService {
  private readonly logger = new Logger(AcademicReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPerformanceReport(query: PerformanceReportQuery): Promise<PaginatedReportResponse<AcademicPerformanceRow>> {
    const { schoolId, academicYearId, termId, classId, sectionId, subjectId, studentId, status, from, to } = query;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (academicYearId) {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { name: true },
      });
      where.OR = [
        { academicYear: academicYearId },
        ...(year?.name ? [{ academicYear: year.name }] : []),
      ];
    }
    if (termId) where.termId = termId;
    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const [rows, total] = await Promise.all([
      this.prisma.subjectGrade.findMany({
        where,
        include: {
          student: { select: { id: true, name: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
          subject: { select: { name: true, code: true } },
          teacher: { select: { name: true } },
        },
        orderBy: { totalScore: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subjectGrade.count({ where }),
    ]);

    const data: AcademicPerformanceRow[] = rows.map((r) => ({
      studentId: r.studentId,
      studentName: r.student.name,
      className: r.class?.name || '',
      sectionName: r.section?.name || '',
      subjectName: r.subject.name,
      subjectCode: r.subject.code,
      score: r.totalScore,
      maxScore: 100,
      percentage: r.totalScore ?? 0,
      gradeLetter: r.gradeLetter,
      gradePoint: r.gradePoint,
      status: r.status,
      teacherName: r.teacher?.name || '',
    }));

    const aggregate = await this.prisma.subjectGrade.aggregate({
      where,
      _avg: { totalScore: true },
      _count: { id: true },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        total: total,
        count: aggregate._count.id,
      },
    };
  }

  async getExamResultsReport(query: PerformanceReportQuery): Promise<PaginatedReportResponse<any>> {
    const { schoolId, classId, sectionId, subjectId, studentId, from, to } = query;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { exam: { schoolId } };
    if (classId) where.exam.classId = classId;
    if (sectionId) where.exam.sectionId = sectionId;
    if (subjectId) where.exam.subjectId = subjectId;
    if (studentId) where.studentId = studentId;

    const [rows, total] = await Promise.all([
      this.prisma.examResult.findMany({
        where,
        include: {
          exam: {
            select: { id: true, title: true, type: true, date: true, maxMarks: true, subject: { select: { name: true, code: true } }, class: { select: { name: true } } },
          },
          student: { select: { id: true, name: true } },
        },
        orderBy: { exam: { date: 'desc' } },
        skip,
        take: limit,
      }),
      this.prisma.examResult.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        examTitle: r.exam.title,
        examType: r.exam.type,
        examDate: r.exam.date,
        subjectName: r.exam.subject?.name,
        subjectCode: r.exam.subject?.code,
        className: r.exam.class?.name,
        studentId: r.studentId,
        studentName: r.student.name,
        marks: r.marks,
        maxMarks: r.exam.maxMarks,
        percentage: r.exam.maxMarks ? Math.round((r.marks / r.exam.maxMarks) * 100) : 0,
        grade: r.grade,
        isAbsent: r.isAbsent,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAssessmentScoresReport(query: PerformanceReportQuery): Promise<PaginatedReportResponse<any>> {
    const { schoolId, classId, sectionId, subjectId, studentId } = query;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { assessmentSubject: { assessment: { schoolId } } };
    if (classId) where.assessmentSubject.classId = classId;
    if (sectionId) where.assessmentSubject.sectionId = sectionId;
    if (subjectId) where.assessmentSubject.subjectId = subjectId;
    if (studentId) where.studentId = studentId;

    const [rows, total] = await Promise.all([
      this.prisma.studentAssessmentScore.findMany({
        where,
        include: {
          assessmentSubject: {
            include: {
              assessment: { select: { id: true, title: true, type: true, startDate: true, endDate: true } },
              subject: { select: { name: true, code: true } },
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
          student: { select: { id: true, name: true } },
        },
        orderBy: { assessmentSubject: { assessment: { startDate: 'desc' } } },
        skip,
        take: limit,
      }),
      this.prisma.studentAssessmentScore.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        assessmentTitle: r.assessmentSubject.assessment.title,
        assessmentType: r.assessmentSubject.assessment.type,
        subjectName: r.assessmentSubject.subject.name,
        subjectCode: r.assessmentSubject.subject.code,
        className: r.assessmentSubject.class?.name,
        sectionName: r.assessmentSubject.section?.name,
        studentId: r.studentId,
        studentName: r.student.name,
        score: r.score,
        maxScore: r.assessmentSubject.maxScore,
        percentage: r.assessmentSubject.maxScore ? Math.round((Number(r.score) / r.assessmentSubject.maxScore) * 100) : 0,
        isAbsent: r.isAbsent,
        status: r.status,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReportCardsReport(query: PerformanceReportQuery): Promise<PaginatedReportResponse<any>> {
    const { schoolId, classId, sectionId, studentId, termId } = query;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };
    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (studentId) where.studentId = studentId;
    if (termId) where.term = termId;

    const [rows, total] = await Promise.all([
      this.prisma.reportCard.findMany({
        where,
        include: {
          student: { select: { id: true, name: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
          StudentProfile: { select: { studentCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reportCard.count({ where }),
    ]);

    return {
      data: rows.map((r: any) => ({
        studentId: r.studentId,
        studentName: r.student.name,
        studentCode: r.StudentProfile?.studentCode,
        className: r.class?.name,
        sectionName: r.section?.name,
        academicYear: r.academicYear,
        term: r.term,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        overallGrade: r.overallGrade,
        rank: r.rank,
        rankInClass: r.rankInClass,
        attendanceRate: r.attendancePercentage ? Number(r.attendancePercentage) : null,
        status: r.status,
        publishedAt: r.publishedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
