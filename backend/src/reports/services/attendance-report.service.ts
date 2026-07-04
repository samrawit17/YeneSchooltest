import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AttendanceReportQuery, PaginatedReportResponse, AttendanceSummaryRow, ReportSummary } from '../dto/reports.dto';

@Injectable()
export class AttendanceReportService {
  private readonly logger = new Logger(AttendanceReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAttendanceSummary(query: AttendanceReportQuery): Promise<PaginatedReportResponse<AttendanceSummaryRow>> {
    const { schoolId, classId, sectionId, studentId, from, to } = query;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const recordWhere: any = { session: { schoolId } };
    if (Object.keys(dateFilter).length) recordWhere.session.date = dateFilter;
    if (studentId) recordWhere.studentId = studentId;

    const studentWhere: any = { schoolId, role: 'STUDENT' };
    if (classId) studentWhere.studentProfile = { ...studentWhere.studentProfile, className: classId };
    if (sectionId) studentWhere.studentProfile = { ...studentWhere.studentProfile, section: sectionId };

    const totalStudents = await this.prisma.user.count({
      where: { ...studentWhere, studentProfile: { schoolId } },
    });

    const attendanceStats = await this.prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: recordWhere,
      _count: { id: true, status: true },
    });

    const presentCounts = await this.prisma.attendanceRecord.groupBy({
      by: ['studentId', 'status'],
      where: { ...recordWhere, status: { in: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] } },
      _count: { id: true },
    });

    const statusMap = new Map<string, Record<string, number>>();
    for (const row of presentCounts) {
      if (!statusMap.has(row.studentId)) statusMap.set(row.studentId, { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 });
      statusMap.get(row.studentId)![row.status] = row._count.id;
    }

    const studentIds = [...statusMap.keys()].slice(skip, skip + limit);
    const studentProfiles = await this.prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true, name: true,
        studentProfile: { select: { studentCode: true, className: true, section: true } },
      },
    });

    const profileMap = new Map(studentProfiles.map((u) => [u.id, u]));

    const data: AttendanceSummaryRow[] = studentIds.map((id) => {
      const profile = profileMap.get(id);
      const counts = statusMap.get(id) || { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
      const totalDays = counts.PRESENT + counts.ABSENT + counts.LATE + counts.EXCUSED;
      return {
        studentId: id,
        studentName: profile?.name || '',
        className: profile?.studentProfile?.className || '',
        totalDays,
        presentDays: counts.PRESENT,
        absentDays: counts.ABSENT,
        lateDays: counts.LATE,
        excusedDays: counts.EXCUSED,
        attendanceRate: totalDays > 0 ? Math.round((counts.PRESENT / totalDays) * 100) : 0,
      };
    });

    const totalRecords = await this.prisma.attendanceRecord.count({ where: recordWhere });

    return {
      data,
      total: totalStudents,
      page,
      limit,
      totalPages: Math.ceil(totalStudents / limit),
      summary: { total: totalRecords, count: totalStudents },
    };
  }

  async getAttendanceTrends(query: AttendanceReportQuery): Promise<any> {
    const { schoolId, from, to, groupBy = 'monthly' } = query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        session: { schoolId, date: { gte: startDate, lte: endDate } },
      },
      select: {
        status: true,
        session: { select: { date: true } },
      },
      orderBy: { session: { date: 'asc' } },
    });

    const trends: Record<string, { present: number; absent: number; late: number; total: number }> = {};
    for (const r of records) {
      const date = r.session.date;
      let key: string;
      if (groupBy === 'daily') key = date.toISOString().slice(0, 10);
      else if (groupBy === 'weekly') {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        key = d.toISOString().slice(0, 10);
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!trends[key]) trends[key] = { present: 0, absent: 0, late: 0, total: 0 };
      trends[key].total++;
      if (r.status === 'PRESENT') trends[key].present++;
      else if (r.status === 'ABSENT') trends[key].absent++;
      else if (r.status === 'LATE') trends[key].late++;
    }

    return Object.entries(trends).map(([period, data]) => ({
      period,
      ...data,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));
  }
}
