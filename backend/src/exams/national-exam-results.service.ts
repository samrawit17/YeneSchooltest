import { HttpStatus, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import {
  NationalExamBatchStatus,
  NationalExamResultStatus,
  NationalExamSource,
  NationalExamType,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImportNationalExamResultsDto } from './dto/national-exam-results.dto';

const EXAM_PASS_MARK: Record<NationalExamType, number> = {
  GRADE_6_REGIONAL: 50,
  GRADE_8_REGIONAL: 50,
  GRADE_12_ESLCE: 50,
};

@Injectable()
export class NationalExamResultsService {
  constructor(private prisma: PrismaService) {}

  async listBatches(schoolId: string) {
    return this.prisma.nationalExamResultBatch.findMany({
      where: { schoolId },
      include: {
        importedBy: { select: { id: true, name: true } },
        _count: { select: { results: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBatch(schoolId: string, batchId: string) {
    const batch = await this.prisma.nationalExamResultBatch.findFirst({
      where: { id: batchId, schoolId },
      include: {
        importedBy: { select: { id: true, name: true } },
        results: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                username: true,
                studentProfile: {
                  select: {
                    studentId: true,
                    studentCode: true,
                    rollNumber: true,
                    className: true,
                    section: true,
                  },
                },
              },
            },
            subjects: { orderBy: { subjectName: 'asc' } },
          },
          orderBy: [{ grade: 'asc' }, { studentName: 'asc' }],
        },
      },
    });
    if (!batch) throw new LocalizedException('exams.national_exam_result_batch_not_found_b3b6afc6', undefined, HttpStatus.NOT_FOUND, 'National exam result batch not found');
    return batch;
  }

  async importResults(schoolId: string, importedById: string, dto: ImportNationalExamResultsDto) {
    if (!dto.rows?.length) throw new LocalizedException('exams.at_least_one_result_row_is_required_a3c907c2', undefined, undefined, 'At least one result row is required');

    const expectedGrade = this.getExpectedGrade(dto.examType);
    const invalidGrade = dto.rows.find((row) => Number(row.grade) !== expectedGrade);
    if (invalidGrade) {
      throw new BadRequestException(
        `${dto.examType} imports can only contain Grade ${expectedGrade} results`,
      );
    }

    const duplicates = this.findDuplicates(dto.rows.map((row) => row.candidateNumber.trim()));
    if (duplicates.length) throw new LocalizedException('exams.duplicate_candidate_numbers_duplicates_join_e0629656', undefined, undefined, '`Duplicate candidate numbers: ${duplicates.join(\', \'');

    const candidates = dto.rows.map((row) => row.candidateNumber.trim()).filter(Boolean);
    const students = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: Role.STUDENT,
        OR: [
          { username: { in: candidates } },
          { studentProfile: { studentId: { in: candidates } } },
          { studentProfile: { studentCode: { in: candidates } } },
          { studentProfile: { rollNumber: { in: candidates } } },
        ],
      },
      select: {
        id: true,
        username: true,
        studentProfile: {
          select: { studentId: true, studentCode: true, rollNumber: true },
        },
      },
    });

    const studentByCandidate = new Map<string, string>();
    for (const student of students) {
      const keys = [
        student.username,
        student.studentProfile?.studentId,
        student.studentProfile?.studentCode,
        student.studentProfile?.rollNumber,
      ].filter(Boolean) as string[];
      for (const key of keys) {
        if (!studentByCandidate.has(key)) studentByCandidate.set(key, student.id);
      }
    }

    const batch = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.nationalExamResultBatch.create({
        data: {
          schoolId,
          academicYearId: dto.academicYearId || null,
          examType: dto.examType,
          examYear: dto.examYear,
          source: dto.source || NationalExamSource.REGIONAL_BUREAU,
          fileName: dto.fileName,
          cutoffScore: dto.cutoffScore,
          importedById,
          status: NationalExamBatchStatus.IMPORTED,
        },
      });

      for (const row of dto.rows) {
        const candidateNumber = row.candidateNumber.trim();
        const totalScore = this.resolveTotal(row);
        const averageScore = row.subjects.length ? totalScore / row.subjects.length : totalScore;
        const status = this.resolveStatus(row.status, totalScore, dto.examType);
        const cutoffEligible =
          dto.examType === NationalExamType.GRADE_12_ESLCE && dto.cutoffScore !== undefined
            ? totalScore >= dto.cutoffScore
            : null;

        await tx.nationalExamResult.create({
          data: {
            batchId: batch.id,
            schoolId,
            studentId: studentByCandidate.get(candidateNumber) || null,
            candidateNumber,
            studentName: row.studentName.trim(),
            grade: Number(row.grade),
            stream: row.stream?.trim() || null,
            totalScore,
            averageScore,
            status,
            cutoffEligible,
            remarks: row.remarks,
            rawData: JSON.stringify(row),
            subjects: {
              create: row.subjects.map((subject) => ({
                subjectName: subject.subjectName.trim(),
                score: Number(subject.score),
                gradeLetter: subject.gradeLetter,
              })),
            },
          },
        });
      }

      return batch;
    });

    return this.getBatch(schoolId, batch.id);
  }

  async publishBatch(schoolId: string, batchId: string) {
    const batch = await this.prisma.nationalExamResultBatch.findFirst({
      where: { id: batchId, schoolId },
    });
    if (!batch) throw new LocalizedException('exams.national_exam_result_batch_not_found_b3b6afc6', undefined, HttpStatus.NOT_FOUND, 'National exam result batch not found');

    return this.prisma.nationalExamResultBatch.update({
      where: { id: batchId },
      data: {
        status: NationalExamBatchStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async getPublishedForStudent(schoolId: string, studentId: string) {
    return this.prisma.nationalExamResult.findMany({
      where: {
        schoolId,
        studentId,
        batch: { status: NationalExamBatchStatus.PUBLISHED },
      },
      include: {
        batch: true,
        subjects: { orderBy: { subjectName: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getExpectedGrade(examType: NationalExamType) {
    if (examType === NationalExamType.GRADE_6_REGIONAL) return 6;
    if (examType === NationalExamType.GRADE_8_REGIONAL) return 8;
    return 12;
  }

  private findDuplicates(values: string[]) {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) duplicates.add(value);
      seen.add(value);
    }
    return Array.from(duplicates);
  }

  private resolveTotal(row: { totalScore?: number; subjects: { score: number }[] }) {
    if (row.totalScore !== undefined && row.totalScore !== null) return Number(row.totalScore);
    return row.subjects.reduce((sum, subject) => sum + Number(subject.score || 0), 0);
  }

  private resolveStatus(status: string | undefined, totalScore: number, examType: NationalExamType) {
    const normalized = status?.trim().toUpperCase();
    if (normalized && normalized in NationalExamResultStatus) {
      return normalized as NationalExamResultStatus;
    }
    return totalScore >= EXAM_PASS_MARK[examType]
      ? NationalExamResultStatus.PASS
      : NationalExamResultStatus.FAIL;
  }
}
