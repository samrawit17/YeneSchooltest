import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UniversalDashboardResponseDto } from '../dto/dashboard-response.dto';

@Injectable()
export class RegistrarDashboardService {
  private readonly logger = new Logger(RegistrarDashboardService.name);

  constructor(private prisma: PrismaService) {}

  private getEmptyDashboard(schoolId?: string): UniversalDashboardResponseDto {
    return {
      stats: {
        totalStudents: 0,
        pendingEnrollments: 0,
        approvedEnrollments: 0,
        rejectedEnrollments: 0,
        totalClasses: 0,
        totalSections: 0,
        activeStudents: 0,
        inactiveStudents: 0,
      },
      alerts: [],
      quickActions: [
        {
          label: 'Approve Enrollment',
          icon: 'enrollment',
          url: '/enrollments/pending',
          permission: 'student:approve_enrollment',
          disabled: true,
        },
        {
          label: 'Add Student',
          icon: 'student',
          url: '/students/new',
          permission: 'student:create',
          disabled: true,
        },
        {
          label: 'View Students',
          icon: 'student',
          url: '/students',
          permission: 'student:read',
          disabled: false,
        },
        {
          label: 'View Classes',
          icon: 'class',
          url: '/classes',
          permission: 'class:read',
          disabled: false,
        },
      ],
      charts: {},
      metadata: {
        schoolId,
        generatedAt: new Date(),
      },
    };
  }

  async getDashboard(
    userId: string,
    schoolId?: string,
  ): Promise<UniversalDashboardResponseDto> {
    try {
      if (!schoolId) {
        this.logger.warn(
          `User ${userId} has no schoolId, returning empty dashboard`,
        );
        return this.getEmptyDashboard(schoolId);
      }

      const today = new Date();
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Get current academic year
      const academicYear = await this.prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        include: { terms: true },
      });

      // Get enrollment statistics
      const [
        totalStudents,
        pendingEnrollments,
        approvedEnrollments,
        rejectedEnrollments,
        activeStudents,
        inactiveStudents,
      ] = await Promise.all([
        this.prisma.user.count({ where: { role: 'STUDENT', schoolId } }),
        this.prisma.enrollment.count({
          where: { schoolId, status: 'PENDING' },
        }),
        this.prisma.enrollment.count({
          where: { schoolId, status: 'APPROVED' },
        }),
        this.prisma.enrollment.count({
          where: { schoolId, status: 'REJECTED' },
        }),
        this.prisma.user.count({
          where: { role: 'STUDENT', schoolId, isActive: true },
        }),
        this.prisma.user.count({
          where: { role: 'STUDENT', schoolId, isActive: false },
        }),
      ]);

      // Get class and section counts
      const [totalClasses, totalSections] = await Promise.all([
        this.prisma.class.count({ where: { schoolId } }),
        this.prisma.section.count({ where: { class: { schoolId } } }),
      ]);

