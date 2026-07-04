import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ReportQueryDto, PaginatedReportResponse, DisciplineSummaryRow } from '../dto/reports.dto';

@Injectable()
export class DisciplineReportService {
  private readonly logger = new Logger(DisciplineReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDisciplineReport(query: ReportQueryDto): Promise<PaginatedReportResponse<DisciplineSummaryRow>> {
    const { schoolId, studentId, from, to } = query;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };
    if (studentId) where.studentId = studentId;
    if (from || to) {
      where.incidentDate = {};
      if (from) where.incidentDate.gte = new Date(from);
      if (to) where.incidentDate.lte = new Date(to);
    }

    const [rows, total] = await Promise.all([
      this.prisma.disciplineIncident.findMany({
        where,
        include: {
          student: { select: { user: { select: { name: true } }, className: true } },
          reporter: { select: { name: true } },
        },
        orderBy: { incidentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.disciplineIncident.count({ where }),
    ]);

    const severityCounts = await this.prisma.disciplineIncident.groupBy({
      by: ['severity'],
      where,
      _count: { id: true },
    });

    const statusCounts = await this.prisma.disciplineIncident.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const data: DisciplineSummaryRow[] = rows.map((r) => ({
      incidentId: r.id,
      studentId: r.studentId,
      studentName: r.student?.user?.name || '',
      className: r.student?.className || '',
      incidentDate: r.incidentDate,
      severity: r.severity,
      status: r.status,
      title: r.title,
      description: r.description,
      actionTaken: r.actionTaken,
      reportedByName: r.reporter?.name || '',
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        total,
        count: total,
        severityBreakdown: severityCounts.map((s) => ({ severity: s.severity, count: s._count.id })),
        statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count.id })),
      } as any,
    };
  }

  async getDisciplineTrends(query: ReportQueryDto): Promise<any> {
    const { schoolId, from, to } = query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const incidents = await this.prisma.disciplineIncident.findMany({
      where: { schoolId, incidentDate: { gte: startDate, lte: endDate } },
      select: { incidentDate: true, severity: true },
      orderBy: { incidentDate: 'asc' },
    });

    const trends: Record<string, { total: number; low: number; medium: number; high: number; critical: number }> = {};
    for (const inc of incidents) {
      const month = `${inc.incidentDate.getFullYear()}-${String(inc.incidentDate.getMonth() + 1).padStart(2, '0')}`;
      if (!trends[month]) trends[month] = { total: 0, low: 0, medium: 0, high: 0, critical: 0 };
      trends[month].total++;
      const sev = inc.severity.toLowerCase() as keyof typeof trends[string];
      if (sev in trends[month]) trends[month][sev]++;
    }

    return Object.entries(trends).map(([period, data]) => ({ period, ...data }));
  }
}
