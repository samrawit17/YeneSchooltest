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
exports.LessonService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../notification/notification.service");
let LessonService = class LessonService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async getFormData(teacherId, schoolId) {
        const activeYear = await this.prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        if (!activeYear) {
            return {
                academicYears: [],
                activeAcademicYearId: null,
                terms: [],
                grades: [],
                sectionsByGrade: {},
                allSubjects: [],
                teacherSubjects: [],
                periods: [
                    { value: 1, label: 'Period 1' },
                    { value: 2, label: 'Period 2' },
                    { value: 3, label: 'Period 3' },
                    { value: 4, label: 'Period 4' },
                    { value: 5, label: 'Period 5' },
                    { value: 6, label: 'Period 6' },
                    { value: 7, label: 'Period 7' },
                    { value: 8, label: 'Period 8' },
                ],
            };
        }
        const classSubjects = await this.prisma.classSubject.findMany({
            where: { teacherId, academicYear: activeYear.id },
            include: {
                class: { select: { id: true, grade: true } },
                section: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true, code: true } },
            },
        });
        const teacherGrades = [...new Set(classSubjects.map(cs => cs.class.grade).filter(Boolean))].sort();
        const teacherSections = classSubjects.map(cs => ({
            id: cs.section.id,
            name: cs.section.name,
            classId: cs.class.id,
            grade: cs.class.grade,
        })).filter(s => s.grade !== null);
        const subjectMap = new Map();
        classSubjects.forEach(cs => {
            if (cs.class.grade === null)
                return;
            if (!subjectMap.has(cs.subject.id)) {
                subjectMap.set(cs.subject.id, {
                    id: cs.subject.id,
                    name: cs.subject.name,
                    code: cs.subject.code || undefined,
                    grade: cs.class.grade,
                    section: cs.section.name,
                });
            }
        });
        const teacherSubjects = Array.from(subjectMap.values());
        const sectionsByGrade = {};
        teacherSections.forEach(s => {
            if (s.grade === null)
                return;
            if (!sectionsByGrade[s.grade])
                sectionsByGrade[s.grade] = [];
            sectionsByGrade[s.grade].push({ id: s.id, name: s.name, classId: s.classId });
        });
        const academicYears = await this.prisma.academicYear.findMany({
            where: { schoolId },
            orderBy: { startDate: 'desc' },
            take: 5,
        });
        const terms = await this.prisma.term.findMany({
            where: { academicYearId: activeYear.id },
            orderBy: { order: 'asc' },
        });
        return {
            academicYears: academicYears.map(ay => ({ id: ay.id, name: ay.name, isActive: ay.isActive })),
            activeAcademicYearId: activeYear.id,
            terms: terms.map(t => ({ id: t.id, name: t.name, startDate: t.startDate?.toISOString(), endDate: t.endDate?.toISOString() })),
            grades: teacherGrades,
            sectionsByGrade,
            allSubjects: teacherSubjects,
            teacherSubjects,
            periods: [
                { value: 1, label: 'Period 1' },
                { value: 2, label: 'Period 2' },
                { value: 3, label: 'Period 3' },
                { value: 4, label: 'Period 4' },
                { value: 5, label: 'Period 5' },
                { value: 6, label: 'Period 6' },
                { value: 7, label: 'Period 7' },
                { value: 8, label: 'Period 8' },
            ],
        };
    }
    async validatePeriodAssignment(teacherId, classId, sectionId, subjectId, dayOfWeek, periodNumber, academicYearId) {
        return true;
    }
    getDayOfWeek(date) {
        return date.getDay();
    }
    getLearnerVisibleLessonStatuses() {
        return [
            client_1.LessonStatus.DRAFT,
            'PENDING_REVIEW',
            client_1.LessonStatus.PUBLISHED,
            client_1.LessonStatus.COVERED,
        ];
    }
    buildHomeworkFromLesson(lesson) {
        const title = lesson.description?.trim();
        const description = lesson.instructions?.trim();
        if (!title && !description)
            return null;
        return {
            id: lesson.id,
            title: title || `Homework for ${lesson.title || 'lesson'}`,
            description: description || '',
        };
    }
    async createLessonBundle(data, teacherId, schoolId) {
        const classRecord = await this.prisma.class.findFirst({
            where: {
                grade: data.grade,
                schoolId,
            },
        });
        if (!classRecord)
            throw new common_1.NotFoundException(`Class not found for grade ${data.grade}`);
        let sectionRecord = await this.prisma.section.findFirst({
            where: {
                OR: [
                    { name: data.section, classId: classRecord.id },
                    { name: data.section, class: { grade: data.grade, schoolId } },
                ]
            },
        });
        if (!sectionRecord) {
            sectionRecord = await this.prisma.section.create({
                data: {
                    name: data.section,
                    classId: classRecord.id,
                    capacity: 50,
                },
            });
        }
        const lessonDate = new Date(data.lessonDate);
        const dayOfWeek = this.getDayOfWeek(lessonDate);
        await this.validatePeriodAssignment(teacherId, classRecord.id, sectionRecord.id, data.subjectId, dayOfWeek, data.periodNumber, data.academicYearId);
        const existingLesson = await this.prisma.content.findFirst({
            where: {
                schoolId,
                subjectId: data.subjectId,
                teacherId,
                lessonDate,
                periodNumber: data.periodNumber,
                type: client_1.ContentType.LESSON,
            },
        });
        if (existingLesson)
            throw new common_1.BadRequestException('Lesson already exists');
        const result = await this.prisma.$transaction(async (tx) => {
            const lesson = await tx.content.create({
                data: {
                    schoolId,
                    academicYearId: data.academicYearId,
                    semesterId: data.semesterId,
                    type: client_1.ContentType.LESSON,
                    grade: data.grade,
                    sectionName: data.section,
                    stream: data.stream,
                    subjectId: data.subjectId,
                    teacherId,
                    title: data.title,
                    description: data.homework?.title || null,
                    instructions: data.homework?.description ||
                        data.homework?.instructions ||
                        null,
                    objective: data.objective,
                    lessonContent: data.lessonContent,
                    lessonDate,
                    periodNumber: data.periodNumber,
                    status: data.status || 'DRAFT',
                    isExamPrep: data.isExamPrep || false,
                    unitNumber: data.unitNumber,
                    topicName: data.topicName,
                    competency: data.competency,
                    syllabusMappingId: data.syllabusMappingId,
                },
                include: {
                    subject: true,
                    teacher: { select: { id: true, name: true, email: true } },
                    academicYear: true,
                    semester: true,
                },
            });
            let resources = [];
            if (data.resources && data.resources.length > 0) {
            }
            return { lesson, resources };
        });
        await this.notifyLessonCreated(result.lesson);
        return result;
    }
    async updateLessonBundle(lessonId, data, teacherId, schoolId) {
        const lesson = await this.prisma.content.findFirst({
            where: {
                id: lessonId,
                schoolId,
                type: client_1.ContentType.LESSON,
            },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        if (lesson.teacherId !== teacherId)
            throw new common_1.ForbiddenException('Only creator can update');
        if (lesson.status === client_1.LessonStatus.PUBLISHED)
            throw new common_1.BadRequestException('Cannot update published lesson');
        const updated = await this.prisma.content.update({
            where: { id: lessonId },
            data: {
                title: data.title,
                description: data.homework?.title,
                instructions: data.homework?.description || data.homework?.instructions,
                objective: data.objective,
                lessonContent: data.lessonContent,
                periodNumber: data.periodNumber,
                unitNumber: data.unitNumber,
                topicName: data.topicName,
                topicId: data.topicId,
                competency: data.competency,
                status: data.status,
                isExamPrep: data.isExamPrep,
                syllabusMappingId: data.syllabusMappingId,
            },
            include: {
                subject: true,
                teacher: { select: { id: true, name: true, email: true } },
            },
        });
        return { lesson: updated };
    }
    async submitForReview(lessonId, teacherId, schoolId) {
        const lesson = await this.prisma.content.findUnique({
            where: { id: lessonId },
        });
        if (!lesson || lesson.type !== client_1.ContentType.LESSON)
            throw new common_1.NotFoundException('Lesson not found');
        if (lesson.schoolId !== schoolId)
            throw new common_1.ForbiddenException('Access denied');
        if (lesson.teacherId !== teacherId)
            throw new common_1.ForbiddenException('Only creator can submit');
        if (lesson.status !== client_1.LessonStatus.DRAFT)
            throw new common_1.BadRequestException('Only draft lessons can be submitted');
        return this.prisma.content.update({
            where: { id: lessonId },
            data: { status: 'PENDING_REVIEW' },
            include: {
                subject: true,
                teacher: { select: { id: true, name: true, email: true } },
            },
        });
    }
    async approveLesson(lessonId, hodId, schoolId) {
        const lesson = await this.prisma.content.findUnique({
            where: { id: lessonId },
        });
        if (!lesson || lesson.type !== client_1.ContentType.LESSON)
            throw new common_1.NotFoundException('Lesson not found');
        if (lesson.schoolId !== schoolId)
            throw new common_1.ForbiddenException('Access denied');
        if (lesson.status !== 'PENDING_REVIEW')
            throw new common_1.BadRequestException('Only pending review can be approved');
        const updated = await this.prisma.content.update({
            where: { id: lessonId },
            data: {
                status: client_1.LessonStatus.PUBLISHED,
                reviewedBy: hodId,
                reviewedAt: new Date(),
            },
            include: {
                subject: true,
                teacher: { select: { id: true, name: true, email: true } },
            },
        });
        await this.notifyLessonPublished(updated);
        const homework = this.buildHomeworkFromLesson(updated);
        if (homework) {
            await this.notifyParents(updated, homework);
        }
        return updated;
    }
    async notifyLessonPublished(lesson) {
        try {
            const classRecord = await this.prisma.class.findFirst({
                where: { grade: lesson.grade, schoolId: lesson.schoolId },
            });
            if (!classRecord)
                return;
            const studentClasses = await this.prisma.studentClass.findMany({
                where: { classId: classRecord.id, section: { name: lesson.sectionName } },
            });
            const parentIds = new Set();
            for (const sc of studentClasses) {
                const parentLinks = await this.prisma.parentStudent.findMany({
                    where: { studentId: sc.studentId },
                });
                parentLinks.forEach((pl) => parentIds.add(pl.parentId));
            }
            const userIds = Array.from(parentIds);
            if (userIds.length > 0) {
                await this.notificationService.createBulkNotifications({
                    schoolId: lesson.schoolId,
                    userIds,
                    title: 'New Lesson Published',
                    message: `New lesson: ${lesson.title} for Grade ${lesson.grade} ${lesson.sectionName} by ${lesson.teacher?.name || 'Teacher'}`,
                    type: 'LESSON',
                });
            }
        }
        catch (e) {
            console.error('Lesson notification error:', e);
        }
    }
    async notifyLessonCreated(lesson) {
        try {
            const classRecord = await this.prisma.class.findFirst({
                where: { grade: lesson.grade, schoolId: lesson.schoolId },
            });
            if (!classRecord)
                return;
            const studentClasses = await this.prisma.studentClass.findMany({
                where: {
                    schoolId: lesson.schoolId,
                    classId: classRecord.id,
                    section: { name: lesson.sectionName },
                },
                select: { studentId: true },
            });
            const studentUserIds = studentClasses.map((sc) => sc.studentId);
            if (studentUserIds.length === 0)
                return;
            const studentProfiles = await this.prisma.studentProfile.findMany({
                where: {
                    schoolId: lesson.schoolId,
                    userId: { in: studentUserIds },
                },
                select: { id: true },
            });
            const studentProfileIds = studentProfiles.map((profile) => profile.id);
            const parentLinks = studentProfileIds.length > 0
                ? await this.prisma.parentStudent.findMany({
                    where: {
                        schoolId: lesson.schoolId,
                        studentId: { in: studentProfileIds },
                    },
                    select: { parent: { select: { userId: true } } },
                })
                : [];
            const subjectName = lesson.subject?.name || 'lesson';
            const metadata = {
                lessonId: lesson.id,
                grade: lesson.grade,
                section: lesson.sectionName,
                subjectId: lesson.subjectId,
                subjectName,
            };
            const message = `${lesson.teacher?.name || 'Teacher'} created "${lesson.title}" for ${subjectName}.`;
            const uniqueStudentUserIds = Array.from(new Set(studentUserIds));
            if (uniqueStudentUserIds.length > 0) {
                await this.notificationService.createBulkNotifications({
                    schoolId: lesson.schoolId,
                    userIds: uniqueStudentUserIds,
                    title: 'New Lesson Created',
                    message,
                    type: notification_service_1.NotificationType.LESSON,
                    actionUrl: '/student/lessons',
                    metadata,
                });
            }
            const uniqueParentUserIds = Array.from(new Set(parentLinks.map((link) => link.parent.userId)));
            if (uniqueParentUserIds.length > 0) {
                await this.notificationService.createBulkNotifications({
                    schoolId: lesson.schoolId,
                    userIds: uniqueParentUserIds,
                    title: 'New Lesson Created',
                    message,
                    type: notification_service_1.NotificationType.LESSON,
                    actionUrl: '/parent/lessons',
                    metadata,
                });
            }
        }
        catch (error) {
            console.error('Lesson creation notification error:', error);
        }
    }
    async rejectLesson(lessonId, hodId, schoolId, reason) {
        const lesson = await this.prisma.content.findUnique({
            where: { id: lessonId },
            include: { subject: true },
        });
        if (!lesson || lesson.type !== client_1.ContentType.LESSON)
            throw new common_1.NotFoundException('Lesson not found');
        if (lesson.schoolId !== schoolId)
            throw new common_1.ForbiddenException('Access denied');
        if (lesson.status !== 'PENDING_REVIEW')
            throw new common_1.BadRequestException('Only pending review can be rejected');
        return this.prisma.content.update({
            where: { id: lessonId },
            data: {
                status: client_1.LessonStatus.DRAFT,
                reviewedBy: hodId,
                reviewedAt: new Date(),
            },
            include: {
                subject: true,
                teacher: { select: { id: true, name: true, email: true } },
            },
        });
    }
    async notifyParents(lesson, homework) {
        try {
            const classRecord = await this.prisma.class.findFirst({
                where: { grade: lesson.grade, schoolId: lesson.schoolId },
            });
            if (!classRecord)
                return;
            const studentClasses = await this.prisma.studentClass.findMany({
                where: { classId: classRecord.id, section: { name: lesson.section } },
                include: { student: true },
            });
            const parentIds = new Set();
            for (const sc of studentClasses) {
                const parentLink = await this.prisma.parentStudent.findFirst({
                    where: { studentId: sc.studentId },
                });
                if (parentLink)
                    parentIds.add(parentLink.parentId);
            }
            const userIds = Array.from(parentIds);
            if (userIds.length > 0) {
                await this.notificationService.createBulkNotifications({
                    schoolId: lesson.schoolId,
                    userIds,
                    title: 'New Homework Assigned',
                    message: `New homework: ${homework.title}. Due: ${homework.dueDate || 'No due date'}`,
                    type: 'HOMEWORK',
                });
            }
        }
        catch (e) {
            console.error('Notify error:', e);
        }
    }
    async getLessonWithContentLock(lessonId, studentId, schoolId) {
        const lesson = await this.prisma.content.findUnique({
            where: { id: lessonId },
            include: {
                subject: true,
                teacher: { select: { id: true, name: true } },
                resources: true,
                attachmentsNew: true,
            },
        });
        if (!lesson || lesson.type !== client_1.ContentType.LESSON)
            throw new common_1.NotFoundException('Lesson not found');
        const homework = this.buildHomeworkFromLesson(lesson);
        const submission = null;
        const studentFees = await this.prisma.studentFee.findMany({
            where: { studentId, schoolId, status: { in: ['OVERDUE', 'PENDING'] } },
        });
        const hasOutstandingFees = studentFees.length > 0;
        if (hasOutstandingFees) {
            return {
                ...lesson,
                resources: [],
                homework: homework
                    ? { ...homework, description: 'Locked - Please settle fees.' }
                    : null,
                isLocked: true,
                lockMessage: 'Content locked due to outstanding fees',
            };
        }
        return {
            ...lesson,
            homework,
            submission,
            isLocked: false,
        };
    }
    async submitHomework(homeworkId, studentId, data) {
        const homework = await this.prisma.homework.findUnique({
            where: { id: homeworkId },
        });
        if (!homework)
            throw new common_1.NotFoundException('Homework not found');
        const existing = await this.prisma.homeworkSubmission.findUnique({
            where: { homeworkId_studentId: { homeworkId, studentId } },
        });
        if (existing) {
            return this.prisma.homeworkSubmission.update({
                where: { id: existing.id },
                data: {
                    submissionUrl: data.submissionUrl,
                    submissionText: data.submissionText,
                    submittedAt: new Date(),
                    status: 'SUBMITTED',
                },
            });
        }
        return this.prisma.homeworkSubmission.create({
            data: {
                homeworkId,
                studentId,
                submissionUrl: data.submissionUrl,
                submissionText: data.submissionText,
                submittedAt: new Date(),
                status: 'SUBMITTED',
            },
        });
    }
    async gradeHomework(submissionId, teacherId, data) {
        const submission = await this.prisma.homeworkSubmission.findUnique({ where: { id: submissionId } });
        if (!submission)
            throw new common_1.NotFoundException('Submission not found');
        return this.prisma.homeworkSubmission.update({
            where: { id: submissionId },
            data: {
                type: client_1.ContentType.LESSON,
                grade: data.grade,
                feedback: data.feedback,
                status: 'GRADED',
                gradedBy: teacherId,
                gradedAt: new Date(),
            },
        });
    }
    async getLessonCoverageReport(query, schoolId) {
        const syllabusMappings = await this.prisma.syllabusMapping.findMany({
            where: {
                schoolId,
                subjectId: query.subjectId,
                grade: query.grade,
                ...(query.unitNumber && { unitNumber: query.unitNumber }),
            },
            orderBy: { unitNumber: 'asc' },
        });
        const lessons = await this.prisma.content.findMany({
            where: {
                schoolId,
                subjectId: query.subjectId,
                grade: query.grade,
                status: { in: [client_1.LessonStatus.PUBLISHED, client_1.LessonStatus.COVERED] },
                type: client_1.ContentType.LESSON,
            },
            select: {
                id: true,
                unitNumber: true,
                topicName: true,
                status: true,
                lessonDate: true,
            },
        });
        const coverageByUnit = syllabusMappings.map((m) => ({
            unitNumber: m.unitNumber,
            unitName: m.unitName,
            topicName: m.topicName,
            competency: m.competency,
            lessonsCovered: lessons.filter((l) => l.unitNumber === m.unitNumber)
                .length,
            status: lessons.some((l) => l.unitNumber === m.unitNumber)
                ? 'Covered'
                : 'Not Covered',
        }));
        const coveredUnits = coverageByUnit.filter((c) => c.status === 'Covered').length;
        return {
            summary: {
                totalUnits: syllabusMappings.length,
                coveredUnits,
                coveragePercentage: syllabusMappings.length === 0
                    ? 0
                    : Math.round((coveredUnits / syllabusMappings.length) * 100),
                totalLessons: lessons.length,
            },
            coverageByUnit,
        };
    }
    async getPendingReviewLessons(schoolId, departmentId) {
        return this.prisma.content.findMany({
            where: {
                schoolId,
                status: 'PENDING_REVIEW',
                type: client_1.ContentType.LESSON,
            },
            include: {
                subject: true,
                teacher: { select: { id: true, name: true, email: true } },
                academicYear: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async create(data, teacherId, schoolId) {
        const classRecord = await this.prisma.class.findFirst({
            where: {
                grade: data.grade,
                schoolId,
            },
        });
        if (!classRecord)
            throw new common_1.NotFoundException(`Class not found`);
        const sectionRecord = await this.prisma.section.findFirst({
            where: { name: data.section, classId: classRecord.id },
        });
        if (!sectionRecord)
            throw new common_1.NotFoundException(`Section not found`);
        const classSubject = await this.prisma.classSubject.findFirst({
            where: {
                subjectId: data.subjectId,
                classId: classRecord.id,
                sectionId: sectionRecord.id,
                teacherId,
            },
        });
        if (!classSubject)
            throw new common_1.ForbiddenException('Not assigned');
        const existing = await this.prisma.content.findFirst({
            where: {
                schoolId,
                subjectId: data.subjectId,
                teacherId,
                lessonDate: new Date(data.lessonDate),
                periodNumber: data.periodNumber,
            },
        });
        if (existing)
            throw new common_1.BadRequestException('Lesson exists');
        return this.prisma.content.create({
            data: {
                schoolId,
                academicYearId: data.academicYearId,
                semesterId: data.semesterId,
                type: client_1.ContentType.LESSON,
                grade: data.grade,
                sectionName: data.section,
                stream: data.stream,
                subjectId: data.subjectId,
                teacherId,
                title: data.title,
                objective: data.objective,
                lessonContent: data.lessonContent,
                lessonDate: new Date(data.lessonDate),
                periodNumber: data.periodNumber,
                status: data.status || client_1.LessonStatus.DRAFT,
            },
            include: {
                subject: true,
                teacher: { select: { id: true, name: true, email: true } },
                academicYear: true,
                semester: true,
                attachmentsNew: true,
            },
        });
    }
    async findAll(query, schoolId, userId, role) {
        const where = { schoolId };
        where.type = client_1.ContentType.LESSON;
        let parentChildMap = null;
        let parentClassScopes = new Map();
        if (role === 'TEACHER')
            where.teacherId = userId;
        else if (role === 'STUDENT') {
            where.status = { in: this.getLearnerVisibleLessonStatuses() };
            const sc = await this.prisma.studentClass.findFirst({
                where: { studentId: userId, schoolId },
                include: { section: { include: { class: true } } },
            });
            if (!sc) {
                return {
                    data: [],
                    meta: { total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 },
                };
            }
            where.grade = sc.section.class.grade;
            where.sectionName = sc.section.name;
        }
        else if (role === 'PARENT') {
            where.status = { in: this.getLearnerVisibleLessonStatuses() };
            const parentProfile = await this.prisma.parentProfile.findFirst({
                where: { userId, schoolId },
            });
            if (!parentProfile) {
                return {
                    data: [],
                    meta: { total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 },
                };
            }
            const childLinks = await this.prisma.parentStudent.findMany({
                where: {
                    parentId: parentProfile.id,
                    schoolId,
                    ...(query.studentId ? { studentId: query.studentId } : {}),
                },
                include: {
                    student: {
                        include: {
                            user: { select: { id: true, name: true } },
                        },
                    },
                },
            });
            const childUserIds = childLinks.map((link) => link.student.userId);
            parentChildMap = new Map(childLinks.map((link) => [
                link.student.userId,
                { id: link.student.id, name: link.student.user?.name || 'Unknown' },
            ]));
            const studentClasses = await this.prisma.studentClass.findMany({
                where: { studentId: { in: childUserIds }, schoolId },
                include: { section: { include: { class: true } } },
            });
            parentClassScopes = new Map();
            studentClasses.forEach((sc) => {
                const existing = parentClassScopes.get(sc.studentId) || [];
                existing.push({
                    grade: sc.section.class.grade,
                    sectionName: sc.section.name,
                });
                parentClassScopes.set(sc.studentId, existing);
            });
            const scopes = studentClasses
                .map((sc) => ({
                grade: sc.section.class.grade,
                sectionName: sc.section.name,
            }))
                .filter((scope) => scope.grade !== null);
            if (scopes.length === 0) {
                return {
                    data: [],
                    meta: { total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 },
                };
            }
            where.OR = scopes;
        }
        if (role !== 'STUDENT' && role !== 'PARENT') {
            if (query.grade)
                where.grade = query.grade;
            if (query.section)
                where.sectionName = query.section;
        }
        if (query.semesterId)
            where.semesterId = query.semesterId;
        if (query.subjectId)
            where.subjectId = query.subjectId;
        if (query.status)
            where.status = query.status;
        if (query.startDate || query.endDate) {
            where.lessonDate = {};
            if (query.startDate)
                where.lessonDate.gte = new Date(query.startDate);
            if (query.endDate)
                where.lessonDate.lte = new Date(query.endDate);
        }
        const page = query.page || 1, limit = query.limit || 20, skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.content.findMany({
                where,
                skip,
                take: limit,
                orderBy: { lessonDate: 'desc' },
                include: {
                    subject: true,
                    teacher: { select: { id: true, name: true, email: true } },
                    academicYear: true,
                    semester: true,
                    attachmentsNew: true,
                },
            }),
            this.prisma.content.count({ where }),
        ]);
        const resolvedData = role === 'PARENT' && parentChildMap
            ? data.flatMap((lesson) => {
                const matchingChildren = Array.from(parentChildMap.entries()).filter(([childUserId]) => parentClassScopes.get(childUserId)?.some((scope) => scope.grade === lesson.grade &&
                    scope.sectionName === lesson.sectionName));
                return matchingChildren.map(([_, child]) => ({
                    ...lesson,
                    section: lesson.sectionName,
                    homework: this.buildHomeworkFromLesson(lesson),
                    studentId: child.id,
                    studentName: child.name,
                    childGrade: lesson.grade,
                    childSection: lesson.sectionName,
                }));
            })
            : data.map((lesson) => ({
                ...lesson,
                section: lesson.sectionName,
                homework: this.buildHomeworkFromLesson(lesson),
            }));
        return {
            data: resolvedData,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async findOne(id, schoolId, role, userId) {
        const lesson = await this.prisma.content.findUnique({
            where: { id },
            include: {
                subject: true,
                teacher: { select: { id: true, name: true, email: true } },
                academicYear: true,
                semester: true,
                attachmentsNew: true,
            },
        });
        if (!lesson || lesson.type !== client_1.ContentType.LESSON)
            throw new common_1.NotFoundException('Not found');
        if (lesson.schoolId !== schoolId)
            throw new common_1.ForbiddenException('Access denied');
        if (role === 'TEACHER' &&
            lesson.teacherId !== userId &&
            lesson.status !== client_1.LessonStatus.PUBLISHED)
            throw new common_1.ForbiddenException('Access denied');
        if (role === 'STUDENT') {
            if (!this.getLearnerVisibleLessonStatuses().includes(lesson.status))
                throw new common_1.ForbiddenException('Not visible');
            const studentClass = await this.prisma.studentClass.findFirst({
                where: { studentId: userId, schoolId },
                include: { section: { include: { class: true } } },
            });
            if (!studentClass ||
                studentClass.section.class.grade !== lesson.grade ||
                studentClass.section.name !== lesson.sectionName) {
                throw new common_1.ForbiddenException('Access denied');
            }
        }
        if (role === 'PARENT') {
            if (!this.getLearnerVisibleLessonStatuses().includes(lesson.status))
                throw new common_1.ForbiddenException('Not visible');
            const parentProfile = await this.prisma.parentProfile.findFirst({
                where: { userId, schoolId },
            });
            if (!parentProfile)
                throw new common_1.ForbiddenException('Access denied');
            const childLinks = await this.prisma.parentStudent.findMany({
                where: { parentId: parentProfile.id, schoolId },
                include: { student: { include: { user: { select: { id: true, name: true } } } } },
            });
            const childUserIds = childLinks.map((link) => link.student.userId);
            const matchingClass = await this.prisma.studentClass.findFirst({
                where: {
                    studentId: { in: childUserIds },
                    schoolId,
                    section: { name: lesson.sectionName || undefined },
                    class: { grade: lesson.grade || undefined },
                },
            });
            if (!matchingClass)
                throw new common_1.ForbiddenException('Access denied');
        }
        return {
            ...lesson,
            section: lesson.sectionName,
            homework: this.buildHomeworkFromLesson(lesson),
        };
    }
    async update(id, data, teacherId, schoolId) {
        const lesson = await this.prisma.content.findFirst({
            where: { id, schoolId, type: client_1.ContentType.LESSON },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Not found');
        if (lesson.teacherId !== teacherId)
            throw new common_1.ForbiddenException('Only creator');
        return this.prisma.content.update({
            where: { id },
            data: {
                title: data.title,
                objective: data.objective,
                lessonContent: data.lessonContent,
                periodNumber: data.periodNumber,
                status: data.status,
            },
            include: {
                subject: true,
                teacher: { select: { id: true, name: true, email: true } },
                academicYear: true,
                semester: true,
                attachmentsNew: true,
            },
        });
    }
    async remove(id, teacherId, schoolId) {
        const lesson = await this.prisma.content.findFirst({
            where: { id, schoolId, type: client_1.ContentType.LESSON },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Not found');
        if (lesson.teacherId !== teacherId)
            throw new common_1.ForbiddenException('Only creator');
        if (lesson.status === client_1.LessonStatus.PUBLISHED)
            throw new common_1.BadRequestException('Cannot delete published');
        await this.prisma.content.delete({ where: { id } });
        return { message: 'Deleted' };
    }
};
exports.LessonService = LessonService;
exports.LessonService = LessonService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], LessonService);
//# sourceMappingURL=lesson.service.js.map