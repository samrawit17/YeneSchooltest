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
exports.AcademicYearService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const school_settings_service_1 = require("../school-settings/school-settings.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const getEthiopianYear = (date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    if (month < 9 || (month === 9 && day < 11)) {
        return year - 8;
    }
    return year - 7;
};
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
const CURRICULUM_TYPES = ['SEMESTER', 'QUARTER', 'TERM', 'CUSTOM'];
const CALENDAR_TYPES = ['GREGORIAN', 'ETHIOPIAN'];
const isCurriculumType = (value) => typeof value === 'string' &&
    CURRICULUM_TYPES.includes(value);
const isCalendarType = (value) => typeof value === 'string' && CALENDAR_TYPES.includes(value);
const parseValidDate = (value, label) => {
    if (!value) {
        throw new localization_1.LocalizedException('academic_year.is_required_d947c5d8', undefined, undefined, '${label} is required');
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new localization_1.LocalizedException('academic_year.must_be_a_valid_date_c2c21ec5', undefined, undefined, '${label} must be a valid date');
    }
    return date;
};
const assertDateRange = (startDate, endDate) => {
    if (startDate >= endDate) {
        throw new localization_1.LocalizedException('academic_year.start_date_must_be_before_end_date_3a47b1bf', undefined, undefined, 'Start date must be before end date');
    }
};
const STANDARD_PERIOD_DURATIONS = {
    SEMESTER: [{ months: 5 }, { months: 5 }],
    QUARTER: [
        { months: 2, days: 15 },
        { months: 2, days: 15 },
        { months: 2, days: 15 },
        { months: 2, days: 15 },
    ],
    TERM: [
        { months: 3, days: 10 },
        { months: 3, days: 10 },
        { months: 3, days: 10 },
    ],
};
const addMonthsAndDays = (date, months = 0, days = 0) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    result.setDate(result.getDate() + days);
    return result;
};
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
const buildPeriodDateRanges = (curriculumType, startDate, endDate, periodConfig) => {
    const standardDurations = STANDARD_PERIOD_DURATIONS[curriculumType];
    const academicYearStart = new Date(startDate);
    const academicYearEnd = new Date(endDate);
    const result = [];
    for (let index = 0; index < periodConfig.length; index++) {
        const config = periodConfig[index];
        const isLastPeriod = index === periodConfig.length - 1;
        let periodStart;
        if (index === 0) {
            periodStart = new Date(academicYearStart);
        }
        else {
            periodStart = addDays(result[index - 1].endDate, 1);
        }
        let periodEnd;
        if (isLastPeriod) {
            periodEnd = new Date(academicYearEnd);
        }
        else if (standardDurations?.[index]) {
            const duration = standardDurations[index];
            periodEnd = addDays(addMonthsAndDays(periodStart, duration.months, duration.days ?? 0), -1);
        }
        else {
            const remainingPeriods = periodConfig.length - index;
            const remainingDurationMs = academicYearEnd.getTime() - periodStart.getTime();
            periodEnd = addDays(new Date(periodStart.getTime() +
                Math.floor(remainingDurationMs / remainingPeriods)), -1);
        }
        if (periodEnd > academicYearEnd) {
            periodEnd = new Date(academicYearEnd);
        }
        result.push({
            name: config.name,
            order: config.order,
            percentageWeight: config.percentageWeight,
            startDate: periodStart,
            endDate: periodEnd,
        });
    }
    return result;
};
let AcademicYearService = class AcademicYearService {
    prismaService;
    schoolSettingsService;
    eventBus;
    constructor(prismaService, schoolSettingsService, eventBus) {
        this.prismaService = prismaService;
        this.schoolSettingsService = schoolSettingsService;
        this.eventBus = eventBus;
    }
    requireSchoolId(schoolId) {
        if (!schoolId) {
            throw new localization_1.LocalizedException('academic_year.schoolid_is_required_7fbaa2cd', undefined, undefined, 'schoolId is required');
        }
        return schoolId;
    }
    assertSchoolAccess(recordSchoolId, expectedSchoolId) {
        if (expectedSchoolId && recordSchoolId !== expectedSchoolId) {
            throw new localization_1.LocalizedException('academic_year.academic_year_not_found_561c725b', undefined, common_1.HttpStatus.NOT_FOUND, 'Academic year not found');
        }
    }
    async assertTermSchoolAccess(termId, expectedSchoolId) {
        const term = await this.prismaService.term.findUnique({
            where: { id: termId },
            include: { academicYear: true },
        });
        if (!term) {
            throw new localization_1.LocalizedException('academic_year.term_not_found_f9401991', undefined, common_1.HttpStatus.NOT_FOUND, 'Term not found');
        }
        this.assertSchoolAccess(term.academicYear.schoolId, expectedSchoolId);
        return term;
    }
    async assertTermDatesDoNotOverlap(academicYearId, startDate, endDate, excludeTermId) {
        const overlappingTerm = await this.prismaService.term.findFirst({
            where: {
                academicYearId,
                ...(excludeTermId ? { id: { not: excludeTermId } } : {}),
                startDate: { lte: endDate },
                endDate: { gte: startDate },
            },
            select: { name: true },
        });
        if (overlappingTerm) {
            throw new localization_1.LocalizedException('academic_year.period_dates_overlap_with_db6c695a', undefined, undefined, 'Period dates overlap with ${overlappingTerm.name}');
        }
    }
    assertPeriodWeight(percentageWeight) {
        if (percentageWeight === undefined)
            return;
        if (typeof percentageWeight !== 'number' ||
            Number.isNaN(percentageWeight) ||
            percentageWeight < 0 ||
            percentageWeight > 100) {
            throw new localization_1.LocalizedException('academic_year.period_weight_must_be_between_0_and_100_44a5b184', undefined, undefined, 'Period weight must be between 0 and 100');
        }
    }
    async assertTotalWeightDoesNotExceed100(academicYearId, nextWeight, excludeTermId) {
        const terms = await this.prismaService.term.findMany({
            where: {
                academicYearId,
                ...(excludeTermId ? { id: { not: excludeTermId } } : {}),
            },
            select: { percentageWeight: true },
        });
        const total = terms.reduce((sum, term) => sum + term.percentageWeight, 0) + nextWeight;
        if (total > 100.01) {
            throw new localization_1.LocalizedException('academic_year.total_period_weight_cannot_exceed_100_143bc124', undefined, undefined, 'Total period weight cannot exceed 100%');
        }
    }
    async createAcademicYear(createDto) {
        const { name, startDate, endDate, schoolId, curriculumType, calendarType = 'ETHIOPIAN', } = createDto;
        const finalSchoolId = this.requireSchoolId(schoolId);
        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new localization_1.LocalizedException('academic_year.academic_year_name_is_required_ba7cdfec', undefined, undefined, 'Academic year name is required');
        }
        if (curriculumType && !isCurriculumType(curriculumType)) {
            throw new localization_1.LocalizedException('academic_year.invalid_curriculum_type_f2e9e2ce', undefined, undefined, 'Invalid curriculum type');
        }
        if (calendarType && !isCalendarType(calendarType)) {
            throw new localization_1.LocalizedException('academic_year.invalid_calendar_type_49d65c6f', undefined, undefined, 'Invalid calendar type');
        }
        const parsedStartDate = parseValidDate(startDate, 'Start date');
        const parsedEndDate = parseValidDate(endDate, 'End date');
        assertDateRange(parsedStartDate, parsedEndDate);
        const existing = await this.prismaService.academicYear.findUnique({
            where: {
                schoolId_name: {
                    schoolId: finalSchoolId,
                    name: trimmedName,
                },
            },
        });
        if (existing) {
            throw new localization_1.LocalizedException('academic_year.academic_year_with_this_name_already_exists_for_this_school_4cca5d0a', undefined, undefined, 'Academic year with this name already exists for this school');
        }
        let finalCurriculumType = curriculumType || 'SEMESTER';
        if (!curriculumType) {
            const schoolSetting = await this.schoolSettingsService.getSetting(finalSchoolId, 'curriculum_type');
            if (isCurriculumType(schoolSetting)) {
                finalCurriculumType = schoolSetting;
            }
        }
        const academicYear = await this.prismaService.academicYear.create({
            data: {
                name: trimmedName,
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                schoolId: finalSchoolId,
                curriculumType: finalCurriculumType,
                calendarType: calendarType,
                ethiopianYear: getEthiopianYear(parsedStartDate),
            },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
                school: true,
            },
        });
        if (finalCurriculumType !== 'CUSTOM') {
            const periodConfig = DEFAULT_PERIOD_CONFIGS[finalCurriculumType];
            if (periodConfig) {
                const termsData = buildPeriodDateRanges(finalCurriculumType, parsedStartDate, parsedEndDate, periodConfig).map((config) => ({
                    academicYearId: academicYear.id,
                    name: config.name,
                    order: config.order,
                    percentageWeight: config.percentageWeight,
                    startDate: config.startDate,
                    endDate: config.endDate,
                    isLocked: false,
                }));
                await this.prismaService.term.createMany({
                    data: termsData,
                });
            }
        }
        await this.schoolSettingsService.ensureDefaultClassesForAcademicYear(finalSchoolId, academicYear.id);
        void this.eventBus.emit('academic-year.created', {
            schoolId: finalSchoolId,
            academicYearId: academicYear.id,
            name: trimmedName,
            createdBy: 'system',
        });
        return this.prismaService.academicYear.findUnique({
            where: { id: academicYear.id },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
                school: true,
            },
        });
    }
    async getAcademicYears(schoolId) {
        const finalSchoolId = this.requireSchoolId(schoolId);
        return this.prismaService.academicYear.findMany({
            where: { schoolId: finalSchoolId },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAcademicYearById(id, schoolId) {
        const academicYear = await this.prismaService.academicYear.findUnique({
            where: { id },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
                school: true,
            },
        });
        if (!academicYear) {
            throw new localization_1.LocalizedException('academic_year.academic_year_not_found_561c725b', undefined, common_1.HttpStatus.NOT_FOUND, 'Academic year not found');
        }
        this.assertSchoolAccess(academicYear.schoolId, schoolId);
        return academicYear;
    }
    async getActiveAcademicYear(schoolId) {
        const finalSchoolId = this.requireSchoolId(schoolId);
        const settings = await this.prismaService.schoolSettings.findUnique({
            where: { schoolId: finalSchoolId },
        });
        if (settings && settings.defaultAcademicYearId) {
            const defaultYear = await this.prismaService.academicYear.findUnique({
                where: { id: settings.defaultAcademicYearId },
                include: {
                    terms: { orderBy: { order: 'asc' } },
                },
            });
            if (defaultYear) {
                return defaultYear;
            }
        }
        const activeYear = await this.prismaService.academicYear.findFirst({
            where: {
                schoolId: finalSchoolId,
                isActive: true,
            },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { startDate: 'desc' },
        });
        if (activeYear) {
            return activeYear;
        }
        return this.prismaService.academicYear.findFirst({
            where: { schoolId: finalSchoolId },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { startDate: 'desc' },
        });
    }
    async resolveAcademicYearId(schoolId, providedAcademicYearId) {
        const finalSchoolId = this.requireSchoolId(schoolId);
        if (providedAcademicYearId) {
            await this.getAcademicYearById(providedAcademicYearId, finalSchoolId);
            return providedAcademicYearId;
        }
        const settings = await this.prismaService.schoolSettings.findUnique({
            where: { schoolId: finalSchoolId },
        });
        if (settings && settings.defaultAcademicYearId) {
            return settings.defaultAcademicYearId;
        }
        const activeInfo = await this.getActiveAcademicYear(finalSchoolId);
        if (!activeInfo) {
            throw new localization_1.LocalizedException('academic_year.no_academic_year_provided_and_no_default_active_academic_yea_5436cd5b', undefined, undefined, 'No academic year provided and no default/active academic year found for the school');
        }
        return activeInfo.id;
    }
    async updateAcademicYear(id, updateDto, schoolId) {
        const academicYear = await this.getAcademicYearById(id, schoolId);
        const nextStartDate = updateDto.startDate
            ? parseValidDate(updateDto.startDate, 'Start date')
            : academicYear.startDate;
        const nextEndDate = updateDto.endDate
            ? parseValidDate(updateDto.endDate, 'End date')
            : academicYear.endDate;
        assertDateRange(nextStartDate, nextEndDate);
        if (updateDto.curriculumType &&
            !isCurriculumType(updateDto.curriculumType)) {
            throw new localization_1.LocalizedException('academic_year.invalid_curriculum_type_f2e9e2ce', undefined, undefined, 'Invalid curriculum type');
        }
        if (updateDto.calendarType && !isCalendarType(updateDto.calendarType)) {
            throw new localization_1.LocalizedException('academic_year.invalid_calendar_type_49d65c6f', undefined, undefined, 'Invalid calendar type');
        }
        const trimmedName = updateDto.name?.trim();
        if (updateDto.name !== undefined && !trimmedName) {
            throw new localization_1.LocalizedException('academic_year.academic_year_name_is_required_ba7cdfec', undefined, undefined, 'Academic year name is required');
        }
        if (trimmedName && trimmedName !== academicYear.name) {
            const existing = await this.prismaService.academicYear.findUnique({
                where: {
                    schoolId_name: {
                        schoolId: academicYear.schoolId,
                        name: trimmedName,
                    },
                },
            });
            if (existing) {
                throw new localization_1.LocalizedException('academic_year.academic_year_with_this_name_already_exists_for_this_school_4cca5d0a', undefined, undefined, 'Academic year with this name already exists for this school');
            }
        }
        if (updateDto.curriculumType &&
            updateDto.curriculumType !== academicYear.curriculumType) {
            await this.updateCurriculumType(id, {
                curriculumType: updateDto.curriculumType,
            }, schoolId);
        }
        return this.prismaService.academicYear.update({
            where: { id },
            data: {
                ...(trimmedName && { name: trimmedName }),
                ...(updateDto.startDate && {
                    startDate: nextStartDate,
                    ethiopianYear: getEthiopianYear(nextStartDate),
                }),
                ...(updateDto.endDate && { endDate: nextEndDate }),
                ...(updateDto.calendarType && {
                    calendarType: updateDto.calendarType,
                }),
            },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
        });
    }
    async updateCurriculumType(id, dto, schoolId) {
        if (!isCurriculumType(dto.curriculumType)) {
            throw new localization_1.LocalizedException('academic_year.invalid_curriculum_type_f2e9e2ce', undefined, undefined, 'Invalid curriculum type');
        }
        const academicYear = await this.getAcademicYearById(id, schoolId);
        const existingGrades = await this.prismaService.subjectGrade.findFirst({
            where: {
                academicYear: academicYear.name,
                schoolId: academicYear.schoolId,
            },
        });
        if (existingGrades) {
            throw new localization_1.LocalizedException('academic_year.cannot_change_curriculum_type_after_grading_has_begun_please_28888e07', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot change curriculum type after grading has begun. Please contact system administrator.');
        }
        const termsWithGrades = await this.prismaService.term.findFirst({
            where: {
                academicYearId: id,
                subjectGrades: {
                    some: {},
                },
            },
            include: {
                subjectGrades: true,
            },
        });
        if (termsWithGrades && termsWithGrades.subjectGrades.length > 0) {
            throw new localization_1.LocalizedException('academic_year.cannot_change_curriculum_type_after_terms_have_grades_please_9f72c2a2', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot change curriculum type after terms have grades. Please contact system administrator.');
        }
        return this.prismaService.$transaction(async (tx) => {
            await tx.term.deleteMany({
                where: { academicYearId: id },
            });
            if (dto.curriculumType !== 'CUSTOM') {
                const periodConfig = DEFAULT_PERIOD_CONFIGS[dto.curriculumType];
                if (periodConfig) {
                    await tx.term.createMany({
                        data: buildPeriodDateRanges(dto.curriculumType, academicYear.startDate, academicYear.endDate, periodConfig).map((config) => ({
                            academicYearId: id,
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
            return tx.academicYear.update({
                where: { id },
                data: { curriculumType: dto.curriculumType },
                include: {
                    terms: {
                        orderBy: { order: 'asc' },
                    },
                },
            });
        });
    }
    async activateAcademicYear(id, schoolId) {
        const academicYear = await this.getAcademicYearById(id, schoolId);
        const weightsValid = await this.validatePeriodWeights(id, schoolId);
        if (!weightsValid) {
            throw new localization_1.LocalizedException('academic_year.period_weights_must_total_100_before_activating_an_academic__b4f7e301', undefined, undefined, 'Period weights must total 100% before activating an academic year');
        }
        const activated = await this.prismaService.$transaction(async (tx) => {
            await tx.academicYear.updateMany({
                where: {
                    schoolId: academicYear.schoolId,
                    id: { not: id },
                },
                data: { isActive: false },
            });
            const updated = await tx.academicYear.update({
                where: { id },
                data: { isActive: true },
                include: {
                    terms: {
                        orderBy: { order: 'asc' },
                    },
                },
            });
            await tx.schoolSettings.upsert({
                where: { schoolId: academicYear.schoolId },
                update: { defaultAcademicYearId: id },
                create: {
                    schoolId: academicYear.schoolId,
                    defaultAcademicYearId: id,
                },
            });
            return updated;
        });
        void this.eventBus.emit('academic-year.activated', {
            schoolId: academicYear.schoolId,
            academicYearId: activated.id,
            name: activated.name,
            activatedBy: 'system',
        });
        await this.schoolSettingsService.ensureDefaultClassesForAcademicYear(academicYear.schoolId, activated.id);
        return activated;
    }
    async deleteAcademicYear(id, schoolId) {
        const academicYear = await this.getAcademicYearById(id, schoolId);
        if (academicYear.endDate < new Date()) {
            throw new localization_1.LocalizedException('academic_year.cannot_delete_a_past_academic_year_past_academic_years_are_l_8047924c', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot delete a past academic year. Past academic years are locked to preserve historical records.');
        }
        return this.prismaService.$transaction(async (tx) => {
            await tx.timetableSlot.updateMany({
                where: { academicYearId: id },
                data: { academicYearId: null },
            });
            await tx.enrollment.deleteMany({
                where: {
                    academicYear: academicYear.name,
                    schoolId: academicYear.schoolId,
                },
            });
            return tx.academicYear.delete({
                where: { id },
            });
        });
    }
    async getCurrentTerm(schoolId) {
        const finalSchoolId = this.requireSchoolId(schoolId);
        const now = new Date();
        const schoolSettings = await this.prismaService.schoolSettings.findUnique({
            where: { schoolId: finalSchoolId },
        });
        const activeYear = schoolSettings?.defaultAcademicYearId
            ? await this.prismaService.academicYear.findUnique({
                where: { id: schoolSettings.defaultAcademicYearId },
            })
            : await this.prismaService.academicYear.findFirst({
                where: {
                    schoolId: finalSchoolId,
                    isActive: true,
                },
                orderBy: { startDate: 'desc' },
            });
        const fallbackYear = activeYear ||
            (await this.prismaService.academicYear.findFirst({
                where: { schoolId: finalSchoolId },
                orderBy: { startDate: 'desc' },
            }));
        if (!fallbackYear) {
            return null;
        }
        const currentTerm = await this.prismaService.term.findFirst({
            where: {
                academicYearId: fallbackYear.id,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            orderBy: { order: 'asc' },
            include: {
                academicYear: true,
            },
        });
        if (currentTerm) {
            return currentTerm;
        }
        return this.prismaService.term.findFirst({
            where: {
                academicYearId: fallbackYear.id,
            },
            orderBy: { order: 'asc' },
            include: {
                academicYear: true,
            },
        });
    }
    async getPeriodWeights(id, schoolId) {
        const academicYear = await this.getAcademicYearById(id, schoolId);
        return academicYear.terms.map((term) => ({
            id: term.id,
            name: term.name,
            order: term.order,
            percentageWeight: term.percentageWeight,
            isLocked: term.isLocked,
        }));
    }
    async validatePeriodWeights(id, schoolId) {
        const academicYear = await this.getAcademicYearById(id, schoolId);
        const totalWeight = academicYear.terms.reduce((sum, term) => sum + term.percentageWeight, 0);
        return Math.abs(totalWeight - 100) < 0.01;
    }
    async createTerm(academicYearId, dto, schoolId) {
        const academicYear = await this.getAcademicYearById(academicYearId, schoolId);
        const name = dto.name?.trim();
        if (!name) {
            throw new localization_1.LocalizedException('academic_year.period_name_is_required_a8533660', undefined, undefined, 'Period name is required');
        }
        if (!Number.isInteger(dto.order) || dto.order < 1) {
            throw new localization_1.LocalizedException('academic_year.period_order_must_be_a_positive_integer_d2412d12', undefined, undefined, 'Period order must be a positive integer');
        }
        this.assertPeriodWeight(dto.percentageWeight);
        const startDate = parseValidDate(dto.startDate, 'Start date');
        const endDate = parseValidDate(dto.endDate, 'End date');
        assertDateRange(startDate, endDate);
        const existingTerm = await this.prismaService.term.findFirst({
            where: {
                academicYearId,
                name,
            },
        });
        if (existingTerm) {
            throw new localization_1.LocalizedException('academic_year.a_period_with_this_name_already_exists_e0ce51af', undefined, undefined, 'A period with this name already exists');
        }
        if (startDate < academicYear.startDate || endDate > academicYear.endDate) {
            throw new localization_1.LocalizedException('academic_year.term_dates_must_be_within_the_academic_year_b298f13d', undefined, undefined, 'Term dates must be within the academic year');
        }
        await this.assertTermDatesDoNotOverlap(academicYearId, startDate, endDate);
        await this.assertTotalWeightDoesNotExceed100(academicYearId, dto.percentageWeight);
        const existingOrder = await this.prismaService.term.findFirst({
            where: {
                academicYearId,
                order: dto.order,
            },
        });
        if (existingOrder) {
            throw new localization_1.LocalizedException('academic_year.a_period_with_this_order_number_already_exists_b67c58bd', undefined, undefined, 'A period with this order number already exists');
        }
        const term = await this.prismaService.term.create({
            data: {
                academicYearId,
                name,
                order: dto.order,
                percentageWeight: dto.percentageWeight,
                startDate,
                endDate,
                isLocked: false,
            },
        });
        void this.eventBus.emit('term.activated', {
            schoolId: academicYear.schoolId,
            academicYearId,
            termId: term.id,
            name: term.name,
        });
        return term;
    }
    async updateTerm(termId, dto, schoolId) {
        const term = await this.assertTermSchoolAccess(termId, schoolId);
        if (term.isLocked) {
            throw new localization_1.LocalizedException('academic_year.cannot_modify_a_locked_period_please_unlock_it_first_c8664d4d', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot modify a locked period. Please unlock it first.');
        }
        const name = dto.name?.trim();
        if (dto.name !== undefined && !name) {
            throw new localization_1.LocalizedException('academic_year.period_name_is_required_a8533660', undefined, undefined, 'Period name is required');
        }
        if (dto.order !== undefined &&
            (!Number.isInteger(dto.order) || dto.order < 1)) {
            throw new localization_1.LocalizedException('academic_year.period_order_must_be_a_positive_integer_d2412d12', undefined, undefined, 'Period order must be a positive integer');
        }
        this.assertPeriodWeight(dto.percentageWeight);
        const nextStartDate = dto.startDate
            ? parseValidDate(dto.startDate, 'Start date')
            : term.startDate;
        const nextEndDate = dto.endDate
            ? parseValidDate(dto.endDate, 'End date')
            : term.endDate;
        assertDateRange(nextStartDate, nextEndDate);
        if (nextStartDate < term.academicYear.startDate ||
            nextEndDate > term.academicYear.endDate) {
            throw new localization_1.LocalizedException('academic_year.term_dates_must_be_within_the_academic_year_b298f13d', undefined, undefined, 'Term dates must be within the academic year');
        }
        await this.assertTermDatesDoNotOverlap(term.academicYearId, nextStartDate, nextEndDate, termId);
        if (name && name !== term.name) {
            const existingName = await this.prismaService.term.findFirst({
                where: {
                    academicYearId: term.academicYearId,
                    name,
                    id: { not: termId },
                },
            });
            if (existingName) {
                throw new localization_1.LocalizedException('academic_year.a_period_with_this_name_already_exists_e0ce51af', undefined, undefined, 'A period with this name already exists');
            }
        }
        if (dto.percentageWeight !== undefined) {
            const hasGrades = await this.prismaService.subjectGrade.findFirst({
                where: { termId },
            });
            if (hasGrades) {
                throw new localization_1.LocalizedException('academic_year.cannot_change_weight_after_grading_has_begun_ec2a70da', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot change weight after grading has begun');
            }
            await this.assertTotalWeightDoesNotExceed100(term.academicYearId, dto.percentageWeight, termId);
        }
        if (dto.order !== undefined) {
            const existingOrder = await this.prismaService.term.findFirst({
                where: {
                    academicYearId: term.academicYearId,
                    order: dto.order,
                    id: { not: termId },
                },
            });
            if (existingOrder) {
                throw new localization_1.LocalizedException('academic_year.a_period_with_this_order_number_already_exists_b67c58bd', undefined, undefined, 'A period with this order number already exists');
            }
        }
        return this.prismaService.term.update({
            where: { id: termId },
            data: {
                ...(name && { name }),
                ...(dto.order !== undefined && { order: dto.order }),
                ...(dto.percentageWeight !== undefined && {
                    percentageWeight: dto.percentageWeight,
                }),
                ...(dto.startDate && { startDate: nextStartDate }),
                ...(dto.endDate && { endDate: nextEndDate }),
            },
        });
    }
    async lockTerm(termId, isLocked, schoolId) {
        await this.assertTermSchoolAccess(termId, schoolId);
        return this.prismaService.term.update({
            where: { id: termId },
            data: { isLocked },
        });
    }
    async deleteTerm(termId, schoolId) {
        const term = await this.assertTermSchoolAccess(termId, schoolId);
        if (term.isLocked) {
            throw new localization_1.LocalizedException('academic_year.cannot_delete_a_locked_period_26f1f6f8', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot delete a locked period');
        }
        const hasGrades = await this.prismaService.subjectGrade.findFirst({
            where: { termId },
        });
        if (hasGrades) {
            throw new localization_1.LocalizedException('academic_year.cannot_delete_a_period_that_has_grades_d19d158d', undefined, common_1.HttpStatus.FORBIDDEN, 'Cannot delete a period that has grades');
        }
        return this.prismaService.term.delete({
            where: { id: termId },
        });
    }
    async getTermById(termId, schoolId) {
        return this.assertTermSchoolAccess(termId, schoolId);
    }
};
exports.AcademicYearService = AcademicYearService;
exports.AcademicYearService = AcademicYearService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        school_settings_service_1.SchoolSettingsService,
        event_bus_service_1.EventBusService])
], AcademicYearService);
//# sourceMappingURL=academic-year.service.js.map