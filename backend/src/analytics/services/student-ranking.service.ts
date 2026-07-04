import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RankingQueryDto, StudentRankingRow } from '../dto/analytics.dto';

@Injectable()
export class StudentRankingService {
  private readonly logger = new Logger(StudentRankingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStudentRankings(query: RankingQueryDto): Promise<{
    rankings: StudentRankingRow[];
    summary: { totalStudents: number; averageScore: number; topScore: number };
  }> {
    const { schoolId, academicYearId, termId, classId, subjectId, limit = 100 } = query;

    const where: any = { schoolId, status: 'APPROVED' };
    if (academicYearId) where.academicYear = academicYearId;
    if (termId) where.termId = termId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    const grades = await this.prisma.subjectGrade.findMany({
      where,
      select: {
        studentId: true,
        totalScore: true,
        gradePoint: true,
        subjectId: true,
        student: { select: { id: true, name: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });

    const studentMap = new Map<string, {
      name: string; code: string; className: string; sectionName: string;
      scores: number[]; totalPoints: number; subjects: Set<string>; latestGp: number | null;
    }>();

    for (const g of grades) {
      if (!studentMap.has(g.studentId)) {
        const profile = await this.prisma.studentProfile.findUnique({
          where: { userId: g.studentId },
          select: { studentCode: true, className: true, section: true },
        });
        studentMap.set(g.studentId, {
          name: g.student.name,
          code: profile?.studentCode || '',
          className: g.class?.name || profile?.className || '',
          sectionName: g.section?.name || profile?.section || '',
          scores: [],
          totalPoints: 0,
          subjects: new Set(),
          latestGp: null,
        });
      }
      const entry = studentMap.get(g.studentId)!;
      if (g.totalScore != null) entry.scores.push(g.totalScore);
      if (g.gradePoint != null) entry.latestGp = g.gradePoint;
      entry.subjects.add(g.subjectId);
    }

    const ranked: StudentRankingRow[] = Array.from(studentMap.entries())
      .map(([studentId, data]) => {
        const avg = data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 0;
        return {
          rank: 0,
          studentId,
          studentName: data.name,
          studentCode: data.code,
          className: data.className,
          sectionName: data.sectionName,
          averageScore: avg,
          gradePoint: data.latestGp,
          subjectsCount: data.subjects.size,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, limit)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    const allAvg = ranked.length > 0
      ? Math.round(ranked.reduce((sum, r) => sum + r.averageScore, 0) / ranked.length)
      : 0;

    return {
      rankings: ranked,
      summary: {
        totalStudents: ranked.length,
        averageScore: allAvg,
        topScore: ranked[0]?.averageScore || 0,
      },
    };
  }

  async getClassRankings(query: RankingQueryDto): Promise<any> {
    const { schoolId, academicYearId, termId } = query;

    const where: any = { schoolId, status: 'APPROVED' };
    if (academicYearId) where.academicYear = academicYearId;
    if (termId) where.termId = termId;

    const grades = await this.prisma.subjectGrade.findMany({
      where,
      select: {
        totalScore: true,
        classId: true,
        class: { select: { name: true } },
        studentId: true,
      },
    });

    const classMap = new Map<string, { className: string; totalScores: number[]; studentIds: Set<string> }>();
    for (const g of grades) {
      if (!classMap.has(g.classId)) {
        classMap.set(g.classId, { className: g.class?.name || '', totalScores: [], studentIds: new Set() });
      }
      const entry = classMap.get(g.classId)!;
      if (g.totalScore != null) entry.totalScores.push(g.totalScore);
      entry.studentIds.add(g.studentId);
    }

    return Array.from(classMap.entries())
      .map(([classId, data]) => ({
        classId,
        className: data.className,
        studentCount: data.studentIds.size,
        averageScore: data.totalScores.length > 0
          ? Math.round(data.totalScores.reduce((a, b) => a + b, 0) / data.totalScores.length)
          : 0,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);
  }

  async getStudentRankingHistory(studentId: string): Promise<any> {
    const grades = await this.prisma.subjectGrade.findMany({
      where: { studentId, status: 'APPROVED' },
      select: {
        totalScore: true,
        gradePoint: true,
        termId: true,
        academicYear: true,
        term: { select: { name: true, order: true } },
        subject: { select: { name: true, code: true } },
        class: { select: { name: true } },
      },
      orderBy: [{ academicYear: 'asc' }, { term: { order: 'asc' } }],
    });

    const history: Record<string, { term: string; average: number; gpa: number | null; subjects: any[] }> = {};
    for (const g of grades) {
      const key = `${g.academicYear}-T${g.term?.order || g.termId}`;
      if (!history[key]) history[key] = { term: key, average: 0, gpa: null, subjects: [] };
      history[key].subjects.push({
        name: g.subject.name,
        code: g.subject.code,
        score: g.totalScore,
        gradePoint: g.gradePoint,
      });
    }

    return Object.values(history).map((entry) => {
      const scores = entry.subjects.filter((s) => s.score != null).map((s) => s.score);
      const gps = entry.subjects.filter((s) => s.gradePoint != null).map((s) => s.gradePoint);
      return {
        ...entry,
        average: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        gpa: gps.length > 0 ? gps.reduce((a, b) => a + b, 0) / gps.length : null,
      };
    });
  }
}
