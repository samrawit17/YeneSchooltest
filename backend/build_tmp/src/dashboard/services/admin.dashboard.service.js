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
var AdminDashboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminDashboardService = AdminDashboardService_1 = class AdminDashboardService {
    prisma;
    logger = new common_1.Logger(AdminDashboardService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    percent(value, target) {
        if (target <= 0)
            return 0;
        return Math.min(100, Math.round((value / target) * 100));
    }
    async getTeacherLeaderboard(schoolId) {
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        const [teachers, assessmentScores, attendanceCounts, lessonCounts] = await Promise.all([
            this.prisma.user.findMany({
                where: { schoolId, role: 'TEACHER', isActive: true },
                select: { id: true, name: true, email: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.studentAssessmentScore.findMany({
                where: {
                    enteredAt: { gte: start },
                    status: 'SUBMITTED',
                    assessmentSubject: {
                        assessment: { schoolId },
                    },
                },
                select: {
                    enteredAt: true,
                    enteredBy: true,
                    assessmentSubject: {
                        select: {
                            teacherId: true,
                            assessment: { select: { endDate: true } },
                        },
                    },
                },
            }),
            this.prisma.attendanceSession.groupBy({
                by: ['takenById'],
                where: {
                    schoolId,
                    date: { gte: start },
                    status: 'SUBMITTED',
                },
                _count: { id: true },
            }),
            this.prisma.content.groupBy({
                by: ['teacherId'],
                where: {
                    schoolId,
                    type: 'LESSON',
                    teacherId: { not: null },
                    createdAt: { gte: start },
                    status: { in: ['PUBLISHED', 'COVERED'] },
                },
                _count: { id: true },
            }),
        ]);
        const gradingByTeacher = new Map();
        assessmentScores.forEach((score) => {
            const teacherId = score.assessmentSubject.teacherId || score.enteredBy;
            const current = gradingByTeacher.get(teacherId) || {
                submitted: 0,
                onTime: 0,
            };
            current.submitted += 1;
            if (score.enteredAt <= score.assessmentSubject.assessment.endDate) {
                current.onTime += 1;
            }
            gradingByTeacher.set(teacherId, current);
        });
        const attendanceByTeacher = new Map(attendanceCounts.map((row) => [row.takenById, row._count.id]));
        const lessonsByTeacher = new Map(lessonCounts
            .filter((row) => row.teacherId)
            .map((row) => [row.teacherId, row._count.id]));
        return teachers
            .map((teacher) => {
            const grading = gradingByTeacher.get(teacher.id) || {
                submitted: 0,
                onTime: 0,
            };
            const gradingSubmitted = grading.submitted;
            const attendanceSubmitted = attendanceByTeacher.get(teacher.id) || 0;
            const lessonPlans = lessonsByTeacher.get(teacher.id) || 0;
            const gradingScore = gradingSubmitted > 0
                ? Math.round((grading.onTime / gradingSubmitted) * 100)
                : 0;
            const attendanceScore = this.percent(attendanceSubmitted, 20);
            const lessonPlanScore = this.percent(lessonPlans, 8);
            const overallScore = Math.round(gradingScore * 0.4 + attendanceScore * 0.35 + lessonPlanScore * 0.25);
            return {
                teacherId: teacher.id,
                teacherName: teacher.name,
                teacherEmail: teacher.email,
                overallScore,
                gradingScore,
                attendanceScore,
                lessonPlanScore,
                gradingSubmitted,
                gradingOnTime: grading.onTime,
                attendanceSubmitted,
                lessonPlans,
            };
        })
            .sort((a, b) => {
            if (b.overallScore !== a.overallScore) {
                return b.overallScore - a.overallScore;
            }
            return (b.gradingSubmitted +
                b.attendanceSubmitted +
                b.lessonPlans -
                (a.gradingSubmitted + a.attendanceSubmitted + a.lessonPlans));
        })
            .slice(0, 10)
            .map((teacher, index) => ({ ...teacher, rank: index + 1 }));
    }
    getEmptyDashboard(schoolId, permissions = []) {
        return {
            stats: {
                students: 0,
                teachers: 0,
                classes: 0,
                sections: 0,
                attendanceRate: 0,
                pendingEnrollments: 0,
                feesCollected: 0,
                upcomingExams: 0,
            },
            alerts: [],
            quickActions: [
                {
                    label: 'Add Student',
                    icon: 'student',
                    url: '/students/new',
                    permission: 'student:create',
                    disabled: !permissions.includes('student:create'),
                },
                {
                    label: 'Add Teacher',
                    icon: 'teacher',
                    url: '/teachers/new',
                    permission: 'teacher:create',
                    disabled: !permissions.includes('teacher:create'),
                },
                {
                    label: 'Create Class',
                    icon: 'class',
                    url: '/classes/new',
                    permission: 'class:create',
                    disabled: !permissions.includes('class:create'),
                },
                {
                    label: 'School Settings',
                    icon: 'settings',
                    url: '/settings',
                    permission: 'settings:manage',
                    disabled: !permissions.includes('settings:manage'),
                },
            ],
            charts: {},
            metadata: {
                schoolId,
                generatedAt: new Date(),
            },
        };
    }
    async getDashboard(userId, schoolId, options) {
        try {
            const role = options?.role;
            const permissions = options?.permissions || [];
            if (!schoolId) {
                this.logger.warn(`User ${userId} has no schoolId, returning empty dashboard`);
                return this.getEmptyDashboard(schoolId, permissions);
            }
            if (!role || !['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'TEACHER', 'FINANCE'].includes(role)) {
                this.logger.warn(`User ${userId} with role=${role} is not authorized for a school dashboard`);
                return this.getEmptyDashboard(schoolId, permissions);
            }
            const today = new Date();
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const [totalStudents, totalTeachers, totalClasses, totalSections] = await Promise.all([
                this.prisma.user.count({
                    where: { role: 'STUDENT', schoolId },
                }),
                this.prisma.user.count({
                    where: { role: 'TEACHER', schoolId },
                }),
                this.prisma.class.count({
                    where: { schoolId },
                }),
                this.prisma.section.count({
                    where: { class: { schoolId } },
                }),
            ]);
            const todaySessions = await this.prisma.attendanceSession.findMany({
                where: {
                    date: {
                        gte: todayStart,
                        lte: todayEnd,
                    },
                    schoolId,
                },
                include: {
                    attendanceRecords: true,
                },
            });
            let presentToday = 0;
            let absentToday = 0;
            todaySessions.forEach((session) => {
                presentToday += session.attendanceRecords.filter((r) => r.status === 'PRESENT').length;
                absentToday += session.attendanceRecords.filter((r) => r.status === 'ABSENT').length;
            });
            const totalTodayRecords = presentToday + absentToday;
            const attendanceRate = totalTodayRecords > 0
                ? Math.round((presentToday / totalTodayRecords) * 100)
                : 0;
            const pendingEnrollments = await this.prisma.enrollmentRequest.count({
                where: {
                    schoolId,
                    status: 'PENDING',
                },
            });
            const feePayments = await this.prisma.payment.findMany({
                where: {
                    studentFee: { schoolId, status: 'PAID' },
                    paymentDate: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
            });
            const feesCollected = feePayments.reduce((sum, p) => sum + p.amountPaid, 0);
            const totalFees = await this.prisma.studentFee.aggregate({
                where: {
                    schoolId,
                    dueDate: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
                _sum: {
                    finalAmount: true,
                },
            });
            const expectedFees = totalFees._sum.finalAmount || 0;
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            const upcomingExams = await this.prisma.exam.count({
                where: {
                    schoolId,
                    date: {
                        gte: tomorrow,
                        lte: nextWeek,
                    },
                },
            });
            const alerts = [];
            if (pendingEnrollments > 0) {
                alerts.push({
                    message: `${pendingEnrollments} enrollment(s) pending approval`,
                    type: 'warning',
                    priority: 'high',
                    actionUrl: '/admin/enrollment',
                    actionLabel: 'Review',
                });
            }
            if (attendanceRate < 80) {
                const todayDay = today.getDay();
                const isWeekend = todayDay === 0 || todayDay === 6;
                if (!isWeekend) {
                    alerts.push({
                        message: `Today's attendance rate is ${attendanceRate}%`,
                        type: 'warning',
                        priority: 'medium',
                        actionUrl: '/attendance',
                        actionLabel: 'View Details',
                    });
                }
            }
            if (upcomingExams > 0) {
                alerts.push({
                    message: `${upcomingExams} exam(s) scheduled this week`,
                    type: 'info',
                    priority: 'medium',
                    actionUrl: '/exams',
                    actionLabel: 'View Exams',
                });
            }
            const quickActions = [
                {
                    label: 'Add Student',
                    icon: 'student',
                    url: '/students/new',
                    permission: 'student:create',
                    disabled: !permissions.includes('student:create'),
                },
                {
                    label: 'Approve Enrollments',
                    icon: 'enrollment',
                    url: '/admin/enrollment',
                    permission: 'enrollment:approve',
                    disabled: pendingEnrollments === 0 ||
                        !permissions.includes('enrollment:approve'),
                },
                {
                    label: 'Take Attendance',
                    icon: 'attendance',
                    url: '/attendance/take',
                    permission: 'attendance:create',
                    disabled: !permissions.includes('attendance:create'),
                },
                {
                    label: 'View Reports',
                    icon: 'report',
                    url: '/reports',
                    permission: 'report:view',
                    disabled: !permissions.includes('report:view'),
                },
                {
                    label: 'Manage Fees',
                    icon: 'finance',
                    url: '/fees',
                    permission: 'fee:manage',
                    disabled: !permissions.includes('fee:manage'),
                },
                {
                    label: 'School Settings',
                    icon: 'settings',
                    url: '/settings',
                    permission: 'settings:manage',
                    disabled: !permissions.includes('settings:manage'),
                },
            ];
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dayOfWeek = date.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    last7Days.push(date);
                }
            }
            const attendanceByDay = await Promise.all(last7Days.map(async (date) => {
                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);
                const daySessions = await this.prisma.attendanceSession.findMany({
                    where: {
                        date: { gte: dayStart, lte: dayEnd },
                        schoolId,
                    },
                    include: {
                        attendanceRecords: true,
                    },
                });
                let present = 0;
                let absent = 0;
                daySessions.forEach((session) => {
                    present += session.attendanceRecords.filter((r) => r.status === 'PRESENT').length;
                    absent += session.attendanceRecords.filter((r) => r.status === 'ABSENT').length;
                });
                return {
                    name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    present,
                    absent,
                };
            }));
            const userRoleDistribution = await this.prisma.user.groupBy({
                by: ['role'],
                where: {
                    schoolId,
                    role: { in: ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'REGISTRAR', 'TEACHER', 'STUDENT', 'PARENT', 'FINANCE'] },
                },
                _count: { id: true },
            });
            const monthlyFees = [];
            for (let i = 11; i >= 0; i--) {
                const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
                const collected = await this.prisma.payment.aggregate({
                    where: {
                        studentFee: { schoolId, status: 'PAID' },
                        paymentDate: { gte: monthStart, lte: monthEnd },
                    },
                    _sum: { amountPaid: true },
                });
                const pending = await this.prisma.studentFee.aggregate({
                    where: {
                        schoolId,
                        dueDate: { gte: monthStart, lte: monthEnd },
                    },
                    _sum: { finalAmount: true },
                });
                monthlyFees.push({
                    name: monthStart.toLocaleDateString('en-US', { month: 'short' }),
                    collected: collected._sum.amountPaid || 0,
                    pending: (pending._sum.finalAmount || 0) - (collected._sum.amountPaid || 0),
                });
            }
            const classDistributionData = await this.prisma.class.findMany({
                where: { schoolId },
                include: {
                    _count: { select: { sections: true, attendances: true } },
                },
                take: 10,
            });
            const classDistribution = classDistributionData.map((c) => ({
                name: c.name,
                sections: c._count.sections,
            }));
            const subjectCount = await this.prisma.subject.count({
                where: { schoolId },
            });
            const teacherLeaderboard = await this.getTeacherLeaderboard(schoolId);
            const charts = {
                attendance: {
                    type: 'bar',
                    title: 'Weekly Attendance',
                    labels: attendanceByDay.map((d) => d.name),
                    datasets: [
                        {
                            label: 'Present',
                            data: attendanceByDay.map((d) => d.present),
                            backgroundColor: '#10b981',
                        },
                        {
                            label: 'Absent',
                            data: attendanceByDay.map((d) => d.absent),
                            backgroundColor: '#ef4444',
                        },
                    ],
                },
                userDistribution: {
                    type: 'doughnut',
                    title: 'Users by Role',
                    labels: userRoleDistribution.map((g) => g.role),
                    datasets: [
                        {
                            label: 'Users',
                            data: userRoleDistribution.map((g) => g._count.id),
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
                finance: {
                    type: 'line',
                    title: 'Monthly Fee Collection',
                    labels: monthlyFees.map((m) => m.name),
                    datasets: [
                        {
                            label: 'Collected',
                            data: monthlyFees.map((m) => m.collected),
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        },
                        {
                            label: 'Pending',
                            data: monthlyFees.map((m) => m.pending),
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        },
                    ],
                },
                classDistribution: {
                    type: 'bar',
                    title: 'Sections per Class',
                    labels: classDistribution.map((c) => c.name),
                    datasets: [
                        {
                            label: 'Sections',
                            data: classDistribution.map((c) => c.sections),
                            backgroundColor: '#3b82f6',
                        },
                    ],
                },
                overview: {
                    type: 'pie',
                    title: 'School Overview',
                    labels: ['Students', 'Teachers', 'Classes', 'Subjects'],
                    datasets: [
                        {
                            label: 'Count',
                            data: [totalStudents, totalTeachers, totalClasses, subjectCount],
                            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
                        },
                    ],
                },
            };
            const stats = {
                students: totalStudents,
                teachers: totalTeachers,
                classes: totalClasses,
                sections: totalSections,
                attendanceRate,
                presentToday,
                absentToday,
                pendingEnrollments,
                feesCollected,
                expectedFees,
                feesCollectedPercentage: expectedFees > 0
                    ? Math.round((feesCollected / expectedFees) * 100)
                    : 0,
                upcomingExams,
                totalRevenue: feesCollected,
            };
            return {
                stats,
                alerts,
                quickActions,
                charts,
                metadata: {
                    schoolId,
                    teacherLeaderboard,
                    generatedAt: new Date(),
                },
            };
        }
        catch (error) {
            this.logger.error(`Error fetching admin dashboard: ${error.message}`, error.stack);
            return this.getEmptyDashboard(schoolId);
        }
    }
};
exports.AdminDashboardService = AdminDashboardService;
exports.AdminDashboardService = AdminDashboardService = AdminDashboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminDashboardService);
//# sourceMappingURL=admin.dashboard.service.js.map