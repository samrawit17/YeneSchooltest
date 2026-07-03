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
const localization_1 = require("../core/localization");
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
    getDefaultPeriodOptions() {
        return Array.from({ length: 8 }, (_, index) => ({
            value: index + 1,
            label: `Period ${index + 1}`,
        }));
    }
    async getLessonPeriodOptions(schoolId) {
        const configuredPeriods = await this.prisma.periodTime.findMany({
            where: { schoolId },
            select: {
                periodNumber: true,
                startTime: true,
                endTime: true,
            },
            orderBy: { periodNumber: 'asc' },
        });
        if (configuredPeriods.length === 0) {
            return this.getDefaultPeriodOptions();
        }
        return configuredPeriods.map((period) => ({
            value: period.periodNumber,
            label: `Period ${period.periodNumber}`,
            startTime: period.startTime,
            endTime: period.endTime,
        }));
    }
    async assertValidLessonPeriod(schoolId, periodNumber) {
        if (!Number.isInteger(periodNumber) || (periodNumber ?? 0) < 1) {
            throw new localization_1.LocalizedException('lesson.a_valid_period_number_is_required_33484f91', undefined, undefined, 'A valid period number is required');
        }
        const configuredPeriods = await this.prisma.periodTime.findMany({
            where: { schoolId },
            select: { periodNumber: true },
            orderBy: { periodNumber: 'asc' },
        });
        if (configuredPeriods.length === 0) {
            if ((periodNumber ?? 0) > 8) {
                throw new localization_1.LocalizedException('lesson.this_period_is_not_available_configure_school_period_times_f_29481470', undefined, undefined, 'This period is not available. Configure school period times first.');
            }
            return;
        }
        const isConfigured = configuredPeriods.some((period) => period.periodNumber === periodNumber);
        if (!isConfigured) {
            const availablePeriods = configuredPeriods
                .map((period) => period.periodNumber)
                .join(', ');
            throw new localization_1.LocalizedException('lesson.period_is_not_configured_for_this_school_available_periods_907d68f3', undefined, undefined, 'Period ${periodNumber} is not configured for this school. Available periods: ${availablePeriods}');
        }
    }
    async getTeacherLessonAssignments(teacherId, schoolId) {
        const [classSubjects, timetableSlots] = await Promise.all([
            this.prisma.classSubject.findMany({
                where: {
                    teacherId,
                    class: { schoolId },
                },
                include: {
                    academicYearRelation: { select: { id: true, name: true, isActive: true } },
                    class: { select: { id: true, grade: true, academicYearId: true } },
                    section: { select: { id: true, name: true } },
                    subject: { select: { id: true, name: true, code: true } },
                },
            }),
            this.prisma.timetableSlot.findMany({
                where: {
                    schoolId,
                    teacherId,
                },
                include: {
                    academicYear: { select: { id: true, name: true, isActive: true } },
                    class: {
                        select: {
                            id: true,
                            grade: true,
                            academicYearId: true,
                            academicYear: { select: { id: true, name: true, isActive: true } },
                        },
                    },
                    section: { select: { id: true, name: true } },
                    subject: { select: { id: true, name: true, code: true } },
                },
            }),
        ]);
        const assignmentMap = new Map();
        for (const assignment of classSubjects) {
            if (assignment.class.grade === null)
                continue;
            const key = [
                assignment.classId,
                assignment.sectionId,
                assignment.subjectId,
                assignment.academicYear,
            ].join(':');
            assignmentMap.set(key, {
                id: assignment.subject.id,
                assignmentId: assignment.id,
                source: 'CLASS_SUBJECT',
                name: assignment.subject.name,
                code: assignment.subject.code || undefined,
                grade: assignment.class.grade,
                section: assignment.section.name,
                sectionId: assignment.section.id,
                classId: assignment.class.id,
                academicYearId: assignment.academicYear,
                academicYearName: assignment.academicYearRelation.name,
                isActiveAcademicYear: assignment.academicYearRelation.isActive,
            });
        }
        for (const slot of timetableSlots) {
            if (slot.class.grade === null)
                continue;
            const academicYear = slot.academicYear || slot.class.academicYear;
            const academicYearId = slot.academicYearId || slot.class.academicYearId;
            const key = [slot.classId, slot.sectionId, slot.subjectId, academicYearId].join(':');
            if (assignmentMap.has(key))
                continue;
            assignmentMap.set(key, {
                id: slot.subject.id,
                assignmentId: `timetable:${slot.id}`,
                source: 'TIMETABLE_SLOT',
                name: slot.subject.name,
                code: slot.subject.code || undefined,
                grade: slot.class.grade,
                section: slot.section.name,
                sectionId: slot.section.id,
                classId: slot.class.id,
                academicYearId,
                academicYearName: academicYear?.name,
                isActiveAcademicYear: academicYear?.isActive,
            });
        }
        return Array.from(assignmentMap.values()).sort((left, right) => Number(right.isActiveAcademicYear) - Number(left.isActiveAcademicYear) ||
            left.grade - right.grade ||
            left.section.localeCompare(right.section) ||
            left.name.localeCompare(right.name));
    }
    async teacherCanCreateLessonForAssignment(teacherId, schoolId, classId, sectionId, subjectId, academicYearId) {
        const classSubject = await this.prisma.classSubject.findFirst({
            where: {
                classId,
                sectionId,
                subjectId,
                teacherId,
                academicYear: academicYearId,
            },
        });
        if (classSubject)
            return true;
        const timetableSlot = await this.prisma.timetableSlot.findFirst({
            where: {
                schoolId,
                classId,
                sectionId,
                subjectId,
                teacherId,
                OR: [
                    { academicYearId },
                    { academicYearId: null, class: { academicYearId } },
                ],
            },
            select: { id: true },
        });
        return Boolean(timetableSlot);
    }
    async getFormData(teacherId, schoolId) {
        const [activeYear, periods] = await Promise.all([
            this.prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
            }),
            this.getLessonPeriodOptions(schoolId),
        ]);
        const [teacherSubjects, academicYears] = await Promise.all([
            this.getTeacherLessonAssignments(teacherId, schoolId),
            this.prisma.academicYear.findMany({
                where: { schoolId },
                orderBy: { startDate: 'desc' },
            }),
        ]);
        const teacherGrades = [
            ...new Set(teacherSubjects.map((assignment) => assignment.grade)),
        ].sort((left, right) => left - right);
        const sectionsByGrade = {};
        teacherSubjects.forEach((assignment) => {
            if (!sectionsByGrade[assignment.grade])
                sectionsByGrade[assignment.grade] = [];
            const existing = sectionsByGrade[assignment.grade].some((section) => section.id === assignment.sectionId);
            if (!existing) {
                sectionsByGrade[assignment.grade].push({
                    id: assignment.sectionId,
                    name: assignment.section,
                    classId: assignment.classId,
                });
            }
        });
        if (!activeYear) {
            return {
                academicYears: academicYears.map(ay => ({ id: ay.id, name: ay.name, isActive: ay.isActive })),
                activeAcademicYearId: null,
                terms: [],
                grades: teacherGrades,
                sectionsByGrade,
                allSubjects: teacherSubjects,
                teacherSubjects,
                periods,
            };
        }
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
            periods,
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
                academicYearId: data.academicYearId,
            },
        });
        if (!classRecord)
            throw new localization_1.LocalizedException('lesson.class_not_found_for_grade_2d1f2d09', undefined, common_1.HttpStatus.NOT_FOUND, 'Class not found for grade ${data.grade}');
        const sectionRecord = await this.prisma.section.findFirst({
            where: {
                name: data.section,
                classId: classRecord.id,
            },
        });
        if (!sectionRecord)
            throw new localization_1.LocalizedException('lesson.section_not_found_for_grade_65bebebf', undefined, common_1.HttpStatus.NOT_FOUND, 'Section ${data.section} not found for grade ${data.grade}');
        const canCreateForAssignment = await this.teacherCanCreateLessonForAssignment(teacherId, schoolId, classRecord.id, sectionRecord.id, data.subjectId, data.academicYearId);
        if (!canCreateForAssignment) {
            throw new localization_1.LocalizedException('lesson.you_can_only_create_lessons_for_your_assigned_class_section__83d7e8f6', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only create lessons for your assigned class, section, and subject');
        }
        const lessonDate = new Date(data.lessonDate);
        const dayOfWeek = this.getDayOfWeek(lessonDate);
        await this.assertValidLessonPeriod(schoolId, data.periodNumber);
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
        throw new localization_1.LocalizedException('lesson.lesson_already_exists_c3540565', undefined, undefined, 'Lesson already exists');
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
                resources = await Promise.all(data.resources.map((resource) => tx.contentResource.create({
                    data: {
                        contentId: lesson.id,
                        schoolId,
                        title: resource.title,
                        description: resource.description,
                        resourceType: resource.resourceType,
                        fileUrl: resource.fileUrl,
                        fileName: resource.fileName,
                        fileSize: resource.fileSize,
                        mimeType: resource.mimeType,
                        isLocked: resource.isLocked || false,
                        uploadedBy: teacherId,
                    },
                })));
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
            throw new localization_1.LocalizedException('lesson.lesson_not_found_e459bc16', undefined, common_1.HttpStatus.NOT_FOUND, 'Lesson not found');
        if (lesson.teacherId !== teacherId)
            throw new localization_1.LocalizedException('lesson.only_creator_can_update_660427ea', undefined, common_1.HttpStatus.FORBIDDEN, 'Only creator can update');
        if ([client_1.LessonStatus.PUBLISHED, 'PENDING_REVIEW'].includes(lesson.status))
            throw new localization_1.LocalizedException('lesson.cannot_update_lessons_that_are_pending_review_or_published_866ce81b', undefined, undefined, 'Cannot update lessons that are pending review or published');
        if (data.periodNumber !== undefined) {
            await this.assertValidLessonPeriod(schoolId, data.periodNumber);
        }
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
            throw new localization_1.LocalizedException('lesson.lesson_not_found_e459bc16', undefined, common_1.HttpStatus.NOT_FOUND, 'Lesson not found');
        if (lesson.schoolId !== schoolId)
            throw new localization_1.LocalizedException('lesson.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        if (lesson.teacherId !== teacherId)
            throw new localization_1.LocalizedException('lesson.only_creator_can_submit_4b55f2d8', undefined, common_1.HttpStatus.FORBIDDEN, 'Only creator can submit');
        if (lesson.status !== client_1.LessonStatus.DRAFT)
            throw new localization_1.LocalizedException('lesson.only_draft_lessons_can_be_submitted_9b4af7b6', undefined, undefined, 'Only draft lessons can be submitted');
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
            throw new localization_1.LocalizedException('lesson.lesson_not_found_e459bc16', undefined, common_1.HttpStatus.NOT_FOUND, 'Lesson not found');
        if (lesson.schoolId !== schoolId)
            throw new localization_1.LocalizedException('lesson.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        if (lesson.status !== 'PENDING_REVIEW')
            throw new localization_1.LocalizedException('lesson.only_pending_review_can_be_approved_7a82e0f4', undefined, undefined, 'Only pending review can be approved');
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
            const parentUserIds = new Set();
            for (const sc of studentClasses) {
                const parentLinks = await this.prisma.parentStudent.findMany({
                    where: { student: { userId: sc.studentId }, schoolId: lesson.schoolId },
                    select: { parent: { select: { userId: true } } },
                });
                parentLinks.forEach((pl) => {
                    if (pl.parent?.userId)
                        parentUserIds.add(pl.parent.userId);
                });
            }
            const userIds = Array.from(parentUserIds);
            if (userIds.length > 0) {
                await this.notificationService.createBulkNotifications({
                    schoolId: lesson.schoolId,
                    userIds,
                    title: 'New Lesson Published',
                    message: `New lesson: ${lesson.title} for Grade ${lesson.grade} ${lesson.sectionName} by ${lesson.teacher?.name || 'Teacher'}`,
                    type: 'LESSON',
                    actionUrl: `/parent/lessons/${lesson.id}`,
                    metadata: {
                        lessonId: lesson.id,
                        lessonTitle: lesson.title,
                        grade: lesson.grade,
                        section: lesson.sectionName,
                        subjectId: lesson.subjectId,
                        subjectName: lesson.subject?.name || 'lesson',
                        teacherName: lesson.teacher?.name || 'Teacher',
                    },
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
                lessonTitle: lesson.title,
                grade: lesson.grade,
                section: lesson.sectionName,
                subjectId: lesson.subjectId,
                subjectName,
                teacherName: lesson.teacher?.name || 'Teacher',
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
                    actionUrl: `/student/lessons/${lesson.id}`,
                    metadata,
                });
            }
            const uniqueParentUserIds = Array.from(new Set(parentLinks.map((link) => link.parent.userId).filter(Boolean)));
            if (uniqueParentUserIds.length > 0) {
                await this.notificationService.createBulkNotifications({
                    schoolId: lesson.schoolId,
                    userIds: uniqueParentUserIds,
                    title: 'New Lesson Created',
                    message,
                    type: notification_service_1.NotificationType.LESSON,
                    actionUrl: `/parent/lessons/${lesson.id}`,
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
            throw new localization_1.LocalizedException('lesson.lesson_not_found_e459bc16', undefined, common_1.HttpStatus.NOT_FOUND, 'Lesson not found');
        if (lesson.schoolId !== schoolId)
            throw new localization_1.LocalizedException('lesson.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        if (lesson.status !== 'PENDING_REVIEW')
            throw new localization_1.LocalizedException('lesson.only_pending_review_can_be_rejected_4a8ef4ff', undefined, undefined, 'Only pending review can be rejected');
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
                submissions: {
                    where: { studentId },
                    take: 1,
                },
            },
        });
        if (!lesson || lesson.type !== client_1.ContentType.LESSON)
            throw new localization_1.LocalizedException('lesson.lesson_not_found_e459bc16', undefined, common_1.HttpStatus.NOT_FOUND, 'Lesson not found');
        const homework = this.buildHomeworkFromLesson(lesson);
        const submission = lesson.submissions[0] || null;
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
        const homework = await this.prisma.content.findFirst({
            where: {
                id: homeworkId,
                type: client_1.ContentType.LESSON,
            },
        });
        throw new localization_1.LocalizedException('lesson.homework_not_found_ab4f0e59', undefined, common_1.HttpStatus.NOT_FOUND, 'Homework not found');
        if (!this.buildHomeworkFromLesson(homework)) {
            throw new localization_1.LocalizedException('lesson.this_lesson_does_not_have_homework_7d413af1', undefined, undefined, 'This lesson does not have homework');
        }
        const existing = await this.prisma.contentSubmission.findUnique({
            where: { contentId_studentId: { contentId: homeworkId, studentId } },
        });
        if (existing) {
            return this.prisma.contentSubmission.update({
                where: { id: existing.id },
                data: {
                    submissionUrl: data.submissionUrl,
                    submissionText: data.submissionText,
                    submittedAt: new Date(),
                    status: 'SUBMITTED',
                },
            });
        }
        return this.prisma.contentSubmission.create({
            data: {
                contentId: homeworkId,
                studentId,
                submissionUrl: data.submissionUrl,
                submissionText: data.submissionText,
                submittedAt: new Date(),
                status: 'SUBMITTED',
            },
        });
    }
    async gradeHomework(submissionId, teacherId, data) {
        const submission = await this.prisma.contentSubmission.findUnique({
            where: { id: submissionId },
            include: { content: true },
        });
        throw new localization_1.LocalizedException('lesson.submission_not_found_0e3901c5', undefined, common_1.HttpStatus.NOT_FOUND, 'Submission not found');
        if (submission.content.type !== client_1.ContentType.LESSON) {
            throw new localization_1.LocalizedException('lesson.submission_is_not_for_a_lesson_homework_a9690116', undefined, undefined, 'Submission is not for a lesson homework');
        }
        if (submission.content.teacherId !== teacherId) {
            throw new localization_1.LocalizedException('lesson.only_the_lesson_teacher_can_grade_this_submission_29961945', undefined, common_1.HttpStatus.FORBIDDEN, 'Only the lesson teacher can grade this submission');
        }
        return this.prisma.contentSubmission.update({
            where: { id: submissionId },
            data: {
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
        throw new localization_1.LocalizedException('lesson.class_not_found_7fd09a97', undefined, common_1.HttpStatus.NOT_FOUND, 'Class not found');
        const sectionRecord = await this.prisma.section.findFirst({
            where: { name: data.section, classId: classRecord.id },
        });
        throw new localization_1.LocalizedException('lesson.section_not_found_f649d604', undefined, common_1.HttpStatus.NOT_FOUND, 'Section not found');
        const classSubject = await this.prisma.classSubject.findFirst({
            where: {
                subjectId: data.subjectId,
                classId: classRecord.id,
                sectionId: sectionRecord.id,
                teacherId,
            },
        });
        throw new localization_1.LocalizedException('lesson.not_assigned_63d8c71d', undefined, common_1.HttpStatus.FORBIDDEN, 'Not assigned');
        const existing = await this.prisma.content.findFirst({
            where: {
                schoolId,
                subjectId: data.subjectId,
                teacherId,
                lessonDate: new Date(data.lessonDate),
                periodNumber: data.periodNumber,
            },
        });
        throw new localization_1.LocalizedException('lesson.lesson_exists_6de939a6', undefined, undefined, 'Lesson exists');
        const lesson = await this.prisma.content.create({
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
                description: data.description,
                instructions: data.instructions,
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
        await this.notifyLessonCreated(lesson);
        return lesson;
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
        if (query.academicYearId)
            where.academicYearId = query.academicYearId;
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
            throw new localization_1.LocalizedException('lesson.not_found_9e076f58', undefined, common_1.HttpStatus.NOT_FOUND, 'Not found');
        if (lesson.schoolId !== schoolId)
            throw new localization_1.LocalizedException('lesson.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        if (role === 'TEACHER' &&
            lesson.teacherId !== userId &&
            lesson.status !== client_1.LessonStatus.PUBLISHED)
            throw new localization_1.LocalizedException('lesson.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
        if (role === 'STUDENT') {
            if (!this.getLearnerVisibleLessonStatuses().includes(lesson.status))
                throw new localization_1.LocalizedException('lesson.not_visible_f6730d9e', undefined, common_1.HttpStatus.FORBIDDEN, 'Not visible');
            const studentClass = await this.prisma.studentClass.findFirst({
                where: { studentId: userId, schoolId },
                include: { section: { include: { class: true } } },
            });
            if (!studentClass ||
                studentClass.section.class.grade !== lesson.grade ||
                studentClass.section.name !== lesson.sectionName) {
                throw new localization_1.LocalizedException('lesson.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
            }
        }
        if (role === 'PARENT') {
            if (!this.getLearnerVisibleLessonStatuses().includes(lesson.status))
                throw new localization_1.LocalizedException('lesson.not_visible_f6730d9e', undefined, common_1.HttpStatus.FORBIDDEN, 'Not visible');
            const parentProfile = await this.prisma.parentProfile.findFirst({
                where: { userId, schoolId },
            });
            throw new localization_1.LocalizedException('lesson.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
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
            throw new localization_1.LocalizedException('lesson.access_denied_08de2fda', undefined, common_1.HttpStatus.FORBIDDEN, 'Access denied');
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
            throw new localization_1.LocalizedException('lesson.not_found_9e076f58', undefined, common_1.HttpStatus.NOT_FOUND, 'Not found');
        if (lesson.teacherId !== teacherId)
            throw new localization_1.LocalizedException('lesson.only_creator_a9e6ff97', undefined, common_1.HttpStatus.FORBIDDEN, 'Only creator');
        if (data.periodNumber !== undefined) {
            await this.assertValidLessonPeriod(schoolId, data.periodNumber);
        }
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
            throw new localization_1.LocalizedException('lesson.not_found_9e076f58', undefined, common_1.HttpStatus.NOT_FOUND, 'Not found');
        if (lesson.teacherId !== teacherId)
            throw new localization_1.LocalizedException('lesson.only_creator_a9e6ff97', undefined, common_1.HttpStatus.FORBIDDEN, 'Only creator');
        if ([client_1.LessonStatus.PUBLISHED, 'PENDING_REVIEW'].includes(lesson.status))
            throw new localization_1.LocalizedException('lesson.cannot_delete_lessons_that_are_pending_review_or_published_0bb77bda', undefined, undefined, 'Cannot delete lessons that are pending review or published');
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