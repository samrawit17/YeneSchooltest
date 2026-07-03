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
exports.GradingService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const academic_year_service_1 = require("../academic-year/academic-year.service");
const grading_dto_1 = require("./dto/grading.dto");
const cache_service_1 = require("../infrastructure/cache/cache.service");
const cache_constants_1 = require("../infrastructure/cache/cache.constants");
const notification_service_1 = require("../notification/notification.service");
const school_settings_service_1 = require("../school-settings/school-settings.service");
const DEFAULT_GRADE_SCALE = [
    { letter: 'A', min: 90, max: 100, point: 4.0, desc: 'Excellent' },
    { letter: 'B', min: 80, max: 89, point: 3.5, desc: 'Very Good' },
    { letter: 'C', min: 70, max: 79, point: 3.0, desc: 'Good' },
    { letter: 'D', min: 60, max: 69, point: 2.5, desc: 'Satisfactory' },
    { letter: 'F', min: 0, max: 59, point: 0.0, desc: 'Fail' },
];
const DEFAULT_GRADING_COMPONENTS = [
    { name: 'Continuous Assessment', code: 'CA', percentage: 30 },
    { name: 'Mid Exam', code: 'MID', percentage: 20 },
    { name: 'Final Exam', code: 'FINAL', percentage: 50 },
];
let GradingService = class GradingService {
    prisma;
    academicYearService;
    cacheService;
    notificationService;
    constructor(prisma, academicYearService, cacheService, notificationService) {
        this.prisma = prisma;
        this.academicYearService = academicYearService;
        this.cacheService = cacheService;
        this.notificationService = notificationService;
    }
    getStudentGradesNamespace(schoolId, studentId) {
        return `grades:school:${schoolId}:student:${studentId}`;
    }
    getTeacherGradesNamespace(schoolId, teacherId) {
        return `grades:school:${schoolId}:teacher:${teacherId}`;
    }
    getSchoolGradesNamespace(schoolId) {
        return `grades:school:${schoolId}`;
    }
    parseSettingValue(rawValue) {
        if (rawValue === null || rawValue === undefined)
            return null;
        try {
            return JSON.parse(rawValue);
        }
        catch {
            return rawValue;
        }
    }
    async ensureParentGradeAccessEnabled(schoolId) {
        const settings = await this.prisma.schoolSetting.findMany({
            where: {
                schoolId,
                key: { in: [school_settings_service_1.SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES, 'PARENT_VIEW_GRADES'] },
            },
            select: { key: true, value: true },
        });
        const setting = settings.find((item) => item.key === school_settings_service_1.SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES) ||
            settings[0];
        const value = this.parseSettingValue(setting?.value);
        if (value === false || value === 'false') {
            throw new localization_1.LocalizedException('grading.parent_grade_viewing_is_disabled_for_this_school_a7e04b72', undefined, common_1.HttpStatus.FORBIDDEN, 'Parent grade viewing is disabled for this school.');
        }
    }
    async getSchoolGradingComponentsMap(schoolId) {
        const assessmentTypesRaw = await this.getAssessmentTypes(schoolId);
        const assessmentTypes = Array.isArray(assessmentTypesRaw)
            ? assessmentTypesRaw.flatMap((item) => {
                if (item &&
                    typeof item === 'object' &&
                    'code' in item &&
                    'name' in item &&
                    'percentage' in item) {
                    return [
                        {
                            code: String(item.code),
                            name: String(item.name),
                            percentage: Number(item.percentage),
                        },
                    ];
                }
                return [];
            })
            : [];
        const componentMap = new Map();
        for (const item of assessmentTypes) {
            const code = String(item.code).toUpperCase();
            const component = await this.prisma.gradingComponent.upsert({
                where: {
                    schoolId_code: {
                        schoolId,
                        code,
                    },
                },
                update: {
                    name: item.name,
                    percentage: item.percentage,
                    isActive: true,
                },
                create: {
                    schoolId,
                    code,
                    name: item.name,
                    percentage: item.percentage,
                    isActive: true,
                },
            });
            componentMap.set(code, component);
        }
        return componentMap;
    }
    getEffectiveAssessmentMaxScore(storedMaxScore, componentPercentage) {
        if (storedMaxScore === 100 &&
            componentPercentage !== undefined &&
            componentPercentage !== null &&
            componentPercentage > 0 &&
            componentPercentage <= 100) {
            return Number(componentPercentage);
        }
        return Number(storedMaxScore);
    }
    buildLegacyScoresFromComponents(componentScores) {
        let caScore = 0;
        let midScore = 0;
        let finalScore = 0;
        for (const item of componentScores) {
            const score = item.score ?? 0;
            const code = String(item.code).toUpperCase();
            if (code === 'FINAL') {
                finalScore += score;
            }
            else if (code === 'MID') {
                midScore += score;
            }
            else {
                caScore += score;
            }
        }
        return {
            caScore: caScore > 0 ? caScore : null,
            midScore: midScore > 0 ? midScore : null,
            finalScore: finalScore > 0 ? finalScore : null,
        };
    }
    async normalizeComponentPayload(schoolId, componentScores, context) {
        if (!componentScores || componentScores.length === 0) {
            return [];
        }
        const componentMap = await this.getSchoolGradingComponentsMap(schoolId);
        const dedupedComponentScores = Array.from(componentScores
            .filter((item) => item && item.code)
            .reduce((map, item) => {
            map.set(String(item.code).toUpperCase(), item);
            return map;
        }, new Map())
            .values());
        return Promise.all(dedupedComponentScores
            .map(async (item) => {
            const code = String(item.code).toUpperCase();
            const component = componentMap.get(code);
            if (!component) {
                throw new localization_1.LocalizedException('grading.is_not_configured_for_this_school_d4c00305', undefined, undefined, '${code} is not configured for this school');
            }
            let maxScore = Number(component.percentage);
            const score = item.score ?? null;
            if (context && score !== null && !item.assessmentSubjectId) {
                throw new localization_1.LocalizedException('grading.is_not_scheduled_for_this_class_section_subject_and_term_62ee5cad', undefined, undefined, '${code} is not scheduled for this class, section, subject, and term');
            }
            if (item.assessmentSubjectId) {
                const assessmentSubject = await this.prisma.assessmentSubject.findFirst({
                    where: {
                        id: item.assessmentSubjectId,
                        assessment: {
                            schoolId,
                            type: code,
                            ...(context
                                ? {
                                    academicYearId: context.academicYear,
                                    termId: context.termId,
                                }
                                : {}),
                        },
                        ...(context
                            ? {
                                classId: context.classId,
                                sectionId: context.sectionId,
                                subjectId: context.subjectId,
                            }
                            : {}),
                    },
                    select: {
                        maxScore: true,
                        teacherId: true,
                        assessment: {
                            select: {
                                status: true,
                                startDate: true,
                                endDate: true,
                            },
                        },
                    },
                });
                if (!assessmentSubject) {
                    throw new localization_1.LocalizedException('grading.is_not_scheduled_for_this_class_section_subject_and_term_62ee5cad', undefined, undefined, '${code} is not scheduled for this class, section, subject, and term');
                }
                if (context &&
                    assessmentSubject.teacherId &&
                    assessmentSubject.teacherId !== context.teacherId) {
                    throw new localization_1.LocalizedException('grading.you_are_not_assigned_to_this_assessment_12bccb78', undefined, common_1.HttpStatus.FORBIDDEN, 'You are not assigned to this ${code} assessment');
                }
                if (assessmentSubject.assessment.status === client_1.AssessmentStatus.LOCKED) {
                    throw new localization_1.LocalizedException('grading.assessment_is_locked_e6fb1e6d', undefined, common_1.HttpStatus.FORBIDDEN, '${code} assessment is locked');
                }
                if (assessmentSubject.assessment.startDate > new Date()) {
                    throw new localization_1.LocalizedException('grading.assessment_has_not_started_yet_9ec01f8f', undefined, common_1.HttpStatus.FORBIDDEN, '${code} assessment has not started yet');
                }
                if (assessmentSubject.assessment.status === client_1.AssessmentStatus.COMPLETED ||
                    assessmentSubject.assessment.endDate < new Date()) {
                    throw new localization_1.LocalizedException('grading.assessment_entry_period_is_over_1a7e0775', undefined, common_1.HttpStatus.FORBIDDEN, '${code} assessment entry period is over');
                }
                maxScore = this.getEffectiveAssessmentMaxScore(assessmentSubject.maxScore, component?.percentage);
            }
            if (score !== null && (score < 0 || score > maxScore)) {
                throw new localization_1.LocalizedException('grading.max_score_is_2a04992a', undefined, undefined, '${code} max score is ${maxScore}');
            }
            return {
                code,
                score,
                maxScore,
                componentId: component?.id ?? null,
            };
        }));
    }
    calculateTotalFromComponentScores(componentScores) {
        const hasAny = componentScores.some((item) => item.score !== null && item.score !== undefined);
        if (!hasAny)
            return null;
        const total = componentScores.reduce((sum, item) => sum + (item.score ?? 0), 0);
        return Math.round(total * 100) / 100;
    }
    mergeComponentScores(existingScores, incomingScores) {
        const byCode = new Map();
        for (const item of existingScores) {
            byCode.set(String(item.code).toUpperCase(), {
                ...item,
                code: String(item.code).toUpperCase(),
            });
        }
        for (const item of incomingScores) {
            byCode.set(String(item.code).toUpperCase(), {
                ...item,
                code: String(item.code).toUpperCase(),
            });
        }
        return Array.from(byCode.values());
    }
    async upsertGradeScores(client, subjectGradeId, componentScores) {
        const rows = componentScores.filter((item) => item.componentId);
        for (const item of rows) {
            await client.gradeScore.upsert({
                where: {
                    subjectGradeId_gradingComponentId: {
                        subjectGradeId,
                        gradingComponentId: item.componentId,
                    },
                },
                update: {
                    score: item.score ?? null,
                    maxScore: item.maxScore,
                },
                create: {
                    subjectGradeId,
                    gradingComponentId: item.componentId,
                    score: item.score ?? null,
                    maxScore: item.maxScore,
                },
            });
        }
    }
    buildMergedLegacyScores(mergedComponentScores, existingGrade) {
        if (mergedComponentScores.length === 0) {
            return {
                caScore: existingGrade?.caScore ?? null,
                midScore: existingGrade?.midScore ?? null,
                finalScore: existingGrade?.finalScore ?? null,
            };
        }
        const derived = this.buildLegacyScoresFromComponents(mergedComponentScores);
        const componentCodes = new Set(mergedComponentScores.map((item) => String(item.code).toUpperCase()));
        const hasContinuousComponents = Array.from(componentCodes).some((code) => code !== 'MID' && code !== 'FINAL');
        return {
            caScore: hasContinuousComponents
                ? derived.caScore
                : existingGrade?.caScore ?? derived.caScore,
            midScore: componentCodes.has('MID')
                ? derived.midScore
                : existingGrade?.midScore ?? derived.midScore,
            finalScore: componentCodes.has('FINAL')
                ? derived.finalScore
                : existingGrade?.finalScore ?? derived.finalScore,
        };
    }
    calculateTotalFromLegacyScores(scores) {
        const hasAny = scores.caScore !== null ||
            scores.midScore !== null ||
            scores.finalScore !== null;
        if (!hasAny)
            return null;
        return Math.round(((scores.caScore ?? 0) + (scores.midScore ?? 0) + (scores.finalScore ?? 0)) * 100) / 100;
    }
    normalizeAssessmentComponentCode(code) {
        const normalized = code.toUpperCase().trim();
        if (normalized === 'MID_EXAM' || normalized === 'MIDTERM')
            return 'MID';
        if (normalized === 'FINAL_EXAM')
            return 'FINAL';
        return normalized;
    }
    getEffectiveGradeTotalScore(grade) {
        const componentSum = (grade.caScore ?? 0) + (grade.midScore ?? 0) + (grade.finalScore ?? 0);
        const storedTotal = grade.totalScore ?? null;
        if (storedTotal === null || storedTotal === undefined) {
            return componentSum > 0 ? componentSum : null;
        }
        if (componentSum > 0 && storedTotal < componentSum) {
            return componentSum;
        }
        return storedTotal;
    }
    async invalidateGradeCaches(input) {
        await this.cacheService.bumpVersion(this.getSchoolGradesNamespace(input.schoolId));
        await this.cacheService.bumpVersion(`dashboard:school:${input.schoolId}`);
        if (input.teacherId) {
            await this.cacheService.bumpVersion(this.getTeacherGradesNamespace(input.schoolId, input.teacherId));
            await this.cacheService.bumpVersion(`dashboard:school:${input.schoolId}:user:${input.teacherId}`);
        }
        for (const studentId of input.studentIds || []) {
            await this.cacheService.bumpVersion(this.getStudentGradesNamespace(input.schoolId, studentId));
            await this.cacheService.bumpVersion(`dashboard:school:${input.schoolId}:user:${studentId}`);
        }
    }
    async calculateGrade(schoolId, caScore, midScore, finalScore) {
        const components = await this.prisma.gradingComponent.findMany({
            where: {
                schoolId,
                isActive: true,
            },
            orderBy: { code: 'asc' },
        });
        const weights = components.length > 0
            ? components.reduce((acc, comp) => {
                acc[comp.code] = comp.percentage / 100;
                return acc;
            }, {})
            : { CA: 0.3, MID: 0.2, FINAL: 0.5 };
        const ca = caScore ?? 0;
        const mid = midScore ?? 0;
        const final = finalScore ?? 0;
        const totalScore = ca * (weights.CA || 0) +
            mid * (weights.MID || 0) +
            final * (weights.FINAL || 0);
        const { gradeLetter, gradePoint } = await this.getGradeFromScore(schoolId, totalScore);
        return {
            totalScore: Math.round(totalScore * 100) / 100,
            gradeLetter,
            gradePoint,
        };
    }
    async getGradeFromScore(schoolId, score) {
        const gradeScales = await this.prisma.gradeScale.findMany({
            where: {
                schoolId,
                isActive: true,
            },
            orderBy: { minScore: 'desc' },
        });
        if (gradeScales.length > 0) {
            const matchingScale = gradeScales.find((scale) => score >= scale.minScore && score <= scale.maxScore);
            if (matchingScale) {
                return {
                    gradeLetter: matchingScale.gradeLetter,
                    gradePoint: matchingScale.gradePoint,
                };
            }
        }
        if (score >= 90)
            return { gradeLetter: 'A', gradePoint: 4.0 };
        if (score >= 80)
            return { gradeLetter: 'B', gradePoint: 3.5 };
        if (score >= 70)
            return { gradeLetter: 'C', gradePoint: 3.0 };
        if (score >= 60)
            return { gradeLetter: 'D', gradePoint: 2.5 };
        return { gradeLetter: 'F', gradePoint: 0.0 };
    }
    async assertTermIsOpen(termId, bypassLock = false) {
        const term = await this.prisma.term.findUnique({
            where: { id: termId },
            select: { id: true, isLocked: true },
        });
        if (!term) {
            throw new localization_1.LocalizedException('grading.term_not_found_f9401991', undefined, common_1.HttpStatus.NOT_FOUND, 'Term not found');
        }
        if (term.isLocked && !bypassLock) {
            throw new localization_1.LocalizedException('grading.this_term_is_locked_for_grading_af8f42ec', undefined, common_1.HttpStatus.FORBIDDEN, 'This term is locked for grading');
        }
    }
    async assertStudentInClassSection(studentId, schoolId, classId, sectionId, academicYear) {
        const enrollment = await this.prisma.studentClass.findFirst({
            where: {
                schoolId,
                studentId,
                classId,
                sectionId,
                academicYear,
            },
            select: { id: true },
        });
        if (!enrollment) {
            throw new localization_1.LocalizedException('grading.student_is_not_enrolled_in_the_selected_class_section_for_th_42029f2d', undefined, undefined, 'Student is not enrolled in the selected class/section for this academic year');
        }
    }
    async getProfileRosterWhere(client, input) {
        const [classData, sectionData, academicYearData] = await Promise.all([
            client.class.findFirst({
                where: {
                    id: input.classId,
                    schoolId: input.schoolId,
                },
                select: { name: true },
            }),
            client.section.findFirst({
                where: {
                    id: input.sectionId,
                    classId: input.classId,
                },
                select: { name: true },
            }),
            client.academicYear.findFirst({
                where: {
                    id: input.academicYear,
                    schoolId: input.schoolId,
                },
                select: { id: true, name: true, ethiopianYear: true },
            }),
        ]);
        if (!classData || !sectionData)
            return null;
        const className = classData.name || '';
        const sectionName = sectionData.name || '';
        const possibleClassNames = [
            className,
            className.replace('Grade ', ''),
            `Grade ${className.replace('Grade ', '')}`,
        ].filter((value, index, values) => value && values.indexOf(value) === index);
        const possibleSections = [
            sectionName,
            sectionName.toUpperCase(),
            sectionName.toLowerCase(),
        ].filter((value, index, values) => value && values.indexOf(value) === index);
        const possibleAcademicYears = [
            academicYearData?.id,
            academicYearData?.name,
            academicYearData?.ethiopianYear?.toString(),
        ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
        return {
            schoolId: input.schoolId,
            deletedAt: null,
            ...(input.studentId ? { userId: input.studentId } : {}),
            ...(possibleAcademicYears.length > 0
                ? { academicYear: { in: possibleAcademicYears } }
                : {}),
            OR: possibleClassNames.flatMap((classNameCandidate) => possibleSections.length > 0
                ? possibleSections.map((sectionCandidate) => ({
                    className: classNameCandidate,
                    section: sectionCandidate,
                }))
                : [{ className: classNameCandidate }]),
        };
    }
    async assertStudentInGradeEntryRoster(client, input) {
        const enrollment = await client.studentClass.findFirst({
            where: {
                schoolId: input.schoolId,
                studentId: input.studentId,
                classId: input.classId,
                sectionId: input.sectionId,
                academicYear: input.academicYear,
            },
            select: { id: true },
        });
        if (enrollment)
            return;
        const profileWhere = await this.getProfileRosterWhere(client, input);
        if (profileWhere) {
            const profile = await client.studentProfile.findFirst({
                where: profileWhere,
                select: { id: true },
            });
            if (profile)
                return;
        }
        throw new localization_1.LocalizedException('grading.student_is_not_enrolled_in_the_selected_class_section_for_th_42029f2d', undefined, undefined, 'Student is not enrolled in the selected class/section for this academic year');
    }
    assertReviewStatus(status) {
        if (status !== grading_dto_1.GradeStatus.APPROVED && status !== grading_dto_1.GradeStatus.REJECTED) {
            throw new localization_1.LocalizedException('grading.registrar_review_status_must_be_approved_or_rejected_3ec8b23b', undefined, undefined, 'Registrar review status must be APPROVED or REJECTED');
        }
    }
    async resolveTeacherGradingAccess(teacherId, schoolId, academicYear, classId, sectionId, subjectId) {
        const explicitAssignment = await this.prisma.teacherSubjectAssignment.findFirst({
            where: {
                teacherId,
                schoolId,
                academicYear,
                classId,
                sectionId,
                subjectId,
                isActive: true,
            },
            select: {
                schoolId: true,
            },
        });
        if (explicitAssignment) {
            return { schoolId };
        }
        const classSubjectAssignment = await this.prisma.classSubject.findFirst({
            where: {
                teacherId,
                academicYear,
                classId,
                sectionId,
                subjectId,
                class: { schoolId },
            },
            select: {
                class: {
                    select: {
                        schoolId: true,
                    },
                },
            },
        });
        if (classSubjectAssignment?.class?.schoolId) {
            return { schoolId };
        }
        const homeroomClass = await this.prisma.class.findFirst({
            where: {
                id: classId,
                schoolId,
                homeroomTeacherId: teacherId,
                academicYearId: academicYear,
            },
            select: {
                schoolId: true,
            },
        });
        if (homeroomClass?.schoolId) {
            return { schoolId };
        }
        const homeroomSection = await this.prisma.section.findFirst({
            where: {
                id: sectionId,
                classId,
                homeroomTeacherId: teacherId,
                class: {
                    schoolId,
                    academicYearId: academicYear,
                },
            },
            select: {
                class: {
                    select: {
                        schoolId: true,
                    },
                },
            },
        });
        if (homeroomSection?.class?.schoolId) {
            return { schoolId };
        }
        throw new localization_1.LocalizedException('grading.you_are_not_assigned_to_this_subject_class_section_820be2c9', undefined, common_1.HttpStatus.FORBIDDEN, 'You are not assigned to this subject/class/section');
    }
    ensureConsistentBulkPayload(grades) {
        const [first] = grades;
        if (!first)
            return;
        const inconsistent = grades.find((grade) => grade.academicYear !== first.academicYear ||
            grade.termId !== first.termId ||
            grade.classId !== first.classId ||
            grade.sectionId !== first.sectionId ||
            grade.subjectId !== first.subjectId);
        if (inconsistent) {
            throw new localization_1.LocalizedException('grading.all_rows_in_bulk_grading_must_target_the_same_academic_year__0dc05e29', undefined, undefined, 'All rows in bulk grading must target the same academic year, term, class, section, and subject');
        }
    }
    async syncGradeLockStatus(studentId, schoolId, academicYearId) {
        const { isCleared } = await this.verifyFinancialClearance(studentId, schoolId, academicYearId, undefined, true);
        await this.prisma.subjectGrade.updateMany({
            where: {
                studentId,
                academicYear: academicYearId,
            },
            data: {
                isLocked: !isCleared,
            },
        });
        return isCleared;
    }
    maskLockedGradeForPortal(grade) {
        if (!grade.isLocked) {
            return grade;
        }
        return {
            ...grade,
            caScore: null,
            midScore: null,
            finalScore: null,
            totalScore: null,
            gradeLetter: null,
            gradePoint: null,
            remark: null,
            financeLockMessage: 'Grade is locked due to outstanding balance. Please contact finance.',
        };
    }
    async resolveChildStudentForParent(parentUserId, schoolId, childIdOrUserId) {
        const parentProfile = await this.prisma.parentProfile.findFirst({
            where: { userId: parentUserId, schoolId },
            select: { id: true },
        });
        if (!parentProfile) {
            throw new localization_1.LocalizedException('grading.parent_profile_not_found_ad089d27', undefined, common_1.HttpStatus.NOT_FOUND, 'Parent profile not found');
        }
        const studentProfile = await this.prisma.studentProfile.findFirst({
            where: {
                schoolId,
                OR: [{ id: childIdOrUserId }, { userId: childIdOrUserId }],
            },
            select: { id: true, userId: true },
        });
        if (!studentProfile) {
            throw new localization_1.LocalizedException('grading.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const parentStudent = await this.prisma.parentStudent.findFirst({
            where: {
                parentId: parentProfile.id,
                studentId: studentProfile.id,
            },
            select: { id: true },
        });
        if (!parentStudent) {
            throw new localization_1.LocalizedException('grading.you_are_not_linked_to_this_student_49797e72', undefined, common_1.HttpStatus.FORBIDDEN, 'You are not linked to this student');
        }
        return {
            studentUserId: studentProfile.userId,
            studentProfileId: studentProfile.id,
        };
    }
    async getStudentsForGradeEntry(teacherId, schoolId, academicYear, termId, classId, sectionId, subjectId) {
        await this.assertTermIsOpen(termId, true);
        const access = await this.resolveTeacherGradingAccess(teacherId, schoolId, academicYear, classId, sectionId, subjectId);
        return this.cacheService.getOrSetVersioned(this.getTeacherGradesNamespace(schoolId, teacherId), JSON.stringify({
            mode: 'grade-entry',
            academicYear,
            termId,
            classId,
            sectionId,
            subjectId,
        }), cache_constants_1.CACHE_TTL.GRADES_TEACHER, async () => {
            const gradingComponentMap = await this.getSchoolGradingComponentsMap(access.schoolId);
            const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
                where: {
                    classId,
                    sectionId,
                    subjectId,
                    assessment: {
                        schoolId: access.schoolId,
                        academicYearId: academicYear,
                        termId,
                    },
                },
                include: {
                    assessment: {
                        select: {
                            type: true,
                            startDate: true,
                            endDate: true,
                            status: true,
                        },
                    },
                },
                orderBy: [{ assessment: { startDate: 'asc' } }],
            });
            const componentAvailability = Array.from(assessmentSubjects.reduce((map, item) => {
                const code = String(item.assessment.type).toUpperCase();
                const now = new Date();
                const started = item.assessment.startDate <= now;
                const ended = item.assessment.endDate < now;
                const existing = map.get(code);
                const isOpen = started &&
                    !ended &&
                    item.assessment.status === client_1.AssessmentStatus.ACTIVE;
                const existingOpen = Boolean(existing) &&
                    existing.started &&
                    !existing.ended &&
                    existing.status === client_1.AssessmentStatus.ACTIVE;
                const existingStart = existing
                    ? new Date(existing.startDate)
                    : null;
                const useThisAssessment = !existing ||
                    (!existingOpen && isOpen) ||
                    (existing.ended && !ended) ||
                    (!existing.started && started) ||
                    (existing.started === started &&
                        existing.ended === ended &&
                        existingStart !== null &&
                        item.assessment.startDate > existingStart);
                if (useThisAssessment) {
                    const component = gradingComponentMap.get(code);
                    map.set(code, {
                        code,
                        assessmentSubjectId: item.id,
                        startDate: item.assessment.startDate.toISOString(),
                        endDate: item.assessment.endDate.toISOString(),
                        status: item.assessment.status,
                        started,
                        ended,
                        maxScore: this.getEffectiveAssessmentMaxScore(item.maxScore, component?.percentage),
                    });
                }
                return map;
            }, new Map())).map(([_, value]) => value);
            const studentClasses = await this.prisma.studentClass.findMany({
                where: {
                    schoolId: access.schoolId,
                    academicYear,
                    classId,
                    sectionId,
                },
                include: {
                    student: {
                        include: {
                            studentProfile: true,
                        },
                    },
                },
            });
            const existingGrades = await this.prisma.subjectGrade.findMany({
                where: {
                    academicYear,
                    termId,
                    subjectId,
                    classId,
                    sectionId,
                    teacherId,
                },
                include: {
                    gradeScores: {
                        include: {
                            component: true,
                        },
                    },
                },
            });
            if (studentClasses.length === 0) {
                const profileWhere = await this.getProfileRosterWhere(this.prisma, {
                    schoolId: access.schoolId,
                    classId,
                    sectionId,
                    academicYear,
                });
                if (profileWhere) {
                    const profileStudents = await this.prisma.studentProfile.findMany({
                        where: profileWhere,
                        include: { user: { select: { id: true, name: true } } },
                        orderBy: { rollNumber: 'asc' },
                    });
                    const students = profileStudents.map((sp) => {
                        const grade = existingGrades.find((g) => g.studentId === sp.userId);
                        return {
                            studentId: sp.userId,
                            studentName: sp.user.name,
                            rollNumber: sp.rollNumber,
                            caScore: grade?.caScore ?? null,
                            midScore: grade?.midScore ?? null,
                            finalScore: grade?.finalScore ?? null,
                            totalScore: grade?.totalScore ?? null,
                            gradeLetter: grade?.gradeLetter ?? null,
                            remark: grade?.remark ?? null,
                            status: grade?.status ?? null,
                            registrarComment: grade?.registrarComment ?? null,
                            isLocked: grade?.isLocked ?? false,
                            gradeId: grade?.id ?? null,
                            componentScores: grade?.gradeScores?.map((item) => ({
                                code: item.component.code,
                                score: item.score,
                                maxScore: item.maxScore,
                            })) ?? [],
                        };
                    });
                    return { students, componentAvailability };
                }
                return { students: [], componentAvailability };
            }
            const students = studentClasses.map((sc) => {
                const grade = existingGrades.find((g) => g.studentId === sc.studentId);
                return {
                    studentId: sc.studentId,
                    studentName: sc.student.name,
                    rollNumber: sc.student.studentProfile?.rollNumber,
                    caScore: grade?.caScore ?? null,
                    midScore: grade?.midScore ?? null,
                    finalScore: grade?.finalScore ?? null,
                    totalScore: grade?.totalScore ?? null,
                    gradeLetter: grade?.gradeLetter ?? null,
                    remark: grade?.remark ?? null,
                    status: grade?.status ?? null,
                    registrarComment: grade?.registrarComment ?? null,
                    isLocked: grade?.isLocked ?? false,
                    gradeId: grade?.id ?? null,
                    componentScores: grade?.gradeScores?.map((item) => ({
                        code: item.component.code,
                        score: item.score,
                        maxScore: item.maxScore,
                    })) ?? [],
                };
            });
            return { students, componentAvailability };
        });
    }
    async logGradeChange(tx, gradeId, fieldName, oldValue, newValue, changedById, reason) {
        await tx.gradeChangeLog.create({
            data: {
                gradeId,
                fieldName,
                oldValue: oldValue !== undefined ? String(oldValue) : null,
                newValue: newValue !== undefined ? String(newValue) : null,
                changedById,
                reason,
            },
        });
    }
    async verifyFinancialClearance(studentId, schoolId, academicYearId, termId, checkOverdueOnly = true) {
        const studentProfile = await this.prisma.studentProfile.findFirst({
            where: {
                schoolId,
                OR: [{ id: studentId }, { userId: studentId }],
            },
            select: { id: true, userId: true },
        });
        if (!studentProfile) {
            throw new localization_1.LocalizedException('grading.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const whereClause = {
            studentId: {
                in: [studentProfile.id, studentProfile.userId].filter(Boolean),
            },
            schoolId,
            academicYearId,
            status: { not: 'PAID' },
        };
        if (checkOverdueOnly) {
            whereClause.dueDate = { lt: new Date() };
        }
        const outstandingFees = await this.prisma.studentFee.findMany({
            where: whereClause,
            include: {
                payments: true,
            },
        });
        if (termId) {
            const academicYear = await this.prisma.academicYear.findUnique({
                where: { id: academicYearId, schoolId },
                select: {
                    schoolId: true,
                },
            });
            const terms = await this.prisma.term.findMany({
                where: { academicYearId },
                orderBy: { order: 'asc' },
                select: { id: true },
            });
            const schoolSettings = academicYear?.schoolId
                ? await this.prisma.schoolSetting.findFirst({
                    where: {
                        schoolId: academicYear.schoolId,
                        key: 'curriculum_type',
                    },
                    select: { value: true },
                })
                : null;
            const curriculumTypeMap = {
                QUARTER: 4,
                QUARTERLY: 4,
                SEMESTER: 2,
                TERM: 3,
                MONTH: 12,
                MONTHLY: 12,
                YEAR: 1,
                YEARLY: 1,
            };
            const configuredPeriodCount = curriculumTypeMap[String(schoolSettings?.value || '').toUpperCase()] || 0;
            const periodCount = terms.length || configuredPeriodCount || 1;
            const termBoundOutstanding = outstandingFees.filter((fee) => fee.termId && fee.termId === termId);
            const annualOutstanding = outstandingFees.filter((fee) => !fee.termId);
            const annualBlockingFees = annualOutstanding.filter((fee) => {
                const paidAmount = fee.payments
                    ?.filter((payment) => payment.termId === termId)
                    .reduce((sum, payment) => sum + payment.amountPaid, 0) || 0;
                const requiredPerPeriod = periodCount > 0 ? Number(fee.finalAmount || 0) / periodCount : Number(fee.finalAmount || 0);
                return paidAmount + 0.0001 < requiredPerPeriod;
            });
            const filteredOutstandingFees = [
                ...termBoundOutstanding,
                ...annualBlockingFees,
            ];
            return {
                isCleared: filteredOutstandingFees.length === 0,
                outstandingFees: filteredOutstandingFees,
            };
        }
        return {
            isCleared: outstandingFees.length === 0,
            outstandingFees,
        };
    }
    async updateGradeLockStatus(studentId, schoolId, academicYearId) {
        const { isCleared } = await this.verifyFinancialClearance(studentId, schoolId, academicYearId, undefined, false);
        await this.prisma.subjectGrade.updateMany({
            where: {
                studentId,
                schoolId,
                academicYear: academicYearId,
            },
            data: {
                isLocked: !isCleared,
            },
        });
    }
    async enterGrade(teacherId, schoolId, dto) {
        await this.assertTermIsOpen(dto.termId, true);
        const access = await this.resolveTeacherGradingAccess(teacherId, schoolId, dto.academicYear, dto.classId, dto.sectionId, dto.subjectId);
        await this.assertStudentInGradeEntryRoster(this.prisma, {
            studentId: dto.studentId,
            schoolId: access.schoolId,
            classId: dto.classId,
            sectionId: dto.sectionId,
            academicYear: dto.academicYear,
        });
        const normalizedComponentScores = await this.normalizeComponentPayload(access.schoolId, dto.componentScores, {
            teacherId,
            academicYear: dto.academicYear,
            termId: dto.termId,
            classId: dto.classId,
            sectionId: dto.sectionId,
            subjectId: dto.subjectId,
        });
        const derivedLegacyScores = normalizedComponentScores.length > 0
            ? this.buildLegacyScoresFromComponents(normalizedComponentScores)
            : {
                caScore: dto.caScore ?? null,
                midScore: dto.midScore ?? null,
                finalScore: dto.finalScore ?? null,
            };
        const componentTotal = normalizedComponentScores.length > 0
            ? this.calculateTotalFromComponentScores(normalizedComponentScores)
            : null;
        const hasLegacyValue = derivedLegacyScores.caScore !== null ||
            derivedLegacyScores.midScore !== null ||
            derivedLegacyScores.finalScore !== null;
        const totalScore = componentTotal ??
            (hasLegacyValue
                ? (derivedLegacyScores.caScore ?? 0) +
                    (derivedLegacyScores.midScore ?? 0) +
                    (derivedLegacyScores.finalScore ?? 0)
                : null);
        const { gradeLetter, gradePoint } = totalScore === null
            ? { gradeLetter: null, gradePoint: null }
            : await this.getGradeFromScore(access.schoolId, totalScore);
        const existingGrade = await this.prisma.subjectGrade.findUnique({
            where: {
                studentId_subjectId_academicYear_termId: {
                    studentId: dto.studentId,
                    subjectId: dto.subjectId,
                    academicYear: dto.academicYear,
                    termId: dto.termId,
                },
            },
            include: {
                gradeScores: {
                    include: {
                        component: true,
                    },
                },
            },
        });
        if (existingGrade) {
            if (existingGrade.isLocked) {
                throw new localization_1.LocalizedException('grading.this_grade_is_locked_and_cannot_be_edited_8fd2b868', undefined, common_1.HttpStatus.FORBIDDEN, 'This grade is locked and cannot be edited');
            }
            if (existingGrade.status === grading_dto_1.GradeStatus.APPROVED) {
                throw new localization_1.LocalizedException('grading.cannot_edit_grades_that_are_already_approved_304fca92', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot edit grades that are already approved');
            }
            const existingComponentScores = existingGrade.gradeScores?.map((item) => ({
                code: item.component.code,
                score: item.score,
                maxScore: item.maxScore,
                componentId: item.gradingComponentId,
            })) ?? [];
            const mergedComponentScores = normalizedComponentScores.length > 0
                ? this.mergeComponentScores(existingComponentScores, normalizedComponentScores)
                : normalizedComponentScores;
            const updateLegacyScores = normalizedComponentScores.length > 0
                ? this.buildMergedLegacyScores(mergedComponentScores, existingGrade)
                : derivedLegacyScores;
            const updateTotalScore = normalizedComponentScores.length > 0
                ? this.calculateTotalFromLegacyScores(updateLegacyScores)
                : totalScore;
            const { gradeLetter: updateGradeLetter, gradePoint: updateGradePoint, } = updateTotalScore === null
                ? { gradeLetter: null, gradePoint: null }
                : await this.getGradeFromScore(access.schoolId, updateTotalScore);
            const updated = await this.prisma.$transaction(async (tx) => {
                if (existingGrade.caScore !== updateLegacyScores.caScore) {
                    await this.logGradeChange(tx, existingGrade.id, 'caScore', existingGrade.caScore, updateLegacyScores.caScore, teacherId);
                }
                if (existingGrade.midScore !== updateLegacyScores.midScore) {
                    await this.logGradeChange(tx, existingGrade.id, 'midScore', existingGrade.midScore, updateLegacyScores.midScore, teacherId);
                }
                if (existingGrade.finalScore !== updateLegacyScores.finalScore) {
                    await this.logGradeChange(tx, existingGrade.id, 'finalScore', existingGrade.finalScore, updateLegacyScores.finalScore, teacherId);
                }
                if (existingGrade.totalScore !== updateTotalScore) {
                    await this.logGradeChange(tx, existingGrade.id, 'totalScore', existingGrade.totalScore, updateTotalScore, teacherId);
                }
                if (existingGrade.gradeLetter !== updateGradeLetter) {
                    await this.logGradeChange(tx, existingGrade.id, 'gradeLetter', existingGrade.gradeLetter, updateGradeLetter, teacherId);
                }
                const updated = await tx.subjectGrade.update({
                    where: { id: existingGrade.id },
                    data: {
                        caScore: updateLegacyScores.caScore,
                        midScore: updateLegacyScores.midScore,
                        finalScore: updateLegacyScores.finalScore,
                        totalScore: updateTotalScore,
                        gradeLetter: updateGradeLetter,
                        gradePoint: updateGradePoint,
                        remark: dto.remark,
                        teacherId,
                        status: grading_dto_1.GradeStatus.DRAFT,
                        submittedById: null,
                        approvedById: null,
                        registrarComment: null,
                    },
                    include: {
                        student: true,
                        subject: true,
                    },
                });
                if (normalizedComponentScores.length > 0) {
                    await this.upsertGradeScores(tx, updated.id, mergedComponentScores);
                }
                return updated;
            });
            await this.invalidateGradeCaches({
                schoolId: access.schoolId,
                teacherId,
                studentIds: [dto.studentId],
            });
            return updated;
        }
        const grade = await this.prisma.subjectGrade.create({
            data: {
                schoolId: access.schoolId,
                studentId: dto.studentId,
                subjectId: dto.subjectId,
                classId: dto.classId,
                sectionId: dto.sectionId,
                academicYear: dto.academicYear,
                termId: dto.termId,
                caScore: derivedLegacyScores.caScore,
                midScore: derivedLegacyScores.midScore,
                finalScore: derivedLegacyScores.finalScore,
                totalScore,
                gradeLetter,
                gradePoint,
                remark: dto.remark,
                teacherId,
                status: grading_dto_1.GradeStatus.DRAFT,
            },
            include: {
                student: true,
                subject: true,
            },
        });
        if (normalizedComponentScores.length > 0) {
            if (normalizedComponentScores.some((item) => item.componentId)) {
                await this.prisma.gradeScore.createMany({
                    data: normalizedComponentScores
                        .filter((item) => item.componentId)
                        .map((item) => ({
                        subjectGradeId: grade.id,
                        gradingComponentId: item.componentId,
                        score: item.score ?? null,
                        maxScore: item.maxScore,
                    })),
                });
            }
        }
        await this.invalidateGradeCaches({
            schoolId: access.schoolId,
            teacherId,
            studentIds: [dto.studentId],
        });
        return grade;
    }
    async bulkEnterGrades(teacherId, schoolId, dto) {
        const firstGrade = dto.grades[0];
        if (!firstGrade) {
            return { total: 0, successful: 0, failed: 0, results: [] };
        }
        this.ensureConsistentBulkPayload(dto.grades);
        await this.assertTermIsOpen(firstGrade.termId, true);
        const access = await this.resolveTeacherGradingAccess(teacherId, schoolId, firstGrade.academicYear, firstGrade.classId, firstGrade.sectionId, firstGrade.subjectId);
        const results = await this.prisma.$transaction(async (tx) => {
            const gradeResults = [];
            for (const gradeDto of dto.grades) {
                await this.assertStudentInGradeEntryRoster(tx, {
                    studentId: gradeDto.studentId,
                    schoolId: access.schoolId,
                    classId: gradeDto.classId,
                    sectionId: gradeDto.sectionId,
                    academicYear: gradeDto.academicYear,
                });
                const normalizedComponentScores = await this.normalizeComponentPayload(access.schoolId, gradeDto.componentScores, {
                    teacherId,
                    academicYear: gradeDto.academicYear,
                    termId: gradeDto.termId,
                    classId: gradeDto.classId,
                    sectionId: gradeDto.sectionId,
                    subjectId: gradeDto.subjectId,
                });
                const derivedLegacyScores = normalizedComponentScores.length > 0
                    ? this.buildLegacyScoresFromComponents(normalizedComponentScores)
                    : {
                        caScore: gradeDto.caScore ?? null,
                        midScore: gradeDto.midScore ?? null,
                        finalScore: gradeDto.finalScore ?? null,
                    };
                const hasLegacyValue = derivedLegacyScores.caScore !== null ||
                    derivedLegacyScores.midScore !== null ||
                    derivedLegacyScores.finalScore !== null;
                const componentTotal = normalizedComponentScores.length > 0
                    ? this.calculateTotalFromComponentScores(normalizedComponentScores)
                    : null;
                const totalScore = componentTotal ?? (hasLegacyValue
                    ? (derivedLegacyScores.caScore ?? 0) +
                        (derivedLegacyScores.midScore ?? 0) +
                        (derivedLegacyScores.finalScore ?? 0)
                    : null);
                const { gradeLetter, gradePoint } = totalScore === null
                    ? { gradeLetter: null, gradePoint: null }
                    : await this.getGradeFromScore(access.schoolId, totalScore);
                const existingGrade = await tx.subjectGrade.findUnique({
                    where: {
                        studentId_subjectId_academicYear_termId: {
                            studentId: gradeDto.studentId,
                            subjectId: gradeDto.subjectId,
                            academicYear: gradeDto.academicYear,
                            termId: gradeDto.termId,
                        },
                    },
                    include: {
                        gradeScores: {
                            include: {
                                component: true,
                            },
                        },
                    },
                });
                if (existingGrade) {
                    if (existingGrade.isLocked) {
                        throw new localization_1.LocalizedException('grading.cannot_edit_grade_for_student_grade_is_locked_1a75062c', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot edit grade for student ${gradeDto.studentId} - grade is locked');
                    }
                    if (existingGrade.status === grading_dto_1.GradeStatus.APPROVED) {
                        throw new localization_1.LocalizedException('grading.cannot_save_draft_for_student_grade_is_already_approved_440d2be1', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot save draft for student ${gradeDto.studentId} - grade is already approved');
                    }
                    const existingComponentScores = existingGrade.gradeScores?.map((item) => ({
                        code: item.component.code,
                        score: item.score,
                        maxScore: item.maxScore,
                        componentId: item.gradingComponentId,
                    })) ?? [];
                    const mergedComponentScores = normalizedComponentScores.length > 0
                        ? this.mergeComponentScores(existingComponentScores, normalizedComponentScores)
                        : normalizedComponentScores;
                    const updateLegacyScores = normalizedComponentScores.length > 0
                        ? this.buildMergedLegacyScores(mergedComponentScores, existingGrade)
                        : derivedLegacyScores;
                    const updateTotalScore = normalizedComponentScores.length > 0
                        ? this.calculateTotalFromLegacyScores(updateLegacyScores)
                        : totalScore;
                    const { gradeLetter: updateGradeLetter, gradePoint: updateGradePoint, } = updateTotalScore === null
                        ? { gradeLetter: null, gradePoint: null }
                        : await this.getGradeFromScore(access.schoolId, updateTotalScore);
                    const updated = await tx.subjectGrade.update({
                        where: { id: existingGrade.id },
                        data: {
                            caScore: updateLegacyScores.caScore,
                            midScore: updateLegacyScores.midScore,
                            finalScore: updateLegacyScores.finalScore,
                            totalScore: updateTotalScore,
                            gradeLetter: updateGradeLetter,
                            gradePoint: updateGradePoint,
                            remark: gradeDto.remark,
                            teacherId,
                            status: grading_dto_1.GradeStatus.DRAFT,
                            submittedById: null,
                            approvedById: null,
                            registrarComment: null,
                        },
                    });
                    if (normalizedComponentScores.length > 0) {
                        await this.upsertGradeScores(tx, existingGrade.id, mergedComponentScores);
                    }
                    gradeResults.push({
                        success: true,
                        studentId: gradeDto.studentId,
                        data: updated,
                    });
                }
                else {
                    const grade = await tx.subjectGrade.create({
                        data: {
                            schoolId: access.schoolId,
                            studentId: gradeDto.studentId,
                            subjectId: gradeDto.subjectId,
                            classId: gradeDto.classId,
                            sectionId: gradeDto.sectionId,
                            academicYear: gradeDto.academicYear,
                            termId: gradeDto.termId,
                            caScore: derivedLegacyScores.caScore,
                            midScore: derivedLegacyScores.midScore,
                            finalScore: derivedLegacyScores.finalScore,
                            totalScore,
                            gradeLetter,
                            gradePoint,
                            remark: gradeDto.remark,
                            teacherId,
                            status: grading_dto_1.GradeStatus.DRAFT,
                        },
                    });
                    if (normalizedComponentScores.length > 0 &&
                        normalizedComponentScores.some((item) => item.componentId)) {
                        await tx.gradeScore.createMany({
                            data: normalizedComponentScores
                                .filter((item) => item.componentId)
                                .map((item) => ({
                                subjectGradeId: grade.id,
                                gradingComponentId: item.componentId,
                                score: item.score ?? null,
                                maxScore: item.maxScore,
                            })),
                        });
                    }
                    gradeResults.push({
                        success: true,
                        studentId: gradeDto.studentId,
                        data: grade,
                    });
                }
            }
            return gradeResults;
        });
        await this.invalidateGradeCaches({
            schoolId: access.schoolId,
            teacherId,
            studentIds: dto.grades.map((grade) => grade.studentId),
        });
        return {
            total: dto.grades.length,
            successful: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            results,
        };
    }
    async saveDraft(teacherId, schoolId, gradeId) {
        const grade = await this.prisma.subjectGrade.findUnique({
            where: { id: gradeId },
        });
        if (!grade) {
            throw new localization_1.LocalizedException('grading.grade_not_found_c0cf0a15', undefined, common_1.HttpStatus.NOT_FOUND, 'Grade not found');
        }
        if (grade.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('grading.you_can_only_edit_grades_in_your_school_9ec73540', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only edit grades in your school');
        }
        if (grade.teacherId !== teacherId) {
            throw new localization_1.LocalizedException('grading.you_can_only_edit_your_own_grades_99ae93c9', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only edit your own grades');
        }
        if (grade.status !== grading_dto_1.GradeStatus.DRAFT &&
            grade.status !== grading_dto_1.GradeStatus.REJECTED) {
            throw new localization_1.LocalizedException('grading.can_only_save_draft_for_draft_or_rejected_grades_496674a1', undefined, common_1.HttpStatus.FORBIDDEN, 'Can only save draft for DRAFT or REJECTED grades');
        }
        if (grade.isLocked) {
            throw new localization_1.LocalizedException('grading.this_grade_is_locked_and_cannot_be_modified_a567e02f', undefined, common_1.HttpStatus.FORBIDDEN, 'This grade is locked and cannot be modified');
        }
        const updated = await this.prisma.subjectGrade.update({
            where: { id: gradeId },
            data: { status: grading_dto_1.GradeStatus.DRAFT },
        });
        await this.invalidateGradeCaches({
            schoolId: grade.schoolId,
            teacherId,
            studentIds: [grade.studentId],
        });
        return updated;
    }
    async submitToRegistrar(teacherId, schoolId, gradeId) {
        const grade = await this.prisma.subjectGrade.findUnique({
            where: { id: gradeId },
        });
        if (!grade) {
            throw new localization_1.LocalizedException('grading.grade_not_found_c0cf0a15', undefined, common_1.HttpStatus.NOT_FOUND, 'Grade not found');
        }
        if (grade.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('grading.you_can_only_submit_grades_in_your_school_14f41d67', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only submit grades in your school');
        }
        if (grade.teacherId !== teacherId) {
            throw new localization_1.LocalizedException('grading.you_can_only_submit_your_own_grades_4b9f4366', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only submit your own grades');
        }
        if (grade.status !== grading_dto_1.GradeStatus.DRAFT &&
            grade.status !== grading_dto_1.GradeStatus.REJECTED) {
            throw new localization_1.LocalizedException('grading.can_only_submit_draft_or_rejected_grades_ec9fbe7b', undefined, common_1.HttpStatus.FORBIDDEN, 'Can only submit DRAFT or REJECTED grades');
        }
        await this.assertTermIsOpen(grade.termId, true);
        if (grade.isLocked) {
            throw new localization_1.LocalizedException('grading.this_grade_is_locked_and_cannot_be_submitted_b3076050', undefined, common_1.HttpStatus.FORBIDDEN, 'This grade is locked and cannot be submitted');
        }
        const updated = await this.prisma.subjectGrade.update({
            where: { id: gradeId },
            data: { status: grading_dto_1.GradeStatus.SUBMITTED, submittedById: teacherId },
        });
        await this.invalidateGradeCaches({
            schoolId: grade.schoolId,
            teacherId,
            studentIds: [grade.studentId],
        });
        return updated;
    }
    async submitAllToRegistrar(teacherId, schoolId, academicYear, termId, classId, sectionId, subjectId) {
        await this.assertTermIsOpen(termId, true);
        await this.resolveTeacherGradingAccess(teacherId, schoolId, academicYear, classId, sectionId, subjectId);
        const grades = await this.prisma.subjectGrade.findMany({
            where: {
                academicYear,
                schoolId,
                termId,
                classId,
                sectionId,
                subjectId,
                teacherId,
                status: { in: [grading_dto_1.GradeStatus.DRAFT, grading_dto_1.GradeStatus.REJECTED] },
            },
        });
        if (grades.length === 0) {
            throw new localization_1.LocalizedException('grading.no_grades_to_submit_7d2db342', undefined, undefined, 'No grades to submit');
        }
        const result = await this.prisma.subjectGrade.updateMany({
            where: {
                id: { in: grades.map((g) => g.id) },
            },
            data: { status: grading_dto_1.GradeStatus.SUBMITTED, submittedById: teacherId },
        });
        await this.invalidateGradeCaches({
            schoolId: grades[0].schoolId,
            teacherId,
            studentIds: grades.map((grade) => grade.studentId),
        });
        return result;
    }
    async getGradesForReview(schoolId, filter) {
        const where = {
            schoolId,
            status: filter.status || grading_dto_1.GradeStatus.SUBMITTED,
        };
        if (filter.academicYear)
            where.academicYear = filter.academicYear;
        if (filter.termId)
            where.termId = filter.termId;
        if (filter.classId)
            where.classId = filter.classId;
        if (filter.sectionId)
            where.sectionId = filter.sectionId;
        if (filter.subjectId)
            where.subjectId = filter.subjectId;
        if (filter.teacherId)
            where.teacherId = filter.teacherId;
        return this.cacheService.getOrSetVersioned(this.getSchoolGradesNamespace(schoolId), JSON.stringify({ mode: 'review', filter }), cache_constants_1.CACHE_TTL.GRADES_SCHOOL, async () => this.prisma.subjectGrade.findMany({
            where,
            include: {
                student: true,
                subject: true,
                class: true,
                section: true,
                term: true,
                teacher: true,
            },
            orderBy: [
                { class: { name: 'asc' } },
                { section: { name: 'asc' } },
                { subject: { name: 'asc' } },
                { student: { name: 'asc' } },
            ],
        }));
    }
    async reviewGrade(registrarId, schoolId, gradeId, dto) {
        this.assertReviewStatus(dto.status);
        if (dto.status === grading_dto_1.GradeStatus.REJECTED && !dto.registrarComment?.trim()) {
            throw new localization_1.LocalizedException('grading.registrar_comment_is_required_when_rejecting_a_grade_c5fb4cda', undefined, undefined, 'Registrar comment is required when rejecting a grade');
        }
        const grade = await this.prisma.subjectGrade.findUnique({
            where: { id: gradeId },
        });
        if (!grade) {
            throw new localization_1.LocalizedException('grading.grade_not_found_c0cf0a15', undefined, common_1.HttpStatus.NOT_FOUND, 'Grade not found');
        }
        if (grade.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('grading.you_are_not_allowed_to_review_grades_from_another_school_ad931a8a', undefined, common_1.HttpStatus.FORBIDDEN, 'You are not allowed to review grades from another school');
        }
        if (grade.status !== grading_dto_1.GradeStatus.SUBMITTED) {
            throw new localization_1.LocalizedException('grading.can_only_review_submitted_grades_96d85456', undefined, common_1.HttpStatus.FORBIDDEN, 'Can only review SUBMITTED grades');
        }
        const updated = await this.prisma.subjectGrade.update({
            where: { id: gradeId },
            data: {
                status: dto.status,
                registrarComment: dto.registrarComment?.trim() || null,
                approvedById: registrarId,
            },
            include: {
                student: true,
                subject: true,
                teacher: true,
            },
        });
        await this.invalidateGradeCaches({
            schoolId,
            teacherId: grade.teacherId,
            studentIds: [grade.studentId],
        });
        return updated;
    }
    async bulkApproveGrades(registrarId, schoolId, gradeIds) {
        if (gradeIds.length === 0) {
            throw new localization_1.LocalizedException('grading.at_least_one_grade_id_is_required_25ccb1db', undefined, undefined, 'At least one grade ID is required');
        }
        const result = await this.prisma.subjectGrade.updateMany({
            where: {
                id: { in: gradeIds },
                schoolId,
                status: grading_dto_1.GradeStatus.SUBMITTED,
            },
            data: {
                status: grading_dto_1.GradeStatus.APPROVED,
                approvedById: registrarId,
            },
        });
        const grades = await this.prisma.subjectGrade.findMany({
            where: { id: { in: gradeIds }, schoolId },
            select: { studentId: true, teacherId: true },
        });
        await this.invalidateGradeCaches({
            schoolId,
            teacherId: grades[0]?.teacherId,
            studentIds: grades.map((grade) => grade.studentId),
        });
        return result;
    }
    async bulkRejectGrades(registrarId, schoolId, gradeIds, comment) {
        if (gradeIds.length === 0) {
            throw new localization_1.LocalizedException('grading.at_least_one_grade_id_is_required_25ccb1db', undefined, undefined, 'At least one grade ID is required');
        }
        if (!comment?.trim()) {
            throw new localization_1.LocalizedException('grading.comment_is_required_when_rejecting_grades_7c1cf283', undefined, undefined, 'Comment is required when rejecting grades');
        }
        const result = await this.prisma.subjectGrade.updateMany({
            where: {
                id: { in: gradeIds },
                schoolId,
                status: grading_dto_1.GradeStatus.SUBMITTED,
            },
            data: {
                status: grading_dto_1.GradeStatus.REJECTED,
                registrarComment: comment.trim(),
                approvedById: registrarId,
            },
        });
        const grades = await this.prisma.subjectGrade.findMany({
            where: { id: { in: gradeIds }, schoolId },
            select: { studentId: true, teacherId: true },
        });
        await this.invalidateGradeCaches({
            schoolId,
            teacherId: grades[0]?.teacherId,
            studentIds: grades.map((grade) => grade.studentId),
        });
        return result;
    }
    async getStudentGrades(studentId, schoolId, academicYear, termId) {
        const visiblePortalStatuses = [
            grading_dto_1.GradeStatus.SUBMITTED,
            grading_dto_1.GradeStatus.APPROVED,
        ];
        if (academicYear) {
            await this.syncGradeLockStatus(studentId, schoolId, academicYear);
        }
        else {
            const academicYears = await this.prisma.subjectGrade.findMany({
                where: {
                    studentId,
                    schoolId,
                    status: { in: visiblePortalStatuses },
                },
                select: { academicYear: true },
                distinct: ['academicYear'],
            });
            await Promise.all(academicYears.map((row) => this.syncGradeLockStatus(studentId, schoolId, row.academicYear)));
        }
        return this.cacheService.getOrSetVersioned(this.getStudentGradesNamespace(schoolId, studentId), JSON.stringify({ mode: 'grades', academicYear, termId }), cache_constants_1.CACHE_TTL.GRADES_STUDENT, async () => {
            const grades = await this.prisma.subjectGrade.findMany({
                where: {
                    studentId,
                    schoolId,
                    status: { in: visiblePortalStatuses },
                    ...(academicYear ? { academicYear } : {}),
                    ...(termId ? { termId } : {}),
                },
                include: {
                    subject: true,
                    class: true,
                    section: true,
                    term: true,
                },
                orderBy: [{ term: { order: 'asc' } }, { subject: { name: 'asc' } }],
            });
            return grades.map((grade) => this.maskLockedGradeForPortal(grade));
        });
    }
    async getChildGrades(parentId, childId, schoolId, academicYear, termId) {
        const { studentUserId } = await this.resolveChildStudentForParent(parentId, schoolId, childId);
        return this.getStudentGrades(studentUserId, schoolId, academicYear, termId);
    }
    async getChildFinalGradesWithClass(parentId, childId, schoolId, academicYear, classId) {
        await this.ensureParentGradeAccessEnabled(schoolId);
        const { studentUserId } = await this.resolveChildStudentForParent(parentId, schoolId, childId);
        await this.ensureCurrentPeriodFeesPaid(studentUserId, schoolId, academicYear);
        return this.getStudentFinalGrades(studentUserId, schoolId, academicYear, classId, true);
    }
    async getTeacherAssignments(teacherId, schoolId, academicYear) {
        return this.cacheService.getOrSetVersioned(this.getTeacherGradesNamespace(schoolId, teacherId), JSON.stringify({ mode: 'assignments', academicYear }), cache_constants_1.CACHE_TTL.GRADES_TEACHER, async () => {
            const teacherSubjectAssignments = await this.prisma.teacherSubjectAssignment.findMany({
                where: {
                    teacherId,
                    schoolId,
                    academicYear,
                    isActive: true,
                },
                include: {
                    subject: true,
                    class: true,
                    section: true,
                },
            });
            const classSubjectAssignments = await this.prisma.classSubject.findMany({
                where: {
                    teacherId,
                    academicYear,
                    class: { schoolId },
                },
                include: {
                    subject: true,
                    class: true,
                    section: true,
                },
            });
            const subjectAssignmentsMap = new Map();
            for (const assignment of teacherSubjectAssignments) {
                const key = `${assignment.classId}:${assignment.sectionId}:${assignment.subjectId}:${assignment.academicYear}`;
                subjectAssignmentsMap.set(key, assignment);
            }
            for (const assignment of classSubjectAssignments) {
                const key = `${assignment.classId}:${assignment.sectionId}:${assignment.subjectId}:${assignment.academicYear}`;
                if (!subjectAssignmentsMap.has(key)) {
                    subjectAssignmentsMap.set(key, assignment);
                }
            }
            const homeroomSections = await this.prisma.section.findMany({
                where: {
                    homeroomTeacherId: teacherId,
                    class: {
                        schoolId,
                        academicYearId: academicYear,
                    },
                },
                include: {
                    class: {
                        include: {
                            gradeLevel: true,
                        },
                    },
                    classSubjects: {
                        include: {
                            subject: true,
                        },
                    },
                },
            });
            return {
                subjectAssignments: Array.from(subjectAssignmentsMap.values()),
                homeroomAssignments: homeroomSections.map((section) => ({
                    id: `homeroom-${section.id}`,
                    isHomeroom: true,
                    sectionId: section.id,
                    section,
                    class: section.class,
                    subjects: section.classSubjects.map((cs) => ({
                        subject: cs.subject,
                        classSubjectId: cs.id,
                    })),
                })),
            };
        });
    }
    async createGradingComponents(schoolId, components) {
        const results = [];
        for (const comp of components) {
            const result = await this.prisma.gradingComponent.upsert({
                where: {
                    schoolId_code: {
                        schoolId,
                        code: comp.code,
                    },
                },
                update: {
                    name: comp.name,
                    percentage: comp.percentage,
                },
                create: {
                    schoolId,
                    name: comp.name,
                    code: comp.code,
                    percentage: comp.percentage,
                },
            });
            results.push(result);
        }
        return results;
    }
    async createGradeScales(schoolId, scales) {
        const results = [];
        for (const scale of scales) {
            const result = await this.prisma.gradeScale.upsert({
                where: {
                    schoolId_gradeLetter: {
                        schoolId,
                        gradeLetter: scale.gradeLetter,
                    },
                },
                update: {
                    minScore: scale.minScore,
                    maxScore: scale.maxScore,
                    gradePoint: scale.gradePoint,
                    description: scale.description,
                },
                create: {
                    schoolId,
                    gradeLetter: scale.gradeLetter,
                    minScore: scale.minScore,
                    maxScore: scale.maxScore,
                    gradePoint: scale.gradePoint,
                    description: scale.description,
                },
            });
            results.push(result);
        }
        return results;
    }
    async getGradingComponents(schoolId) {
        const components = await this.prisma.gradingComponent.findMany({
            where: { schoolId, isActive: true },
            orderBy: { percentage: 'desc' },
        });
        if (components.length > 0) {
            return components;
        }
        const settings = await this.prisma.schoolSettings.findUnique({
            where: { schoolId },
        });
        const gradingComponentsFromSettings = settings?.gradingComponents;
        if (gradingComponentsFromSettings) {
            return gradingComponentsFromSettings;
        }
        return [
            { code: 'CA', name: 'Continuous Assessment', percentage: 30 },
            { code: 'MID', name: 'Mid Exam', percentage: 20 },
            { code: 'FINAL', name: 'Final Exam', percentage: 50 },
        ];
    }
    async getGradeScale(schoolId) {
        return this.prisma.gradeScale.findMany({
            where: { schoolId, isActive: true },
            orderBy: { minScore: 'desc' },
        });
    }
    async getAssessmentTypes(schoolId) {
        const weights = await this.prisma.assessmentWeight.findMany({
            where: { schoolId, isActive: true },
            orderBy: { percentage: 'desc' },
        });
        if (weights.length > 0) {
            return weights.map(w => ({
                code: w.type,
                name: w.type
                    .toLowerCase()
                    .split('_')
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(' '),
                percentage: w.percentage,
            }));
        }
        const settings = await this.prisma.schoolSettings.findUnique({
            where: { schoolId },
        });
        if (settings?.assessmentTypes) {
            return settings.assessmentTypes;
        }
        return [
            { code: 'QUIZ', name: 'Quiz', percentage: 15 },
            { code: 'TEST', name: 'Test', percentage: 25 },
            { code: 'MID', name: 'Mid Exam', percentage: 20 },
            { code: 'FINAL', name: 'Final Exam', percentage: 30 },
            { code: 'ATTENDANCE', name: 'Attendance', percentage: 10 },
        ];
    }
    async createAssessmentTypes(schoolId, types) {
        const results = [];
        for (const type of types) {
            const existing = await this.prisma.assessmentWeight.findUnique({
                where: {
                    schoolId_type: {
                        schoolId,
                        type: type.code,
                    },
                },
            });
            let result;
            if (existing) {
                result = await this.prisma.assessmentWeight.update({
                    where: { id: existing.id },
                    data: {
                        percentage: type.percentage,
                        isActive: true,
                    },
                });
            }
            else {
                result = await this.prisma.assessmentWeight.create({
                    data: {
                        schoolId,
                        type: type.code,
                        percentage: type.percentage,
                        isActive: true,
                    },
                });
            }
            results.push(result);
        }
        return results;
    }
    async assignTeacher(schoolId, dto) {
        const classData = await this.prisma.class.findFirst({
            where: { id: dto.classId, schoolId },
        });
        if (!classData) {
            throw new localization_1.LocalizedException('grading.class_not_found_7fd09a97', undefined, common_1.HttpStatus.NOT_FOUND, 'Class not found');
        }
        return this.prisma.teacherSubjectAssignment.upsert({
            where: {
                teacherId_subjectId_classId_sectionId_academicYear: {
                    teacherId: dto.teacherId,
                    subjectId: dto.subjectId,
                    classId: dto.classId,
                    sectionId: dto.sectionId,
                    academicYear: dto.academicYear,
                },
            },
            update: { isActive: true },
            create: {
                schoolId,
                teacherId: dto.teacherId,
                subjectId: dto.subjectId,
                classId: dto.classId,
                sectionId: dto.sectionId,
                academicYear: dto.academicYear,
            },
        });
    }
    async removeTeacherAssignment(schoolId, assignmentId) {
        return this.prisma.teacherSubjectAssignment.update({
            where: { id: assignmentId, schoolId },
            data: { isActive: false },
        });
    }
    async getSubjectPerformanceReport(schoolId, academicYear, termId, subjectId) {
        const grades = await this.prisma.subjectGrade.findMany({
            where: {
                schoolId,
                academicYear,
                termId,
                subjectId,
                status: grading_dto_1.GradeStatus.APPROVED,
            },
            include: {
                student: true,
            },
        });
        if (grades.length === 0) {
            return { totalStudents: 0, average: 0, distribution: {} };
        }
        const totalScore = grades.reduce((sum, g) => sum + (g.totalScore ?? 0), 0);
        const average = totalScore / grades.length;
        const distribution = grades.reduce((acc, g) => {
            const letter = g.gradeLetter ?? 'F';
            acc[letter] = (acc[letter] ?? 0) + 1;
            return acc;
        }, {});
        return {
            totalStudents: grades.length,
            average: Math.round(average * 100) / 100,
            distribution,
            highest: Math.max(...grades.map((g) => g.totalScore ?? 0)),
            lowest: Math.min(...grades.map((g) => g.totalScore ?? 0)),
        };
    }
    async getClassSummaryReport(schoolId, academicYear, termId, classId, sectionId) {
        const grades = await this.prisma.subjectGrade.findMany({
            where: {
                schoolId,
                academicYear,
                termId,
                classId,
                sectionId,
                status: grading_dto_1.GradeStatus.APPROVED,
            },
            include: {
                student: true,
                subject: true,
            },
        });
        const studentMap = new Map();
        for (const grade of grades) {
            if (!studentMap.has(grade.studentId)) {
                studentMap.set(grade.studentId, {
                    studentId: grade.studentId,
                    studentName: grade.student.name,
                    subjects: [],
                    totalScore: 0,
                });
            }
            const studentData = studentMap.get(grade.studentId);
            studentData.subjects.push({
                subjectId: grade.subjectId,
                subjectName: grade.subject.name,
                score: grade.totalScore,
                grade: grade.gradeLetter,
            });
            studentData.totalScore += grade.totalScore ?? 0;
        }
        const results = Array.from(studentMap.values()).map((s) => ({
            ...s,
            average: Math.round((s.totalScore / s.subjects.length) * 100) / 100,
        }));
        results.sort((a, b) => b.average - a.average);
        return results.map((s, index) => ({
            ...s,
            rank: index + 1,
        }));
    }
    async calculateFinalGrade(studentId, schoolId, subjectId, academicYear) {
        const academicYearRecord = await this.prisma.academicYear.findFirst({
            where: {
                schoolId,
                OR: [{ id: academicYear }, { name: academicYear }],
            },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
        });
        if (!academicYearRecord) {
            throw new localization_1.LocalizedException('grading.academic_year_not_found_561c725b', undefined, common_1.HttpStatus.NOT_FOUND, 'Academic year not found');
        }
        const periodGrades = await this.prisma.subjectGrade.findMany({
            where: {
                studentId,
                schoolId,
                subjectId,
                academicYear,
                status: grading_dto_1.GradeStatus.APPROVED,
            },
            include: {
                term: true,
            },
        });
        if (periodGrades.length === 0) {
            return {
                finalScore: 0,
                gradeLetter: 'N/A',
                gradePoint: 0,
                periodGrades: [],
                curriculumType: academicYearRecord.curriculumType,
            };
        }
        let totalWeightedScore = 0;
        let totalWeight = 0;
        const calculatedPeriodGrades = [];
        for (const term of academicYearRecord.terms) {
            const periodGrade = periodGrades.find((pg) => pg.termId === term.id);
            const score = periodGrade?.totalScore ?? 0;
            const weight = term.percentageWeight;
            const weightedScore = (score * weight) / 100;
            totalWeightedScore += weightedScore;
            totalWeight += weight;
            calculatedPeriodGrades.push({
                periodId: term.id,
                periodName: term.name,
                score,
                weight,
                weightedScore,
            });
        }
        const finalScore = totalWeight > 0
            ? (totalWeightedScore / totalWeight) * 100
            : totalWeightedScore;
        const { gradeLetter, gradePoint } = await this.getGradeFromScore(schoolId, finalScore);
        return {
            finalScore: Math.round(finalScore * 100) / 100,
            gradeLetter,
            gradePoint,
            periodGrades: calculatedPeriodGrades,
            curriculumType: academicYearRecord.curriculumType,
        };
    }
    async getStudentFinalGrades(studentId, schoolId, academicYear, classId, hideLockedScores = false) {
        await this.syncGradeLockStatus(studentId, schoolId, academicYear);
        const finalGrades = await this.cacheService.getOrSetVersioned(this.getStudentGradesNamespace(schoolId, studentId), JSON.stringify({
            mode: 'final-grades',
            academicYear,
            classId,
            hideLockedScores,
        }), cache_constants_1.CACHE_TTL.STUDENT_FINAL_GRADES, async () => {
            const grades = await this.prisma.subjectGrade.findMany({
                where: {
                    studentId,
                    schoolId,
                    academicYear,
                    status: grading_dto_1.GradeStatus.APPROVED,
                    ...(classId && { classId }),
                },
                include: {
                    subject: true,
                    class: true,
                    section: true,
                    term: true,
                },
            });
            const subjectIds = [...new Set(grades.map((g) => g.subjectId))];
            return Promise.all(subjectIds.map(async (subjectId) => {
                const subjectGrades = grades.filter((g) => g.subjectId === subjectId);
                const firstGrade = subjectGrades[0];
                const result = await this.calculateFinalGrade(studentId, schoolId, subjectId, academicYear);
                return {
                    subjectId,
                    subjectName: firstGrade.subject.name,
                    classId: firstGrade.classId,
                    className: firstGrade.class.name,
                    sectionId: firstGrade.sectionId,
                    sectionName: firstGrade.section.name,
                    finalScore: result.finalScore,
                    gradeLetter: result.gradeLetter,
                    gradePoint: result.gradePoint,
                    isLocked: subjectGrades.some((grade) => grade.isLocked),
                    curriculumType: result.curriculumType,
                    periodGrades: result.periodGrades,
                };
            }));
        });
        if (!hideLockedScores) {
            return finalGrades;
        }
        return finalGrades.map((grade) => {
            if (!grade.isLocked) {
                return grade;
            }
            return {
                ...grade,
                finalScore: null,
                gradeLetter: null,
                gradePoint: null,
                financeLockMessage: 'Final grade is locked due to outstanding balance. Please contact finance.',
            };
        });
    }
    async verifyParentChild(parentId, studentId, schoolId) {
        const parentProfile = await this.prisma.parentProfile.findFirst({
            where: { userId: parentId, schoolId },
            select: { id: true },
        });
        if (!parentProfile)
            return false;
        const studentProfile = await this.prisma.studentProfile.findFirst({
            where: { schoolId, OR: [{ id: studentId }, { userId: studentId }] },
            select: { id: true },
        });
        if (!studentProfile)
            return false;
        const link = await this.prisma.parentStudent.findFirst({
            where: { parentId: parentProfile.id, studentId: studentProfile.id },
            select: { id: true },
        });
        return !!link;
    }
    async getChildGradesWithAnalysis(parentId, childId, schoolId, academicYear, termId) {
        await this.ensureParentGradeAccessEnabled(schoolId);
        const { studentUserId, studentProfileId } = await this.resolveChildStudentForParent(parentId, schoolId, childId);
        const curriculumSetting = await this.prisma.schoolSetting.findUnique({
            where: {
                schoolId_key: { schoolId: schoolId || '', key: 'curriculum_type' },
            },
        });
        const curriculumType = curriculumSetting?.value || 'TERM';
        const periodCountMap = {
            QUARTER: 4,
            QUARTERLY: 4,
            SEMESTER: 2,
            SEMESTERLY: 2,
            TERM: 3,
            TERMLY: 3,
            MONTHLY: 12,
            YEARLY: 1,
        };
        const periodCount = periodCountMap[curriculumType] || 3;
        const academicYearData = await this.prisma.academicYear.findFirst({
            where: academicYear
                ? { id: academicYear, schoolId }
                : { isActive: true, schoolId },
        });
        if (!academicYearData) {
            return {
                grades: [],
                periods: [],
                summary: {},
                curriculumType,
                periodCount,
            };
        }
        await this.ensureCurrentPeriodFeesPaid(studentUserId, schoolId, academicYearData.id, termId);
        const terms = await this.prisma.term.findMany({
            where: { academicYearId: academicYearData.id },
            orderBy: { order: 'asc' },
        });
        const visibleStatuses = [
            grading_dto_1.GradeStatus.SUBMITTED,
            grading_dto_1.GradeStatus.APPROVED,
        ];
        const grades = await this.prisma.subjectGrade.findMany({
            where: {
                studentId: studentUserId,
                schoolId,
                academicYear: academicYearData.id,
                status: { in: visibleStatuses },
                ...(termId ? { termId } : {}),
            },
            include: {
                subject: true,
                class: true,
                section: true,
                term: true,
                gradeScores: {
                    include: {
                        component: {
                            select: {
                                code: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ term: { order: 'asc' } }, { subject: { name: 'asc' } }],
        });
        const gradedItems = grades.filter((g) => g.totalScore !== null);
        const totalScore = gradedItems.reduce((sum, g) => sum + (g.totalScore || 0), 0);
        const average = gradedItems.length > 0
            ? Math.round((totalScore / gradedItems.length) * 100) / 100
            : 0;
        const gpa = this.calculateGPA(average);
        const periods = terms.map((term, termIndex) => {
            const termGrades = grades.filter((g) => g.termId === term.id);
            const termGraded = termGrades.filter((g) => g.totalScore !== null);
            const termTotal = termGraded.reduce((sum, g) => sum + (g.totalScore || 0), 0);
            const termAverage = termGraded.length > 0
                ? Math.round((termTotal / termGraded.length) * 100) / 100
                : 0;
            const termGPA = this.calculateGPA(termAverage);
            return {
                period: term.name,
                periodIndex: termIndex,
                termId: term.id,
                startDate: term.startDate,
                endDate: term.endDate,
                grades: termGrades,
                subjectCount: termGrades.length,
                average: termAverage,
                gpa: termGPA,
            };
        });
        const now = new Date();
        const currentPeriod = periods.find((period) => {
            const startDate = period.startDate ? new Date(period.startDate) : null;
            const endDate = period.endDate ? new Date(period.endDate) : null;
            return !!startDate && !!endDate && startDate <= now && endDate >= now;
        }) || null;
        let rank = null;
        let totalStudents = 0;
        if (grades.length > 0 && grades[0]?.classId) {
            const classGrades = await this.prisma.subjectGrade.findMany({
                where: {
                    classId: grades[0].classId,
                    schoolId,
                    academicYear: academicYearData.id,
                    termId: termId,
                    status: { in: visibleStatuses },
                    totalScore: { not: null },
                },
                select: { studentId: true, totalScore: true },
            });
            totalStudents = classGrades.length;
            const sortedGrades = classGrades
                .map((g) => ({ studentId: g.studentId, total: g.totalScore || 0 }))
                .sort((a, b) => b.total - a.total);
            const studentRank = sortedGrades.findIndex((g) => g.studentId === studentUserId);
            rank = studentRank >= 0 ? studentRank + 1 : null;
        }
        const summary = {
            totalSubjects: gradedItems.length,
            average,
            gpa,
            rank,
            totalStudents,
            highestScore: gradedItems.length > 0
                ? Math.max(...gradedItems.map((g) => g.totalScore || 0))
                : 0,
            lowestScore: gradedItems.length > 0
                ? Math.min(...gradedItems.map((g) => g.totalScore || 0))
                : 0,
        };
        return {
            grades,
            periods,
            summary,
            curriculumType,
            periodCount,
            academicYear: academicYearData,
            currentPeriodTermId: currentPeriod?.termId || null,
        };
    }
    calculateGPA(average) {
        if (average >= 90)
            return '4.0';
        if (average >= 80)
            return '3.5';
        if (average >= 70)
            return '3.0';
        if (average >= 60)
            return '2.5';
        if (average >= 50)
            return '2.0';
        return '0.0';
    }
    async ensureCurrentPeriodFeesPaid(studentId, schoolId, academicYearId, termId) {
        const effectiveTermId = termId || (await this.resolveCurrentTermId(academicYearId));
        if (!effectiveTermId)
            return;
        const clearance = await this.verifyFinancialClearance(studentId, schoolId, academicYearId, effectiveTermId, false);
        if (!clearance.isCleared) {
            throw new localization_1.LocalizedException('grading.results_are_locked_until_the_current_term_or_semester_fees_a_65156136', undefined, common_1.HttpStatus.FORBIDDEN, 'Results are locked until the current term or semester fees are paid.');
        }
    }
    async resolveCurrentTermId(academicYearId) {
        const now = new Date();
        const currentTerm = await this.prisma.term.findFirst({
            where: {
                academicYearId,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            orderBy: { order: 'asc' },
            select: { id: true },
        });
        if (currentTerm?.id)
            return currentTerm.id;
        const firstTerm = await this.prisma.term.findFirst({
            where: { academicYearId },
            orderBy: { order: 'asc' },
            select: { id: true },
        });
        return firstTerm?.id || null;
    }
    async calculatePeriodRankings(academicYearId, termId, classId, sectionId) {
        if (!classId) {
            throw new localization_1.LocalizedException('grading.class_selection_is_required_before_calculating_rankings_47c702d6', undefined, undefined, 'Class selection is required before calculating rankings');
        }
        const academicYear = await this.prisma.academicYear.findUnique({
            where: { id: academicYearId },
        });
        if (!academicYear) {
            throw new localization_1.LocalizedException('grading.academic_year_not_found_561c725b', undefined, common_1.HttpStatus.NOT_FOUND, 'Academic year not found');
        }
        const academicYearName = academicYear.name;
        const termName = termId
            ? (await this.prisma.term.findFirst({
                where: { id: termId, academicYearId },
                select: { name: true },
            }))?.name
            : null;
        const normalizedSectionId = sectionId && sectionId !== 'all' ? sectionId : undefined;
        const selectedGrade = classId ? Number(classId) : Number.NaN;
        const classSelector = classId
            ? Number.isInteger(selectedGrade)
                ? { grade: selectedGrade }
                : { id: classId }
            : {};
        const classes = await this.prisma.class.findMany({
            where: {
                schoolId: academicYear.schoolId,
                academicYearId,
                ...classSelector,
            },
            include: {
                sections: { select: { name: true } },
            },
        });
        const results = [];
        for (const classItem of classes) {
            const gradeWhere = {
                classId: classItem.id,
                academicYear: academicYearId,
                status: { in: [grading_dto_1.GradeStatus.SUBMITTED, grading_dto_1.GradeStatus.APPROVED] },
                totalScore: { not: null },
            };
            if (termId) {
                gradeWhere.termId = termId;
            }
            if (normalizedSectionId) {
                gradeWhere.sectionId = normalizedSectionId;
            }
            const studentGrades = await this.prisma.subjectGrade.findMany({
                where: gradeWhere,
                select: {
                    studentId: true,
                    caScore: true,
                    midScore: true,
                    finalScore: true,
                    totalScore: true,
                },
            });
            const studentClassesRaw = await this.prisma.studentClass.findMany({
                where: {
                    classId: classItem.id,
                    academicYear: academicYearName,
                    ...(normalizedSectionId ? { sectionId: normalizedSectionId } : {}),
                },
                include: {
                    student: {
                        include: {
                            studentProfile: {
                                select: {
                                    rollNumber: true,
                                },
                            },
                        },
                    },
                    section: true,
                },
            });
            const studentMap = new Map();
            for (const sc of studentClassesRaw) {
                const studentName = sc.student?.name || sc.student?.email || 'Unknown';
                studentMap.set(sc.studentId, {
                    name: studentName,
                    rollNumber: sc.student?.studentProfile?.rollNumber || '',
                    sectionId: sc.sectionId,
                    sectionName: sc.section?.name || '',
                });
            }
            const studentAverages = new Map();
            for (const sg of studentGrades) {
                const effectiveTotal = this.getEffectiveGradeTotalScore(sg);
                if (effectiveTotal === null) {
                    continue;
                }
                const current = studentAverages.get(sg.studentId) || {
                    total: 0,
                    count: 0,
                };
                studentAverages.set(sg.studentId, {
                    total: current.total + effectiveTotal,
                    count: current.count + 1,
                });
            }
            const rankings = await Promise.all(Array.from(studentAverages.entries()).map(async ([studentId, data]) => {
                const studentInfo = studentMap.get(studentId);
                const average = Math.round((data.total / data.count) * 100) / 100;
                const { gradeLetter, gradePoint } = await this.getGradeFromScore(academicYear.schoolId, average);
                return {
                    studentId,
                    studentName: studentInfo?.name || 'Unknown',
                    rollNumber: studentInfo?.rollNumber || '',
                    className: classItem.name,
                    classId: classItem.id,
                    sectionId: studentInfo?.sectionId || '',
                    sectionName: studentInfo?.sectionName || '',
                    average,
                    gradeLetter,
                    gradePoint,
                };
            })).then((rows) => rows.sort((a, b) => b.average - a.average));
            rankings.forEach((rank, index) => {
                results.push({
                    classId: rank.classId,
                    className: rank.className,
                    sectionId: rank.sectionId,
                    sectionName: rank.sectionName,
                    studentId: rank.studentId,
                    studentName: rank.studentName,
                    rollNumber: rank.rollNumber,
                    academicYear: academicYearId,
                    termId: termId || null,
                    rank: index + 1,
                    totalStudents: rankings.length,
                    average: rank.average,
                    gradeLetter: rank.gradeLetter,
                    gradePoint: rank.gradePoint,
                });
            });
        }
        const filteredResults = normalizedSectionId
            ? results.filter((result) => result.sectionId === normalizedSectionId)
            : results;
        const allStudentAverages = filteredResults.map((r) => r.average);
        const classAverage = allStudentAverages.length > 0
            ? Math.round((allStudentAverages.reduce((a, b) => a + b, 0) /
                allStudentAverages.length) *
                100) / 100
            : 0;
        const totalStudents = filteredResults.length;
        const passRate = allStudentAverages.length > 0
            ? Math.round((allStudentAverages.filter((a) => a >= 50).length /
                allStudentAverages.length) *
                100)
            : 0;
        const topStudents = filteredResults
            .sort((a, b) => b.average - a.average)
            .slice(0, 10)
            .map((r, index) => ({
            id: r.studentId,
            name: r.studentName,
            rank: index + 1,
            average: r.average,
            attendance: 0,
        }));
        let updatedReportCards = 0;
        let notifiedParents = 0;
        if (termName) {
            const academicYearKeys = Array.from(new Set([academicYearId, academicYearName].filter(Boolean)));
            const parentUserIds = new Set();
            for (const result of filteredResults) {
                const updateResult = await this.prisma.reportCard.updateMany({
                    where: {
                        studentId: result.studentId,
                        classId: result.classId,
                        academicYear: { in: academicYearKeys },
                        term: termName,
                        ...(normalizedSectionId
                            ? { sectionId: normalizedSectionId }
                            : {}),
                    },
                    data: {
                        rank: result.rank,
                        rankInClass: result.rank,
                    },
                });
                updatedReportCards += updateResult.count;
            }
            if (updatedReportCards > 0) {
                const updatedCards = await this.prisma.reportCard.findMany({
                    where: {
                        studentId: {
                            in: filteredResults.map((result) => result.studentId),
                        },
                        classId: {
                            in: Array.from(new Set(filteredResults.map((result) => result.classId))),
                        },
                        academicYear: { in: academicYearKeys },
                        term: termName,
                        ...(normalizedSectionId
                            ? { sectionId: normalizedSectionId }
                            : {}),
                    },
                    select: {
                        student: {
                            select: {
                                studentProfile: {
                                    select: {
                                        parents: {
                                            select: {
                                                parent: {
                                                    select: {
                                                        userId: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                });
                for (const card of updatedCards) {
                    for (const relation of card.student.studentProfile?.parents ?? []) {
                        if (relation.parent.userId) {
                            parentUserIds.add(relation.parent.userId);
                        }
                    }
                }
                if (parentUserIds.size > 0) {
                    const notification = await this.notificationService.createBulkNotifications({
                        schoolId: academicYear.schoolId,
                        userIds: Array.from(parentUserIds),
                        title: 'Student Ranking Updated',
                        message: `${termName} rankings have been calculated and are available in your child results.`,
                        type: notification_service_1.NotificationType.GRADE_UPDATED,
                        actionUrl: '/parent/children',
                        metadata: {
                            academicYearId,
                            academicYear: academicYearName,
                            termId,
                            term: termName,
                            classId: classId || null,
                            sectionId: normalizedSectionId || null,
                        },
                    });
                    notifiedParents = notification.count;
                }
            }
        }
        return {
            calculated: new Date().toISOString(),
            academicYear: academicYear.name,
            termId: termId || 'All Terms',
            termName: termName || 'All Terms',
            results: filteredResults,
            topStudents,
            totalStudents,
            classAverage,
            passRate,
            updatedReportCards,
            notifiedParents,
        };
    }
    async bulkUploadFromCsv(teacherId, schoolId, data) {
        const lines = data.csvData.split('\n').filter((line) => line.trim());
        if (lines.length < 2) {
            throw new localization_1.LocalizedException('grading.csv_file_is_empty_or_missing_headers_2ece5c43', undefined, undefined, 'CSV file is empty or missing headers');
        }
        const headers = lines[0].split(',').map((h) => h.trim());
        const studentIdIdx = headers.findIndex((h) => h.toLowerCase().includes('id'));
        const caIdx = headers.findIndex((h) => h.toLowerCase().includes('ca'));
        const midIdx = headers.findIndex((h) => h.toLowerCase().includes('mid'));
        const finalIdx = headers.findIndex((h) => h.toLowerCase().includes('final'));
        if (studentIdIdx === -1) {
            throw new localization_1.LocalizedException('grading.csv_must_include_a_student_id_column_4bc47c7f', undefined, undefined, 'CSV must include a Student ID column');
        }
        const grades = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map((v) => v.trim().replace(/^"(.*)"$/, '$1'));
            if (row.length < headers.length)
                continue;
            const studentId = row[studentIdIdx];
            if (!studentId)
                continue;
            grades.push({
                studentId,
                academicYear: data.academicYear,
                termId: data.termId,
                classId: data.classId,
                sectionId: data.sectionId,
                subjectId: data.subjectId,
                caScore: caIdx !== -1 ? parseFloat(row[caIdx]) || 0 : undefined,
                midScore: midIdx !== -1 ? parseFloat(row[midIdx]) || 0 : undefined,
                finalScore: finalIdx !== -1 ? parseFloat(row[finalIdx]) || 0 : undefined,
            });
        }
        return this.bulkEnterGrades(teacherId, schoolId, { grades });
    }
    async generateGradeTemplate(teacherId, schoolId, classId, sectionId, subjectId, academicYear) {
        await this.resolveTeacherGradingAccess(teacherId, schoolId, academicYear, classId, sectionId, subjectId);
        const students = await this.prisma.studentClass.findMany({
            where: { schoolId, classId, sectionId, academicYear },
            include: { student: true },
        });
        let csv = 'Student ID,Student Name,CA Score,Mid Score,Final Score\n';
        students.forEach((sc) => {
            csv += `${sc.studentId},"${sc.student.name}",,,\n`;
        });
        return csv;
    }
    async getAssessmentScoresForReview(schoolId, filter) {
        const where = {
            assessmentSubject: {
                assessment: {
                    schoolId,
                },
            },
        };
        if (filter.academicYear)
            where.assessmentSubject.assessment.academicYearId = filter.academicYear;
        if (filter.termId)
            where.assessmentSubject.assessment.termId = filter.termId;
        if (filter.classId)
            where.assessmentSubject.classId = filter.classId;
        if (filter.sectionId)
            where.assessmentSubject.sectionId = filter.sectionId;
        if (filter.subjectId)
            where.assessmentSubject.subjectId = filter.subjectId;
        if (filter.status)
            where.status = filter.status;
        return this.prisma.studentAssessmentScore.findMany({
            where,
            include: {
                student: true,
                assessmentSubject: {
                    include: {
                        assessment: true,
                        subject: true,
                        class: true,
                        section: true,
                    },
                },
            },
        });
    }
    async getEntryProgress(schoolId, academicYear, term) {
        const academicYearRecord = await this.prisma.academicYear.findFirst({
            where: {
                schoolId,
                OR: [{ id: academicYear }, { name: academicYear }],
            },
            select: {
                id: true,
                name: true,
            },
        });
        const academicYearId = academicYearRecord?.id ?? academicYear;
        const academicYearName = academicYearRecord?.name ?? academicYear;
        const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
            where: {
                assessment: {
                    schoolId,
                    academicYearId,
                    termId: term,
                    status: { in: ['ACTIVE', 'COMPLETED'] },
                },
            },
            include: {
                assessment: {
                    select: {
                        type: true,
                        academicYearId: true,
                    },
                },
                subject: true,
                class: true,
                section: true,
                teacher: { select: { id: true, name: true } },
            },
        });
        const studentCountByClassSection = new Map();
        const getStudentCount = async (classId, sectionId) => {
            const key = `${classId}:${sectionId ?? 'all'}`;
            if (!studentCountByClassSection.has(key)) {
                const count = await this.prisma.studentClass.count({
                    where: {
                        schoolId,
                        classId,
                        ...(sectionId ? { sectionId } : {}),
                        academicYear: {
                            in: Array.from(new Set([academicYearId, academicYearName])),
                        },
                    },
                });
                studentCountByClassSection.set(key, count);
            }
            return studentCountByClassSection.get(key) ?? 0;
        };
        const assignmentKey = (item) => [
            item.academicYear,
            item.classId,
            item.sectionId ?? 'all',
            item.subjectId,
        ].join(':');
        const missingTeacherCriteria = assessmentSubjects
            .filter((item) => !item.teacherId && item.sectionId)
            .map((item) => ({
            academicYear: item.assessment.academicYearId,
            classId: item.classId,
            sectionId: item.sectionId,
            subjectId: item.subjectId,
        }));
        const fallbackTeacherMap = new Map();
        if (missingTeacherCriteria.length > 0) {
            const [teacherAssignments, classSubjectAssignments] = await Promise.all([
                this.prisma.teacherSubjectAssignment.findMany({
                    where: {
                        schoolId,
                        isActive: true,
                        OR: missingTeacherCriteria,
                    },
                    include: { teacher: { select: { id: true, name: true } } },
                }),
                this.prisma.classSubject.findMany({
                    where: {
                        teacherId: { not: null },
                        class: { schoolId },
                        OR: missingTeacherCriteria,
                    },
                    include: { teacher: { select: { id: true, name: true } } },
                }),
            ]);
            for (const assignment of teacherAssignments) {
                fallbackTeacherMap.set(assignmentKey(assignment), assignment.teacher);
            }
            for (const assignment of classSubjectAssignments) {
                if (assignment.teacher) {
                    fallbackTeacherMap.set(assignmentKey(assignment), assignment.teacher);
                }
            }
        }
        const progressByAssignment = new Map();
        for (const assessmentSubject of assessmentSubjects) {
            const fallbackTeacher = fallbackTeacherMap.get(assignmentKey({
                academicYear: assessmentSubject.assessment.academicYearId,
                classId: assessmentSubject.classId,
                sectionId: assessmentSubject.sectionId,
                subjectId: assessmentSubject.subjectId,
            }));
            const teacherId = assessmentSubject.teacherId ?? fallbackTeacher?.id ?? 'unassigned';
            const componentCode = this.normalizeAssessmentComponentCode(assessmentSubject.assessment.type);
            const key = [
                teacherId,
                assessmentSubject.subjectId,
                assessmentSubject.classId,
                assessmentSubject.sectionId ?? 'all',
            ].join(':');
            const totalStudents = await getStudentCount(assessmentSubject.classId, assessmentSubject.sectionId);
            const existing = progressByAssignment.get(key) ?? {
                teacherId,
                teacherName: assessmentSubject.teacher?.name ?? fallbackTeacher?.name ?? null,
                subjectId: assessmentSubject.subjectId,
                classId: assessmentSubject.classId,
                sectionId: assessmentSubject.sectionId ?? null,
                subject: assessmentSubject.subject.name,
                class: assessmentSubject.class.name,
                section: assessmentSubject.section?.name ?? null,
                totalStudents: 0,
                enteredGrades: 0,
                requiredComponents: new Set(),
            };
            if (!existing.requiredComponents.has(componentCode)) {
                existing.requiredComponents.add(componentCode);
                existing.totalStudents += totalStudents;
            }
            progressByAssignment.set(key, existing);
        }
        const progressRows = Array.from(progressByAssignment.values());
        await Promise.all(progressRows.map(async (row) => {
            if (row.totalStudents === 0 || row.requiredComponents.size === 0)
                return;
            const grades = await this.prisma.subjectGrade.findMany({
                where: {
                    schoolId,
                    OR: [{ academicYear: academicYearId }, { academicYear: academicYearName }],
                    termId: term,
                    classId: row.classId,
                    ...(row.sectionId ? { sectionId: row.sectionId } : {}),
                    subjectId: row.subjectId,
                    ...(row.teacherId !== 'unassigned' ? { teacherId: row.teacherId } : {}),
                },
                include: {
                    gradeScores: {
                        include: {
                            component: {
                                select: {
                                    code: true,
                                },
                            },
                        },
                    },
                },
            });
            const enteredStudentComponents = new Set();
            grades.forEach((grade) => {
                row.requiredComponents.forEach((code) => {
                    const componentScore = grade.gradeScores.find((item) => item.component.code.toUpperCase() === code);
                    const hasComponentScore = componentScore?.score !== null && componentScore?.score !== undefined;
                    const hasLegacyScore = (code === 'CA' && grade.caScore !== null) ||
                        (code === 'MID' && grade.midScore !== null) ||
                        (code === 'FINAL' && grade.finalScore !== null);
                    if (hasComponentScore || hasLegacyScore) {
                        enteredStudentComponents.add(`${grade.studentId}:${code}`);
                    }
                });
            });
            row.enteredGrades = enteredStudentComponents.size;
        }));
        const progress = progressRows.map((row) => {
            const enteredGrades = row.totalStudents > 0 ? Math.min(row.enteredGrades, row.totalStudents) : row.enteredGrades;
            return {
                teacherId: row.teacherId,
                teacherName: row.teacherName,
                subjectId: row.subjectId,
                classId: row.classId,
                sectionId: row.sectionId,
                subject: row.subject,
                class: row.class,
                section: row.section,
                totalStudents: row.totalStudents,
                enteredGrades,
                percentage: row.totalStudents > 0 ? Math.round((enteredGrades / row.totalStudents) * 100) : 100,
            };
        });
        return progress;
    }
    async sendReminder(schoolId, academicYear, term) {
        const progress = await this.getEntryProgress(schoolId, academicYear, term);
        const pendingTeachers = progress.filter((p) => p.percentage < 100 && p.teacherId !== 'unassigned');
        const teacherIds = Array.from(new Set(pendingTeachers.map((p) => p.teacherId)));
        const notification = teacherIds.length > 0
            ? await this.notificationService.createBulkNotifications({
                schoolId,
                userIds: teacherIds,
                title: 'Marks entry reminder',
                message: 'Some marks are still missing for the selected term. Please complete and submit your marks before the deadline.',
                type: notification_service_1.NotificationType.WARNING,
                actionUrl: `/teacher/grading?academicYear=${encodeURIComponent(academicYear)}&termId=${encodeURIComponent(term)}`,
                metadata: {
                    academicYear,
                    term,
                    source: 'entry-progress',
                    pendingRows: pendingTeachers.length,
                },
            })
            : { count: 0 };
        return {
            remindersSent: notification.count,
            teachers: teacherIds,
            skippedUnassigned: progress.filter((p) => p.percentage < 100 && p.teacherId === 'unassigned').length,
        };
    }
    async getPublishChecklist(schoolId, academicYear, term) {
        const subjectGrades = await this.prisma.subjectGrade.findMany({
            where: {
                schoolId,
                academicYear,
                termId: term,
            },
            include: {
                subject: true,
                class: true,
                section: true,
            },
        });
        const grouped = new Map();
        for (const sg of subjectGrades) {
            const key = `${sg.subjectId}-${sg.classId}-${sg.sectionId}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    id: key,
                    subject: sg.subject?.name || '',
                    class: sg.class?.name || '',
                    section: sg.section?.name || '',
                    totalStudents: 0,
                    enteredGrades: 0,
                });
            }
            const existing = grouped.get(key);
            existing.enteredGrades += 1;
            existing.totalStudents = Math.max(existing.totalStudents, 1);
        }
        const checklist = Array.from(grouped.values()).map(item => ({
            ...item,
            isReady: item.enteredGrades > 0,
            status: item.enteredGrades > 0 ? 'READY' : 'DRAFT',
        }));
        return checklist;
    }
    async bulkPublish(schoolId, assessmentIds, notifyParents) {
        return this.prisma.assessment.updateMany({
            where: { id: { in: assessmentIds }, schoolId },
            data: { status: client_1.AssessmentStatus.COMPLETED },
        });
    }
    async getPromotionList(schoolId, academicYear) {
        const students = await this.prisma.studentClass.findMany({
            where: { schoolId, academicYear },
            include: { student: { include: { studentProfile: true } }, class: true },
        });
        const promotionList = await Promise.all(students.map(async (sc) => {
            const finalGrades = await this.getStudentFinalGrades(sc.studentId, schoolId, academicYear);
            const avgGPA = finalGrades.length > 0
                ? finalGrades.reduce((acc, g) => acc + (g.gradePoint || 0), 0) /
                    finalGrades.length
                : 0;
            return {
                studentId: sc.studentId,
                studentName: sc.student.name,
                currentClass: sc.class.name,
                gpa: avgGPA,
                recommendation: avgGPA >= 2.0 ? 'PROMOTED' : 'RETAINED',
            };
        }));
        return promotionList;
    }
    async overridePromotion(schoolId, studentId, recommendation) {
        return { studentId, recommendation, status: 'OVERRIDDEN' };
    }
    async confirmPromotions(schoolId, academicYear, notifyParents) {
        return { success: true, message: 'Promotions confirmed' };
    }
    async bulkConfirmPromotions(schoolId, academicYear, notifyParents) {
        return { success: true, message: 'All promotions confirmed' };
    }
};
exports.GradingService = GradingService;
exports.GradingService = GradingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        academic_year_service_1.AcademicYearService,
        cache_service_1.CacheService,
        notification_service_1.NotificationService])
], GradingService);
//# sourceMappingURL=grading.service.js.map