import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExamDto,
  UpdateExamDto,
  BulkExamResultDto,
  ExamResultEntryDto,
} from './dto/exams.dto';
import { ExamType, Role } from '@prisma/client';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async createExam(schoolId: string, dto: CreateExamDto) {
    // Validate subject assignment or existence
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject || subject.schoolId !== schoolId) {
      throw new NotFoundException('Subject not found');
    }

    const data: any = {
      schoolId,
      classId: dto.classId,
      subjectId: dto.subjectId,
      type: dto.type,
      title: dto.title,
      date: new Date(dto.date),
      maxMarks: dto.maxMarks,
      weightage: dto.weightage ?? 1,
      description: dto.description,
    };

    if (dto.sectionId) {
      data.sectionId = dto.sectionId;
    }

    return this.prisma.exam.create({
      data,
    });
  }

  async getExams(schoolId: string, query: any) {
    const { classId, sectionId, subjectId, type } = query;
    const where: any = { schoolId };

    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;

    return this.prisma.exam.findMany({
      where,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true, academicYearId: true } },
        section: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getExamById(schoolId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, schoolId },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
        results: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                studentProfile: { select: { rollNumber: true } },
              },
            },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async updateExam(schoolId: string, examId: string, dto: UpdateExamDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, schoolId },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    const updateData: any = { ...dto };
    if (dto.date) updateData.date = new Date(dto.date);

    return this.prisma.exam.update({
      where: { id: examId },
      data: updateData,
    });
  }

  async deleteExam(schoolId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, schoolId },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    return this.prisma.exam.delete({ where: { id: examId } });
  }

  // Teacher specific
  async getTeacherExams(
    teacherId: string,
    schoolId: string,
    filters?: { academicYearId?: string; termId?: string },
  ) {
    const { academicYearId, termId } = filters || {};

    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    let assignmentYearFilter = academicYearId;

    if (termId) {
      const term = await this.prisma.term.findUnique({
        where: { id: termId },
        select: {
          id: true,
          academicYearId: true,
          startDate: true,
          endDate: true,
          academicYear: {
            select: {
              schoolId: true,
            },
          },
        },
      });

      if (term && term.academicYear.schoolId === schoolId) {
        assignmentYearFilter = term.academicYearId;
        dateFilter = { gte: term.startDate, lte: term.endDate };
      }
    } else if (academicYearId) {
      const academicYear = await this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: {
          id: true,
          schoolId: true,
          startDate: true,
          endDate: true,
        },
      });

      if (academicYear && academicYear.schoolId === schoolId) {
        dateFilter = { gte: academicYear.startDate, lte: academicYear.endDate };
      }
    }

    // Find subjects taught by teacher
    const assignmentWhere = {
      teacherId,
      schoolId,
      isActive: true,
      ...(assignmentYearFilter && { academicYear: assignmentYearFilter }),
    };

    let assignments = await this.prisma.teacherSubjectAssignment.findMany({
      where: assignmentWhere,
    });

    if (!assignments.length && assignmentYearFilter) {
      assignments = await this.prisma.teacherSubjectAssignment.findMany({
        where: {
          teacherId,
          schoolId,
          isActive: true,
        },
      });
    }

    if (!assignments.length) return [];

    const criteriaMap = new Map<
      string,
      { classId: string; subjectId: string }
    >();
    for (const assignment of assignments) {
      const key = `${assignment.classId}:${assignment.subjectId}`;
      if (!criteriaMap.has(key)) {
        criteriaMap.set(key, {
          classId: assignment.classId,
          subjectId: assignment.subjectId,
        });
      }
    }

    const criteria = Array.from(criteriaMap.values());

    const exams = await this.prisma.exam.findMany({
      where: {
        schoolId,
        OR: criteria,
        ...(dateFilter && { date: dateFilter }),
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true, academicYearId: true } },
        section: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    return exams.map((exam) => {
      // Set status based on date
      let status = 'SCHEDULED';
      const now = new Date();
      if (exam.date < now) {
        status = 'COMPLETED';
      } else if (exam.date.toDateString() === now.toDateString()) {
        status = 'IN_PROGRESS';
      }

      return {
        id: exam.id,
        title: exam.title,
        subject: exam.subject.name,
        subjectId: exam.subjectId,
        classId: exam.classId,
        sectionId: exam.sectionId,
        academicYearId: exam.class.academicYearId,
        className: exam.class.name,
        sectionName: exam.section?.name || null,
        examDate: exam.date.toISOString(),
        startTime: exam.date.toTimeString().substring(0, 5),
        endTime: new Date(exam.date.getTime() + 2 * 60 * 60 * 1000)
          .toTimeString()
          .substring(0, 5),
        status,
        type: exam.type,
        totalMarks: exam.maxMarks,
        description: exam.description,
      };
    });
  }

  async enterExamResults(
    userId: string,
    schoolId: string,
    examId: string,
    dto: BulkExamResultDto,
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, schoolId },
      include: { results: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    // Check teacher assignment or admin role
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.TEACHER) {
      const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
        where: {
          teacherId: userId,
          classId: exam.classId,
          subjectId: exam.subjectId,
        },
      });
      if (!assignment)
        throw new ForbiddenException('Not assigned to this class/subject');
    }

    const { results } = dto;
    const existingResultMap = new Map(
      exam.results.map((r) => [r.studentId, r.id]),
    );

    const operations = results.map((r) => {
      if (r.marks > exam.maxMarks) {
        throw new BadRequestException(
          `Marks cannot exceed maximum marks (${exam.maxMarks})`,
        );
      }

      const existingId = existingResultMap.get(r.studentId);
      if (existingId) {
        return this.prisma.examResult.update({
          where: { id: existingId },
          data: { marks: r.marks, grade: r.grade, remarks: r.remarks },
        });
      } else {
        return this.prisma.examResult.create({
          data: {
            examId,
            studentId: r.studentId,
            marks: r.marks,
            grade: r.grade,
            remarks: r.remarks,
          },
        });
      }
    });

    await this.prisma.$transaction(operations);
    return { success: true, message: 'Results updated successfully' };
  }

  // Student specific
  async getStudentExams(studentId: string, schoolId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, schoolId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!enrollment) return [];

    const studentClass = await this.prisma.studentClass.findFirst({
      where: { studentId, schoolId, academicYear: enrollment.academicYear },
    });
    if (!studentClass) return [];

    return this.prisma.exam.findMany({
      where: {
        schoolId,
        classId: studentClass.classId,
        ...(studentClass.sectionId && { sectionId: studentClass.sectionId }),
        date: { gte: new Date() }, // Upcoming exams
      },
      include: { subject: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });
  }

  async getStudentResults(studentId: string, schoolId: string) {
    const results = await this.prisma.examResult.findMany({
      where: { studentId, exam: { schoolId } },
      include: {
        exam: {
          include: { subject: { select: { name: true } } },
        },
      },
      orderBy: { exam: { date: 'desc' } },
    });

    return results;
  }

  // Get form data for Create Assessment form
  async getFormData(schoolId: string, academicYearId?: string) {
    // Get all classes for the school
    const classes = await this.prisma.class.findMany({
      where: {
        schoolId,
        ...(academicYearId && { academicYearId }),
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
      },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    });

    // Get all subjects for the school
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get all sections for the school
    const sections = await this.prisma.section.findMany({
      where: {
        class: { schoolId },
        ...(academicYearId && { class: { academicYearId } }),
      },
      select: {
        id: true,
        name: true,
        classId: true,
        class: {
          select: {
            name: true,
            grade: true,
          },
        },
      },
      orderBy: [{ class: { grade: 'asc' } }, { name: 'asc' }],
    });

    return {
      classes,
      subjects,
      sections,
    };
  }
}
