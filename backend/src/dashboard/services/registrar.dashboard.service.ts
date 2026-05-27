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
        enrollmentRequestsPending,
        enrollmentRequestsApproved,
        grade8Candidates,
        grade12Candidates,
        studentsWithDocuments,
        studentsWithoutDocuments,
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
        this.prisma.enrollmentRequest.count({
          where: { schoolId, status: 'PENDING' },
        }),
        this.prisma.enrollmentRequest.count({
          where: { schoolId, status: 'APPROVED' },
        }),
        this.prisma.studentClass.count({
          where: {
            schoolId,
            academicYear: academicYear?.name,
            class: { grade: 8 },
          },
        }),
        this.prisma.studentClass.count({
          where: {
            schoolId,
            academicYear: academicYear?.name,
            class: { grade: 12 },
          },
        }),
        this.prisma.studentProfile.count({
          where: {
            schoolId,
            documents: { not: null },
          },
        }),
        this.prisma.studentProfile.count({
          where: {
            schoolId,
            OR: [{ documents: null }, { documents: '' }],
          },
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
        where: {
          schoolId,
          ...(academicYear ? { academicYearId: academicYear.id } : {}),
        },
        include: {
          sections: {
            include: {
              homeroomTeacher: { select: { id: true, name: true } },
              _count: { select: { studentClasses: true } },
            },
          },
        },
        orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      });

      const classStudentData = studentsPerClass.map((c) => ({
        name: c.section ? `${c.name}${c.section}` : c.name,
        sections: c.sections.length,
        students: c.sections.reduce(
          (sum, s) => sum + s._count.studentClasses,
          0,
        ),
        capacity: c.sections.reduce((sum, s) => sum + (s.capacity || 0), 0),
      }));

      const sectionCapacityData = studentsPerClass.flatMap((c) =>
        c.sections.map((section) => {
          const enrolled = section._count.studentClasses;
          const capacity = section.capacity || 0;
          const occupancy =
            capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
          return {
            className: c.name,
            sectionName: section.name,
            label: `${c.name}-${section.name}`,
            enrolled,
            capacity,
            available: Math.max(capacity - enrolled, 0),
            occupancy,
            homeroomTeacher: section.homeroomTeacher?.name || null,
            needsHomeroomTeacher: !section.homeroomTeacherId,
          };
        }),
      );

      const nearCapacitySections = sectionCapacityData.filter(
        (section) => section.capacity > 0 && section.occupancy >= 90,
      );
      const fullSections = sectionCapacityData.filter(
        (section) => section.capacity > 0 && section.enrolled >= section.capacity,
      );
      const sectionsWithoutHomeroom = sectionCapacityData.filter(
        (section) => section.needsHomeroomTeacher,
      );

      const attendanceWindowStart = new Date(today);
      attendanceWindowStart.setDate(attendanceWindowStart.getDate() - 30);
      const attendanceRiskRows = await this.prisma.attendance.groupBy({
        by: ['studentId'],
        where: {
          schoolId,
          date: { gte: attendanceWindowStart, lte: todayEnd },
          status: { in: ['ABSENT', 'LATE', 'HALF_DAY'] },
        },
        _count: { id: true },
      });
      const dropoutRiskStudents = attendanceRiskRows.filter(
        (row) => row._count.id >= 5,
      ).length;

      const missingAttendanceSessions = await this.prisma.attendanceSession.count({
        where: {
          schoolId,
          date: { gte: attendanceWindowStart, lte: todayEnd },
          status: 'NOT_SUBMITTED',
        },
      });

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
          actionUrl: '/admin/enrollment',
          actionLabel: 'Review',
        });
      }

      if (enrollmentRequestsPending > 0) {
        alerts.push({
          message: `${enrollmentRequestsPending} online enrollment request(s) waiting for registrar review`,
          type: 'warning',
          priority: 'high',
          actionUrl: '/admin/enrollment',
          actionLabel: 'Review requests',
        });
      }

      if (fullSections.length > 0) {
        alerts.push({
          message: `${fullSections.length} section(s) are at or above capacity`,
          type: 'error',
          priority: 'high',
          actionUrl: '/admin/class-sections',
          actionLabel: 'Manage capacity',
        });
      } else if (nearCapacitySections.length > 0) {
        alerts.push({
          message: `${nearCapacitySections.length} section(s) are near MoE capacity limits`,
          type: 'warning',
          priority: 'medium',
          actionUrl: '/admin/class-sections',
          actionLabel: 'Review capacity',
        });
      }

      if (dropoutRiskStudents > 0) {
        alerts.push({
          message: `${dropoutRiskStudents} student(s) have repeated absence or lateness in the last 30 days`,
          type: 'warning',
          priority: 'high',
          actionUrl: '/admin/attendance',
          actionLabel: 'Review attendance',
        });
      }

      if (sectionsWithoutHomeroom.length > 0) {
        alerts.push({
          message: `${sectionsWithoutHomeroom.length} section(s) do not have a homeroom teacher assigned`,
          type: 'info',
          priority: 'medium',
          actionUrl: '/admin/class-sections',
          actionLabel: 'Assign homeroom',
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
          url: '/admin/enrollment',
          permission: 'student:approve_enrollment',
          disabled: pendingEnrollments + enrollmentRequestsPending === 0,
        },
        {
          label: 'Register Student',
          icon: 'student',
          url: '/admin/enrollment',
          permission: 'student:create',
          disabled: false,
        },
        {
          label: 'Class & Sections',
          icon: 'class',
          url: '/admin/class-sections',
          permission: 'class:create',
          disabled: false,
        },
        {
          label: 'Report Cards',
          icon: 'report',
          url: '/admin/report-cards',
          permission: 'student:read',
          disabled: false,
        },
        {
          label: 'Promotion Decisions',
          icon: 'promotion',
          url: '/admin/promotion',
          permission: 'student:read',
          disabled: false,
        },
        {
          label: 'Credentials',
          icon: 'credential',
          url: '/admin/credentials',
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
              data: classStudentData.slice(0, 12).map((c) => c.students),
              backgroundColor: '#3b82f6',
            },
            {
              label: 'Capacity',
              data: classStudentData.slice(0, 12).map((c) => c.capacity),
              backgroundColor: '#d1d5db',
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
          labels: sectionCapacityData.slice(0, 12).map((c) => c.label),
          datasets: [
            {
              label: 'Occupancy %',
              data: sectionCapacityData.slice(0, 12).map((c) => c.occupancy),
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
        pendingApplications: pendingEnrollments + enrollmentRequestsPending,
        enrollmentRequestsPending,
        enrollmentRequestsApproved,
        grade8Candidates,
        grade12Candidates,
        nationalExamCandidates: grade8Candidates + grade12Candidates,
        studentsWithDocuments,
        studentsWithoutDocuments,
        dropoutRiskStudents,
        missingAttendanceSessions,
        nearCapacitySections: nearCapacitySections.length,
        fullSections: fullSections.length,
        sectionsWithoutHomeroom: sectionsWithoutHomeroom.length,
        classOccupancy:
          sectionCapacityData.length > 0
            ? `${Math.round(
                sectionCapacityData.reduce(
                  (sum, section) => sum + section.occupancy,
                  0,
                ) / sectionCapacityData.length,
              )}%`
            : '0%',
        enrollmentRate:
          totalStudents > 0
            ? Math.round((activeStudents / totalStudents) * 100)
            : 0,
        academicYear: academicYear?.name,
        capacityOverview: sectionCapacityData,
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
