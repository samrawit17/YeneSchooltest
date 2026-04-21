import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UniversalDashboardResponseDto } from '../dto/dashboard-response.dto';

@Injectable()
export class SuperadminDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string): Promise<UniversalDashboardResponseDto> {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get total schools
    const totalSchools = await this.prisma.school.count();

    const activeSchools = await this.prisma.school.count({
      where: { isActive: true },
    });

    // Get total users across all schools
    const totalUsers = await this.prisma.user.count();

    // Get new users this month
    const newUsersThisMonth = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Get inactive schools (potential issues)
    const inactiveSchools = await this.prisma.school.findMany({
      where: { isActive: false },
      take: 5,
    });

    // Get schools with expiring subscriptions (check platform settings if exists)
    const schoolsWithIssues = await this.prisma.school.findMany({
      where: { isActive: false },
      include: {
        _count: {
          select: {
            users: true,
            enrollments: true,
          },
        },
      },
      take: 5,
    });

    // Get user distribution by role
    const userDistribution = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    // Get recent schools (last 5)
    const recentSchools = await this.prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: {
          select: {
            users: true,
            enrollments: true,
          },
        },
      },
    });

    // Get platform statistics
    const totalExams = await this.prisma.exam.count();
    const totalPayments = await this.prisma.payment.aggregate({
      where: {
        studentFee: { status: 'PAID' },
      },
      _sum: { amountPaid: true },
    });

    // Build alerts
    const alerts: any[] = [];

    if (inactiveSchools.length > 0) {
      for (const school of schoolsWithIssues) {
        alerts.push({
          message: `School "${school.name}" is inactive`,
          type: 'warning',
          priority: 'high',
          actionUrl: `/schools/${school.id}`,
          actionLabel: 'Review',
          metadata: { schoolId: school.id },
        });
      }
    }

    // Check for schools with no activity
    const schoolsNoActivity = await this.prisma.school.findMany({
      where: {
        isActive: true,
        users: {
          none: {},
        },
      },
      take: 3,
    });

    if (schoolsNoActivity.length > 0) {
      alerts.push({
        message: `${schoolsNoActivity.length} school(s) with no users registered`,
        type: 'info',
        priority: 'medium',
        actionUrl: '/schools?filter=no-activity',
        actionLabel: 'View',
      });
    }

    // Build quick actions
    const quickActions = [
      {
        label: 'Add School',
        icon: 'school',
        url: '/schools/new',
        permission: 'school:create',
        disabled: false,
      },
      {
        label: 'Manage Schools',
        icon: 'list',
        url: '/schools',
        permission: 'school:view',
        disabled: false,
      },
      {
        label: 'Platform Settings',
        icon: 'settings',
        url: '/platform/settings',
        permission: 'settings:platform',
        disabled: false,
      },
      {
        label: 'User Management',
        icon: 'users',
        url: '/users',
        permission: 'user:view',
        disabled: false,
      },
      {
        label: 'Reports',
        icon: 'report',
        url: '/reports',
        permission: 'report:view',
        disabled: false,
      },
    ];

    // Stats
    const stats = {
      totalSchools,
      activeSchools,
      inactiveSchools: totalSchools - activeSchools,
      totalUsers,
      newUsersThisMonth,
      totalExams,
      totalRevenue: totalPayments._sum.amountPaid || 0,
      schoolsByRole: userDistribution.map((d) => ({
        role: d.role,
        count: d._count.id,
      })),
    };

    // Charts
    const charts: { [key: string]: any } = {
      userDistribution: {
        type: 'doughnut' as const,
        title: 'Users by Role',
        labels: userDistribution.map((d) => d.role),
        datasets: [
          {
            label: 'Users',
            data: userDistribution.map((d) => d._count.id),
            backgroundColor: [
              '#3b82f6',
              '#10b981',
              '#f59e0b',
              '#ef4444',
              '#8b5cf6',
              '#ec4899',
              '#06b6d4',
            ],
          },
        ],
      },
      schoolActivity: {
        type: 'bar' as const,
        title: 'Schools Overview',
        labels: recentSchools.map((s) => s.name),
        datasets: [
          {
            label: 'Users',
            data: recentSchools.map((s) => s._count.users),
            backgroundColor: '#3b82f6',
          },
          {
            label: 'Enrollments',
            data: recentSchools.map((s) => s._count.enrollments),
            backgroundColor: '#10b981',
          },
        ],
      },
      schoolStatus: {
        type: 'pie' as const,
        title: 'School Status',
        labels: ['Active Schools', 'Inactive Schools'],
        datasets: [
          {
            label: 'Count',
            data: [activeSchools, totalSchools - activeSchools],
            backgroundColor: ['#10b981', '#ef4444'],
          },
        ],
      },
      monthlyGrowth: {
        type: 'line' as const,
        title: 'User Growth',
        labels: ['This Month', 'Last Month'],
        datasets: [
          {
            label: 'New Users',
            data: [newUsersThisMonth, 0],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
        ],
      },
    };

    return {
      stats,
      alerts,
      quickActions,
      charts,
      metadata: {
        generatedAt: new Date(),
      },
    };
  }
}
