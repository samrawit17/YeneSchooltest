import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getComprehensiveProfile(studentId: string, schoolId?: string) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, ...(schoolId ? { schoolId } : {}) },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!profile) return null;

    const [grades, attendance, discipline, fees] = await Promise.all([
      this.getRecentGrades(profile.id, profile.schoolId),
      this.getAttendanceSummary(profile.id, profile.schoolId),
      this.getDisciplineIncidents(profile.id, profile.schoolId),
      this.getFeeStatus(profile.id, profile.schoolId),
    ]);

    return {
      student: {
        id: profile.id,
        name: profile.user?.name || 'Unknown',
        email: profile.user?.email,
        phone: profile.user?.phone,
        code: profile.studentCode,
        studentId: profile.studentId,
        class: profile.className,
        section: profile.section,
        grade: profile.className,
        gender: profile.gender,
        enrollmentStatus: profile.enrollmentStatus,
      },
      grades,
      attendance,
      discipline,
      fees,
    };
  }

  async getRiskyStudents(schoolId: string, studentId?: string) {
    const where: any = { schoolId };
    if (studentId) where.id = studentId;

    const students = await this.prisma.studentProfile.findMany({
      where,
      include: { user: { select: { name: true } } },
    });

    const results: Array<{
      studentId: string;
      studentName: string;
      riskFactors: string[];
      attendanceRate?: number;
      gradeAverage?: number;
      disciplineCount?: number;
    }> = [];

    for (const student of students) {
      const factors: string[] = [];

      const [attendance, discipline, grades] = await Promise.all([
        this.getAttendanceSummary(student.id, schoolId),
        this.getDisciplineIncidents(student.id, schoolId),
        this.getRecentGrades(student.id, schoolId),
      ]);

      if (attendance) {
        const rate = attendance.percentage;
        if (rate < 70) factors.push(`Critical attendance rate: ${rate}%`);
        else if (rate < 85) factors.push(`Low attendance rate: ${rate}%`);
      }

      if (discipline && discipline.total > 0) {
        const critical = discipline.incidents.filter(
          (i: any) => i.severity === 'HIGH' || i.severity === 'CRITICAL',
        ).length;
        if (critical > 0) factors.push(`${critical} high-severity discipline incident(s)`);
        else factors.push(`${discipline.total} discipline incident(s)`);
      }

      const failingSubjects = (grades || []).filter((g: any) => {
        const pct = parseFloat(g.percentage) || 0;
        return pct < 50;
      });
      if (failingSubjects.length >= 3) {
        factors.push(`Failing ${failingSubjects.length} subjects`);
      } else if (failingSubjects.length > 0) {
        factors.push(`Below-pass in ${failingSubjects.map((g: any) => g.subject).join(', ')}`);
      }

      if (factors.length > 0) {
        results.push({
          studentId: student.id,
          studentName: student.user?.name || 'Unknown',
          riskFactors: factors,
          attendanceRate: attendance?.percentage,
          gradeAverage: grades?.length
            ? grades.reduce((s: number, g: any) => s + (parseFloat(g.percentage) || 0), 0) / grades.length
            : undefined,
          disciplineCount: discipline?.total,
        });
      }
    }

    return results.sort(
      (a, b) => b.riskFactors.length - a.riskFactors.length,
    );
  }

  private async getRecentGrades(studentProfileId: string, schoolId: string) {
    const grades = await this.prisma.subjectGrade.findMany({
      where: { studentId: studentProfileId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { subject: { select: { name: true } } },
    });
    return grades.map((g) => ({
      subject: g.subject?.name || 'Unknown',
      term: g.termId,
      marks: g.totalScore,
      percentage: g.totalScore && g.subjectId ? g.totalScore.toString() : 'N/A',
      grade: g.gradeLetter,
    }));
  }

  private async getAttendanceSummary(studentProfileId: string, schoolId: string) {
    const records = await this.prisma.attendance.findMany({
      where: { studentId: studentProfileId },
      select: { status: true },
    });

    if (records.length === 0) return null;

    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, late, percentage };
  }

  private async getDisciplineIncidents(studentProfileId: string, schoolId: string) {
    const incidents = await this.prisma.disciplineIncident.findMany({
      where: { studentId: studentProfileId },
      orderBy: { incidentDate: 'desc' },
      take: 10,
    });

    return {
      total: incidents.length,
      incidents: incidents.map((i) => ({
        date: i.incidentDate,
        severity: i.severity,
        title: i.title,
        status: i.status,
      })),
    };
  }

  private async getFeeStatus(studentProfileId: string, schoolId: string) {
    const fees = await this.prisma.studentFee.findMany({
      where: { studentId: studentProfileId },
      select: { status: true, finalAmount: true, dueDate: true },
    });

    const overdue = fees.filter((f) => f.status === 'OVERDUE').length;
    const pending = fees.filter((f) => f.status === 'PENDING').length;
    const totalDue = fees
      .filter((f) => f.status === 'PENDING' || f.status === 'OVERDUE')
      .reduce((sum, f) => sum + Number(f.finalAmount || 0), 0);

    return { overdue, pending, totalDue };
  }
}