      // Get enrollment trend for last 12 months
      const enrollmentTrend: {
        month: string;
        enrolled: number;
        pending: number;
      }[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(
          today.getFullYear(),
          today.getMonth() - i,
          1,
        );
        const monthEnd = new Date(
          today.getFullYear(),
          today.getMonth() - i + 1,
          0,
        );

        const enrolled = await this.prisma.enrollment.count({
          where: {
            schoolId,
            status: 'APPROVED',
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        });

        const pending = await this.prisma.enrollment.count({
          where: {
            schoolId,
            status: 'PENDING',
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        });

        enrollmentTrend.push({
          month: monthStart.toLocaleDateString('en-US', {
            month: 'short',
            year: '2-digit',
          }),
          enrolled,
          pending,
        });
      }

      // Get students per class
      const studentsPerClass = await this.prisma.class.findMany({
        where: { schoolId },
        include: {
          sections: {
            include: {
              _count: { select: { attendances: true } },
            },
          },
        },
        take: 10,
      });

      const classStudentData = studentsPerClass.map((c) => ({
        name: c.name,
        sections: c.sections.length,
        students: c.sections.reduce((sum, s) => sum + s._count.attendances, 0),
      }));

      // Get enrollment status distribution
      const enrollmentStatusData = [
        { status: 'Pending', count: pendingEnrollments, color: '#f59e0b' },
        { status: 'Approved', count: approvedEnrollments, color: '#10b981' },
        { status: 'Rejected', count: rejectedEnrollments, color: '#ef4444' },
      ];

      // Get gender distribution
      const genderDistribution = await this.prisma.studentProfile.groupBy({
        by: ['gender'],
        where: { schoolId },
        _count: { id: true },
      });

      // Get recent enrollments
      const recentEnrollments = await this.prisma.enrollment.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          student: { select: { name: true, email: true } },
        },
      });

      // Build alerts
      const alerts: any[] = [];

      if (pendingEnrollments > 0) {
        alerts.push({
          message: `${pendingEnrollments} enrollment(s) pending approval`,
          type: 'warning',
          priority: 'high',
          actionUrl: '/enrollments?status=pending',
          actionLabel: 'Review',
        });
      }

      if (inactiveStudents > 0) {
        alerts.push({
          message: `${inactiveStudents} inactive student account(s)`,
          type: 'info',
          priority: 'low',
          actionUrl: '/students?status=inactive',
          actionLabel: 'View',
        });
      }

      if (totalClasses === 0) {
        alerts.push({
          message: 'No classes created yet',
          type: 'warning',
          priority: 'medium',
          actionUrl: '/classes/new',
          actionLabel: 'Create Class',
        });
      }

      // Build quick actions
      const quickActions = [
        {
          label: 'Approve Enrollments',
          icon: 'enrollment',
          url: '/enrollments/pending',
          permission: 'student:approve_enrollment',
          disabled: pendingEnrollments === 0,
        },
        {
          label: 'Add Student',
          icon: 'student',
          url: '/students/new',
          permission: 'student:create',
          disabled: false,
        },
        {
          label: 'Create Class',
          icon: 'class',
          url: '/classes/new',
          permission: 'class:create',
          disabled: false,
        },
        {
          label: 'Export Reports',
          icon: 'report',
          url: '/reports/export',
          permission: 'student:read',
          disabled: false,
        },
      ];

      // Build charts data
      const charts: { [key: string]: any } = {
        enrollmentTrend: {
          type: 'line' as const,
          title: 'Enrollment Trend (12 Months)',
          labels: enrollmentTrend.map((e) => e.month),
          datasets: [
            {
              label: 'Approved',
              data: enrollmentTrend.map((e) => e.enrolled),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
            },
            {
              label: 'Pending',
              data: enrollmentTrend.map((e) => e.pending),
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
            },
          ],
        },
        studentsPerClass: {
          type: 'bar' as const,
          title: 'Students per Class',
          labels: classStudentData.map((c) => c.name),
          datasets: [
            {
              label: 'Students',
              data: classStudentData.map((c) => c.students),
              backgroundColor: '#3b82f6',
            },
          ],
        },
        enrollmentStatus: {
          type: 'doughnut' as const,
          title: 'Enrollment Status',
          labels: enrollmentStatusData.map((e) => e.status),
          datasets: [
            {
              label: 'Enrollments',
              data: enrollmentStatusData.map((e) => e.count),
              backgroundColor: enrollmentStatusData.map((e) => e.color),
            },
          ],
        },
        classSections: {
          type: 'bar' as const,
          title: 'Classes and Sections',
          labels: classStudentData.map((c) => c.name),
          datasets: [
            {
              label: 'Sections',
              data: classStudentData.map((c) => c.sections),
              backgroundColor: '#8b5cf6',
            },
          ],
        },
        studentStatus: {
          type: 'doughnut' as const,
          title: 'Student Status',
          labels: ['Active', 'Inactive'],
          datasets: [
            {
              label: 'Students',
              data: [activeStudents, inactiveStudents],
              backgroundColor: ['#10b981', '#ef4444'],
            },
          ],
        },
        genderDistribution: {
          type: 'pie' as const,
          title: 'Gender Distribution',
          labels: genderDistribution.map((g) => g.gender || 'Not Specified'),
          datasets: [
            {
              label: 'Students',
              data: genderDistribution.map((g) => g._count.id),
              backgroundColor: ['#3b82f6', '#ec4899', '#f59e0b'],
            },
          ],
        },
      };

      // Stats
      const stats = {
        totalStudents,
        pendingEnrollments,
        approvedEnrollments,
        rejectedEnrollments,
        totalClasses,
        totalSections,
        activeStudents,
        inactiveStudents,
        enrollmentRate:
          totalStudents > 0
            ? Math.round((activeStudents / totalStudents) * 100)
            : 0,
        academicYear: academicYear?.name,
      };

      // Get current term/period
      const currentTerm = academicYear
        ? await this.prisma.term.findFirst({
            where: {
              academicYearId: academicYear.id,
              startDate: { lte: today },
              endDate: { gte: today },
            },
            orderBy: { order: 'asc' },
          })
        : null;

      return {
        stats,
        alerts,
        quickActions,
        charts,
        metadata: {
          schoolId,
          academicYear: academicYear?.name,
          term: currentTerm?.name,
          generatedAt: new Date(),
          curriculum: academicYear
            ? {
                curriculumType: academicYear.curriculumType,
                academicYear: academicYear.name,
                periods: academicYear.terms.map((t) => ({
                  id: t.id,
                  name: t.name,
                  order: t.order,
                  percentageWeight: t.percentageWeight,
                  isLocked: t.isLocked,
                })),
              }
            : undefined,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching registrar dashboard: ${error.message}`,
        error.stack,
      );
      return this.getEmptyDashboard(schoolId);
    }
  }
}
