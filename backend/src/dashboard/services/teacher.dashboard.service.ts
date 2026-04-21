import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UniversalDashboardResponseDto } from '../dto/dashboard-response.dto';

@Injectable()
export class TeacherDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(
    userId: string,
    schoolId: string,
  ): Promise<UniversalDashboardResponseDto> {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Get teacher's timetable slots for today
    const todaySlots = await this.prisma.timetableSlot.findMany({
      where: {
        teacherId: userId,
        dayOfWeek: dayOfWeek === 0 ? 7 : dayOfWeek,
      } as any,
      include: {
        class: true,
        subject: true,
      },
    });

    // Get active academic year
    const academicYear = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true,
      },
    });

    // Get teacher's class subjects
    const teacherClassSubjects = await this.prisma.classSubject.findMany({
      where: {
        teacherId: userId,
        academicYear: academicYear?.id,
      } as any,
      include: {
        class: true,
        section: true,
        subject: true,
      },
    });

    // Get classes where teacher is homeroom teacher (explicitly assigned)
    const explicitHomeroomClasses = await this.prisma.class.findMany({
      where: {
        homeroomTeacherId: userId,
        schoolId,
      } as any,
    });

    // Get unique classes where teacher is assigned via ClassSubject (treated as homeroom classes)
    const assignedClassIds = await this.prisma.classSubject.findMany({
      where: {
        teacherId: userId,
        academicYear: academicYear?.id,
      } as any,
      select: {
        classId: true,
      },
    });
    const uniqueAssignedClassIds = [
      ...new Set(assignedClassIds.map((cs: any) => cs.classId)),
    ];

    // Combine both: explicit homeroom classes + classes where teacher is assigned
    const allHomeroomClassIds = new Set([
      ...explicitHomeroomClasses.map((c: any) => c.id),
      ...uniqueAssignedClassIds,
    ]);
    const homeroomClassesCount = allHomeroomClassIds.size;

    // Get attendance taken by teacher today
    const attendanceTakenCount = await this.prisma.attendanceSession.count({
      where: {
        takenById: userId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Get attendance records for today
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

    // Calculate pending attendance (sessions without records)
    const sessionsWithRecords = new Set(
      todayAttendanceRecords.map((r) => r.attendanceSessionId),
    );
    const uniqueClassSections = new Set(
      teacherClassSubjects.map((cs: any) => `${cs.classId}-${cs.sectionId}`),
    ).size;

    const pendingAttendance = Math.max(
      0,
      todaySlots.length - attendanceTakenCount,
    );

    // Get exams conducted by this teacher that need grading
    const examsToGrade = await this.prisma.exam.count({
      where: {
        date: { lte: today },
        results: { none: {} },
        schoolId,
        classId: { in: teacherClassSubjects.map((cs: any) => cs.classId) },
        subjectId: { in: teacherClassSubjects.map((cs: any) => cs.subjectId) },
      },
    });

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get upcoming exams in next 7 days
    const upcomingExams = await this.prisma.exam.count({
      where: {
        date: {
          gte: tomorrow,
          lte: new Date(tomorrow.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        schoolId,
        classId: { in: teacherClassSubjects.map((cs: any) => cs.classId) },
      },
    });

    // Build alerts
    const alerts: any[] = [];

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

    // Get homeroom alerts
    for (const homeroom of explicitHomeroomClasses.slice(0, 3) as any[]) {
      alerts.push({
        message: `You are homeroom teacher for ${homeroom.name}`,
        type: 'info',
        priority: 'low',
        actionUrl: `/class/${homeroom.id}`,
        actionLabel: 'View Class',
      });
    }

    // Build quick actions
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

    // Get weekly schedule distribution
    const weeklyClasses: { day: string; classes: number }[] = [];
    for (let i = 1; i <= 7; i++) {
      const daySlots = await this.prisma.timetableSlot.count({
        where: {
          teacherId: userId,
          dayOfWeek: i,
        } as any,
      });
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i - 1];
      weeklyClasses.push({ day: dayName, classes: daySlots });
    }

    // Get class-wise student count for teacher's subjects
    const classStudentCounts = await Promise.all(
      teacherClassSubjects.slice(0, 6).map(async (cs: any) => {
        // Count students based on studentProfile className and section
        const className = cs.class?.name;
        const sectionName = cs.section?.name;

        // Try flexible matching for class names
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
      }),
    );

    // Get monthly attendance rate for teacher's classes
    const monthlyAttendanceData: { month: string; rate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(
        today.getFullYear(),
        today.getMonth() - i + 1,
        0,
      );

      // Get total records from attendance sessions taken by this teacher
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

    // Build charts data
    const charts: { [key: string]: any } = {
      weeklySchedule: {
        type: 'bar' as const,
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
        type: 'bar' as const,
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
        type: 'line' as const,
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
        type: 'doughnut' as const,
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

    // Stats
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
}
