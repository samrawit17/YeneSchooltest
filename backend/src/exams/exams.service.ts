import { HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExamDto,
  UpdateExamDto,
  BulkExamResultDto,
  GetExamsFilterDto,
} from './dto/exams.dto';
import { ExamType, Role } from '@prisma/client';
import { EventBusService } from '../core/events/event-bus.service';

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
  ) {}

  async createExam(schoolId: string, dto: CreateExamDto) {
    // Validate subject assignment or existence
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject || subject.schoolId !== schoolId) throw new LocalizedException('exams.subject_not_found_562e5a84', undefined, HttpStatus.NOT_FOUND, 'Subject not found');

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

    const exam = await this.prisma.exam.create({
      data,
    });

    void this.eventBus.emit('exam.created', {
      schoolId,
      examId: exam.id,
      classId: dto.classId,
      subjectId: dto.subjectId,
      type: dto.type,
      maxMarks: dto.maxMarks,
    });

    return exam;
  }

  async getExams(schoolId: string, query: GetExamsFilterDto) {
    const { classId, sectionId, subjectId, type, academicYearId } = query;
    const where: any = { schoolId };

    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (academicYearId) {
      where.class = { academicYearId };
    }

    return this.prisma.exam.findMany({
      where,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true, grade: true, academicYearId: true } },
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
        class: { select: { name: true, grade: true } },
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
    if (!exam) throw new LocalizedException('exams.exam_not_found_8661b89e', undefined, HttpStatus.NOT_FOUND, 'Exam not found');
    return exam;
  }

  async updateExam(schoolId: string, examId: string, dto: UpdateExamDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, schoolId },
    });
    if (!exam) throw new LocalizedException('exams.exam_not_found_8661b89e', undefined, HttpStatus.NOT_FOUND, 'Exam not found');

    const updateData: any = { ...dto };
    if (dto.date) updateData.date = new Date(dto.date);

    const updated = await this.prisma.exam.update({
      where: { id: examId },
      data: updateData,
    });

    void this.eventBus.emit('exam.updated', {
      schoolId,
      examId,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async deleteExam(schoolId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, schoolId },
    });
    if (!exam) throw new LocalizedException('exams.exam_not_found_8661b89e', undefined, HttpStatus.NOT_FOUND, 'Exam not found');

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
    if (!exam) throw new LocalizedException('exams.exam_not_found_8661b89e', undefined, HttpStatus.NOT_FOUND, 'Exam not found');

    // Check teacher assignment or admin role
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new LocalizedException('exams.user_not_found_b846d114', undefined, HttpStatus.NOT_FOUND, 'User not found');

    if (user.role === Role.TEACHER) {
      const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
        where: {
          teacherId: userId,
          classId: exam.classId,
          subjectId: exam.subjectId,
        },
      });
      if (!assignment) throw new LocalizedException('exams.not_assigned_to_this_class_subject_a9a91398', undefined, HttpStatus.FORBIDDEN, 'Not assigned to this class/subject');
    }

    const { results } = dto;
    const existingResultMap = new Map(
      exam.results.map((r) => [r.studentId, r.id]),
    );

    // Validate ALL results first before building operations
    for (const r of results) {
      if (r.marks > exam.maxMarks) {
        throw new BadRequestException(
          `Marks for student ${r.studentId} exceed max marks (${exam.maxMarks})`,
        );
      }
    }

    // Build operations after validation
    const operations = results.map((r) => {
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

    void this.eventBus.emit('exam.results.entered', {
      schoolId,
      examId,
      studentCount: results.length,
      enteredBy: userId,
    });

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

  // ==================== PUBLISH RESULTS ====================
  async publishTermResults(
    schoolId: string,
    body: { academicYear: string; termId: string; classId: string },
  ) {
    // 1. Verify term belongs to school
    const term = await this.prisma.term.findFirst({
      where: { id: body.termId, academicYear: { schoolId } },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!term) throw new LocalizedException('exams.term_not_found_f9401991', undefined, HttpStatus.NOT_FOUND, 'Term not found');

    // 2. Lock all exams for this term/class
    const exams = await this.prisma.exam.findMany({
      where: {
        schoolId,
        classId: body.classId,
        date: {
          gte: term.startDate,
          lte: term.endDate,
        },
      },
    });

    if (exams.length === 0) throw new LocalizedException('exams.no_exams_found_for_this_class_19e6da5c', undefined, HttpStatus.NOT_FOUND, 'No exams found for this class');

    // 3. Update published to true
    await this.prisma.exam.updateMany({
      where: {
        schoolId,
        classId: body.classId,
        date: {
          gte: term.startDate,
          lte: term.endDate,
        },
      },
      data: { published: true },
    });

    void this.eventBus.emit('exam.results.published', {
      schoolId,
      classId: body.classId,
      termId: body.termId,
      examCount: exams.length,
    });

    return {
      success: true,
      message: `Results published for ${exams.length} exam(s). Grades are now locked.`,
    };
  }

  // ==================== PARENT-CHILD VERIFICATION ====================
  async verifyParentChild(parentId: string, childId: string, schoolId: string) {
    const link = await this.prisma.parentStudent.findFirst({
      where: {
        parentId,
        studentId: childId,
        schoolId,
      },
    });
    if (!link) throw new LocalizedException('exams.you_are_not_linked_to_this_student_49797e72', undefined, HttpStatus.FORBIDDEN, 'You are not linked to this student');
    return link;
  }
}
