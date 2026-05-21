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
exports.SchoolSettingsService = exports.SCHOOL_SETTING_KEYS = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const cache_service_1 = require("../infrastructure/cache/cache.service");
const cache_constants_1 = require("../infrastructure/cache/cache.constants");
const credential_service_1 = require("../credential/credential.service");
const DEFAULT_PERIOD_CONFIGS = {
    SEMESTER: [
        { name: 'Semester 1', order: 1, percentageWeight: 50 },
        { name: 'Semester 2', order: 2, percentageWeight: 50 },
    ],
    QUARTER: [
        { name: 'Quarter 1', order: 1, percentageWeight: 25 },
        { name: 'Quarter 2', order: 2, percentageWeight: 25 },
        { name: 'Quarter 3', order: 3, percentageWeight: 25 },
        { name: 'Quarter 4', order: 4, percentageWeight: 25 },
    ],
    TERM: [
        { name: 'Term 1', order: 1, percentageWeight: 33.33 },
        { name: 'Term 2', order: 2, percentageWeight: 33.33 },
        { name: 'Term 3', order: 3, percentageWeight: 33.34 },
    ],
};
const buildPeriodDateRanges = (startDate, endDate, periodConfig) => {
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const totalDuration = endMs - startMs;
    let currentStart = startMs;
    return periodConfig.map((config, index) => {
        const isLastPeriod = index === periodConfig.length - 1;
        const duration = totalDuration * (config.percentageWeight / 100);
        const periodStart = new Date(currentStart);
        const periodEnd = isLastPeriod
            ? new Date(endMs)
            : new Date(currentStart + duration);
        currentStart = periodEnd.getTime();
        return {
            ...config,
            startDate: periodStart,
            endDate: periodEnd,
        };
    });
};
exports.SCHOOL_SETTING_KEYS = {
    CURRICULUM_TYPE: 'curriculum_type',
    CALENDAR_TYPE: 'calendar_type',
    GRADE_SYSTEM: 'grade_system',
    FEE_STRUCTURE_MODE: 'fee_structure_mode',
    FEE_PAYMENT_DUE_DAY: 'fee_payment_due_day',
    FEE_DAILY_PENALTY_AMOUNT: 'fee_daily_penalty_amount',
    PARENT_VIEW_GRADES: 'parent_view_grades',
    ATTENDANCE_CUTOFF_TIME: 'ATTENDANCE_CUTOFF_TIME',
    DEFAULT_SECTION_CAPACITY: 'DEFAULT_SECTION_CAPACITY',
    SCHOOL_NAME: 'school_name',
    SCHOOL_ADDRESS: 'school_address',
    SCHOOL_PHONE: 'school_phone',
    SCHOOL_EMAIL: 'school_email',
    LOGO_URL: 'logo_url',
    THEME_COLOR: 'theme_color',
    BRAND_COLOR_IN_NAVIGATION: 'BRAND_COLOR_IN_NAVIGATION',
    CERTIFICATE_SETTINGS: 'CERTIFICATE_SETTINGS',
    CERTIFICATE_TEMPLATE: 'certificate_template',
    ID_CARD_TEMPLATE: 'id_card_template',
    TEACHER_PORTAL_ACCESS: 'TEACHER_PORTAL_ACCESS',
    STUDENT_PORTAL_ACCESS: 'STUDENT_PORTAL_ACCESS',
    PARENT_PORTAL_ACCESS: 'PARENT_PORTAL_ACCESS',
    FINANCE_PORTAL_ACCESS: 'FINANCE_PORTAL_ACCESS',
    REGISTRAR_PORTAL_ACCESS: 'REGISTRAR_PORTAL_ACCESS',
};
let SchoolSettingsService = class SchoolSettingsService {
    prisma;
    cacheService;
    credentialService;
    constructor(prisma, cacheService, credentialService) {
        this.prisma = prisma;
        this.cacheService = cacheService;
        this.credentialService = credentialService;
    }
    allowedCalendarTypes = ['GREGORIAN', 'ETHIOPIAN'];
    allowedCurriculumTypes = [
        'SEMESTER',
        'QUARTER',
        'TERM',
        'CUSTOM',
    ];
    allowedGradeSystems = [
        '1-8',
        '1-10',
        '1-12',
        'K-8',
        'K-12',
        'PRE-K-12',
        '9-12',
    ];
    allowedFeeStructureModes = [
        'MONTHLY',
        'QUARTERLY',
        'SEMESTER',
        'TERM',
        'YEARLY',
    ];
    getSectionNameByIndex(index) {
        let current = index;
        let name = '';
        do {
            name = String.fromCharCode(65 + (current % 26)) + name;
            current = Math.floor(current / 26) - 1;
        } while (current >= 0);
        return name;
    }
    normalizeStudentName(name) {
        return String(name || '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    booleanKeys = new Set([
        exports.SCHOOL_SETTING_KEYS.PARENT_VIEW_GRADES,
        exports.SCHOOL_SETTING_KEYS.BRAND_COLOR_IN_NAVIGATION,
        'ALLOW_SELF_ENROLLMENT',
        'ATTENDANCE_TRACKING',
        'LATE_MARKING',
        'ANNOUNCEMENTS_ENABLED',
        exports.SCHOOL_SETTING_KEYS.TEACHER_PORTAL_ACCESS,
        exports.SCHOOL_SETTING_KEYS.STUDENT_PORTAL_ACCESS,
        exports.SCHOOL_SETTING_KEYS.PARENT_PORTAL_ACCESS,
        exports.SCHOOL_SETTING_KEYS.FINANCE_PORTAL_ACCESS,
        exports.SCHOOL_SETTING_KEYS.REGISTRAR_PORTAL_ACCESS,
        'PARENT_VIEW_ATTENDANCE',
        'SELF_ENROLLMENT_ACTIVE',
    ]);
    getSettingCacheKey(schoolId, key) {
        return `school-settings:${schoolId}:key:${key}`;
    }
    getAllSettingsCacheKey(schoolId) {
        return `school-settings:${schoolId}:all`;
    }
    async invalidateCache(schoolId, keys = []) {
        await this.cacheService.del(this.getAllSettingsCacheKey(schoolId), ...keys.map((key) => this.getSettingCacheKey(schoolId, key)));
    }
    parseStoredValue(rawValue) {
        try {
            return JSON.parse(rawValue);
        }
        catch {
            return rawValue;
        }
    }
    serializeSettingValue(value) {
        if (typeof value === 'string')
            return value;
        return JSON.stringify(value);
    }
    normalizeSettingValue(key, value) {
        if (this.booleanKeys.has(key)) {
            if (typeof value === 'boolean')
                return value;
            if (value === 'true' || value === 'false')
                return value === 'true';
            throw new common_1.BadRequestException(`Invalid boolean value for ${key}`);
        }
        if (key === exports.SCHOOL_SETTING_KEYS.CALENDAR_TYPE) {
            const normalizedValue = String(value || '')
                .trim()
                .toUpperCase();
            if (!this.allowedCalendarTypes.includes(normalizedValue)) {
                throw new common_1.BadRequestException(`Invalid calendar type. Allowed values: ${this.allowedCalendarTypes.join(', ')}`);
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE) {
            const normalizedValue = String(value || '')
                .trim()
                .toUpperCase();
            if (!this.allowedCurriculumTypes.includes(normalizedValue)) {
                throw new common_1.BadRequestException(`Invalid curriculum type. Allowed values: ${this.allowedCurriculumTypes.join(', ')}`);
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
            const normalizedValue = String(value || '')
                .trim()
                .toUpperCase();
            if (!this.allowedGradeSystems.includes(normalizedValue)) {
                throw new common_1.BadRequestException(`Invalid grade system. Allowed values: ${this.allowedGradeSystems.join(', ')}`);
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.FEE_STRUCTURE_MODE) {
            const normalizedValue = String(value || '')
                .trim()
                .toUpperCase();
            if (!this.allowedFeeStructureModes.includes(normalizedValue)) {
                throw new common_1.BadRequestException(`Invalid fee structure mode. Allowed values: ${this.allowedFeeStructureModes.join(', ')}`);
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.FEE_PAYMENT_DUE_DAY) {
            const day = Number(value);
            if (!Number.isInteger(day) || day < 1 || day > 31) {
                throw new common_1.BadRequestException(`${key} must be an integer between 1 and 31`);
            }
            return day;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.FEE_DAILY_PENALTY_AMOUNT) {
            const amount = Number(value);
            if (!Number.isFinite(amount) || amount < 0) {
                throw new common_1.BadRequestException('fee_daily_penalty_amount must be a number greater than or equal to 0');
            }
            return Math.round(amount * 100) / 100;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.DEFAULT_SECTION_CAPACITY) {
            const capacity = Number(value);
            if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 200) {
                throw new common_1.BadRequestException('DEFAULT_SECTION_CAPACITY must be an integer between 1 and 200');
            }
            return capacity;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.ATTENDANCE_CUTOFF_TIME) {
            const normalizedValue = String(value || '').trim();
            const isValidTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedValue);
            if (!isValidTime) {
                throw new common_1.BadRequestException('ATTENDANCE_CUTOFF_TIME must be in 24-hour HH:mm format');
            }
            return normalizedValue;
        }
        if (key === exports.SCHOOL_SETTING_KEYS.THEME_COLOR) {
            const normalizedValue = String(value || '').trim();
            const isValidHexColor = /^#([0-9A-Fa-f]{6})$/.test(normalizedValue);
            if (!isValidHexColor) {
                throw new common_1.BadRequestException(`${key} must be a valid hex color in #RRGGBB format`);
            }
            return normalizedValue;
        }
        return value;
    }
    async validateCalendarTypeOneTimeChange(schoolId, incomingValue) {
        const existingCalendarType = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.CALENDAR_TYPE);
        if (existingCalendarType === null || existingCalendarType === undefined) {
            return;
        }
        const existingYears = await this.prisma.academicYear.count({
            where: { schoolId },
        });
        if (existingYears > 0) {
            throw new common_1.BadRequestException('Cannot change after academic year is created. This protects existing academic records and years.');
        }
        if (String(existingCalendarType).toUpperCase() !== incomingValue) {
            throw new common_1.BadRequestException('Calendar type is locked and can only be set once. Changing it later can corrupt date consistency.');
        }
    }
    async validateGradeSystemOneTimeChange(schoolId, incomingValue) {
        const existingGradeSystem = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM);
        if (existingGradeSystem === null || existingGradeSystem === undefined) {
            return;
        }
        if (String(existingGradeSystem).toUpperCase() !== incomingValue) {
            throw new common_1.BadRequestException('Grade system is locked and can only be set once. Changing it later can affect existing grade levels and classes.');
        }
    }
    async validateCurriculumTypeOneTimeChange(schoolId, incomingValue) {
        const existingCurriculumType = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE);
        if (existingCurriculumType !== null &&
            existingCurriculumType !== undefined &&
            String(existingCurriculumType).toUpperCase() !== incomingValue) {
            throw new common_1.BadRequestException('Curriculum system is locked and can only be set once. Changing it later can affect terms, grading, fees, and academic records.');
        }
        const existingFees = await this.prisma.studentFee.count({
            where: { schoolId },
        });
        if (existingFees > 0) {
            throw new common_1.BadRequestException('Cannot change curriculum type after fees have been generated. This would disrupt existing fee records and payments. Please set this at the start of the academic year.');
        }
    }
    async getSetting(schoolId, key) {
        return this.cacheService.getOrSet(this.getSettingCacheKey(schoolId, key), cache_constants_1.DEFAULT_CACHE_TTL_SECONDS, async () => {
            const setting = await this.prisma.schoolSetting.findUnique({
                where: {
                    schoolId_key: {
                        schoolId,
                        key,
                    },
                },
            });
            return setting ? this.parseStoredValue(setting.value) : null;
        });
    }
    async getAllSettings(schoolId) {
        return this.cacheService.getOrSet(this.getAllSettingsCacheKey(schoolId), cache_constants_1.DEFAULT_CACHE_TTL_SECONDS, async () => {
            const settings = await this.prisma.schoolSetting.findMany({
                where: { schoolId },
            });
            const result = {};
            for (const setting of settings) {
                result[setting.key] = this.parseStoredValue(setting.value);
            }
            return result;
        });
    }
    async setSetting(schoolId, key, value) {
        const normalizedValue = this.normalizeSettingValue(key, value);
        const serializedValue = this.serializeSettingValue(normalizedValue);
        if (key === exports.SCHOOL_SETTING_KEYS.CALENDAR_TYPE) {
            await this.validateCalendarTypeOneTimeChange(schoolId, normalizedValue);
        }
        if (key === exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
            await this.validateGradeSystemOneTimeChange(schoolId, normalizedValue);
        }
        if (key === exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE) {
            await this.validateCurriculumTypeOneTimeChange(schoolId, normalizedValue);
        }
        const setting = await this.prisma.schoolSetting.upsert({
            where: {
                schoolId_key: {
                    schoolId,
                    key,
                },
            },
            update: { value: serializedValue },
            create: { schoolId, key, value: serializedValue },
        });
        if (key === exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE &&
            normalizedValue !== 'CUSTOM') {
            await this.autoCreateTermsForAcademicYears(schoolId, normalizedValue);
        }
        if (key === exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
            await this.autoCreateGradeLevels(schoolId, normalizedValue);
        }
        if (key === exports.SCHOOL_SETTING_KEYS.DEFAULT_SECTION_CAPACITY) {
            const newCapacity = typeof normalizedValue === 'number'
                ? normalizedValue
                : parseInt(normalizedValue, 10);
            if (!isNaN(newCapacity) && newCapacity > 0) {
                await this.syncSectionCapacities(schoolId, newCapacity);
            }
        }
        await this.invalidateCache(schoolId, [key]);
        return {
            ...setting,
            value: normalizedValue,
        };
    }
    async syncSectionCapacities(schoolId, capacity) {
        const studentClasses = await this.prisma.studentClass.findMany({
            where: { schoolId },
            include: {
                student: { select: { id: true, name: true } },
                class: {
                    select: {
                        id: true,
                        name: true,
                        academicYearId: true,
                        academicYear: { select: { name: true } },
                        grade: true,
                        gradeId: true,
                    },
                },
            },
        });
        const groupedByGradeYear = new Map();
        for (const row of studentClasses) {
            const key = `${row.class.academicYearId}:${row.class.name}`;
            if (!groupedByGradeYear.has(key))
                groupedByGradeYear.set(key, []);
            groupedByGradeYear.get(key).push(row);
        }
        await this.prisma.$transaction(async (tx) => {
            for (const [, group] of groupedByGradeYear) {
                const orderedStudents = [...group].sort((left, right) => this.normalizeStudentName(left.student?.name).localeCompare(this.normalizeStudentName(right.student?.name), undefined, { sensitivity: 'base' }));
                const totalSections = Math.max(1, Math.ceil(orderedStudents.length / capacity));
                if (orderedStudents.length === 0)
                    continue;
                const sampleClass = orderedStudents[0].class;
                let defaultClassConsumed = false;
                for (let index = 0; index < orderedStudents.length; index++) {
                    const item = orderedStudents[index];
                    const sectionName = this.getSectionNameByIndex(index % totalSections);
                    let cls = await tx.class.findFirst({
                        where: {
                            schoolId,
                            academicYearId: sampleClass.academicYearId,
                            name: sampleClass.name,
                            section: sectionName,
                        },
                    });
                    if (!cls && !defaultClassConsumed) {
                        const emptyClass = await tx.class.findFirst({
                            where: {
                                schoolId,
                                academicYearId: sampleClass.academicYearId,
                                name: sampleClass.name,
                                section: '',
                            },
                        });
                        if (emptyClass) {
                            cls = await tx.class.update({
                                where: { id: emptyClass.id },
                                data: {
                                    section: sectionName,
                                    grade: sampleClass.grade ?? undefined,
                                    gradeId: sampleClass.gradeId ?? undefined,
                                },
                            });
                            defaultClassConsumed = true;
                        }
                    }
                    if (!cls) {
                        cls = await tx.class.create({
                            data: {
                                schoolId,
                                academicYearId: sampleClass.academicYearId,
                                name: sampleClass.name,
                                section: sectionName,
                                grade: sampleClass.grade ?? undefined,
                                gradeId: sampleClass.gradeId ?? undefined,
                            },
                        });
                    }
                    let sec = await tx.section.findFirst({
                        where: { classId: cls.id, name: sectionName },
                    });
                    if (!sec) {
                        sec = await tx.section.create({
                            data: {
                                classId: cls.id,
                                name: sectionName,
                                capacity,
                            },
                        });
                    }
                    else if (sec.capacity !== capacity) {
                        sec = await tx.section.update({
                            where: { id: sec.id },
                            data: { capacity },
                        });
                    }
                    await tx.studentClass.update({
                        where: { id: item.id },
                        data: {
                            classId: cls.id,
                            sectionId: sec.id,
                        },
                    });
                    await tx.studentProfile.updateMany({
                        where: { userId: item.studentId },
                        data: {
                            className: cls.name,
                            section: sec.name,
                            rollNumber: '0',
                        },
                    });
                }
            }
            const sections = await tx.section.findMany({
                where: { class: { schoolId } },
            });
            for (const section of sections) {
                if (section.capacity !== capacity) {
                    await tx.section.update({
                        where: { id: section.id },
                        data: { capacity },
                    });
                }
            }
        });
        const academicYears = await this.prisma.academicYear.findMany({
            where: { schoolId },
            select: { name: true },
        });
        for (const academicYear of academicYears) {
            await this.credentialService.assignRollNumbersByAlphabet(schoolId, academicYear.name);
        }
    }
    async autoCreateTermsForAcademicYears(schoolId, curriculumType) {
        const academicYears = await this.prisma.academicYear.findMany({
            where: { schoolId },
            include: {
                terms: {
                    include: { subjectGrades: true },
                },
            },
        });
        const periodConfig = DEFAULT_PERIOD_CONFIGS[curriculumType];
        if (!periodConfig)
            return;
        for (const academicYear of academicYears) {
            const hasTermsWithGrades = academicYear.terms.some((term) => term.subjectGrades && term.subjectGrades.length > 0);
            if (hasTermsWithGrades) {
                await this.prisma.academicYear.update({
                    where: { id: academicYear.id },
                    data: { curriculumType },
                });
                continue;
            }
            await this.prisma.term.deleteMany({
                where: {
                    academicYearId: academicYear.id,
                    subjectGrades: { none: {} },
                },
            });
            await this.prisma.academicYear.update({
                where: { id: academicYear.id },
                data: { curriculumType },
            });
            await this.prisma.term.createMany({
                data: buildPeriodDateRanges(academicYear.startDate, academicYear.endDate, periodConfig).map((config) => ({
                    academicYearId: academicYear.id,
                    name: config.name,
                    order: config.order,
                    percentageWeight: config.percentageWeight,
                    startDate: config.startDate,
                    endDate: config.endDate,
                    isLocked: false,
                })),
            });
        }
    }
    async autoCreateGradeLevels(schoolId, range, academicYearId) {
        const grades = this.buildGradeLevelsFromRange(range);
        if (grades.length === 0)
            return;
        const targetYearIds = [];
        if (academicYearId) {
            targetYearIds.push(academicYearId);
        }
        else {
            const activeYear = await this.prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true },
            });
            if (activeYear?.id)
                targetYearIds.push(activeYear.id);
        }
        for (const grade of grades) {
            const gradeLevel = await this.prisma.gradeLevel.upsert({
                where: {
                    schoolId_level: {
                        schoolId,
                        level: grade.level,
                    },
                },
                update: { name: grade.name },
                create: {
                    schoolId,
                    name: grade.name,
                    level: grade.level,
                },
            });
            for (const yearId of targetYearIds) {
                const matchingClasses = await this.prisma.class.findMany({
                    where: {
                        schoolId,
                        academicYearId: yearId,
                        OR: [
                            { name: grade.name },
                            { gradeId: gradeLevel.id },
                            { grade: gradeLevel.level },
                        ],
                    },
                    include: {
                        sections: { select: { id: true } },
                        _count: {
                            select: {
                                sections: true,
                                studentClasses: true,
                                ClassSubject: true,
                                teacherAssignments: true,
                                timetableSlots: true,
                                timetables: true,
                                assessmentSubjects: true,
                                contents: true,
                                enrollmentRequests: true,
                                attendances: true,
                                attendanceSessions: true,
                                exams: true,
                                communications: true,
                                reportCards: true,
                                subjectGrades: true,
                            },
                        },
                    },
                });
                const emptyDefaultClass = matchingClasses.find((cls) => cls.name === grade.name && cls.section === '');
                const hasRealClassForGrade = matchingClasses.some((cls) => cls.id !== emptyDefaultClass?.id &&
                    (cls.section !== '' || cls.sections.length > 0));
                if (!emptyDefaultClass && !hasRealClassForGrade) {
                    await this.prisma.class.create({
                        data: {
                            schoolId,
                            academicYearId: yearId,
                            name: grade.name,
                            section: '',
                            gradeId: gradeLevel.id,
                            grade: gradeLevel.level,
                        },
                    });
                    continue;
                }
                if (emptyDefaultClass) {
                    await this.prisma.class.update({
                        where: { id: emptyDefaultClass.id },
                        data: {
                            gradeId: gradeLevel.id,
                            grade: gradeLevel.level,
                        },
                    });
                }
                for (const existingClass of matchingClasses) {
                    if (existingClass.gradeId !== gradeLevel.id ||
                        existingClass.grade !== gradeLevel.level) {
                        await this.prisma.class.update({
                            where: { id: existingClass.id },
                            data: {
                                gradeId: gradeLevel.id,
                                grade: gradeLevel.level,
                            },
                        });
                    }
                }
                if (emptyDefaultClass && hasRealClassForGrade) {
                    const dependencyCount = emptyDefaultClass._count.sections +
                        emptyDefaultClass._count.studentClasses +
                        emptyDefaultClass._count.ClassSubject +
                        emptyDefaultClass._count.teacherAssignments +
                        emptyDefaultClass._count.timetableSlots +
                        emptyDefaultClass._count.timetables +
                        emptyDefaultClass._count.assessmentSubjects +
                        emptyDefaultClass._count.contents +
                        emptyDefaultClass._count.enrollmentRequests +
                        emptyDefaultClass._count.attendances +
                        emptyDefaultClass._count.attendanceSessions +
                        emptyDefaultClass._count.exams +
                        emptyDefaultClass._count.communications +
                        emptyDefaultClass._count.reportCards +
                        emptyDefaultClass._count.subjectGrades;
                    if (dependencyCount === 0) {
                        await this.prisma.class.delete({
                            where: { id: emptyDefaultClass.id },
                        });
                    }
                }
            }
        }
        await this.prisma.gradeLevel.deleteMany({
            where: {
                schoolId,
                level: { notIn: grades.map((g) => g.level) },
                classes: { none: {} },
            },
        });
    }
    async ensureDefaultClassesForAcademicYear(schoolId, academicYearId) {
        const gradeSystem = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM);
        if (gradeSystem === null || gradeSystem === undefined) {
            return {
                message: 'Grade system not set; skipped default class creation',
            };
        }
        const normalizedRange = String(gradeSystem || '')
            .trim()
            .toUpperCase();
        await this.autoCreateGradeLevels(schoolId, normalizedRange, academicYearId);
        return { message: 'Default grade classes ensured for academic year' };
    }
    buildGradeLevelsFromRange(range) {
        const grades = [];
        const pushGradeRange = (start, end) => {
            for (let i = start; i <= end; i++)
                grades.push({ name: `Grade ${i}`, level: i });
        };
        switch (range) {
            case '1-8':
                pushGradeRange(1, 8);
                break;
            case '1-10':
                pushGradeRange(1, 10);
                break;
            case '1-12':
                pushGradeRange(1, 12);
                break;
            case 'K-8':
                grades.push({ name: 'Kindergarten', level: 0 });
                pushGradeRange(1, 8);
                break;
            case 'K-12':
                grades.push({ name: 'Kindergarten', level: 0 });
                pushGradeRange(1, 12);
                break;
            case 'PRE-K-12':
                grades.push({ name: 'Pre-Kindergarten', level: -1 });
                grades.push({ name: 'Kindergarten', level: 0 });
                pushGradeRange(1, 12);
                break;
            case '9-12':
                pushGradeRange(9, 12);
                break;
            default:
                throw new common_1.BadRequestException('Unsupported grade system');
        }
        return grades;
    }
    async getGradeLevelsForSchool(schoolId) {
        const gradeSystem = await this.getGradeSystem(schoolId);
        return this.buildGradeLevelsFromRange(gradeSystem);
    }
    async deleteSetting(schoolId, key) {
        if (key === exports.SCHOOL_SETTING_KEYS.CALENDAR_TYPE ||
            key === exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE ||
            key === exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM) {
            throw new common_1.BadRequestException('This academic setting cannot be deleted after being set. It is locked to preserve data consistency.');
        }
        await this.prisma.schoolSetting.delete({
            where: {
                schoolId_key: {
                    schoolId,
                    key,
                },
            },
        });
        await this.invalidateCache(schoolId, [key]);
        return { message: 'Setting deleted successfully' };
    }
    async getEffectiveSetting(schoolId, key, platformValue = null, systemDefault = null) {
        const schoolValue = await this.getSetting(schoolId, key);
        if (schoolValue !== null) {
            return schoolValue;
        }
        if (platformValue !== null) {
            return platformValue;
        }
        return systemDefault;
    }
    async batchUpdate(schoolId, settings) {
        const results = [];
        for (const [key, value] of Object.entries(settings)) {
            const result = await this.setSetting(schoolId, key, value);
            results.push(result);
        }
        await this.invalidateCache(schoolId, Object.keys(settings));
        return results;
    }
    async getCurriculumType(schoolId) {
        const activeYear = await this.prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        if (activeYear) {
            return activeYear.curriculumType;
        }
        const setting = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.CURRICULUM_TYPE);
        return setting || 'SEMESTER';
    }
    async getGradeSystem(schoolId) {
        const setting = await this.getSetting(schoolId, exports.SCHOOL_SETTING_KEYS.GRADE_SYSTEM);
        return setting || '1-12';
    }
    async getAcademicConfiguration(schoolId) {
        const [curriculumType, gradeSystem, activeYear] = await Promise.all([
            this.getCurriculumType(schoolId),
            this.getGradeSystem(schoolId),
            this.prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                include: {
                    terms: { orderBy: { order: 'asc' } },
                },
            }),
        ]);
        return {
            curriculumType,
            gradeSystem,
            activeAcademicYear: activeYear,
            periods: activeYear?.terms || [],
        };
    }
};
exports.SchoolSettingsService = SchoolSettingsService;
exports.SchoolSettingsService = SchoolSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        credential_service_1.CredentialService])
], SchoolSettingsService);
//# sourceMappingURL=school-settings.service.js.map