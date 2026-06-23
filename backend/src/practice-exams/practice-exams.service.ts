import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PracticeExamAttemptStatus, PracticeExamOption, PracticeExamQuestionType, PracticeExamStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AnswerInput = {
  questionId: string;
  selectedOption?: PracticeExamOption | null;
  textAnswer?: string | null;
  isFlagged?: boolean;
};

const allowedOptions = new Set(['A', 'B', 'C', 'D']);
const allowedQuestionTypes = new Set(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']);
const adminRoles = new Set(['ADMIN', 'REGISTRAR', 'IT_MANAGER', 'SUPER_ADMIN']);
const gradeSystemRanges: Record<string, { min: number; max: number }> = {
  KG_TO_12: { min: 0, max: 12 },
  'KG-12': { min: 0, max: 12 },
  'K-12': { min: 0, max: 12 },
  'PRE-K-12': { min: -1, max: 12 },
  '1-12': { min: 1, max: 12 },
  '1-10': { min: 1, max: 10 },
  '1-8': { min: 1, max: 8 },
  '1-5': { min: 1, max: 5 },
  '9-12': { min: 9, max: 12 },
};

@Injectable()
export class PracticeExamsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeGrade(value: any) {
    const grade = Number(value);
    if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
      throw new BadRequestException('Practice exam grade must be between 1 and 12');
    }
    return grade;
  }

  private async assertGradeAllowedForSchool(schoolId: string, grade: number) {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'grade_system' } },
      select: { value: true },
    });
    const range = gradeSystemRanges[String(setting?.value || '1-12')] || gradeSystemRanges['1-12'];
    const min = Math.max(1, range.min);
    if (grade < min || grade > range.max) {
      throw new BadRequestException(`Grade ${grade} is not available in this school's grade system`);
    }
  }

  private normalizeStream(value: any, grade: number) {
    if (![11, 12].includes(grade)) return null;
    const stream = String(value || '').trim().toUpperCase();
    if (!['NATURAL', 'SOCIAL'].includes(stream)) {
      throw new BadRequestException(`Grade ${grade} practice exams require stream NATURAL or SOCIAL`);
    }
    return stream;
  }

  private normalizeStatus(value: any): PracticeExamStatus {
    const status = String(value || 'DRAFT').trim().toUpperCase();
    if (!['DRAFT', 'READY', 'ACTIVE', 'ARCHIVED'].includes(status)) {
      throw new BadRequestException('Exam status must be DRAFT, READY, ACTIVE, or ARCHIVED');
    }
    return status as PracticeExamStatus;
  }

  private normalizeAccessCode(value: any) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  private generateAccessCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let index = 0; index < 6; index += 1) {
      code += alphabet[randomInt(alphabet.length)];
    }
    return code;
  }

  private isAdminRole(role?: string) {
    return adminRoles.has(String(role || '').toUpperCase());
  }

  private async assertTeacherAssignment(schoolId: string, teacherId: string, body: any) {
    const classId = String(body.classId || '').trim();
    const sectionId = String(body.sectionId || '').trim();
    const subjectId = String(body.subjectId || '').trim();
    if (!classId || !sectionId || !subjectId) {
      throw new BadRequestException('Class, section, and subject are required');
    }
    const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
      where: { schoolId, teacherId, classId, sectionId, subjectId, isActive: true },
      include: { class: true, section: true, subject: true },
    });
    if (!assignment) {
      throw new ForbiddenException('You can only create exams for your assigned classes and subjects');
    }
    return assignment;
  }

  private async assertCanManageExam(schoolId: string, examId: string, userId?: string, role?: string, include: any = {}) {
    const where: any = { id: examId, schoolId };
    if (!this.isAdminRole(role)) where.createdById = userId;
    const exam = await this.prisma.practiceExam.findFirst({ where, include });
    if (!exam) throw new NotFoundException('Practice exam not found');
    return exam;
  }

  private async assertExamCanBeActivated(schoolId: string, examId: string) {
    const activeQuestions = await this.prisma.practiceExamQuestion.count({
      where: { schoolId, examId, isActive: true },
    });
    if (activeQuestions === 0) {
      throw new BadRequestException('Add at least one active question before activating this online exam');
    }
  }

  private async assertQuestionBankEditable(schoolId: string, examId: string, userId?: string, role?: string) {
    const exam = await this.assertCanManageExam(schoolId, examId, userId, role, {
      _count: { select: { attempts: true } },
    });
    if (exam.status === 'ACTIVE') {
      throw new BadRequestException('Question changes are locked while the online exam is active');
    }
    if (((exam as any)._count?.attempts || 0) > 0) {
      throw new BadRequestException('Question changes are locked after students start this online exam');
    }
    return exam;
  }

  private normalizeOption(value: any): PracticeExamOption {
    const option = String(value || '').trim().toUpperCase();
    if (!allowedOptions.has(option)) {
      throw new BadRequestException('Correct option must be A, B, C, or D');
    }
    return option as PracticeExamOption;
  }

  private normalizeQuestionType(value: any): PracticeExamQuestionType {
    const type = String(value || 'MCQ').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (!allowedQuestionTypes.has(type)) {
      throw new BadRequestException('Question type must be MCQ, TRUE_FALSE, or SHORT_ANSWER');
    }
    return type as PracticeExamQuestionType;
  }

  private normalizeTextAnswer(value: any) {
    return String(value || '').trim();
  }

  private isTextAnswerCorrect(answer: string | null | undefined, correctText: string | null | undefined, caseSensitive = false) {
    const normalize = (value: string) => this.normalizeTextAnswer(value).replace(/\s+/g, ' ');
    const submitted = normalize(String(answer || ''));
    const acceptedAnswers = String(correctText || '')
      .split('|')
      .map((value) => normalize(value))
      .filter(Boolean);
    if (!submitted || !acceptedAnswers.length) return null;
    return acceptedAnswers.some((expected) =>
      caseSensitive
        ? submitted === expected
        : submitted.toLocaleLowerCase() === expected.toLocaleLowerCase(),
    );
  }

  private isAnswerCorrect(question: any, answer: any) {
    if (!answer) return null;
    if (question.questionType === 'SHORT_ANSWER') {
      return this.isTextAnswerCorrect(answer.textAnswer, question.correctText, question.caseSensitive);
    }
    return answer.selectedOption ? answer.selectedOption === question.correctOption : null;
  }

  private isAnswerProvided(question: any, answer: any) {
    if (!answer) return false;
    if (question.questionType === 'SHORT_ANSWER') {
      return !!this.normalizeTextAnswer(answer.textAnswer);
    }
    return !!answer.selectedOption;
  }

  private ensureQuestionPayload(body: any) {
    const subject = String(body.subject || '').trim();
    const questionText = String(body.questionText || body.question || '').trim();
    const questionType = this.normalizeQuestionType(body.questionType || body.question_type || body.type);
    let optionA = String(body.optionA || body.option_a || '').trim();
    let optionB = String(body.optionB || body.option_b || '').trim();
    let optionC = String(body.optionC || body.option_c || '').trim();
    let optionD = String(body.optionD || body.option_d || '').trim();
    let correctOption: PracticeExamOption | null = null;
    let correctText: string | null = null;

    if (!subject || !questionText) {
      throw new BadRequestException('Subject and question are required');
    }

    if (questionType === 'MCQ') {
      if (!optionA || !optionB || !optionC || !optionD) {
        throw new BadRequestException('Multiple choice questions require all A/B/C/D options');
      }
      correctOption = this.normalizeOption(body.correctOption || body.correct_option || body.correctAnswer || body.correct_answer);
    } else if (questionType === 'TRUE_FALSE') {
      optionA = optionA || 'True';
      optionB = optionB || 'False';
      optionC = '';
      optionD = '';
      const rawCorrect = String(body.correctOption || body.correct_option || body.correctAnswer || body.correct_answer || '').trim().toUpperCase();
      correctOption = rawCorrect === 'TRUE' ? 'A' : rawCorrect === 'FALSE' ? 'B' : this.normalizeOption(rawCorrect);
      if (!['A', 'B'].includes(correctOption)) {
        throw new BadRequestException('True/false correct answer must be True or False');
      }
    } else {
      correctText = this.normalizeTextAnswer(body.correctText || body.correct_text || body.correctAnswer || body.correct_answer);
      optionA = '';
      optionB = '';
      optionC = '';
      optionD = '';
      if (!correctText) {
        throw new BadRequestException('Short answer questions require a correct answer');
      }
    }
    return {
      subject,
      questionType,
      questionText,
      optionA: optionA || null,
      optionB: optionB || null,
      optionC: optionC || null,
      optionD: optionD || null,
      correctOption,
      correctText,
      caseSensitive: body.caseSensitive === true || body.case_sensitive === true || String(body.caseSensitive || body.case_sensitive || '').toLowerCase() === 'true',
      order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
      isActive: body.isActive !== false,
    };
  }

  async listAdmin(schoolId: string, query: any, userId?: string, role?: string) {
    const where: any = { schoolId };
    if (!this.isAdminRole(role)) where.createdById = userId;
    if (query.grade) where.grade = Number(query.grade);
    if (query.status) where.status = String(query.status).toUpperCase();
    if (query.academicYearId) where.academicYearId = query.academicYearId;
    return this.prisma.practiceExam.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listTeacherSubmissions(schoolId: string, userId: string, role?: string, query: any = {}) {
    const where: any = {
      schoolId,
      status: { in: ['SUBMITTED', 'EXPIRED'] },
    };
    if (query.examId) where.examId = String(query.examId);

    let assignments: { classId: string; sectionId: string; subjectId: string; subject?: { name: string } }[] = [];
    let inferredSubjectNames = new Set<string>();
    if (!this.isAdminRole(role)) {
      assignments = await this.prisma.teacherSubjectAssignment.findMany({
        where: { schoolId, teacherId: userId, isActive: true },
        select: { classId: true, sectionId: true, subjectId: true, subject: { select: { name: true } } },
      });
      const teacher = await this.prisma.user.findFirst({
        where: { id: userId, schoolId },
        select: { name: true, username: true },
      });
      const teacherLabel = `${teacher?.name || ''} ${teacher?.username || ''}`.toUpperCase();
      const subjects = await this.prisma.subject.findMany({
        where: { schoolId, isActive: true },
        select: { name: true },
      });
      inferredSubjectNames = new Set(
        subjects
          .map((subject) => String(subject.name || '').trim().toUpperCase())
          .filter((subjectName) => subjectName && teacherLabel.includes(subjectName)),
      );
      if (!assignments.length && !inferredSubjectNames.size) return [];
    }

    let attempts = await this.prisma.practiceExamAttempt.findMany({
      where,
      include: {
        exam: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            questions: { where: { isActive: true }, select: { subject: true } },
            _count: { select: { questions: true } },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            username: true,
            studentProfile: { select: { studentCode: true, className: true, section: true, stream: true, rollNumber: true } },
            studentClasses: {
              select: { classId: true, sectionId: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    if (!this.isAdminRole(role)) {
      const normalizedAssignments = assignments.map((assignment) => ({
        ...assignment,
        subjectName: String(assignment.subject?.name || '').trim().toUpperCase(),
      }));
      attempts = attempts.filter((attempt) => {
        const studentClass = attempt.student.studentClasses[0];
        const questionSubjects = new Set(
          attempt.exam.questions.map((question) => String(question.subject || '').trim().toUpperCase()).filter(Boolean),
        );
        const legacyTeacherSubjectMatch =
          !attempt.exam.classId &&
          !attempt.exam.sectionId &&
          !attempt.exam.subjectId &&
          [...inferredSubjectNames].some((subjectName) => questionSubjects.has(subjectName));
        if (!normalizedAssignments.length) {
          return legacyTeacherSubjectMatch;
        }
        const assignmentMatch = normalizedAssignments.some((assignment) => {
          const exactExamMatch =
            attempt.exam.classId === assignment.classId &&
            attempt.exam.sectionId === assignment.sectionId &&
            attempt.exam.subjectId === assignment.subjectId;
          const legacyStudentMatch =
            !attempt.exam.classId &&
            !attempt.exam.sectionId &&
            !attempt.exam.subjectId &&
            studentClass?.classId === assignment.classId &&
            studentClass?.sectionId === assignment.sectionId &&
            questionSubjects.has(assignment.subjectName);
          return exactExamMatch || legacyStudentMatch;
        });
        return assignmentMatch || legacyTeacherSubjectMatch;
      });
    }

    const classIds = [
      ...new Set(attempts.flatMap((attempt) => [attempt.exam.classId, attempt.student.studentClasses[0]?.classId]).filter(Boolean)),
    ] as string[];
    const sectionIds = [
      ...new Set(attempts.flatMap((attempt) => [attempt.exam.sectionId, attempt.student.studentClasses[0]?.sectionId]).filter(Boolean)),
    ] as string[];
    const [classes, sections] = await Promise.all([
      classIds.length
        ? this.prisma.class.findMany({ where: { id: { in: classIds }, schoolId }, select: { id: true, name: true, grade: true } })
        : [],
      sectionIds.length
        ? this.prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, name: true, stream: true } })
        : [],
    ]);
    const classById = new Map(classes.map((item) => [item.id, item] as const));
    const sectionById = new Map(sections.map((item) => [item.id, item] as const));

    return attempts.map((attempt) => ({
      ...attempt,
      exam: {
        ...attempt.exam,
        questions: undefined,
        class: classById.get(attempt.exam.classId || attempt.student.studentClasses[0]?.classId || '') || null,
        section: sectionById.get(attempt.exam.sectionId || attempt.student.studentClasses[0]?.sectionId || '') || null,
      },
      student: { ...attempt.student, studentClasses: undefined },
    }));
  }

  async createExam(schoolId: string, createdById: string, body: any, role?: string) {
    const teacherAssignment = this.isAdminRole(role) ? null : await this.assertTeacherAssignment(schoolId, createdById, body);
    const grade = teacherAssignment?.class.grade ?? this.normalizeGrade(body.grade);
    await this.assertGradeAllowedForSchool(schoolId, grade);
    const stream = teacherAssignment ? this.normalizeStream(teacherAssignment.section.stream, grade) : this.normalizeStream(body.stream, grade);
    const title = String(body.title || '').trim();
    if (!title) throw new BadRequestException('Exam title is required');
    const status = this.normalizeStatus(body.status);
    if (status === 'ACTIVE') {
      throw new BadRequestException('Create the online exam as draft or ready, add questions, then activate it');
    }
    const classId = teacherAssignment?.classId || body.classId || null;
    let academicYearId: string | null = null;
    if (classId) {
      const examClass = await this.prisma.class.findUnique({
        where: { id: classId },
        select: { academicYearId: true },
      });
      academicYearId = examClass?.academicYearId || null;
    }
    return this.prisma.practiceExam.create({
      data: {
        schoolId,
        academicYearId,
        createdById,
        title,
        description: body.description || null,
        grade,
        stream,
        classId,
        sectionId: teacherAssignment?.sectionId || body.sectionId || null,
        subjectId: teacherAssignment?.subjectId || body.subjectId || null,
        accessCode: this.normalizeAccessCode(body.accessCode) || this.generateAccessCode(),
        durationMinutes: Math.max(1, Number(body.durationMinutes) || 60),
        passMark: Math.min(100, Math.max(0, Number(body.passMark) || 50)),
        status,
        shuffleQuestions: body.shuffleQuestions !== false,
      },
    });
  }

  async getAdminExam(schoolId: string, examId: string, userId?: string, role?: string) {
    const exam = await this.assertCanManageExam(schoolId, examId, userId, role, {
        subject: { select: { id: true, name: true, code: true } },
        questions: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
        _count: { select: { attempts: true } },
    });
    return exam;
  }

  async updateExam(schoolId: string, examId: string, body: any, userId?: string, role?: string) {
    const existing = await this.assertCanManageExam(schoolId, examId, userId, role, {
      _count: { select: { attempts: true } },
    });
    const grade = body.grade !== undefined ? this.normalizeGrade(body.grade) : existing.grade;
    await this.assertGradeAllowedForSchool(schoolId, grade);
    const status = body.status !== undefined ? this.normalizeStatus(body.status) : undefined;
    if (!this.isAdminRole(role) && status === 'ACTIVE') {
      throw new ForbiddenException('Only admins can make an online exam active');
    }
    const lockedFieldUpdate = ['grade', 'stream', 'accessCode', 'durationMinutes', 'passMark', 'shuffleQuestions'].some((field) =>
      Object.prototype.hasOwnProperty.call(body, field),
    );
    if (lockedFieldUpdate && (existing.status === 'ACTIVE' || ((existing as any)._count?.attempts || 0) > 0)) {
      throw new BadRequestException('Exam setup fields are locked once the online exam is active or students have started');
    }
    if (status === 'ACTIVE') {
      await this.assertExamCanBeActivated(schoolId, examId);
    }
    return this.prisma.practiceExam.update({
      where: { id: examId },
      data: {
        ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.grade !== undefined ? { grade } : {}),
        ...(body.stream !== undefined || body.grade !== undefined ? { stream: this.normalizeStream(body.stream ?? existing.stream, grade) } : {}),
        ...(body.accessCode !== undefined ? { accessCode: this.normalizeAccessCode(body.accessCode) || this.generateAccessCode() } : {}),
        ...(body.durationMinutes !== undefined ? { durationMinutes: Math.max(1, Number(body.durationMinutes) || 60) } : {}),
        ...(body.passMark !== undefined ? { passMark: Math.min(100, Math.max(0, Number(body.passMark) || 50)) } : {}),
        ...(status ? { status } : {}),
        ...(body.shuffleQuestions !== undefined ? { shuffleQuestions: !!body.shuffleQuestions } : {}),
      },
    });
  }

  async deleteExam(schoolId: string, examId: string, userId?: string, role?: string) {
    const exam = await this.assertCanManageExam(schoolId, examId, userId, role, {
      _count: { select: { attempts: true } },
    });
    if (((exam as any)._count?.attempts || 0) > 0) {
      throw new BadRequestException('Online exams with student attempts cannot be deleted. Archive it instead.');
    }
    await this.prisma.practiceExam.delete({ where: { id: examId } });
    return { message: 'Practice exam deleted' };
  }

  async addQuestion(schoolId: string, examId: string, body: any, userId?: string, role?: string) {
    await this.assertQuestionBankEditable(schoolId, examId, userId, role);
    return this.prisma.practiceExamQuestion.create({
      data: {
        schoolId,
        examId,
        ...this.ensureQuestionPayload(body),
      },
    });
  }

  async updateQuestion(schoolId: string, examId: string, questionId: string, body: any, userId?: string, role?: string) {
    await this.assertQuestionBankEditable(schoolId, examId, userId, role);
    const question = await this.prisma.practiceExamQuestion.findFirst({ where: { id: questionId, examId, schoolId } });
    if (!question) throw new NotFoundException('Question not found');
    return this.prisma.practiceExamQuestion.update({
      where: { id: questionId },
      data: this.ensureQuestionPayload({ ...question, ...body }),
    });
  }

  async deleteQuestion(schoolId: string, examId: string, questionId: string, userId?: string, role?: string) {
    await this.assertQuestionBankEditable(schoolId, examId, userId, role);
    const question = await this.prisma.practiceExamQuestion.findFirst({ where: { id: questionId, examId, schoolId } });
    if (!question) throw new NotFoundException('Question not found');
    await this.prisma.practiceExamQuestion.delete({ where: { id: questionId } });
    return { message: 'Question deleted' };
  }

  private parseCsvLine(line: string) {
    const values: string[] = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  async importQuestions(schoolId: string, examId: string, csv: string, userId?: string, role?: string) {
    await this.assertQuestionBankEditable(schoolId, examId, userId, role);
    const lines = csv.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must include a header and at least one question');
    const headers = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const rows = lines.slice(1);
    const created: any[] = [];
    const failed: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        const values = this.parseCsvLine(rows[i]);
        const record: any = {};
        headers.forEach((header, index) => (record[header] = values[index]));
        const question = await this.addQuestion(schoolId, examId, record, userId, role);
        created.push(question);
      } catch (error: any) {
        failed.push({ row: i + 2, error: error.message });
      }
    }
    return { createdCount: created.length, failedCount: failed.length, failed };
  }

  async listAvailableForStudent(schoolId: string, studentId: string) {
    const profile = await this.prisma.studentProfile.findFirst({ where: { userId: studentId, schoolId } });
    const grade = this.extractGrade(profile?.className);
    if (!grade) return [];
    const stream = String(profile?.stream || '').trim().toUpperCase();
    const streamFilter = [11, 12].includes(grade) ? { OR: [{ stream: null }, { stream }] } : { stream: null };
    const studentClass = await this.prisma.studentClass.findFirst({
      where: { studentId, schoolId },
      orderBy: { createdAt: 'desc' },
    });
    const targetFilter = studentClass
      ? {
          OR: [
            { classId: null, sectionId: null },
            {
              classId: studentClass.classId,
              OR: [{ sectionId: null }, { sectionId: studentClass.sectionId }],
            },
          ],
        }
      : { classId: null, sectionId: null };
    return this.prisma.practiceExam.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        grade,
        ...streamFilter,
        ...targetFilter,
      },
      select: {
        id: true,
        title: true,
        description: true,
        grade: true,
        stream: true,
        classId: true,
        sectionId: true,
        subjectId: true,
        createdById: true,
        durationMinutes: true,
        passMark: true,
        status: true,
        shuffleQuestions: true,
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { questions: true } },
        attempts: { where: { studentId }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private extractGrade(value?: string | null) {
    const match = String(value || '').match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  private async assertExamAvailableForStudent(schoolId: string, studentId: string, exam: any) {
    const profile = await this.prisma.studentProfile.findFirst({ where: { userId: studentId, schoolId } });
    const grade = this.extractGrade(profile?.className);
    if (!grade || grade !== exam.grade) throw new NotFoundException('Active practice exam not found');
    if ([11, 12].includes(grade)) {
      const stream = String(profile?.stream || '').trim().toUpperCase();
      if (exam.stream && exam.stream !== stream) throw new NotFoundException('Active practice exam not found');
    } else if (exam.stream) {
      throw new NotFoundException('Active practice exam not found');
    }
    if (exam.classId || exam.sectionId) {
      const studentClass = await this.prisma.studentClass.findFirst({
        where: { studentId, schoolId },
        orderBy: { createdAt: 'desc' },
      });
      if (!studentClass) throw new NotFoundException('Active practice exam not found');
      if (exam.classId && exam.classId !== studentClass.classId) throw new NotFoundException('Active practice exam not found');
      if (exam.sectionId && exam.sectionId !== studentClass.sectionId) throw new NotFoundException('Active practice exam not found');
    }
  }

  async startAttempt(schoolId: string, studentId: string, examId: string, accessCode: any) {
    const exam = await this.prisma.practiceExam.findFirst({
      where: { id: examId, schoolId, status: 'ACTIVE' },
      include: { questions: { where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!exam) throw new NotFoundException('Active practice exam not found');
    await this.assertExamAvailableForStudent(schoolId, studentId, exam);
    if (exam.questions.length === 0) throw new BadRequestException('This exam has no active questions');
    if (this.normalizeAccessCode(accessCode) !== exam.accessCode) {
      throw new ForbiddenException('Invalid exam access code');
    }
    const existing = await this.prisma.practiceExamAttempt.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });
    if (existing) return this.getAttemptForStudent(schoolId, studentId, existing.id);
    const expiresAt = new Date(Date.now() + exam.durationMinutes * 60_000);
    const attempt = await this.prisma.practiceExamAttempt.create({
      data: { examId, schoolId, studentId, expiresAt },
    });
    return this.getAttemptForStudent(schoolId, studentId, attempt.id);
  }

  async getAttemptForStudent(schoolId: string, studentId: string, attemptId: string) {
    let attempt = await this.prisma.practiceExamAttempt.findFirst({
      where: { id: attemptId, schoolId, studentId },
      include: {
        exam: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            questions: { where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
          },
        },
        answers: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (this.isAttemptExpired(attempt)) {
      attempt = await this.finalizeAttempt(attempt, [], 'EXPIRED', false);
    }
    const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    const questions = [...attempt.exam.questions];
    if (attempt.exam.shuffleQuestions) {
      questions.sort((a, b) => a.id.localeCompare(b.id));
    }
    return {
      ...attempt,
      questions: questions.map((question) => ({
        id: question.id,
        subject: question.subject,
        questionText: question.questionText,
        questionType: question.questionType,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctText: attempt.status === 'IN_PROGRESS' ? undefined : question.correctText,
        caseSensitive: question.caseSensitive,
        selectedOption: answerMap.get(question.id)?.selectedOption || null,
        textAnswer: answerMap.get(question.id)?.textAnswer || null,
        isFlagged: answerMap.get(question.id)?.isFlagged || false,
        ...(attempt.status === 'IN_PROGRESS' ? {} : { correctOption: question.correctOption, isCorrect: answerMap.get(question.id)?.isCorrect ?? null }),
      })),
    };
  }

  async autosave(schoolId: string, studentId: string, attemptId: string, answers: AnswerInput[]) {
    const attempt = await this.ensureOpenAttempt(schoolId, studentId, attemptId);
    await this.saveAnswers(attempt, answers, false);
    return { message: 'Saved', savedCount: answers.length };
  }

  private async ensureOpenAttempt(schoolId: string, studentId: string, attemptId: string) {
    const attempt = await this.prisma.practiceExamAttempt.findFirst({
      where: { id: attemptId, schoolId, studentId },
      include: { exam: { include: { questions: { where: { isActive: true } } } } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'IN_PROGRESS') return this.getAttemptForStudent(schoolId, studentId, attemptId);
    if (this.isAttemptExpired(attempt)) {
      await this.finalizeAttempt(attempt, [], 'EXPIRED', false);
      throw new BadRequestException('Exam time is up');
    }
    return attempt;
  }

  private isAttemptExpired(attempt: { status: PracticeExamAttemptStatus; expiresAt: Date }) {
    return attempt.status === 'IN_PROGRESS' && new Date() >= attempt.expiresAt;
  }

  private async saveAnswers(attempt: any, answers: AnswerInput[], gradeNow: boolean) {
    const questionIds = new Set(attempt.exam.questions.map((q: any) => q.id));
    for (const answer of answers) {
      if (!questionIds.has(answer.questionId)) continue;
      const selectedOption = answer.selectedOption ? this.normalizeOption(answer.selectedOption) : null;
      const textAnswer = answer.textAnswer !== undefined && answer.textAnswer !== null ? this.normalizeTextAnswer(answer.textAnswer) : null;
      const question = attempt.exam.questions.find((q: any) => q.id === answer.questionId);
      const answerForGrading = { selectedOption, textAnswer };
      await this.prisma.practiceExamAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: answer.questionId } },
        create: {
          attemptId: attempt.id,
          examId: attempt.examId,
          schoolId: attempt.schoolId,
          studentId: attempt.studentId,
          questionId: answer.questionId,
          selectedOption,
          textAnswer,
          isFlagged: !!answer.isFlagged,
          isCorrect: gradeNow ? this.isAnswerCorrect(question, answerForGrading) : null,
        },
        update: {
          selectedOption,
          textAnswer,
          isFlagged: !!answer.isFlagged,
          ...(gradeNow ? { isCorrect: this.isAnswerCorrect(question, answerForGrading) } : {}),
        },
      });
    }
  }

  async submitAttempt(schoolId: string, studentId: string, attemptId: string, answers: AnswerInput[]) {
    const attempt = await this.prisma.practiceExamAttempt.findFirst({
      where: { id: attemptId, schoolId, studentId },
      include: { exam: { include: { questions: { where: { isActive: true } } } } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Attempt is already submitted');
    const status = new Date() >= attempt.expiresAt ? 'EXPIRED' : 'SUBMITTED';
    await this.finalizeAttempt(attempt, answers, status, true);
    return this.getAttemptForStudent(schoolId, studentId, attemptId);
  }

  private async finalizeAttempt(attempt: any, answers: AnswerInput[], status: PracticeExamAttemptStatus, saveIncomingAnswers: boolean) {
    if (saveIncomingAnswers) {
      await this.saveAnswers(attempt, answers, true);
    } else {
      await this.gradeSavedAnswers(attempt);
    }
    const saved = await this.prisma.practiceExamAnswer.findMany({ where: { attemptId: attempt.id } });
    const answerMap = new Map(saved.map((answer) => [answer.questionId, answer]));
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    for (const question of attempt.exam.questions) {
      const answer = answerMap.get(question.id);
      const provided = this.isAnswerProvided(question, answer);
      const correct = this.isAnswerCorrect(question, answer);
      if (!provided) skippedCount++;
      else if (correct === true) correctCount++;
      else wrongCount++;
    }
    const total = attempt.exam.questions.length;
    const percentage = total ? Math.round((correctCount / total) * 1000) / 10 : 0;
    await this.prisma.practiceExamAttempt.update({
      where: { id: attempt.id },
      data: {
        status,
        submittedAt: new Date(),
        score: correctCount,
        percentage,
        correctCount,
        wrongCount,
        skippedCount,
      },
    });
    return this.prisma.practiceExamAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      include: {
        exam: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            questions: { where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
          },
        },
        answers: true,
      },
    });
  }

  private async gradeSavedAnswers(attempt: any) {
    const saved = await this.prisma.practiceExamAnswer.findMany({ where: { attemptId: attempt.id } });
    const questionById = new Map(attempt.exam.questions.map((question: any) => [question.id, question]));
    for (const answer of saved) {
      const question = questionById.get(answer.questionId) as any;
      if (!question) continue;
      await this.prisma.practiceExamAnswer.update({
        where: { id: answer.id },
        data: { isCorrect: this.isAnswerCorrect(question, answer) },
      });
    }
  }

  async getExamResults(schoolId: string, examId: string, userId?: string, role?: string) {
    await this.assertCanManageExam(schoolId, examId, userId, role);
    return this.prisma.practiceExamAttempt.findMany({
      where: { schoolId, examId, status: { in: ['SUBMITTED', 'EXPIRED'] } },
      include: { student: { select: { id: true, name: true, username: true } } },
      orderBy: [{ percentage: 'desc' }, { submittedAt: 'asc' }],
    });
  }
}
