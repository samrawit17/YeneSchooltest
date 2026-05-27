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
exports.AssessmentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
const DEFAULT_ASSESSMENT_WEIGHTS = {
    QUIZ: 20,
    TEST: 20,
    MID: 30,
    FINAL: 30,
    ATTENDANCE: 0,
};
const TEACHER_MANAGED_ASSESSMENT_TYPES = new Set(['QUIZ', 'TEST']);
const READ_ONLY_ASSESSMENT_TYPES = new Set(['MID', 'FINAL']);
const CALENDAR_DEFAULT_ASSESSMENT_TYPES = new Set([
    'MID',
    'MID_EXAM',
    'FINAL',
    'FINAL_EXAM',
    'TEST',
]);
let AssessmentsService = class AssessmentsService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async getWeightMap(schoolId) {
        const configured = await this.prisma.assessmentWeight.findMany({
            where: { schoolId, isActive: true },
        });
        const merged = { ...DEFAULT_ASSESSMENT_WEIGHTS };
        for (const row of configured) {
            merged[row.type] = row.percentage;
        }
        return merged;
    }
    getEffectiveMaxScore(storedMaxScore, assessmentType, weights) {
        const configuredMax = weights[String(assessmentType).toUpperCase()];
        if (storedMaxScore === 100 &&
            configuredMax !== undefined &&
            configuredMax > 0 &&
            configuredMax <= 100) {
            return configuredMax;
        }
        return storedMaxScore;
    }
    buildTypeScoreMap(items) {
        const byType = new Map();
        for (const item of items) {
            if (item.isAbsent || item.score === null)
                continue;
            const normalizedType = String(item.type).toUpperCase();
            const normalizedScore = item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0;
            const bucket = byType.get(normalizedType) ?? [];
            bucket.push(Math.max(0, Math.min(100, normalizedScore)));
            byType.set(normalizedType, bucket);
        }
        return byType;
    }
    average(values) {
        return values.length
            ? values.reduce((sum, value) => sum + value, 0) / values.length
            : null;
    }
    isAssessmentDue(startDate) {
        return startDate.getTime() <= Date.now();
    }
    shouldAddAssessmentToCalendar(type, addToCalendar) {
        if (typeof addToCalendar === 'boolean') {
            return addToCalendar;
        }
        return CALENDAR_DEFAULT_ASSESSMENT_TYPES.has(String(type).toUpperCase());
    }
    formatAssessmentTypeLabel(type) {
        return String(type)
            .toLowerCase()
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
    async notifyTeachersForAssessmentStart(schoolId, assessment, subjects) {
        if (!this.isAssessmentDue(assessment.startDate)) {
            return;
        }
        for (const item of subjects) {
            if (!item.teacherId)
                continue;
            const existing = await this.prisma.notification.findFirst({
                where: {
                    schoolId,
                    userId: item.teacherId,
                    type: 'ASSESSMENT_CREATED',
                    metadata: {
                        contains: `"assessmentSubjectId":"${item.id}"`,
                    },
                },
                select: { id: true },
            });
            if (existing)
                continue;
            await this.notificationService.notifyAssessmentStarted(schoolId, [item.teacherId], assessment.title, assessment.type, item.className, item.subjectName, {
                assessmentId: assessment.id,
                assessmentSubjectId: item.id,
                startDate: assessment.startDate.toISOString(),
            });
        }
    }
    async notifyDueAssessmentStarts() {
        const dueSubjects = await this.prisma.assessmentSubject.findMany({
            where: {
                teacherId: { not: null },
                assessment: {
                    status: client_1.AssessmentStatus.ACTIVE,
                    startDate: { lte: new Date() },
                },
            },
            include: {
                assessment: {
                    select: {
                        id: true,
                        schoolId: true,
                        title: true,
                        type: true,
                        startDate: true,
                    },
                },
                class: { select: { name: true } },
                subject: { select: { name: true } },
            },
        });
        for (const item of dueSubjects) {
            await this.notifyTeachersForAssessmentStart(item.assessment.schoolId, item.assessment, [
                {
                    id: item.id,
                    teacherId: item.teacherId,
                    className: item.class.name,
                    subjectName: item.subject.name,
                },
            ]);
        }
    }
    computeWeightedAssessmentSummary(byType, weights) {
        let total = 0;
        let hasAny = false;
        for (const [type, percentage] of Object.entries(weights)) {
            const average = this.average(byType.get(String(type).toUpperCase()) ?? []);
            if (average !== null) {
                hasAny = true;
                total += average * (percentage / 100);
            }
        }
        const quizAverage = this.average(byType.get('QUIZ') ?? []);
        const testAverage = this.average(byType.get('TEST') ?? []);
        const midAverage = this.average(byType.get('MID') ?? []);
        const finalAverage = this.average(byType.get('FINAL') ?? []);
        const caContributors = Array.from(byType.entries()).filter(([type]) => !['MID', 'FINAL', 'ATTENDANCE'].includes(type));
        const caWeightedTotal = caContributors.reduce((sum, [type, values]) => {
            const average = this.average(values);
            const weight = weights[type] ?? 0;
            return average === null ? sum : sum + average * weight;
        }, 0);
        const caWeightTotal = caContributors.reduce((sum, [type, values]) => this.average(values) === null ? sum : sum + (weights[type] ?? 0), 0);
        return {
            totalScore: hasAny ? Math.round(total * 100) / 100 : null,
            caScore: caWeightTotal > 0
                ? Math.round((caWeightedTotal / caWeightTotal) * 100) / 100
                : null,
            midScore: midAverage !== null ? Math.round(midAverage * 100) / 100 : null,
            finalScore: finalAverage !== null ? Math.round(finalAverage * 100) / 100 : null,
            quizAverage,
            testAverage,
            midAverage,
            finalAverage,
            hasAny,
        };
    }
    async getGradeFromScore(schoolId, score) {
        const customScale = await this.prisma.gradeScale.findMany({
            where: { schoolId, isActive: true },
            orderBy: { minScore: 'desc' },
        });
        const match = customScale.find((scale) => score >= scale.minScore && score <= scale.maxScore);
        if (match) {
            return {
                gradeLetter: match.gradeLetter,
                gradePoint: match.gradePoint,
            };
        }
        if (score >= 85)
            return { gradeLetter: 'A', gradePoint: 4.0 };
        if (score >= 75)
            return { gradeLetter: 'B', gradePoint: 3.0 };
        if (score >= 60)
            return { gradeLetter: 'C', gradePoint: 2.0 };
        if (score >= 50)
            return { gradeLetter: 'D', gradePoint: 1.0 };
        return { gradeLetter: 'F', gradePoint: 0 };
    }
    async resolveChildStudentForParent(parentUserId, childIdOrUserId) {
        const parentProfile = await this.prisma.parentProfile.findUnique({
            where: { userId: parentUserId },
            select: { id: true },
        });
        if (!parentProfile) {
            throw new common_1.NotFoundException('Parent profile not found');
        }
        const studentProfile = await this.prisma.studentProfile.findFirst({
            where: {
                OR: [{ id: childIdOrUserId }, { userId: childIdOrUserId }],
            },
            select: { id: true, userId: true },
        });
        if (!studentProfile) {
            throw new common_1.NotFoundException('Student not found');
        }
        const parentStudent = await this.prisma.parentStudent.findFirst({
            where: {
                parentId: parentProfile.id,
                studentId: studentProfile.id,
            },
            select: { id: true },
        });
        if (!parentStudent) {
            throw new common_1.ForbiddenException('You are not linked to this student');
        }
        return studentProfile.userId;
    }
    async validateAssessmentContext(schoolId, dto) {
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { id: dto.academicYearId, schoolId },
            select: { id: true },
        });
        if (!academicYear) {
            throw new common_1.NotFoundException('Academic year not found');
        }
        if (dto.termId) {
            const term = await this.prisma.term.findFirst({
                where: { id: dto.termId, academicYearId: dto.academicYearId },
                select: { id: true },
            });
            if (!term) {
                throw new common_1.NotFoundException('Term not found for academic year');
            }
        }
        if (new Date(dto.endDate) < new Date(dto.startDate)) {
            throw new common_1.BadRequestException('End date cannot be before start date');
        }
    }
    async resolveTeacherAssignment(teacherId, academicYearId, subject) {
        const explicit = await this.prisma.teacherSubjectAssignment.findFirst({
            where: {
                teacherId,
                academicYear: academicYearId,
                classId: subject.classId,
                sectionId: subject.sectionId,
                subjectId: subject.subjectId,
                isActive: true,
            },
            select: { id: true },
        });
        if (explicit)
            return teacherId;
        const classSubject = await this.prisma.classSubject.findFirst({
            where: {
                academicYear: academicYearId,
                classId: subject.classId,
                sectionId: subject.sectionId,
                subjectId: subject.subjectId,
                teacherId,
            },
            select: { id: true },
        });
        if (classSubject)
            return teacherId;
        throw new common_1.ForbiddenException('You are not assigned to one or more selected subjects');
    }
    async ensureAssessmentWriteAccess(schoolId, userId, role, assessmentId) {
        const assessment = await this.prisma.assessment.findFirst({
            where: { id: assessmentId, schoolId },
        });
        if (!assessment) {
            throw new common_1.NotFoundException('Assessment not found');
        }
        if (assessment.status === client_1.AssessmentStatus.LOCKED) {
            throw new common_1.ForbiddenException('Assessment is locked');
        }
        if (role === 'TEACHER' &&
            (assessment.createdBy !== userId ||
                !TEACHER_MANAGED_ASSESSMENT_TYPES.has(String(assessment.type).toUpperCase()))) {
            throw new common_1.ForbiddenException('Teachers can only manage their own quiz and test assessments');
        }
        return assessment;
    }
    async ensureTeacherCanScore(teacherId, assessmentSubjectId, schoolId) {
        const assessmentSubject = await this.prisma.assessmentSubject.findFirst({
            where: {
                id: assessmentSubjectId,
                assessment: { schoolId },
            },
            include: {
                assessment: true,
                subject: { select: { id: true, name: true } },
                class: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
            },
        });
        if (!assessmentSubject) {
            throw new common_1.NotFoundException('Assessment subject not found');
        }
        if (assessmentSubject.teacherId === teacherId) {
            return assessmentSubject;
        }
        const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
            where: {
                teacherId,
                academicYear: assessmentSubject.assessment.academicYearId,
                subjectId: assessmentSubject.subjectId,
                classId: assessmentSubject.classId,
                isActive: true,
            },
            select: { sectionId: true },
        });
        if (assignment?.sectionId) {
            const section = await this.prisma.section.findUnique({
                where: { id: assignment.sectionId },
                select: { id: true, name: true },
            });
            return { ...assessmentSubject, section };
        }
        await this.resolveTeacherAssignment(teacherId, assessmentSubject.assessment.academicYearId, {
            subjectId: assessmentSubject.subjectId,
            classId: assessmentSubject.classId,
            sectionId: assessmentSubject.sectionId ?? undefined,
            gradeLevelId: assessmentSubject.gradeLevelId ?? undefined,
            maxScore: assessmentSubject.maxScore,
        });
        return assessmentSubject;
    }
    async syncSubjectGradeForStudent(assessmentSubjectId, studentId) {
        const assessmentSubject = await this.prisma.assessmentSubject.findUnique({
            where: { id: assessmentSubjectId },
            include: {
                assessment: true,
            },
        });
        if (!assessmentSubject?.assessment.termId) {
            return null;
        }
        const academicYearRecord = await this.prisma.academicYear.findUnique({
            where: { id: assessmentSubject.assessment.academicYearId },
            select: { name: true },
        });
        const studentClass = await this.prisma.studentClass.findFirst({
            where: {
                studentId,
                classId: assessmentSubject.classId,
                academicYear: academicYearRecord?.name || assessmentSubject.assessment.academicYearId,
            },
            select: { sectionId: true },
        });
        const resolvedSectionId = assessmentSubject.sectionId ?? studentClass?.sectionId;
        if (!resolvedSectionId) {
            throw new common_1.BadRequestException('Student section could not be resolved for subject grade sync');
        }
        const scoreRows = await this.prisma.studentAssessmentScore.findMany({
            where: {
                studentId,
                assessmentSubject: {
                    subjectId: assessmentSubject.subjectId,
                    classId: assessmentSubject.classId,
                    sectionId: assessmentSubject.sectionId,
                    assessment: {
                        schoolId: assessmentSubject.assessment.schoolId,
                        academicYearId: assessmentSubject.assessment.academicYearId,
                        termId: assessmentSubject.assessment.termId,
                    },
                },
            },
            include: {
                assessmentSubject: {
                    include: {
                        assessment: true,
                    },
                },
            },
        });
        const weights = await this.getWeightMap(assessmentSubject.assessment.schoolId);
        const summary = this.computeWeightedAssessmentSummary(this.buildTypeScoreMap(scoreRows.map((row) => ({
            type: row.assessmentSubject.assessment.type,
            score: row.score,
            maxScore: row.assessmentSubject.maxScore,
            isAbsent: row.isAbsent,
        }))), weights);
        const totalScore = summary.totalScore;
        const { gradeLetter, gradePoint } = totalScore === null
            ? { gradeLetter: null, gradePoint: null }
            : await this.getGradeFromScore(assessmentSubject.assessment.schoolId, totalScore);
        return this.prisma.subjectGrade.upsert({
            where: {
                studentId_subjectId_academicYear_termId: {
                    studentId,
                    subjectId: assessmentSubject.subjectId,
                    academicYear: assessmentSubject.assessment.academicYearId,
                    termId: assessmentSubject.assessment.termId,
                },
            },
            update: {
                classId: assessmentSubject.classId,
                sectionId: resolvedSectionId,
                teacherId: assessmentSubject.teacherId,
                caScore: summary.caScore,
                midScore: summary.midScore,
                finalScore: summary.finalScore,
                totalScore,
                gradeLetter,
                gradePoint,
            },
            create: {
                schoolId: assessmentSubject.assessment.schoolId,
                studentId,
                subjectId: assessmentSubject.subjectId,
                classId: assessmentSubject.classId,
                sectionId: resolvedSectionId,
                academicYear: assessmentSubject.assessment.academicYearId,
                termId: assessmentSubject.assessment.termId,
                teacherId: assessmentSubject.teacherId,
                caScore: summary.caScore,
                midScore: summary.midScore,
                finalScore: summary.finalScore,
                totalScore,
                gradeLetter,
                gradePoint,
            },
        });
    }
    async createAssessmentSubjects(assessmentId, academicYearId, subjects, actorId, role) {
        const subjectIds = subjects.map((s) => s.subjectId);
        const classIds = subjects.map((s) => s.classId);
        const sectionIds = subjects.filter((s) => s.sectionId).map((s) => s.sectionId);
        const [subjectsFound, classesFound] = await Promise.all([
            this.prisma.subject.findMany({
                where: { id: { in: subjectIds } },
                select: { id: true },
            }),
            this.prisma.class.findMany({
                where: { id: { in: classIds } },
                select: { id: true, gradeId: true },
            }),
        ]);
        const subjectSet = new Set(subjectsFound.map((s) => s.id));
        const classMap = new Map(classesFound.map((c) => [c.id, c]));
        for (const item of subjects) {
            if (!subjectSet.has(item.subjectId)) {
                throw new common_1.NotFoundException('Subject not found');
            }
            const classRecord = classMap.get(item.classId);
            if (!classRecord) {
                throw new common_1.NotFoundException('Class not found');
            }
        }
        let sectionsFound = [];
        if (sectionIds.length > 0) {
            sectionsFound = await this.prisma.section.findMany({
                where: { id: { in: sectionIds } },
                select: { id: true, classId: true },
            });
        }
        const sectionMap = new Map(sectionsFound.map((s) => [s.id, s]));
        const classNamesMap = new Map();
        const subjectNamesMap = new Map();
        if (role === 'TEACHER') {
            for (const item of subjects) {
                await this.resolveTeacherAssignment(actorId, academicYearId, item);
            }
        }
        const [subjectsWithNames, classesWithNames] = await Promise.all([
            this.prisma.subject.findMany({
                where: { id: { in: subjectIds } },
                select: { id: true, name: true },
            }),
            this.prisma.class.findMany({
                where: { id: { in: classIds } },
                select: { id: true, name: true },
            }),
        ]);
        for (const s of subjectsWithNames) {
            subjectNamesMap.set(s.id, s.name);
        }
        for (const c of classesWithNames) {
            classNamesMap.set(c.id, c.name);
        }
        const createdRecords = await this.prisma.$transaction(subjects.map((item) => {
            const classRecord = classMap.get(item.classId);
            return this.prisma.assessmentSubject.create({
                data: {
                    assessmentId,
                    subjectId: item.subjectId,
                    classId: item.classId,
                    sectionId: item.sectionId,
                    gradeLevelId: item.gradeLevelId ?? classRecord.gradeId ?? undefined,
                    teacherId: role === 'TEACHER' ? actorId : item.teacherId,
                    maxScore: item.maxScore,
                    passMark: item.passMark,
                },
            });
        }));
        return createdRecords.map((c) => ({
            id: c.id,
            classId: c.classId,
            subjectId: c.subjectId,
            teacherId: c.teacherId,
            className: classNamesMap.get(c.classId) ?? 'Unknown Class',
            subjectName: subjectNamesMap.get(c.subjectId) ?? 'Unknown Subject',
        }));
    }
    async attachFallbackTeachersToAssessments(assessments) {
        const missing = assessments.flatMap((assessment) => (assessment.subjects || [])
            .filter((subject) => !subject.teacherId)
            .map((subject) => ({
            subjectId: subject.subjectId,
            classId: subject.classId,
            sectionId: subject.sectionId ?? null,
            academicYearId: assessment.academicYearId,
        })));
        if (missing.length === 0) {
            return assessments;
        }
        const fallbackAssignments = await Promise.all(missing.map((item) => this.prisma.classSubject.findFirst({
            where: {
                academicYear: item.academicYearId,
                classId: item.classId,
                sectionId: item.sectionId ?? undefined,
                subjectId: item.subjectId,
                teacherId: { not: null },
            },
            include: {
                teacher: {
                    select: { id: true, name: true },
                },
            },
        })));
        const fallbackMap = new Map();
        for (let index = 0; index < missing.length; index += 1) {
            const assignment = fallbackAssignments[index];
            if (!assignment?.teacher)
                continue;
            const item = missing[index];
            const key = `${item.academicYearId}:${item.classId}:${item.sectionId ?? "null"}:${item.subjectId}`;
            fallbackMap.set(key, assignment.teacher);
        }
        return assessments.map((assessment) => ({
            ...assessment,
            subjects: (assessment.subjects || []).map((subject) => {
                if (subject.teacher)
                    return subject;
                const key = `${assessment.academicYearId}:${subject.classId}:${subject.sectionId ?? "null"}:${subject.subjectId}`;
                const teacher = fallbackMap.get(key);
                return teacher ? { ...subject, teacherId: teacher.id, teacher } : subject;
            }),
        }));
    }
    async createAssessment(schoolId, userId, role, dto) {
        if (role === 'TEACHER' &&
            !TEACHER_MANAGED_ASSESSMENT_TYPES.has(String(dto.type).toUpperCase())) {
            throw new common_1.ForbiddenException('Teachers can only create quizzes and tests');
        }
        await this.validateAssessmentContext(schoolId, dto);
        const assessmentData = {
            schoolId,
            academicYearId: dto.academicYearId,
            termId: dto.termId ?? null,
            title: dto.title,
            type: dto.type,
            status: client_1.AssessmentStatus.ACTIVE,
            startDate: new Date(dto.startDate),
            endDate: new Date(dto.endDate),
            createdBy: userId,
        };
        const assessment = await this.prisma.$transaction(async (tx) => {
            const createdAssessment = await tx.assessment.create({
                data: assessmentData,
            });
            if (!this.shouldAddAssessmentToCalendar(dto.type, dto.addToCalendar)) {
                return createdAssessment;
            }
            const calendarEvent = await tx.schoolEvent.create({
                data: {
                    schoolId,
                    createdById: userId,
                    title: dto.title,
                    description: `${this.formatAssessmentTypeLabel(dto.type)} scheduled for score entry and school calendar visibility.`,
                    startDate: new Date(dto.startDate),
                    endDate: new Date(dto.endDate),
                    audience: JSON.stringify(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']),
                    category: 'ACADEMIC',
                    color: '#e35336',
                },
                select: { id: true },
            });
            return tx.assessment.update({
                where: { id: createdAssessment.id },
                data: { calendarEventId: calendarEvent.id },
            });
        });
        if (dto.subjects?.length) {
            const createdSubjects = await this.createAssessmentSubjects(assessment.id, dto.academicYearId, dto.subjects, userId, role);
            await this.notifyTeachersForAssessmentStart(schoolId, assessment, createdSubjects);
        }
        return this.getAssessmentById(schoolId, assessment.id);
    }
    async addSubjects(schoolId, userId, role, assessmentId, dto) {
        const assessment = await this.ensureAssessmentWriteAccess(schoolId, userId, role, assessmentId);
        const createdSubjects = await this.createAssessmentSubjects(assessment.id, assessment.academicYearId, dto.subjects, userId, role);
        await this.notifyTeachersForAssessmentStart(schoolId, assessment, createdSubjects);
        return this.getAssessmentById(schoolId, assessmentId);
    }
    async getAssessmentById(schoolId, id) {
        const assessment = await this.prisma.assessment.findFirst({
            where: { id, schoolId },
            include: {
                academicYear: { select: { id: true, name: true } },
                term: { select: { id: true, name: true, order: true } },
                creator: { select: { id: true, name: true } },
                subjects: {
                    include: {
                        class: { select: { id: true, name: true } },
                        section: { select: { id: true, name: true } },
                        subject: { select: { id: true, name: true } },
                        teacher: { select: { id: true, name: true } },
                        _count: { select: { scores: true } },
                    },
                },
            },
        });
        if (!assessment) {
            throw new common_1.NotFoundException('Assessment not found');
        }
        return assessment;
    }
    async listAssessments(schoolId, query) {
        const where = { schoolId };
        if (query.academicYearId)
            where.academicYearId = query.academicYearId;
        if (query.termId)
            where.termId = query.termId;
        if (query.type)
            where.type = query.type;
        if (query.status)
            where.status = query.status;
        const assessments = await this.prisma.assessment.findMany({
            where,
            include: {
                academicYear: { select: { id: true, name: true } },
                term: { select: { id: true, name: true } },
                subjects: {
                    include: {
                        class: { select: { id: true, name: true } },
                        section: { select: { id: true, name: true } },
                        subject: { select: { id: true, name: true } },
                        teacher: { select: { id: true, name: true } },
                        _count: { select: { scores: true } },
                    },
                },
            },
            orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        });
        return this.attachFallbackTeachersToAssessments(assessments);
    }
    async clearAssessments(schoolId) {
        const result = await this.prisma.assessment.deleteMany({
            where: { schoolId },
        });
        return {
            success: true,
            deleted: result.count,
        };
    }
    async getTeacherAssessments(teacherId, schoolId, query) {
        const assignments = await this.prisma.teacherSubjectAssignment.findMany({
            where: {
                teacherId,
                schoolId,
                isActive: true,
                ...(query.academicYearId
                    ? { academicYear: query.academicYearId }
                    : {}),
            },
            select: {
                subjectId: true,
                classId: true,
                sectionId: true,
                academicYear: true,
            },
        });
        if (!assignments.length) {
            return [];
        }
        const assignmentCriteriaMap = new Map();
        for (const assignment of assignments) {
            const sectionKey = `${assignment.classId}:${assignment.subjectId}:${assignment.sectionId}`;
            if (!assignmentCriteriaMap.has(sectionKey)) {
                assignmentCriteriaMap.set(sectionKey, {
                    subjectId: assignment.subjectId,
                    classId: assignment.classId,
                    sectionId: assignment.sectionId,
                });
            }
        }
        const assessmentSubjectArgs = client_1.Prisma.validator()({
            where: {
                assessment: {
                    schoolId,
                    ...(query.academicYearId
                        ? { academicYearId: query.academicYearId }
                        : {}),
                    ...(query.termId ? { termId: query.termId } : {}),
                    ...(query.type ? { type: query.type } : {}),
                },
                OR: [
                    { teacherId },
                    ...Array.from(assignmentCriteriaMap.values()).map((assignment) => ({
                        subjectId: assignment.subjectId,
                        classId: assignment.classId,
                        sectionId: assignment.sectionId,
                    })),
                ],
            },
            include: {
                assessment: {
                    include: {
                        academicYear: { select: { id: true, name: true } },
                        term: { select: { id: true, name: true } },
                    },
                },
                class: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } },
                _count: { select: { scores: true } },
            },
            orderBy: [{ assessment: { startDate: 'desc' } }],
        });
        const assessmentSubjects = await this.prisma.assessmentSubject.findMany(assessmentSubjectArgs);
        const scoreStatusMap = new Map();
        const assessmentIds = assessmentSubjects.map(s => s.id);
        if (assessmentIds.length > 0) {
            const scoreGroups = await this.prisma.studentAssessmentScore.groupBy({
                by: ['assessmentSubjectId', 'status'],
                where: { assessmentSubjectId: { in: assessmentIds } },
                _count: true,
            });
            for (const group of scoreGroups) {
                const existing = scoreStatusMap.get(group.assessmentSubjectId);
                if (!existing || group.status === 'SUBMITTED') {
                    scoreStatusMap.set(group.assessmentSubjectId, {
                        status: group.status,
                        count: group._count
                    });
                }
                else if (existing && existing.status === 'SUBMITTED') {
                    existing.count += group._count;
                }
                else {
                    scoreStatusMap.set(group.assessmentSubjectId, {
                        status: group.status,
                        count: group._count
                    });
                }
            }
        }
        const weights = await this.getWeightMap(schoolId);
        return assessmentSubjects.map((item) => {
            const scoreInfo = scoreStatusMap.get(item.id);
            let scoreStatus = 'NOT_STARTED';
            if (scoreInfo) {
                scoreStatus = scoreInfo.status;
            }
            const effectiveMaxScore = this.getEffectiveMaxScore(item.maxScore, item.assessment.type, weights);
            return {
                id: item.id,
                assessmentId: item.assessmentId,
                title: item.assessment.title,
                type: item.assessment.type,
                status: item.assessment.status,
                academicYear: item.assessment.academicYear,
                term: item.assessment.term,
                class: item.class,
                section: item.section,
                subject: item.subject,
                maxScore: effectiveMaxScore,
                startDate: item.assessment.startDate,
                endDate: item.assessment.endDate,
                scoreEntries: item._count.scores,
                scoreStatus: scoreStatus,
                canCreate: TEACHER_MANAGED_ASSESSMENT_TYPES.has(String(item.assessment.type).toUpperCase()),
                canEditScores: item.assessment.status !== client_1.AssessmentStatus.LOCKED,
                isReadOnly: READ_ONLY_ASSESSMENT_TYPES.has(String(item.assessment.type).toUpperCase()),
            };
        });
    }
    async getScoreEntry(userId, role, schoolId, assessmentSubjectId) {
        let assessmentSubject = role === 'TEACHER'
            ? await this.ensureTeacherCanScore(userId, assessmentSubjectId, schoolId)
            : await this.prisma.assessmentSubject.findFirst({
                where: { id: assessmentSubjectId, assessment: { schoolId } },
                include: {
                    assessment: true,
                    subject: { select: { id: true, name: true } },
                    class: { select: { id: true, name: true } },
                    section: { select: { id: true, name: true } },
                },
            });
        if (!assessmentSubject) {
            throw new common_1.NotFoundException('Assessment subject not found');
        }
        let sectionId = assessmentSubject.sectionId;
        if (role === 'TEACHER' && !sectionId) {
            const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
                where: {
                    teacherId: userId,
                    academicYear: assessmentSubject.assessment.academicYearId,
                    subjectId: assessmentSubject.subjectId,
                    classId: assessmentSubject.classId,
                    isActive: true,
                },
                select: { sectionId: true },
            });
            sectionId = assignment?.sectionId || null;
        }
        const academicYearRecord = await this.prisma.academicYear.findUnique({
            where: { id: assessmentSubject.assessment.academicYearId },
            select: { name: true },
        });
        const students = await this.prisma.studentClass.findMany({
            where: {
                academicYear: academicYearRecord?.name || assessmentSubject.assessment.academicYearId,
                classId: assessmentSubject.classId,
                ...(sectionId ? { sectionId } : {}),
            },
            include: {
                student: {
                    include: {
                        studentProfile: { select: { rollNumber: true } },
                    },
                },
                section: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
        const weights = await this.getWeightMap(schoolId);
        const effectiveMaxScore = this.getEffectiveMaxScore(assessmentSubject.maxScore, assessmentSubject.assessment.type, weights);
        const existing = await this.prisma.studentAssessmentScore.findMany({
            where: { assessmentSubjectId },
        });
        const existingMap = new Map(existing.map((row) => [row.studentId, row]));
        return {
            id: assessmentSubject.id,
            maxScore: effectiveMaxScore,
            subject: assessmentSubject.subject,
            class: assessmentSubject.class,
            section: assessmentSubject.section,
            assessment: assessmentSubject.assessment,
            students: students.map((entry) => ({
                studentId: entry.studentId,
                studentName: entry.student.name,
                rollNumber: entry.student.studentProfile?.rollNumber ?? null,
                sectionName: entry.section?.name ?? null,
                score: existingMap.get(entry.studentId)?.score ?? null,
                isAbsent: existingMap.get(entry.studentId)?.isAbsent ?? false,
                remarks: existingMap.get(entry.studentId)?.remarks ?? null,
                status: existingMap.get(entry.studentId)?.status ?? client_1.AssessmentScoreStatus.DRAFT,
            })),
        };
    }
    async saveScores(userId, role, schoolId, assessmentSubjectId, dto) {
        const assessmentSubject = role === 'TEACHER'
            ? await this.ensureTeacherCanScore(userId, assessmentSubjectId, schoolId)
            : await this.prisma.assessmentSubject.findFirst({
                where: { id: assessmentSubjectId, assessment: { schoolId } },
                include: { assessment: true },
            });
        if (!assessmentSubject) {
            throw new common_1.NotFoundException('Assessment subject not found');
        }
        if (assessmentSubject.assessment.status === client_1.AssessmentStatus.LOCKED &&
            !(dto.registrarOverride &&
                ['REGISTRAR', 'ADMIN', 'SUPER_ADMIN'].includes(role))) {
            throw new common_1.ForbiddenException('Assessment scores are locked');
        }
        const weights = await this.getWeightMap(schoolId);
        const effectiveMaxScore = this.getEffectiveMaxScore(assessmentSubject.maxScore, assessmentSubject.assessment.type, weights);
        const academicYearRecord = await this.prisma.academicYear.findUnique({
            where: { id: assessmentSubject.assessment.academicYearId },
            select: { name: true },
        });
        const validStudents = await this.prisma.studentClass.findMany({
            where: {
                academicYear: academicYearRecord?.name || assessmentSubject.assessment.academicYearId,
                classId: assessmentSubject.classId,
                ...(assessmentSubject.sectionId
                    ? { sectionId: assessmentSubject.sectionId }
                    : {}),
            },
            select: { studentId: true },
        });
        const validStudentIds = new Set(validStudents.map((row) => row.studentId));
        for (const score of dto.scores) {
            if (!validStudentIds.has(score.studentId)) {
                throw new common_1.BadRequestException('One or more students are not in the class');
            }
            if (score.score !== undefined &&
                score.score !== null &&
                score.score > effectiveMaxScore) {
                throw new common_1.BadRequestException(`Score cannot exceed ${effectiveMaxScore}`);
            }
        }
        await this.prisma.$transaction(dto.scores.map((row) => this.prisma.studentAssessmentScore.upsert({
            where: {
                assessmentSubjectId_studentId: {
                    assessmentSubjectId,
                    studentId: row.studentId,
                },
            },
            update: {
                score: row.isAbsent ? null : (row.score ?? null),
                isAbsent: row.isAbsent ?? false,
                remarks: row.remarks,
                status: dto.status ?? client_1.AssessmentScoreStatus.DRAFT,
                enteredBy: userId,
                enteredAt: new Date(),
            },
            create: {
                assessmentSubjectId,
                studentId: row.studentId,
                score: row.isAbsent ? null : (row.score ?? null),
                isAbsent: row.isAbsent ?? false,
                remarks: row.remarks,
                status: dto.status ?? client_1.AssessmentScoreStatus.DRAFT,
                enteredBy: userId,
            },
        })));
        await Promise.all(dto.scores.map((row) => this.syncSubjectGradeForStudent(assessmentSubjectId, row.studentId)));
        return this.getScoreEntry(userId, role, schoolId, assessmentSubjectId);
    }
    async lockAssessment(schoolId, assessmentId) {
        const assessment = await this.prisma.assessment.findFirst({
            where: { id: assessmentId, schoolId },
            select: { id: true },
        });
        if (!assessment) {
            throw new common_1.NotFoundException('Assessment not found');
        }
        return this.prisma.assessment.update({
            where: { id: assessmentId },
            data: {
                status: client_1.AssessmentStatus.LOCKED,
                lockAt: new Date(),
            },
        });
    }
    async getMissingMarks(schoolId, query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const academicYearName = query.academicYearId
            ? (await this.prisma.academicYear.findFirst({
                where: { id: query.academicYearId, schoolId },
                select: { name: true },
            }))?.name
            : undefined;
        const [assessmentSubjects, total] = await Promise.all([
            this.prisma.assessmentSubject.findMany({
                where: {
                    assessment: {
                        schoolId,
                        ...(query.academicYearId
                            ? { academicYearId: query.academicYearId }
                            : {}),
                        ...(query.termId ? { termId: query.termId } : {}),
                    },
                },
                include: {
                    assessment: true,
                    subject: { select: { name: true } },
                    class: { select: { name: true } },
                    section: { select: { name: true } },
                    _count: { select: { scores: true } },
                },
                orderBy: [{ assessment: { startDate: 'desc' } }],
                skip,
                take: limit,
            }),
            this.prisma.assessmentSubject.count({
                where: {
                    assessment: {
                        schoolId,
                        ...(query.academicYearId
                            ? { academicYearId: query.academicYearId }
                            : {}),
                        ...(query.termId ? { termId: query.termId } : {}),
                    },
                },
            }),
        ]);
        const studentCounts = await this.prisma.studentClass.groupBy({
            by: ['classId', 'sectionId'],
            where: {
                schoolId,
                ...(academicYearName ? { academicYear: academicYearName } : {}),
            },
            _count: { studentId: true },
        });
        const countMap = new Map(studentCounts.map((r) => [
            `${r.classId}:${r.sectionId ?? 'null'}`,
            r._count.studentId,
        ]));
        const data = assessmentSubjects.map((item) => {
            const studentCount = countMap.get(`${item.classId}:${item.sectionId ?? 'null'}`) ?? 0;
            return {
                assessmentSubjectId: item.id,
                assessmentId: item.assessmentId,
                title: item.assessment.title,
                type: item.assessment.type,
                subject: item.subject.name,
                className: item.class.name,
                sectionName: item.section?.name ?? null,
                expectedEntries: studentCount,
                enteredEntries: item._count.scores,
                missingEntries: Math.max(studentCount - item._count.scores, 0),
                isLocked: item.assessment.status === client_1.AssessmentStatus.LOCKED,
            };
        });
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getWeights(schoolId) {
        const weights = await this.getWeightMap(schoolId);
        return Object.entries(weights).map(([type, percentage]) => ({
            type,
            percentage,
        }));
    }
    async updateWeights(schoolId, dto) {
        const total = dto.weights.reduce((sum, row) => sum + row.percentage, 0);
        if (Math.round(total * 100) / 100 !== 100) {
            throw new common_1.BadRequestException('Assessment weights must total 100');
        }
        await this.prisma.$transaction(dto.weights.map((row) => this.prisma.assessmentWeight.upsert({
            where: {
                schoolId_type: {
                    schoolId,
                    type: row.type,
                },
            },
            update: {
                percentage: row.percentage,
                isActive: true,
            },
            create: {
                schoolId,
                type: row.type,
                percentage: row.percentage,
            },
        })));
        return this.getWeights(schoolId);
    }
    async getStudentAcademicContext(studentId, schoolId, academicYearId) {
        const latestAssignment = await this.prisma.studentClass.findFirst({
            where: {
                studentId,
                schoolId,
                ...(academicYearId ? { academicYear: academicYearId } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!latestAssignment) {
            return null;
        }
        return latestAssignment;
    }
    async getStudentUpcoming(studentId, schoolId, academicYearId) {
        const context = await this.getStudentAcademicContext(studentId, schoolId, academicYearId);
        if (!context)
            return [];
        return this.prisma.assessmentSubject.findMany({
            where: {
                classId: context.classId,
                sectionId: context.sectionId,
                assessment: {
                    schoolId,
                    academicYearId: context.academicYear,
                    startDate: { gte: new Date() },
                },
            },
            include: {
                assessment: true,
                subject: { select: { id: true, name: true } },
                scores: {
                    where: { studentId },
                    select: { score: true, status: true },
                },
            },
            orderBy: [{ assessment: { startDate: 'asc' } }],
        });
    }
    async getStudentResults(studentId, schoolId, academicYearId, termId) {
        const context = await this.getStudentAcademicContext(studentId, schoolId, academicYearId);
        if (!context)
            return [];
        const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
            where: {
                classId: context.classId,
                sectionId: context.sectionId,
                assessment: {
                    schoolId,
                    academicYearId: context.academicYear,
                    ...(termId ? { termId } : {}),
                },
            },
            include: {
                assessment: {
                    include: {
                        term: { select: { id: true, name: true } },
                    },
                },
                subject: { select: { id: true, name: true } },
                scores: {
                    where: { studentId },
                    select: { score: true, isAbsent: true, status: true, remarks: true },
                },
            },
            orderBy: [
                { subject: { name: 'asc' } },
                { assessment: { startDate: 'asc' } },
            ],
        });
        const weights = await this.getWeightMap(schoolId);
        const grouped = new Map();
        for (const row of assessmentSubjects) {
            const score = row.scores[0];
            const key = `${row.subjectId}:${row.assessment.termId ?? 'no-term'}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    subjectId: row.subjectId,
                    subjectName: row.subject.name,
                    termName: row.assessment.term?.name ?? null,
                    assessments: [],
                });
            }
            grouped.get(key).assessments.push({
                assessmentSubjectId: row.id,
                title: row.assessment.title,
                type: row.assessment.type,
                maxScore: row.maxScore,
                startDate: row.assessment.startDate,
                endDate: row.assessment.endDate,
                score: score?.score ?? null,
                isAbsent: score?.isAbsent ?? false,
                status: score?.status ?? 'PENDING',
                remarks: score?.remarks ?? null,
            });
        }
        const response = [];
        for (const group of grouped.values()) {
            const weightedSummary = this.computeWeightedAssessmentSummary(this.buildTypeScoreMap(group.assessments.map((item) => {
                const typed = item;
                return typed;
            })), weights);
            const total = weightedSummary.totalScore ?? 0;
            const hasAny = weightedSummary.hasAny;
            const summary = hasAny && group.assessments.length
                ? await this.getGradeFromScore(schoolId, total)
                : { gradeLetter: null, gradePoint: null };
            response.push({
                ...group,
                summary: {
                    quizAverage: weightedSummary.quizAverage,
                    testAverage: weightedSummary.testAverage,
                    midAverage: weightedSummary.midAverage,
                    finalAverage: weightedSummary.finalAverage,
                    totalScore: weightedSummary.totalScore,
                    gradeLetter: summary.gradeLetter,
                    gradePoint: summary.gradePoint,
                },
            });
        }
        return response;
    }
    async getParentUpcoming(parentUserId, childId, schoolId, academicYearId) {
        const studentId = await this.resolveChildStudentForParent(parentUserId, childId);
        return this.getStudentUpcoming(studentId, schoolId, academicYearId);
    }
    async getParentResults(parentUserId, childId, schoolId, academicYearId, termId) {
        const studentId = await this.resolveChildStudentForParent(parentUserId, childId);
        return this.getStudentResults(studentId, schoolId, academicYearId, termId);
    }
};
exports.AssessmentsService = AssessmentsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AssessmentsService.prototype, "notifyDueAssessmentStarts", null);
exports.AssessmentsService = AssessmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], AssessmentsService);
//# sourceMappingURL=assessments.service.js.map