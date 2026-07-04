import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ReportQueryDto, PaginatedReportResponse, StudentDemographicsRow } from '../dto/reports.dto';

@Injectable()
export class StudentReportService {
  private readonly logger = new Logger(StudentReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDemographicsReport(query: ReportQueryDto): Promise<PaginatedReportResponse<StudentDemographicsRow>> {
    const { schoolId, classId, studentId } = query;
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { studentProfile: { schoolId } };
    if (studentId) where.id = studentId;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { ...where, role: 'STUDENT' },
        select: {
          id: true, name: true,
          studentProfile: {
            select: {
              studentCode: true, gender: true, enrollmentStatus: true, academicYear: true,
              className: true, section: true,
              parents: { select: { parent: { select: { user: { select: { name: true, phone: true } } } } } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where: { ...where, role: 'STUDENT' } }),
    ]);

    const data: StudentDemographicsRow[] = users.map((u) => {
      const profile = u.studentProfile;
      const primaryParent = profile?.parents?.find((pp) => pp.parent?.user)?.parent?.user;
      return {
        studentId: u.id,
        studentName: u.name,
        studentCode: profile?.studentCode || '',
        gender: profile?.gender || null,
        className: profile?.className || '',
        sectionName: profile?.section || '',
        enrollmentStatus: profile?.enrollmentStatus || '',
        academicYear: profile?.academicYear || '',
        parentName: primaryParent?.name || null,
        parentPhone: primaryParent?.phone || null,
      };
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getEnrollmentTrends(query: ReportQueryDto): Promise<any> {
    const { schoolId, from, to } = query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const users = await this.prisma.user.findMany({
      where: { schoolId, role: 'STUDENT', createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const trends: Record<string, number> = {};
    for (const u of users) {
      const month = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
      trends[month] = (trends[month] || 0) + 1;
    }

    return Object.entries(trends).map(([period, count]) => ({ period, count }));
  }

  async getStudentDetail(studentId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true, name: true, email: true, phone: true, username: true, isActive: true, createdAt: true,
        studentProfile: {
          select: {
            studentCode: true, studentId: true, gender: true, enrollmentStatus: true,
            academicYear: true, className: true, section: true,
            parents: {
              select: {
                relation: true, isPrimary: true,
                parent: { select: { user: { select: { name: true, phone: true, email: true } } } },
              },
            },
            disciplinaryRecords: {
              select: { id: true, incidentDate: true, severity: true, status: true, title: true, description: true },
              orderBy: { incidentDate: 'desc' },
              take: 10,
            },
          },
        },
        enrollments: {
          select: { status: true, academicYear: true, grade: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return user;
  }
}
