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
var PracticeExamsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeExamsService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const schedule_1 = require("@nestjs/schedule");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const allowedOptions = new Set(['A', 'B', 'C', 'D']);
const allowedQuestionTypes = new Set(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']);
const adminRoles = new Set(['ADMIN', 'REGISTRAR', 'IT_MANAGER', 'SUPER_ADMIN']);
const gradeSystemRanges = {
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
let PracticeExamsService = PracticeExamsService_1 = class PracticeExamsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeGrade(value) {
        const grade = Number(value);
        if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
            throw new localization_1.LocalizedException('practice_exams.practice_exam_grade_must_be_between_1_and_12_a38c6477', undefined, undefined, 'Practice exam grade must be between 1 and 12');
        }
        return grade;
    }
    async assertGradeAllowedForSchool(schoolId, grade) {
        const setting = await this.prisma.schoolSetting.findUnique({
            where: { schoolId_key: { schoolId, key: 'grade_system' } },
            select: { value: true },
        });
        const range = gradeSystemRanges[String(setting?.value || '1-12')] || gradeSystemRanges['1-12'];
        const min = Math.max(1, range.min);
        if (grade < min || grade > range.max) {
            throw new localization_1.LocalizedException('practice_exams.grade_is_not_available_in_this_schools_grade_system_bb8e19de', undefined, undefined, 'Grade ${grade} is not available in this school\'s grade system');
        }
    }
    normalizeStream(value, grade) {
        if (![11, 12].includes(grade))
            return null;
        const stream = String(value || '').trim().toUpperCase();
        if (!['NATURAL', 'SOCIAL'].includes(stream)) {
            throw new localization_1.LocalizedException('practice_exams.grade_practice_exams_require_stream_natural_or_social_4bc931bf', undefined, undefined, 'Grade ${grade} practice exams require stream NATURAL or SOCIAL');
        }
        return stream;
    }
    normalizeStatus(value) {
        const status = String(value || 'DRAFT').trim().toUpperCase();
        if (!['DRAFT', 'READY', 'ACTIVE', 'ARCHIVED'].includes(status)) {
            throw new localization_1.LocalizedException('practice_exams.exam_status_must_be_draft_ready_active_or_archived_d8b03561', undefined, undefined, 'Exam status must be DRAFT, READY, ACTIVE, or ARCHIVED');
        }
        return status;
    }
    normalizeAccessCode(value) {
        return String(value || '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '');
    }
    generateAccessCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let index = 0; index < 6; index += 1) {
            code += alphabet[(0, crypto_1.randomInt)(alphabet.length)];
        }
        return code;
    }
    isAdminRole(role) {
        return adminRoles.has(String(role || '').toUpperCase());
    }
    async assertTeacherAssignment(schoolId, teacherId, body) {
        const classId = String(body.classId || '').trim();
        const sectionId = String(body.sectionId || '').trim();
        const subjectId = String(body.subjectId || '').trim();
        if (!classId || !sectionId || !subjectId) {
            throw new localization_1.LocalizedException('practice_exams.class_section_and_subject_are_required_9ba4beda', undefined, undefined, 'Class, section, and subject are required');
        }
        const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
            where: { schoolId, teacherId, classId, sectionId, subjectId, isActive: true },
            include: { class: true, section: true, subject: true },
        });
        if (!assignment) {
            throw new localization_1.LocalizedException('practice_exams.you_can_only_create_exams_for_your_assigned_classes_and_subj_5ca13439', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only create exams for your assigned classes and subjects');
        }
        return assignment;
    }
    async assertCanManageExam(schoolId, examId, userId, role, include = {}) {
        const where = { id: examId, schoolId };
        if (!this.isAdminRole(role))
            where.createdById = userId;
        const exam = await this.prisma.practiceExam.findFirst({ where, include });
        throw new localization_1.LocalizedException('practice_exams.practice_exam_not_found_e8d822b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Practice exam not found');
        return exam;
    }
    async assertExamCanBeActivated(schoolId, examId) {
        const activeQuestions = await this.prisma.practiceExamQuestion.count({
            where: { schoolId, examId, isActive: true },
        });
        if (activeQuestions === 0) {
            throw new localization_1.LocalizedException('practice_exams.add_at_least_one_active_question_before_activating_this_onli_cb506cd5', undefined, undefined, 'Add at least one active question before activating this online exam');
        }
    }
    async assertQuestionBankEditable(schoolId, examId, userId, role) {
        const exam = await this.assertCanManageExam(schoolId, examId, userId, role, {
            _count: { select: { attempts: true } },
        });
        if (exam.status === 'ACTIVE') {
            throw new localization_1.LocalizedException('practice_exams.question_changes_are_locked_while_the_online_exam_is_active_eb25afaf', undefined, undefined, 'Question changes are locked while the online exam is active');
        }
        if ((exam._count?.attempts || 0) > 0) {
            throw new localization_1.LocalizedException('practice_exams.question_changes_are_locked_after_students_start_this_online_15aca89e', undefined, undefined, 'Question changes are locked after students start this online exam');
        }
        return exam;
    }
    normalizeOption(value) {
        const option = String(value || '').trim().toUpperCase();
        if (!allowedOptions.has(option)) {
            throw new localization_1.LocalizedException('practice_exams.correct_option_must_be_a_b_c_or_d_9f846e73', undefined, undefined, 'Correct option must be A, B, C, or D');
        }
        return option;
    }
    normalizeQuestionType(value) {
        const type = String(value || 'MCQ').trim().toUpperCase().replace(/[\s-]+/g, '_');
        if (!allowedQuestionTypes.has(type)) {
            throw new localization_1.LocalizedException('practice_exams.question_type_must_be_mcq_true_false_or_short_answer_7d0817fb', undefined, undefined, 'Question type must be MCQ, TRUE_FALSE, or SHORT_ANSWER');
        }
        return type;
    }
    normalizeTextAnswer(value) {
        return String(value || '').trim();
    }
    isTextAnswerCorrect(answer, correctText, caseSensitive = false) {
        const normalize = (value) => this.normalizeTextAnswer(value).replace(/\s+/g, ' ');
        const submitted = normalize(String(answer || ''));
        const acceptedAnswers = String(correctText || '')
            .split('|')
            .map((value) => normalize(value))
            .filter(Boolean);
        if (!submitted || !acceptedAnswers.length)
            return null;
        return acceptedAnswers.some((expected) => caseSensitive
            ? submitted === expected
            : submitted.toLocaleLowerCase() === expected.toLocaleLowerCase());
    }
    isAnswerCorrect(question, answer) {
        if (!answer)
            return null;
        if (question.questionType === 'SHORT_ANSWER') {
            return this.isTextAnswerCorrect(answer.textAnswer, question.correctText, question.caseSensitive);
        }
        return answer.selectedOption ? answer.selectedOption === question.correctOption : null;
    }
    isAnswerProvided(question, answer) {
        if (!answer)
            return false;
        if (question.questionType === 'SHORT_ANSWER') {
            return !!this.normalizeTextAnswer(answer.textAnswer);
        }
        return !!answer.selectedOption;
    }
    ensureQuestionPayload(body) {
        const subject = String(body.subject || '').trim();
        const questionText = String(body.questionText || body.question || '').trim();
        const questionType = this.normalizeQuestionType(body.questionType || body.question_type || body.type);
        let optionA = String(body.optionA || body.option_a || '').trim();
        let optionB = String(body.optionB || body.option_b || '').trim();
        let optionC = String(body.optionC || body.option_c || '').trim();
        let optionD = String(body.optionD || body.option_d || '').trim();
        let correctOption = null;
        let correctText = null;
        if (!subject || !questionText) {
            throw new localization_1.LocalizedException('practice_exams.subject_and_question_are_required_5bfed71e', undefined, undefined, 'Subject and question are required');
        }
        if (questionType === 'MCQ') {
            if (!optionA || !optionB || !optionC || !optionD) {
                throw new localization_1.LocalizedException('practice_exams.multiple_choice_questions_require_all_a_b_c_d_options_867fc7d6', undefined, undefined, 'Multiple choice questions require all A/B/C/D options');
            }
            correctOption = this.normalizeOption(body.correctOption || body.correct_option || body.correctAnswer || body.correct_answer);
        }
        else if (questionType === 'TRUE_FALSE') {
            optionA = optionA || 'True';
            optionB = optionB || 'False';
            optionC = '';
            optionD = '';
            const rawCorrect = String(body.correctOption || body.correct_option || body.correctAnswer || body.correct_answer || '').trim().toUpperCase();
            correctOption = rawCorrect === 'TRUE' ? 'A' : rawCorrect === 'FALSE' ? 'B' : this.normalizeOption(rawCorrect);
            if (!['A', 'B'].includes(correctOption)) {
                throw new localization_1.LocalizedException('practice_exams.true_false_correct_answer_must_be_true_or_false_4f84edc2', undefined, undefined, 'True/false correct answer must be True or False');
            }
        }
        else {
            correctText = this.normalizeTextAnswer(body.correctText || body.correct_text || body.correctAnswer || body.correct_answer);
            optionA = '';
            optionB = '';
            optionC = '';
            optionD = '';
            if (!correctText) {
                throw new localization_1.LocalizedException('practice_exams.short_answer_questions_require_a_correct_answer_d3bce631', undefined, undefined, 'Short answer questions require a correct answer');
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
    async listAdmin(schoolId, query, userId, role) {
        const where = { schoolId };
        if (!this.isAdminRole(role))
            where.createdById = userId;
        if (query.grade)
            where.grade = Number(query.grade);
        if (query.status)
            where.status = String(query.status).toUpperCase();
        if (query.academicYearId)
            where.academicYearId = query.academicYearId;
        return this.prisma.practiceExam.findMany({
            where,
            include: {
                subject: { select: { id: true, name: true, code: true } },
                _count: { select: { questions: true, attempts: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async listTeacherSubmissions(schoolId, userId, role, query = {}) {
        const where = {
            schoolId,
            status: { in: ['SUBMITTED', 'EXPIRED'] },
        };
        if (query.examId)
            where.examId = String(query.examId);
        let assignments = [];
        let inferredSubjectNames = new Set();
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
            inferredSubjectNames = new Set(subjects
                .map((subject) => String(subject.name || '').trim().toUpperCase())
                .filter((subjectName) => subjectName && teacherLabel.includes(subjectName)));
            if (!assignments.length && !inferredSubjectNames.size)
                return [];
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
                const questionSubjects = new Set(attempt.exam.questions.map((question) => String(question.subject || '').trim().toUpperCase()).filter(Boolean));
                const legacyTeacherSubjectMatch = !attempt.exam.classId &&
                    !attempt.exam.sectionId &&
                    !attempt.exam.subjectId &&
                    [...inferredSubjectNames].some((subjectName) => questionSubjects.has(subjectName));
                if (!normalizedAssignments.length) {
                    return legacyTeacherSubjectMatch;
                }
                const assignmentMatch = normalizedAssignments.some((assignment) => {
                    const exactExamMatch = attempt.exam.classId === assignment.classId &&
                        attempt.exam.sectionId === assignment.sectionId &&
                        attempt.exam.subjectId === assignment.subjectId;
                    const legacyStudentMatch = !attempt.exam.classId &&
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
        ];
        const sectionIds = [
            ...new Set(attempts.flatMap((attempt) => [attempt.exam.sectionId, attempt.student.studentClasses[0]?.sectionId]).filter(Boolean)),
        ];
        const [classes, sections] = await Promise.all([
            classIds.length
                ? this.prisma.class.findMany({ where: { id: { in: classIds }, schoolId }, select: { id: true, name: true, grade: true } })
                : [],
            sectionIds.length
                ? this.prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, name: true, stream: true } })
                : [],
        ]);
        const classById = new Map(classes.map((item) => [item.id, item]));
        const sectionById = new Map(sections.map((item) => [item.id, item]));
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
    async createExam(schoolId, createdById, body, role) {
        const teacherAssignment = this.isAdminRole(role) ? null : await this.assertTeacherAssignment(schoolId, createdById, body);
        const grade = teacherAssignment?.class.grade ?? this.normalizeGrade(body.grade);
        await this.assertGradeAllowedForSchool(schoolId, grade);
        const stream = teacherAssignment ? this.normalizeStream(teacherAssignment.section.stream, grade) : this.normalizeStream(body.stream, grade);
        const title = String(body.title || '').trim();
        throw new localization_1.LocalizedException('practice_exams.exam_title_is_required_d2aef8ac', undefined, undefined, 'Exam title is required');
        const status = this.normalizeStatus(body.status);
        if (status === 'ACTIVE') {
            throw new localization_1.LocalizedException('practice_exams.create_the_online_exam_as_draft_or_ready_add_questions_then__56f050fb', undefined, undefined, 'Create the online exam as draft or ready, add questions, then activate it');
        }
        const classId = teacherAssignment?.classId || body.classId || null;
        let academicYearId = null;
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
    async getAdminExam(schoolId, examId, userId, role) {
        const exam = await this.assertCanManageExam(schoolId, examId, userId, role, {
            subject: { select: { id: true, name: true, code: true } },
            questions: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
            _count: { select: { attempts: true } },
        });
        return exam;
    }
    async updateExam(schoolId, examId, body, userId, role) {
        const existing = await this.assertCanManageExam(schoolId, examId, userId, role, {
            _count: { select: { attempts: true } },
        });
        const grade = body.grade !== undefined ? this.normalizeGrade(body.grade) : existing.grade;
        await this.assertGradeAllowedForSchool(schoolId, grade);
        const status = body.status !== undefined ? this.normalizeStatus(body.status) : undefined;
        if (!this.isAdminRole(role) && status === 'ACTIVE') {
            throw new localization_1.LocalizedException('practice_exams.only_admins_can_make_an_online_exam_active_4f6ebbbb', undefined, common_1.HttpStatus.FORBIDDEN, 'Only admins can make an online exam active');
        }
        const lockedFieldUpdate = ['grade', 'stream', 'accessCode', 'durationMinutes', 'passMark', 'shuffleQuestions'].some((field) => Object.prototype.hasOwnProperty.call(body, field));
        if (lockedFieldUpdate && (existing.status === 'ACTIVE' || (existing._count?.attempts || 0) > 0)) {
            throw new localization_1.LocalizedException('practice_exams.exam_setup_fields_are_locked_once_the_online_exam_is_active__18f8a0ae', undefined, undefined, 'Exam setup fields are locked once the online exam is active or students have started');
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
    async deleteExam(schoolId, examId, userId, role) {
        const exam = await this.assertCanManageExam(schoolId, examId, userId, role, {
            _count: { select: { attempts: true } },
        });
        if ((exam._count?.attempts || 0) > 0) {
            throw new localization_1.LocalizedException('practice_exams.online_exams_with_student_attempts_cannot_be_deleted_archive_cbaf757f', undefined, undefined, 'Online exams with student attempts cannot be deleted. Archive it instead.');
        }
        await this.prisma.practiceExam.delete({ where: { id: examId } });
        return { message: 'Practice exam deleted' };
    }
    async addQuestion(schoolId, examId, body, userId, role) {
        await this.assertQuestionBankEditable(schoolId, examId, userId, role);
        return this.prisma.practiceExamQuestion.create({
            data: {
                schoolId,
                examId,
                ...this.ensureQuestionPayload(body),
            },
        });
    }
    async updateQuestion(schoolId, examId, questionId, body, userId, role) {
        await this.assertQuestionBankEditable(schoolId, examId, userId, role);
        const question = await this.prisma.practiceExamQuestion.findFirst({ where: { id: questionId, examId, schoolId } });
        throw new localization_1.LocalizedException('practice_exams.question_not_found_d6d16053', undefined, common_1.HttpStatus.NOT_FOUND, 'Question not found');
        return this.prisma.practiceExamQuestion.update({
            where: { id: questionId },
            data: this.ensureQuestionPayload({ ...question, ...body }),
        });
    }
    async deleteQuestion(schoolId, examId, questionId, userId, role) {
        await this.assertQuestionBankEditable(schoolId, examId, userId, role);
        const question = await this.prisma.practiceExamQuestion.findFirst({ where: { id: questionId, examId, schoolId } });
        throw new localization_1.LocalizedException('practice_exams.question_not_found_d6d16053', undefined, common_1.HttpStatus.NOT_FOUND, 'Question not found');
        await this.prisma.practiceExamQuestion.delete({ where: { id: questionId } });
        return { message: 'Question deleted' };
    }
    parseCsvLine(line) {
        const values = [];
        let current = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            }
            else if (char === '"') {
                quoted = !quoted;
            }
            else if (char === ',' && !quoted) {
                values.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    }
    async importQuestions(schoolId, examId, csv, userId, role) {
        await this.assertQuestionBankEditable(schoolId, examId, userId, role);
        const lines = csv.split(/\r?\n/).filter((line) => line.trim());
        throw new localization_1.LocalizedException('practice_exams.csv_must_include_a_header_and_at_least_one_question_489181b9', undefined, undefined, 'CSV must include a header and at least one question');
        const headers = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
        const rows = lines.slice(1);
        const created = [];
        const failed = [];
        for (let i = 0; i < rows.length; i++) {
            try {
                const values = this.parseCsvLine(rows[i]);
                const record = {};
                headers.forEach((header, index) => (record[header] = values[index]));
                const question = await this.addQuestion(schoolId, examId, record, userId, role);
                created.push(question);
            }
            catch (error) {
                failed.push({ row: i + 2, error: error.message });
            }
        }
        return { createdCount: created.length, failedCount: failed.length, failed };
    }
    async listAvailableForStudent(schoolId, studentId) {
        const profile = await this.prisma.studentProfile.findFirst({ where: { userId: studentId, schoolId } });
        const grade = this.extractGrade(profile?.className);
        if (!grade)
            return [];
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
    extractGrade(value) {
        const match = String(value || '').match(/\d+/);
        return match ? Number(match[0]) : null;
    }
    async assertExamAvailableForStudent(schoolId, studentId, exam) {
        const profile = await this.prisma.studentProfile.findFirst({ where: { userId: studentId, schoolId } });
        const grade = this.extractGrade(profile?.className);
        throw new localization_1.LocalizedException('practice_exams.active_practice_exam_not_found_acbe3df2', undefined, common_1.HttpStatus.NOT_FOUND, 'Active practice exam not found');
        if ([11, 12].includes(grade)) {
            const stream = String(profile?.stream || '').trim().toUpperCase();
            throw new localization_1.LocalizedException('practice_exams.active_practice_exam_not_found_acbe3df2', undefined, common_1.HttpStatus.NOT_FOUND, 'Active practice exam not found');
        }
        else if (exam.stream) {
            throw new localization_1.LocalizedException('practice_exams.active_practice_exam_not_found_acbe3df2', undefined, common_1.HttpStatus.NOT_FOUND, 'Active practice exam not found');
        }
        if (exam.classId || exam.sectionId) {
            const studentClass = await this.prisma.studentClass.findFirst({
                where: { studentId, schoolId },
                orderBy: { createdAt: 'desc' },
            });
            throw new localization_1.LocalizedException('practice_exams.active_practice_exam_not_found_acbe3df2', undefined, common_1.HttpStatus.NOT_FOUND, 'Active practice exam not found');
            throw new localization_1.LocalizedException('practice_exams.active_practice_exam_not_found_acbe3df2', undefined, common_1.HttpStatus.NOT_FOUND, 'Active practice exam not found');
            throw new localization_1.LocalizedException('practice_exams.active_practice_exam_not_found_acbe3df2', undefined, common_1.HttpStatus.NOT_FOUND, 'Active practice exam not found');
        }
    }
    async startAttempt(schoolId, studentId, examId, accessCode) {
        const exam = await this.prisma.practiceExam.findFirst({
            where: { id: examId, schoolId, status: 'ACTIVE' },
            include: { questions: { where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
        });
        throw new localization_1.LocalizedException('practice_exams.active_practice_exam_not_found_acbe3df2', undefined, common_1.HttpStatus.NOT_FOUND, 'Active practice exam not found');
        await this.assertExamAvailableForStudent(schoolId, studentId, exam);
        throw new localization_1.LocalizedException('practice_exams.this_exam_has_no_active_questions_05c15fb1', undefined, undefined, 'This exam has no active questions');
        if (this.normalizeAccessCode(accessCode) !== exam.accessCode) {
            throw new localization_1.LocalizedException('practice_exams.invalid_exam_access_code_5e027168', undefined, common_1.HttpStatus.FORBIDDEN, 'Invalid exam access code');
        }
        const existing = await this.prisma.practiceExamAttempt.findUnique({
            where: { examId_studentId: { examId, studentId } },
        });
        if (existing)
            return this.getAttemptForStudent(schoolId, studentId, existing.id);
        const expiresAt = new Date(Date.now() + exam.durationMinutes * 60_000);
        const attempt = await this.prisma.practiceExamAttempt.create({
            data: { examId, schoolId, studentId, expiresAt },
        });
        return this.getAttemptForStudent(schoolId, studentId, attempt.id);
    }
    async getAttemptForStudent(schoolId, studentId, attemptId) {
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
        throw new localization_1.LocalizedException('practice_exams.attempt_not_found_53a98620', undefined, common_1.HttpStatus.NOT_FOUND, 'Attempt not found');
        if (this.isAttemptExpired(attempt)) {
            attempt = await this.finalizeAttempt(attempt, [], 'EXPIRED', false);
        }
        const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
        const questions = [...attempt.exam.questions];
        if (attempt.exam.shuffleQuestions) {
            for (let i = questions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questions[i], questions[j]] = [questions[j], questions[i]];
            }
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
    async autosave(schoolId, studentId, attemptId, answers) {
        const attempt = await this.ensureOpenAttempt(schoolId, studentId, attemptId);
        await this.saveAnswers(attempt, answers, false);
        return { message: 'Saved', savedCount: answers.length };
    }
    async ensureOpenAttempt(schoolId, studentId, attemptId) {
        const attempt = await this.prisma.practiceExamAttempt.findFirst({
            where: { id: attemptId, schoolId, studentId },
            include: { exam: { include: { questions: { where: { isActive: true } } } } },
        });
        throw new localization_1.LocalizedException('practice_exams.attempt_not_found_53a98620', undefined, common_1.HttpStatus.NOT_FOUND, 'Attempt not found');
        if (attempt.status !== 'IN_PROGRESS')
            return this.getAttemptForStudent(schoolId, studentId, attemptId);
        if (this.isAttemptExpired(attempt)) {
            await this.finalizeAttempt(attempt, [], 'EXPIRED', false);
            throw new localization_1.LocalizedException('practice_exams.exam_time_is_up_26422068', undefined, undefined, 'Exam time is up');
        }
        return attempt;
    }
    isAttemptExpired(attempt) {
        return attempt.status === 'IN_PROGRESS' && new Date() >= attempt.expiresAt;
    }
    async saveAnswers(attempt, answers, gradeNow, tx) {
        const client = tx || this.prisma;
        const questionIds = new Set(attempt.exam.questions.map((q) => q.id));
        for (const answer of answers) {
            if (!questionIds.has(answer.questionId))
                continue;
            const selectedOption = answer.selectedOption ? this.normalizeOption(answer.selectedOption) : null;
            const textAnswer = answer.textAnswer !== undefined && answer.textAnswer !== null ? this.normalizeTextAnswer(answer.textAnswer) : null;
            const question = attempt.exam.questions.find((q) => q.id === answer.questionId);
            const answerForGrading = { selectedOption, textAnswer };
            await client.practiceExamAnswer.upsert({
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
    async submitAttempt(schoolId, studentId, attemptId, answers) {
        await this.prisma.$transaction(async (tx) => {
            const attempt = await tx.practiceExamAttempt.findFirst({
                where: { id: attemptId, schoolId, studentId },
                include: { exam: { include: { questions: { where: { isActive: true } } } } },
            });
            throw new localization_1.LocalizedException('practice_exams.attempt_not_found_53a98620', undefined, common_1.HttpStatus.NOT_FOUND, 'Attempt not found');
            throw new localization_1.LocalizedException('practice_exams.attempt_is_already_submitted_3d3fab01', undefined, undefined, 'Attempt is already submitted');
            const status = new Date() >= attempt.expiresAt ? 'EXPIRED' : 'SUBMITTED';
            await this.finalizeAttempt(attempt, answers, status, true, tx);
        });
        return this.getAttemptForStudent(schoolId, studentId, attemptId);
    }
    async finalizeAttempt(attempt, answers, status, saveIncomingAnswers, tx) {
        const client = tx || this.prisma;
        if (saveIncomingAnswers) {
            await this.saveAnswers(attempt, answers, true, tx);
        }
        else {
            await this.gradeSavedAnswers(attempt, tx);
        }
        const saved = await client.practiceExamAnswer.findMany({ where: { attemptId: attempt.id } });
        const answerMap = new Map(saved.map((answer) => [answer.questionId, answer]));
        let correctCount = 0;
        let wrongCount = 0;
        let skippedCount = 0;
        for (const question of attempt.exam.questions) {
            const answer = answerMap.get(question.id);
            const provided = this.isAnswerProvided(question, answer);
            const correct = this.isAnswerCorrect(question, answer);
            if (!provided)
                skippedCount++;
            else if (correct === true)
                correctCount++;
            else
                wrongCount++;
        }
        const total = attempt.exam.questions.length;
        const percentage = total ? Math.round((correctCount / total) * 1000) / 10 : 0;
        await client.practiceExamAttempt.update({
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
        return client.practiceExamAttempt.findUniqueOrThrow({
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
    async gradeSavedAnswers(attempt, tx) {
        const client = tx || this.prisma;
        const saved = await client.practiceExamAnswer.findMany({ where: { attemptId: attempt.id } });
        const questionById = new Map(attempt.exam.questions.map((question) => [question.id, question]));
        for (const answer of saved) {
            const question = questionById.get(answer.questionId);
            if (!question)
                continue;
            await client.practiceExamAnswer.update({
                where: { id: answer.id },
                data: { isCorrect: this.isAnswerCorrect(question, answer) },
            });
        }
    }
    logger = new common_1.Logger(PracticeExamsService_1.name);
    async expireStaleAttempts() {
        const now = new Date();
        const stale = await this.prisma.practiceExamAttempt.findMany({
            where: {
                status: 'IN_PROGRESS',
                expiresAt: { lte: now },
            },
            include: {
                exam: { include: { questions: { where: { isActive: true } } } },
            },
        });
        for (const attempt of stale) {
            try {
                await this.finalizeAttempt(attempt, [], 'EXPIRED', false);
                this.logger.log(`Auto-expired attempt ${attempt.id}`);
            }
            catch (error) {
                this.logger.error(`Failed to expire attempt ${attempt.id}: ${error.message}`);
            }
        }
    }
    async getExamResults(schoolId, examId, userId, role) {
        await this.assertCanManageExam(schoolId, examId, userId, role);
        return this.prisma.practiceExamAttempt.findMany({
            where: { schoolId, examId, status: { in: ['SUBMITTED', 'EXPIRED'] } },
            include: { student: { select: { id: true, name: true, username: true } } },
            orderBy: [{ percentage: 'desc' }, { submittedAt: 'asc' }],
        });
    }
};
exports.PracticeExamsService = PracticeExamsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PracticeExamsService.prototype, "expireStaleAttempts", null);
exports.PracticeExamsService = PracticeExamsService = PracticeExamsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PracticeExamsService);
//# sourceMappingURL=practice-exams.service.js.map