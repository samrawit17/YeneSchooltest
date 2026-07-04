import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ReportQueryDto, PaginatedReportResponse, TeacherPerformanceRow } from '../dto/reports.dto';

@Injectable()
export class TeacherReportService {
  private readonly logger = new Logger(TeacherReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTeacherPerformanceReport(query: ReportQueryDto): Promise<PaginatedReportResponse<TeacherPerformanceRow>> {
    const { schoolId, teacherId } = query;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const teacherWhere: any = { schoolId, role: 'TEACHER' };
    if (teacherId) teacherWhere.id = teacherId;

    const [teachers, total] = await Promise.all([
      this.prisma.user.findMany({
        where: teacherWhere,
        select: {
          id: true, name: true,
          teacherProfile: { select: { employeeId: true, department: { select: { name: true } } } },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where: teacherWhere }),
    ]);

    const teacherIds = teachers.map((t) => t.id);

    const [classCounts, subjectCounts, studentCounts, avgScores] = await Promise.all([
      this.prisma.classSubject.groupBy({ by: ['teacherId'], where: { teacherId: { in: teacherIds } }, _count: { id: true } }),
      this.prisma.teacherSubjectAssignment.groupBy({ by: ['teacherId'], where: { teacherId: { in: teacherIds } }, _count: { subjectId: true } }),
      this.prisma.subjectGrade.groupBy({ by: ['teacherId'], where: { teacherId: { in: teacherIds } }, _count: { studentId: true } }),
      this.prisma.subjectGrade.groupBy({ by: ['teacherId'], where: { teacherId: { in: teacherIds }, totalScore: { not: null } }, _avg: { totalScore: true }, _count: { id: true } }),
    ]);

    const classMap = new Map(classCounts.map((c) => [c.teacherId, c._count.id]));
    const subjectMap = new Map(subjectCounts.map((s) => [s.teacherId, s._count.subjectId]));
    const studentMap = new Map(studentCounts.map((s) => [s.teacherId, s._count.studentId]));
    const scoreMap = new Map(avgScores.map((s) => [s.teacherId, { avg: s._avg.totalScore, count: s._count.id }]));

    const data: TeacherPerformanceRow[] = teachers.map((t) => ({
      teacherId: t.id,
      teacherName: t.name,
      employeeId: t.teacherProfile?.employeeId || '',
      department: t.teacherProfile?.department?.name || null,
      totalStudents: studentMap.get(t.id) || 0,
      totalClasses: classMap.get(t.id) || 0,
      totalSubjects: subjectMap.get(t.id) || 0,
      averageScore: Math.round(scoreMap.get(t.id)?.avg ?? 0),
      gradingRate: scoreMap.get(t.id)?.count || 0,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTeacherLeaderboard(schoolId: string): Promise<any[]> {
    const teachers = await this.prisma.user.findMany({
      where: { schoolId, role: 'TEACHER' },
      select: { id: true, name: true, teacherProfile: { select: { employeeId: true, department: { select: { name: true } } } } },
    });

    const teacherIds = teachers.map((t) => t.id);

    const [gradingCounts, avgScores, attendanceCounts] = await Promise.all([
      this.prisma.subjectGrade.groupBy({ by: ['teacherId'], where: { teacherId: { in: teacherIds }, status: 'APPROVED' }, _count: { id: true } }),
      this.prisma.subjectGrade.groupBy({ by: ['teacherId'], where: { teacherId: { in: teacherIds }, totalScore: { not: null } }, _avg: { totalScore: true } }),
      this.prisma.attendanceSession.groupBy({ by: ['takenById'], where: { takenById: { in: teacherIds }, status: 'SUBMITTED' }, _count: { id: true } }),
    ]);

    const gradingMap = new Map(gradingCounts.map((g) => [g.teacherId, g._count.id]));
    const avgMap = new Map(avgScores.map((a) => [a.teacherId, a._avg.totalScore]));
    const attendanceMap = new Map(attendanceCounts.map((a) => [a.takenById, a._count.id]));

    return teachers
      .map((t) => {
        const graded = gradingMap.get(t.id) || 0;
        const avg = avgMap.get(t.id);
        return {
          teacherId: t.id,
          teacherName: t.name,
          employeeId: t.teacherProfile?.employeeId,
          department: t.teacherProfile?.department?.name,
          studentsGraded: graded,
          averageScore: avg ? Math.round(avg) : 0,
          attendanceTaken: attendanceMap.get(t.id) || 0,
          compositeScore: graded + (avg || 0),
        };
      })
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 20);
  }
}
