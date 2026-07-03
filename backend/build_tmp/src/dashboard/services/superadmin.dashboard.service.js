"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperadminDashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SuperadminDashboardService = class SuperadminDashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboard(userId) {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const totalSchools = await this.prisma.school.count();
        const activeSchools = await this.prisma.school.count({
            where: { isActive: true },
        });
        const totalUsers = await this.prisma.user.count();
        const newUsersThisMonth = await this.prisma.user.count({
            where: {
                createdAt: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
        });
        const inactiveSchools = await this.prisma.school.findMany({
            where: { isActive: false },
            take: 5,
        });
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
        const userDistribution = await this.prisma.user.groupBy({
            by: ['role'],
            _count: { id: true },
        });
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
        const totalExams = await this.prisma.exam.count();
        const totalPayments = await this.prisma.payment.aggregate({
            where: {
                studentFee: { status: 'PAID' },
            },
            _sum: { amountPaid: true },
        });
        const alerts = [];
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
        const charts = {
            userDistribution: {
                type: 'doughnut',
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
                type: 'bar',
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
                type: 'pie',
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
                type: 'line',
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
};
exports.SuperadminDashboardService = SuperadminDashboardService;
exports.SuperadminDashboardService = SuperadminDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuperadminDashboardService);
//# sourceMappingURL=superadmin.dashboard.service.js.map