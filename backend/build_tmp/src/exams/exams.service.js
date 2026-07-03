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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamsService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const event_bus_service_1 = require("../core/events/event-bus.service");
let ExamsService = class ExamsService {
    prisma;
    eventBus;
    constructor(prisma, eventBus) {
        this.prisma = prisma;
        this.eventBus = eventBus;
    }
    async createExam(schoolId, dto) {
        const subject = await this.prisma.subject.findUnique({
            where: { id: dto.subjectId },
        });
        if (!subject || subject.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('exams.subject_not_found_562e5a84', undefined, common_1.HttpStatus.NOT_FOUND, 'Subject not found');
        }
        const data = {
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
    async getExams(schoolId, query) {
        const { classId, sectionId, subjectId, type, academicYearId } = query;
        const where = { schoolId };
        if (classId)
            where.classId = classId;
        if (sectionId)
            where.sectionId = sectionId;
        if (subjectId)
            where.subjectId = subjectId;
        if (type)
            where.type = type;
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
    async getExamById(schoolId, examId) {
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
        throw new localization_1.LocalizedException('exams.exam_not_found_8661b89e', undefined, common_1.HttpStatus.NOT_FOUND, 'Exam not found');
        return exam;
    }
    async updateExam(schoolId, examId, dto) {
        const exam = await this.prisma.exam.findUnique({
            where: { id: examId, schoolId },
        });
        throw new localization_1.LocalizedException('exams.exam_not_found_8661b89e', undefined, common_1.HttpStatus.NOT_FOUND, 'Exam not found');
        const updateData = { ...dto };
        if (dto.date)
            updateData.date = new Date(dto.date);
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
    async deleteExam(schoolId, examId) {
        const exam = await this.prisma.exam.findUnique({
            where: { id: examId, schoolId },
        });
        throw new localization_1.LocalizedException('exams.exam_not_found_8661b89e', undefined, common_1.HttpStatus.NOT_FOUND, 'Exam not found');
        return this.prisma.exam.delete({ where: { id: examId } });
    }
    async getTeacherExams(teacherId, schoolId, filters) {
        const { academicYearId, termId } = filters || {};
        let dateFilter;
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
        }
        else if (academicYearId) {
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
        if (!assignments.length)
            return [];
        const criteriaMap = new Map();
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
            let status = 'SCHEDULED';
            const now = new Date();
            if (exam.date < now) {
                status = 'COMPLETED';
            }
            else if (exam.date.toDateString() === now.toDateString()) {
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
    async enterExamResults(userId, schoolId, examId, dto) {
        const exam = await this.prisma.exam.findUnique({
            where: { id: examId, schoolId },
            include: { results: true },
        });
        throw new localization_1.LocalizedException('exams.exam_not_found_8661b89e', undefined, common_1.HttpStatus.NOT_FOUND, 'Exam not found');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        throw new localization_1.LocalizedException('exams.user_not_found_b846d114', undefined, common_1.HttpStatus.NOT_FOUND, 'User not found');
        if (user.role === client_1.Role.TEACHER) {
            const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
                where: {
                    teacherId: userId,
                    classId: exam.classId,
                    subjectId: exam.subjectId,
                },
            });
            if (!assignment)
                throw new localization_1.LocalizedException('exams.not_assigned_to_this_class_subject_a9a91398', undefined, common_1.HttpStatus.FORBIDDEN, 'Not assigned to this class/subject');
        }
        const { results } = dto;
        const existingResultMap = new Map(exam.results.map((r) => [r.studentId, r.id]));
        for (const r of results) {
            if (r.marks > exam.maxMarks) {
                throw new localization_1.LocalizedException('exams.marks_for_student_exceed_max_marks_12dffccf', undefined, undefined, 'Marks for student ${r.studentId} exceed max marks (${exam.maxMarks})');
            }
        }
        const operations = results.map((r) => {
            const existingId = existingResultMap.get(r.studentId);
            if (existingId) {
                return this.prisma.examResult.update({
                    where: { id: existingId },
                    data: { marks: r.marks, grade: r.grade, remarks: r.remarks },
                });
            }
            else {
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
    async getStudentExams(studentId, schoolId) {
        const enrollment = await this.prisma.enrollment.findFirst({
            where: { studentId, schoolId, status: 'APPROVED' },
            orderBy: { createdAt: 'desc' },
        });
        if (!enrollment)
            return [];
        const studentClass = await this.prisma.studentClass.findFirst({
            where: { studentId, schoolId, academicYear: enrollment.academicYear },
        });
        if (!studentClass)
            return [];
        return this.prisma.exam.findMany({
            where: {
                schoolId,
                classId: studentClass.classId,
                ...(studentClass.sectionId && { sectionId: studentClass.sectionId }),
                date: { gte: new Date() },
            },
            include: { subject: { select: { name: true } } },
            orderBy: { date: 'asc' },
        });
    }
    async getStudentResults(studentId, schoolId) {
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
    async getFormData(schoolId, academicYearId) {
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
        const subjects = await this.prisma.subject.findMany({
            where: { schoolId },
            select: {
                id: true,
                name: true,
                code: true,
            },
            orderBy: { name: 'asc' },
        });
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
    async publishTermResults(schoolId, body) {
        const term = await this.prisma.term.findFirst({
            where: { id: body.termId, academicYear: { schoolId } },
            select: {
                id: true,
                startDate: true,
                endDate: true,
            },
        });
        if (!term) {
            throw new localization_1.LocalizedException('exams.term_not_found_f9401991', undefined, common_1.HttpStatus.NOT_FOUND, 'Term not found');
        }
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
        if (exams.length === 0) {
            throw new localization_1.LocalizedException('exams.no_exams_found_for_this_class_19e6da5c', undefined, common_1.HttpStatus.NOT_FOUND, 'No exams found for this class');
        }
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
    async verifyParentChild(parentId, childId, schoolId) {
        const link = await this.prisma.parentStudent.findFirst({
            where: {
                parentId,
                studentId: childId,
                schoolId,
            },
        });
        if (!link) {
            throw new localization_1.LocalizedException('exams.you_are_not_linked_to_this_student_49797e72', undefined, common_1.HttpStatus.FORBIDDEN, 'You are not linked to this student');
        }
        return link;
    }
};
exports.ExamsService = ExamsService;
exports.ExamsService = ExamsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], ExamsService);
//# sourceMappingURL=exams.service.js.map