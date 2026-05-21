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
exports.StudentDashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let StudentDashboardService = class StudentDashboardService {
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
    async getDashboard(userId, schoolId) {
        const today = new Date();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const totalAttendance = await this.prisma.attendanceRecord.count({
            where: {
                studentId: userId,
                session: {
                    date: {
                        gte: new Date(today.getFullYear(), 0, 1),
                        lte: todayEnd,
                    },
                },
            },
        });
        const presentAttendance = await this.prisma.attendanceRecord.count({
            where: {
                studentId: userId,
                status: 'PRESENT',
                session: {
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
        const activeAcademicYear = await this.prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
        });
        const activeAcademicYearId = activeAcademicYear?.id;
        const approvedSubjectGrades = activeAcademicYearId
            ? await this.prisma.subjectGrade.findMany({
                where: {
                    schoolId,
                    studentId: userId,
                    academicYear: activeAcademicYearId,
                    status: 'APPROVED',
                },
                include: {
                    subject: true,
                    term: true,
                },
                orderBy: [{ updatedAt: 'desc' }],
            })
            : [];
        const alerts = [];
        const upcomingExamDetails = await this.prisma.exam.findMany({
            where: {
                schoolId,
                date: {
                    gte: tomorrow,
                    lte: nextWeek,
                },
            },
            include: {
                subject: true,
                class: true,
                section: true,
            },
            take: 3,
        });
        for (const exam of upcomingExamDetails) {
            alerts.push({
                message: `${exam.subject.name} exam on ${exam.date.toLocaleDateString()}`,
                type: 'info',
                priority: 'medium',
                actionUrl: `/exams/${exam.id}`,
                actionLabel: 'View Details',
            });
        }
        if (attendancePercentage < 75) {
            alerts.push({
                message: `Your attendance is ${attendancePercentage}%. Maintain 75% to avoid issues.`,
                type: 'warning',
                priority: 'high',
                actionUrl: '/student/attendance',
                actionLabel: 'View Attendance',
            });
        }
        if (approvedSubjectGrades.length > 0) {
            alerts.push({
                message: `${approvedSubjectGrades.length} result(s) published`,
                type: 'success',
                priority: 'medium',
                actionUrl: '/student/results',
                actionLabel: 'View Results',
            });
        }
        const quickActions = [
            {
                label: 'View Attendance',
                icon: 'clipboard',
                description: 'Check your daily attendance',
                url: '/student/attendance',
                permission: 'attendance:view',
                disabled: false,
            },
            {
                label: 'View Results',
                icon: 'file',
                description: 'See approved grades and remarks',
                url: '/student/results',
                permission: 'result:view',
                disabled: false,
            },
            {
                label: 'View Timetable',
                icon: 'eye',
                description: 'Today and weekly schedule',
                url: '/student/timetable',
                permission: 'timetable:view',
                disabled: false,
            },
            {
                label: 'View Assignments',
                icon: 'book',
                description: 'Assignments and lesson tasks',
                url: '/student/lessons',
                permission: 'assignment:view',
                disabled: false,
            },
        ];
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            last7Days.push(date);
        }
        const attendanceByDay = await Promise.all(last7Days.map(async (date) => {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            const records = await this.prisma.attendanceRecord.findMany({
                where: {
                    studentId: userId,
                    session: {
                        date: { gte: dayStart, lte: dayEnd },
                    },
                },
            });
            const present = records.filter((r) => r.status === 'PRESENT').length;
            const absent = records.filter((r) => r.status === 'ABSENT').length;
            return {
                name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                status: records.length > 0 ? records[0].status : 'N/A',
                present,
                absent,
            };
        }));
        const latestBySubject = new Map();
        for (const grade of approvedSubjectGrades) {
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
        const subjectGrades = Array.from(latestBySubject.values()).slice(0, 6);
        const monthlyAttendance = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            const monthTotal = await this.prisma.attendanceRecord.count({
                where: {
                    studentId: userId,
                    session: {
                        date: { gte: monthStart, lte: monthEnd },
                    },
                },
            });
            const monthPresent = await this.prisma.attendanceRecord.count({
                where: {
                    studentId: userId,
                    status: 'PRESENT',
                    session: {
                        date: { gte: monthStart, lte: monthEnd },
                    },
                },
            });
            monthlyAttendance.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
                percentage: monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 0,
            });
        }
        const charts = {
            weeklyAttendance: {
                type: 'bar',
                title: "This Week's Attendance",
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
            subjectPerformance: {
                type: 'bar',
                title: 'Subject Performance',
                labels: subjectGrades.map((g) => g.subject?.name || 'Unknown'),
                datasets: [
                    {
                        label: 'Score (%)',
                        data: subjectGrades.map((g) => typeof g.totalScore === 'number' ? g.totalScore : 0),
                        backgroundColor: '#3b82f6',
                    },
                ],
            },
            attendanceTrend: {
                type: 'line',
                title: 'Attendance Trend',
                labels: monthlyAttendance.map((m) => m.month),
                datasets: [
                    {
                        label: 'Attendance %',
                        data: monthlyAttendance.map((m) => m.percentage),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    },
                ],
            },
            gradeDistribution: {
                type: 'doughnut',
                title: 'Grade Overview',
                labels: [
                    'A (90-100)',
                    'B (80-89)',
                    'C (70-79)',
                    'D (60-69)',
                    'F (<60)',
                ],
                datasets: [
                    {
                        label: 'Count',
                        data: [
                            subjectGrades.filter((g) => (g.totalScore || 0) >= 90).length,
                            subjectGrades.filter((g) => (g.totalScore || 0) >= 80 && (g.totalScore || 0) < 90).length,
                            subjectGrades.filter((g) => (g.totalScore || 0) >= 70 && (g.totalScore || 0) < 80).length,
                            subjectGrades.filter((g) => (g.totalScore || 0) >= 60 && (g.totalScore || 0) < 70).length,
                            subjectGrades.filter((g) => (g.totalScore || 0) < 60).length,
                        ],
                        backgroundColor: [
                            '#10b981',
                            '#3b82f6',
                            '#f59e0b',
                            '#f97316',
                            '#ef4444',
                        ],
                    },
                ],
            },
        };
        const publishedScores = approvedSubjectGrades
            .map((g) => g.totalScore)
            .filter((v) => typeof v === 'number');
        const totalSubjects = publishedScores.length;
        const passedSubjects = publishedScores.filter((s) => s >= 60).length;
        const averageScore = totalSubjects > 0
            ? Math.round((publishedScores.reduce((a, b) => a + b, 0) / totalSubjects) * 100) / 100
            : 0;
        const averageGrade = totalSubjects > 0 ? this.scoreToLetter(averageScore) : 'N/A';
        const stats = {
            attendance: `${attendancePercentage}%`,
            presentDays: presentAttendance,
            totalDays: totalAttendance,
            upcomingExams,
            resultsPublished: totalSubjects,
            totalSubjects,
            passedSubjects,
            averageGrade,
            attendanceTrend: monthlyAttendance.length >= 2
                ? monthlyAttendance[monthlyAttendance.length - 1].percentage -
                    monthlyAttendance[monthlyAttendance.length - 2].percentage
                : 0,
            classPosition: 'N/A',
            recentGrades: approvedSubjectGrades.slice(0, 5).map((g) => ({
                subject: g.subject?.name || 'Unknown',
                grade: g.gradeLetter ||
                    (typeof g.totalScore === 'number'
                        ? this.scoreToLetter(g.totalScore)
                        : 'N/A'),
                percentage: typeof g.totalScore === 'number' ? g.totalScore : 0,
            })),
        };
        const curriculumInfo = activeAcademicYear
            ? {
                curriculumType: activeAcademicYear.curriculumType,
                academicYear: activeAcademicYear.name,
                periods: activeAcademicYear.terms.map((term) => ({
                    id: term.id,
                    name: term.name,
                    order: term.order,
                    percentageWeight: term.percentageWeight,
                    isLocked: term.isLocked,
                })),
            }
            : undefined;
        return {
            stats,
            alerts,
            quickActions,
            charts,
            metadata: {
                schoolId,
                academicYear: activeAcademicYearId,
                generatedAt: new Date(),
                curriculum: curriculumInfo,
            },
        };
    }
};
exports.StudentDashboardService = StudentDashboardService;
exports.StudentDashboardService = StudentDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentDashboardService);
//# sourceMappingURL=student.dashboard.service.js.map