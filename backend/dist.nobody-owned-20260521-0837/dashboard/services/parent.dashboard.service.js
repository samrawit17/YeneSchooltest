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
exports.ParentDashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ParentDashboardService = class ParentDashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    scoreToLetter(score) {
        if (score >= 90)
            return 'A';
        if (score >= 80)
            return 'B';
        if (score >= 70)
            return 'C';
        if (score >= 60)
            return 'D';
        return 'F';
    }
    async getDashboard(userId, schoolId, userEmail) {
        const today = new Date();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        let parentProfile = await this.prisma.parentProfile.findUnique({
            where: { userId },
        });
        if (!parentProfile && userEmail) {
            const user = await this.prisma.user.findUnique({
                where: { email: userEmail },
            });
            if (user) {
                parentProfile = await this.prisma.parentProfile.findUnique({
                    where: { userId: user.id },
                });
                if (!parentProfile && schoolId) {
                    parentProfile = await this.prisma.parentProfile.findFirst({
                        where: {
                            userId: user.id,
                            schoolId: schoolId,
                        },
                    });
                }
            }
        }
        if (!parentProfile) {
            return {
                stats: {
                    totalChildren: 0,
                    children: [],
                    averageAttendance: 'N/A',
                    totalUpcomingExams: 0,
                },
                alerts: [],
                quickActions: [],
                charts: {},
                metadata: { schoolId, generatedAt: new Date() },
            };
        }
        const parentStudents = await this.prisma.parentStudent.findMany({
            where: {
                parentId: parentProfile.id,
            },
            include: {
                student: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        const activeAcademicYear = schoolId
            ? await this.prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true },
            })
            : null;
        const childrenData = [];
        for (const parentStudent of parentStudents) {
            const studentProfile = parentStudent.student;
            const studentUser = studentProfile.user;
            const totalAttendance = await this.prisma.attendanceRecord.count({
                where: {
                    studentId: studentProfile.userId,
                    session: {
                        status: 'SUBMITTED',
                        date: {
                            gte: new Date(today.getFullYear(), 0, 1),
                            lte: todayEnd,
                        },
                    },
                },
            });
            const presentAttendance = await this.prisma.attendanceRecord.count({
                where: {
                    studentId: studentProfile.userId,
                    status: 'PRESENT',
                    session: {
                        status: 'SUBMITTED',
                        date: {
                            gte: new Date(today.getFullYear(), 0, 1),
                            lte: todayEnd,
                        },
                    },
                },
            });
            const attendancePercentage = totalAttendance > 0
                ? Math.round((presentAttendance / totalAttendance) * 100)
                : 0;
            const upcomingExams = await this.prisma.exam.count({
                where: {
                    schoolId,
                    date: {
                        gte: tomorrow,
                        lte: nextWeek,
                    },
                },
            });
            const recentAbsences = await this.prisma.attendanceRecord.findMany({
                where: {
                    studentId: studentProfile.userId,
                    status: 'ABSENT',
                    session: {
                        status: 'SUBMITTED',
                        date: {
                            gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
                            lte: todayEnd,
                        },
                    },
                },
                include: {
                    session: true,
                },
                orderBy: {
                    session: {
                        date: 'desc',
                    },
                },
                take: 3,
            });
            const approvedGrades = activeAcademicYear?.id
                ? await this.prisma.subjectGrade.findMany({
                    where: {
                        schoolId,
                        studentId: studentProfile.userId,
                        academicYear: activeAcademicYear.id,
                        status: 'APPROVED',
                    },
                    include: {
                        subject: true,
                        term: true,
                    },
                    orderBy: [{ term: { order: 'desc' } }, { updatedAt: 'desc' }],
                })
                : [];
            const latestBySubject = new Map();
            for (const grade of approvedGrades) {
                const subjectId = grade.subjectId;
                if (!subjectId)
                    continue;
                const existing = latestBySubject.get(subjectId);
                if (!existing) {
                    latestBySubject.set(subjectId, grade);
                    continue;
                }
                const existingOrder = existing.term?.order ?? -1;
                const gradeOrder = grade.term?.order ?? -1;
                if (gradeOrder > existingOrder) {
                    latestBySubject.set(subjectId, grade);
                }
            }
            const latestSubjectGrades = Array.from(latestBySubject.values());
            const scoreValues = latestSubjectGrades
                .map((g) => g.totalScore)
                .filter((v) => typeof v === 'number');
            const avg = scoreValues.length > 0
                ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) *
                    100) / 100
                : 0;
            const overallGrade = scoreValues.length > 0 ? this.scoreToLetter(avg) : 'N/A';
            const latestGrade = latestSubjectGrades[0]?.gradeLetter ||
                (typeof latestSubjectGrades[0]?.totalScore === 'number'
                    ? this.scoreToLetter(latestSubjectGrades[0].totalScore)
                    : 'N/A');
            const grades = latestSubjectGrades.slice(0, 8).map((g) => ({
                subject: g.subject?.name || 'Unknown',
                currentGrade: g.gradeLetter ||
                    (typeof g.totalScore === 'number'
                        ? this.scoreToLetter(g.totalScore)
                        : 'N/A'),
                average: typeof g.totalScore === 'number' ? `${g.totalScore}%` : 'N/A',
                status: g.status,
            }));
            const reportCards = await this.prisma.reportCard.findMany({
                where: {
                    studentId: studentProfile.userId,
                    status: 'PUBLISHED',
                },
                orderBy: {
                    publishedAt: 'desc',
                },
                take: 1,
            });
            childrenData.push({
                id: studentProfile.userId,
                name: studentUser.name,
                photoUrl: studentUser.avatarUrl || null,
                avatarUrl: studentUser.avatarUrl || null,
                studentCode: studentProfile.studentCode,
                className: studentProfile.className,
                section: studentProfile.section,
                relation: parentStudent.relation,
                attendance: `${attendancePercentage}%`,
                presentDays: presentAttendance,
                totalDays: totalAttendance,
                upcomingExams,
                recentAbsences: recentAbsences.map((a) => ({
                    date: a.session.date,
                    reason: a.remark,
                })),
                latestGrade,
                overallGrade,
                grades,
                reportCard: reportCards[0]
                    ? {
                        status: reportCards[0].status,
                        percentage: reportCards[0].percentage,
                        publishedAt: reportCards[0].publishedAt,
                    }
                    : null,
            });
        }
        const alerts = [];
        for (const child of childrenData) {
            if (parseInt(child.attendance) < 75) {
                alerts.push({
                    message: `${child.name}'s attendance is ${child.attendance}%`,
                    type: 'warning',
                    priority: 'high',
                    actionUrl: `/child/${child.id}/attendance`,
                    actionLabel: 'View Details',
                    metadata: { childId: child.id },
                });
            }
            if (child.recentAbsences.length > 0) {
                const lastAbsence = child.recentAbsences[0];
                alerts.push({
                    message: `${child.name} was absent on ${new Date(lastAbsence.date).toLocaleDateString()}`,
                    type: 'warning',
                    priority: 'medium',
                    actionUrl: `/child/${child.id}/attendance`,
                    actionLabel: 'View Details',
                    metadata: { childId: child.id },
                });
            }
            if (child.upcomingExams > 0) {
                alerts.push({
                    message: `${child.name} has ${child.upcomingExams} exam(s) this week`,
                    type: 'info',
                    priority: 'medium',
                    actionUrl: `/child/${child.id}/exams`,
                    actionLabel: 'View Exams',
                    metadata: { childId: child.id },
                });
            }
        }
        const quickActions = [
            {
                label: 'View Children',
                icon: 'student',
                url: '/children',
                permission: 'children:view',
                disabled: false,
            },
            {
                label: 'View Attendance',
                icon: 'attendance',
                url: '/children/attendance',
                permission: 'attendance:view',
                disabled: false,
            },
            {
                label: 'View Results',
                icon: 'result',
                url: '/children/results',
                permission: 'result:view',
                disabled: false,
            },
            {
                label: 'Contact School',
                icon: 'message',
                url: '/contact',
                permission: 'communication:send',
                disabled: false,
            },
        ];
        const stats = {
            totalChildren: childrenData.length,
            children: childrenData,
            averageAttendance: childrenData.length > 0
                ? Math.round(childrenData.reduce((sum, c) => sum + parseInt(c.attendance), 0) /
                    childrenData.length) + '%'
                : 'N/A',
            totalUpcomingExams: childrenData.reduce((sum, c) => sum + c.upcomingExams, 0),
        };
        const charts = {
            childrenAttendance: {
                type: 'bar',
                title: 'Children Attendance Overview',
                labels: childrenData.map((c) => c.name),
                datasets: [
                    {
                        label: 'Attendance %',
                        data: childrenData.map((c) => parseInt(c.attendance)),
                        backgroundColor: '#3b82f6',
                    },
                ],
            },
            childrenOverview: {
                type: 'doughnut',
                title: 'Children Summary',
                labels: ['Total Children', 'Upcoming Exams', 'Recent Absences'],
                datasets: [
                    {
                        label: 'Count',
                        data: [
                            childrenData.length,
                            childrenData.reduce((sum, c) => sum + c.upcomingExams, 0),
                            childrenData.reduce((sum, c) => sum + c.recentAbsences.length, 0),
                        ],
                        backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444'],
                    },
                ],
            },
            attendanceComparison: {
                type: 'line',
                title: 'Attendance Trend',
                labels: childrenData.map((c) => c.name),
                datasets: [
                    {
                        label: 'Present Days',
                        data: childrenData.map((c) => c.presentDays),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    },
                    {
                        label: 'Total Days',
                        data: childrenData.map((c) => c.totalDays),
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
                schoolId,
                academicYear: activeAcademicYear?.id,
                generatedAt: new Date(),
            },
        };
    }
};
exports.ParentDashboardService = ParentDashboardService;
exports.ParentDashboardService = ParentDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ParentDashboardService);
//# sourceMappingURL=parent.dashboard.service.js.map