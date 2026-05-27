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
exports.TeacherDashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let TeacherDashboardService = class TeacherDashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboard(userId, schoolId) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const todaySlots = await this.prisma.timetableSlot.findMany({
            where: {
                teacherId: userId,
                dayOfWeek: dayOfWeek === 0 ? 7 : dayOfWeek,
            },
            include: {
                class: true,
                subject: true,
            },
        });
        const academicYear = await this.prisma.academicYear.findFirst({
            where: {
                schoolId,
                isActive: true,
            },
        });
        const teacherClassSubjects = await this.prisma.classSubject.findMany({
            where: {
                teacherId: userId,
                academicYear: academicYear?.id,
            },
            include: {
                class: true,
                section: true,
                subject: true,
            },
        });
        const explicitHomeroomClasses = await this.prisma.class.findMany({
            where: {
                homeroomTeacherId: userId,
                schoolId,
            },
        });
        const assignedClassIds = await this.prisma.classSubject.findMany({
            where: {
                teacherId: userId,
                academicYear: academicYear?.id,
            },
            select: {
                classId: true,
            },
        });
        const uniqueAssignedClassIds = [
            ...new Set(assignedClassIds.map((cs) => cs.classId)),
        ];
        const allHomeroomClassIds = new Set([
            ...explicitHomeroomClasses.map((c) => c.id),
            ...uniqueAssignedClassIds,
        ]);
        const homeroomClassesCount = allHomeroomClassIds.size;
        const attendanceTakenCount = await this.prisma.attendanceSession.count({
            where: {
                takenById: userId,
                date: {
                    gte: todayStart,
                    lte: todayEnd,
                },
            },
        });
        const todayAttendanceRecords = await this.prisma.attendanceRecord.findMany({
            where: {
                session: {
                    takenById: userId,
                    date: {
                        gte: todayStart,
                        lte: todayEnd,
                    },
                },
            },
        });
        const sessionsWithRecords = new Set(todayAttendanceRecords.map((r) => r.attendanceSessionId));
        const uniqueClassSections = new Set(teacherClassSubjects.map((cs) => `${cs.classId}-${cs.sectionId}`)).size;
        const pendingAttendance = Math.max(0, todaySlots.length - attendanceTakenCount);
        const examsToGrade = await this.prisma.exam.count({
            where: {
                date: { lte: today },
                results: { none: {} },
                schoolId,
                classId: { in: teacherClassSubjects.map((cs) => cs.classId) },
                subjectId: { in: teacherClassSubjects.map((cs) => cs.subjectId) },
            },
        });
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const upcomingExams = await this.prisma.exam.count({
            where: {
                date: {
                    gte: tomorrow,
                    lte: new Date(tomorrow.getTime() + 7 * 24 * 60 * 60 * 1000),
                },
                schoolId,
                classId: { in: teacherClassSubjects.map((cs) => cs.classId) },
            },
        });
        const alerts = [];
        if (pendingAttendance > 0) {
            alerts.push({
                message: `${pendingAttendance} class(es) missing attendance for today`,
                type: 'warning',
                priority: 'high',
                actionUrl: `/attendance`,
                actionLabel: 'Take Attendance',
            });
        }
        if (examsToGrade > 0) {
            alerts.push({
                message: `${examsToGrade} exam(s) need grading`,
                type: 'warning',
                priority: 'high',
                actionUrl: `/exams/grade`,
                actionLabel: 'Grade Exams',
            });
        }
        if (upcomingExams > 0) {
            alerts.push({
                message: `${upcomingExams} exam(s) scheduled in the next 7 days`,
                type: 'info',
                priority: 'medium',
                actionUrl: `/exams`,
                actionLabel: 'View Exams',
            });
        }
        for (const homeroom of explicitHomeroomClasses.slice(0, 3)) {
            alerts.push({
                message: `You are homeroom teacher for ${homeroom.name}`,
                type: 'info',
                priority: 'low',
                actionUrl: `/class/${homeroom.id}`,
                actionLabel: 'View Class',
            });
        }
        const quickActions = [
            {
                label: 'Take Attendance',
                icon: 'attendance',
                url: '/attendance',
                permission: 'attendance:take',
                disabled: false,
            },
            {
                label: 'Enter Marks',
                icon: 'result',
                url: '/results/entry',
                permission: 'exam:grade',
                disabled: false,
            },
            {
                label: 'View Timetable',
                icon: 'calendar',
                url: '/timetable',
                permission: 'timetable:view',
                disabled: false,
            },
            {
                label: 'Class Resources',
                icon: 'lesson',
                url: '/resources',
                permission: 'resource:view',
                disabled: false,
            },
        ];
        const weeklyClasses = [];
        for (let i = 1; i <= 7; i++) {
            const daySlots = await this.prisma.timetableSlot.count({
                where: {
                    teacherId: userId,
                    dayOfWeek: i,
                },
            });
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i - 1];
            weeklyClasses.push({ day: dayName, classes: daySlots });
        }
        const classStudentCounts = await Promise.all(teacherClassSubjects.slice(0, 6).map(async (cs) => {
            const className = cs.class?.name;
            const sectionName = cs.section?.name;
            const possibleClassNames = [
                className,
                className?.replace('Grade ', ''),
                className ? `Grade ${className.replace('Grade ', '')}` : null,
            ].filter(Boolean);
            const possibleSections = [
                sectionName,
                sectionName?.toUpperCase(),
                sectionName?.toLowerCase(),
            ].filter(Boolean);
            const count = await this.prisma.studentProfile.count({
                where: {
                    schoolId,
                    enrollmentStatus: 'APPROVED',
                    className: { in: possibleClassNames },
                    section: { in: possibleSections },
                },
            });
            return {
                name: `${cs.class?.name || 'Class'}-${cs.section?.name || 'Section'}`,
                students: count,
            };
        }));
        const monthlyAttendanceData = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            const total = await this.prisma.attendanceRecord.count({
                where: {
                    session: {
                        takenById: userId,
                        date: { gte: monthStart, lte: monthEnd },
                    },
                },
            });
            const present = await this.prisma.attendanceRecord.count({
                where: {
                    session: {
                        takenById: userId,
                        date: { gte: monthStart, lte: monthEnd },
                    },
                    status: 'PRESENT',
                },
            });
            monthlyAttendanceData.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
                rate: total > 0 ? Math.round((present / total) * 100) : 0,
            });
        }
        const charts = {
            weeklySchedule: {
                type: 'bar',
                title: 'Weekly Class Distribution',
                labels: weeklyClasses.map((d) => d.day),
                datasets: [
                    {
                        label: 'Classes',
                        data: weeklyClasses.map((d) => d.classes),
                        backgroundColor: '#3b82f6',
                    },
                ],
            },
            classSizes: {
                type: 'bar',
                title: 'Students per Class',
                labels: classStudentCounts.map((c) => c.name),
                datasets: [
                    {
                        label: 'Students',
                        data: classStudentCounts.map((c) => c.students),
                        backgroundColor: '#10b981',
                    },
                ],
            },
            attendanceRate: {
                type: 'line',
                title: 'Attendance Rate Trend',
                labels: monthlyAttendanceData.map((m) => m.month),
                datasets: [
                    {
                        label: 'Attendance %',
                        data: monthlyAttendanceData.map((m) => m.rate),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    },
                ],
            },
            workload: {
                type: 'doughnut',
                title: 'Workload Overview',
                labels: [
                    'Classes Today',
                    'Exams to Grade',
                    'Pending Attendance',
                    'Homeroom Classes',
                ],
                datasets: [
                    {
                        label: 'Count',
                        data: [
                            todaySlots.length,
                            examsToGrade,
                            pendingAttendance,
                            homeroomClassesCount,
                        ],
                        backgroundColor: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'],
                    },
                ],
            },
        };
        const stats = {
            todayClasses: todaySlots.length,
            attendancePending: pendingAttendance,
            examsToGrade,
            upcomingExams,
            homeroomClasses: homeroomClassesCount,
        };
        return {
            stats,
            alerts,
            quickActions,
            charts,
            metadata: {
                schoolId,
                academicYear: academicYear?.name,
                generatedAt: new Date(),
            },
        };
    }
};
exports.TeacherDashboardService = TeacherDashboardService;
exports.TeacherDashboardService = TeacherDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeacherDashboardService);
//# sourceMappingURL=teacher.dashboard.service.js.map