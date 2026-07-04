import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AnalyticsQueryDto, PerformanceTrendPoint } from '../dto/analytics.dto';

@Injectable()
export class AdvancedAnalyticsService {
  private readonly logger = new Logger(AdvancedAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPerformanceTrends(query: AnalyticsQueryDto): Promise<PerformanceTrendPoint[]> {
    const { schoolId, academicYearId, from, to } = query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const where: any = {
      schoolId,
      status: 'APPROVED',
      createdAt: { gte: startDate, lte: endDate },
    };
    if (academicYearId) where.academicYear = academicYearId;

    const grades = await this.prisma.subjectGrade.findMany({
      where,
      select: {
        totalScore: true,
        subjectId: true,
        createdAt: true,
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const months: Record<string, { scores: number[]; students: Set<string>; subjects: Record<string, number[]> }> = {};
    for (const g of grades) {
      const key = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { scores: [], students: new Set(), subjects: {} };
      if (g.totalScore != null) {
        months[key].scores.push(g.totalScore);
        const subj = g.subject?.name || 'Unknown';
        if (!months[key].subjects[subj]) months[key].subjects[subj] = [];
        months[key].subjects[subj].push(g.totalScore);
      }
    }

    return Object.entries(months).map(([period, data]) => {
      const subjectBreakdown: Record<string, number> = {};
      for (const [name, scores] of Object.entries(data.subjects)) {
        subjectBreakdown[name] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
      return {
        period,
        averageScore: data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 0,
        studentCount: data.students.size,
        subjectBreakdown,
      };
    });
  }

  async getAttendanceAnalytics(query: AnalyticsQueryDto): Promise<any> {
    const { schoolId, from, to } = query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        session: { schoolId, date: { gte: startDate, lte: endDate } },
      },
      select: { status: true, session: { select: { date: true } } },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;

    const stats = { total, present, absent, late, rate: total > 0 ? Math.round((present / total) * 100) : 0 };

    const studentsWithHighAbsences = await this.prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: {
        status: 'ABSENT',
        session: { schoolId, date: { gte: startDate, lte: endDate } },
      },
      _count: { id: true },
      having: { id: { _count: { gte: 5 } } },
    });

    const flaggedStudentIds = studentsWithHighAbsences.map((s) => s.studentId);
    const flaggedStudents = flaggedStudentIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: flaggedStudentIds } },
          select: { name: true, studentProfile: { select: { className: true, studentCode: true } } },
        })
      : [];

    return {
      summary: stats,
      attendanceRate: stats.rate,
      flaggedStudents: flaggedStudents.map((u) => ({
        name: u.name,
        studentCode: u.studentProfile?.studentCode,
        className: u.studentProfile?.className,
      })),
    };
  }

  async getFinancialAnalytics(query: AnalyticsQueryDto): Promise<any> {
    const { schoolId, from, to } = query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const payments = await this.prisma.payment.findMany({
      where: { schoolId, paymentDate: { gte: startDate, lte: endDate } },
      select: { amountPaid: true, paymentDate: true },
      orderBy: { paymentDate: 'asc' },
    });

    const monthlyRevenue: Record<string, number> = {};
    for (const p of payments) {
      const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + Number(p.amountPaid);
    }

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

    const pendingFees = await this.prisma.studentFee.aggregate({
      where: { schoolId, status: { in: ['PENDING', 'PARTIAL'] } },
      _sum: { finalAmount: true },
      _count: { id: true },
    });

    const collectionRate = totalRevenue > 0
      ? Math.round((totalRevenue / (totalRevenue + Number(pendingFees._sum.finalAmount || 0))) * 100)
      : 0;

    return {
      totalRevenue,
      totalPayments: payments.length,
      collectionRate,
      pendingFees: { count: pendingFees._count.id, amount: pendingFees._sum.finalAmount || 0 },
      monthlyTrend: Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue })),
    };
  }

  async getSchoolOverview(schoolId: string): Promise<any> {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [students, teachers, classes, attendanceRate, totalRevenue, activeSubscriptions] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.attendanceRecord.aggregate({
        where: { session: { schoolId, date: { gte: yearStart } } },
        _count: { id: true, status: true },
      }),
      this.prisma.payment.aggregate({
        where: { schoolId, paymentDate: { gte: yearStart } },
        _sum: { amountPaid: true },
      }),
      this.prisma.subscription.findFirst({
        where: { schoolId, status: 'ACTIVE' },
        select: { plan: { select: { name: true, tier: true } } },
      }),
    ]);

    const totalAttendance = (attendanceRate as any)._count?.id || 0;
    const presentCount = (attendanceRate as any)._count?.status || 0;

    return {
      studentCount: students,
      teacherCount: teachers,
      classCount: classes,
      studentTeacherRatio: teachers > 0 ? Math.round(students / teachers) : 0,
      attendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
      yearToDateRevenue: totalRevenue._sum.amountPaid || 0,
      subscriptionPlan: activeSubscriptions?.plan?.name || 'None',
      subscriptionTier: activeSubscriptions?.plan?.tier || 'N/A',
    };
  }
}
