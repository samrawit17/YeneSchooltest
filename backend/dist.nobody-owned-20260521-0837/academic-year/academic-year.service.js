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
const prisma_service_1 = require("../prisma/prisma.service");
const school_settings_service_1 = require("../school-settings/school-settings.service");
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
    constructor(prismaService, schoolSettingsService) {
        this.prismaService = prismaService;
        this.schoolSettingsService = schoolSettingsService;
    }
    async createAcademicYear(createDto) {
        const { name, startDate, endDate, schoolId, curriculumType, calendarType = 'ETHIOPIAN', } = createDto;
        if (new Date(startDate) >= new Date(endDate)) {
            throw new common_1.BadRequestException('Start date must be before end date');
        }
        const existing = await this.prismaService.academicYear.findUnique({
            where: {
                schoolId_name: {
                    schoolId,
                    name,
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Academic year with this name already exists for this school');
        }
        let finalCurriculumType = curriculumType || 'SEMESTER';
        if (!curriculumType) {
            const schoolSetting = await this.schoolSettingsService.getSetting(schoolId, 'curriculum_type');
            if (schoolSetting) {
                finalCurriculumType = schoolSetting;
            }
        }
        const academicYear = await this.prismaService.academicYear.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                schoolId,
                curriculumType: finalCurriculumType,
                calendarType: calendarType,
                ethiopianYear: getEthiopianYear(new Date(startDate)),
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
                const termsData = buildPeriodDateRanges(finalCurriculumType, new Date(startDate), new Date(endDate), periodConfig).map((config) => ({
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
        await this.schoolSettingsService.ensureDefaultClassesForAcademicYear(schoolId, academicYear.id);
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
        return this.prismaService.academicYear.findMany({
            where: { schoolId },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAcademicYearById(id) {
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
            throw new common_1.NotFoundException('Academic year not found');
        }
        return academicYear;
    }
    async getActiveAcademicYear(schoolId) {
        const settings = await this.prismaService.schoolSettings.findUnique({
            where: { schoolId },
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
                schoolId,
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
            where: { schoolId },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { startDate: 'desc' },
        });
    }
    async resolveAcademicYearId(schoolId, providedAcademicYearId) {
        if (providedAcademicYearId) {
            return providedAcademicYearId;
        }
        const settings = await this.prismaService.schoolSettings.findUnique({
            where: { schoolId },
        });
        if (settings && settings.defaultAcademicYearId) {
            return settings.defaultAcademicYearId;
        }
        const activeInfo = await this.getActiveAcademicYear(schoolId);
        if (!activeInfo) {
            throw new common_1.BadRequestException('No academic year provided and no default/active academic year found for the school');
        }
        return activeInfo.id;
    }
    async updateAcademicYear(id, updateDto) {
        const academicYear = await this.getAcademicYearById(id);
        if (updateDto.startDate && updateDto.endDate) {
            if (new Date(updateDto.startDate) >= new Date(updateDto.endDate)) {
                throw new common_1.BadRequestException('Start date must be before end date');
            }
        }
        if (updateDto.name && updateDto.name !== academicYear.name) {
            const existing = await this.prismaService.academicYear.findUnique({
                where: {
                    schoolId_name: {
                        schoolId: academicYear.schoolId,
                        name: updateDto.name,
                    },
                },
            });
            if (existing) {
                throw new common_1.BadRequestException('Academic year with this name already exists for this school');
            }
        }
        if (updateDto.curriculumType &&
            updateDto.curriculumType !== academicYear.curriculumType) {
            await this.updateCurriculumType(id, {
                curriculumType: updateDto.curriculumType,
            });
        }
        return this.prismaService.academicYear.update({
            where: { id },
            data: {
                ...(updateDto.name && { name: updateDto.name }),
                ...(updateDto.startDate && {
                    startDate: new Date(updateDto.startDate),
                    ethiopianYear: getEthiopianYear(new Date(updateDto.startDate)),
                }),
                ...(updateDto.endDate && { endDate: new Date(updateDto.endDate) }),
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
    async updateCurriculumType(id, dto) {
        const academicYear = await this.getAcademicYearById(id);
        const existingGrades = await this.prismaService.subjectGrade.findFirst({
            where: {
                academicYear: academicYear.name,
                schoolId: academicYear.schoolId,
            },
        });
        if (existingGrades) {
            throw new common_1.ForbiddenException('Cannot change curriculum type after grading has begun. Please contact system administrator.');
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
            throw new common_1.ForbiddenException('Cannot change curriculum type after terms have grades. Please contact system administrator.');
        }
        await this.prismaService.term.deleteMany({
            where: { academicYearId: id },
        });
        if (dto.curriculumType !== 'CUSTOM') {
            const periodConfig = DEFAULT_PERIOD_CONFIGS[dto.curriculumType];
            if (periodConfig) {
                await this.prismaService.term.createMany({
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
        return this.prismaService.academicYear.update({
            where: { id },
            data: { curriculumType: dto.curriculumType },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
        });
    }
    async activateAcademicYear(id) {
        const academicYear = await this.getAcademicYearById(id);
        await this.prismaService.academicYear.updateMany({
            where: {
                schoolId: academicYear.schoolId,
                id: { not: id },
            },
            data: { isActive: false },
        });
        const activated = await this.prismaService.academicYear.update({
            where: { id },
            data: { isActive: true },
            include: {
                terms: {
                    orderBy: { order: 'asc' },
                },
            },
        });
        await this.schoolSettingsService.ensureDefaultClassesForAcademicYear(academicYear.schoolId, activated.id);
        return activated;
    }
    async deleteAcademicYear(id) {
        const academicYear = await this.getAcademicYearById(id);
        const [enrollments, enrollmentRequests, classes, grades] = await Promise.all([
            this.prismaService.enrollment.count({
                where: {
                    academicYear: academicYear.name,
                    schoolId: academicYear.schoolId,
                },
            }),
            this.prismaService.enrollmentRequest.count({
                where: { academicYearId: id },
            }),
            this.prismaService.class.count({
                where: { academicYearId: id },
            }),
            this.prismaService.subjectGrade.count({
                where: { term: { academicYearId: id } },
            }),
        ]);
        if (enrollments > 0 ||
            enrollmentRequests > 0 ||
            classes > 0 ||
            grades > 0) {
            throw new common_1.ForbiddenException('Cannot delete an academic year that has student enrollments, requests, classes, or grades.');
        }
        return this.prismaService.academicYear.delete({
            where: { id },
        });
    }
    async getCurrentTerm(schoolId) {
        const now = new Date();
        const schoolSettings = await this.prismaService.schoolSettings.findUnique({
            where: { schoolId },
        });
        const activeYear = schoolSettings?.defaultAcademicYearId
            ? await this.prismaService.academicYear.findUnique({
                where: { id: schoolSettings.defaultAcademicYearId },
            })
            : await this.prismaService.academicYear.findFirst({
                where: {
                    schoolId,
                    isActive: true,
                },
                orderBy: { startDate: 'desc' },
            });
        const fallbackYear = activeYear ||
            (await this.prismaService.academicYear.findFirst({
                where: { schoolId },
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
    async getPeriodWeights(id) {
        const academicYear = await this.getAcademicYearById(id);
        return academicYear.terms.map((term) => ({
            id: term.id,
            name: term.name,
            order: term.order,
            percentageWeight: term.percentageWeight,
            isLocked: term.isLocked,
        }));
    }
    async validatePeriodWeights(id) {
        const academicYear = await this.getAcademicYearById(id);
        const totalWeight = academicYear.terms.reduce((sum, term) => sum + term.percentageWeight, 0);
        return Math.abs(totalWeight - 100) < 0.01;
    }
    async createTerm(academicYearId, dto) {
        const academicYear = await this.getAcademicYearById(academicYearId);
        const existingTerm = await this.prismaService.term.findFirst({
            where: {
                academicYearId,
                name: dto.name,
            },
        });
        if (existingTerm) {
            throw new common_1.BadRequestException('A period with this name already exists');
        }
        if (new Date(dto.startDate) < academicYear.startDate ||
            new Date(dto.endDate) > academicYear.endDate) {
            throw new common_1.BadRequestException('Term dates must be within the academic year');
        }
        const existingOrder = await this.prismaService.term.findFirst({
            where: {
                academicYearId,
                order: dto.order,
            },
        });
        if (existingOrder) {
            throw new common_1.BadRequestException('A period with this order number already exists');
        }
        return this.prismaService.term.create({
            data: {
                academicYearId,
                name: dto.name,
                order: dto.order,
                percentageWeight: dto.percentageWeight,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                isLocked: false,
            },
        });
    }
    async updateTerm(termId, dto) {
        const term = await this.prismaService.term.findUnique({
            where: { id: termId },
            include: { academicYear: true },
        });
        if (!term) {
            throw new common_1.NotFoundException('Term not found');
        }
        if (term.isLocked) {
            throw new common_1.ForbiddenException('Cannot modify a locked period. Please unlock it first.');
        }
        if (dto.percentageWeight !== undefined) {
            const hasGrades = await this.prismaService.subjectGrade.findFirst({
                where: { termId },
            });
            if (hasGrades) {
                throw new common_1.ForbiddenException('Cannot change weight after grading has begun');
            }
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
                throw new common_1.BadRequestException('A period with this order number already exists');
            }
        }
        return this.prismaService.term.update({
            where: { id: termId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.order !== undefined && { order: dto.order }),
                ...(dto.percentageWeight !== undefined && {
                    percentageWeight: dto.percentageWeight,
                }),
                ...(dto.startDate && { startDate: new Date(dto.startDate) }),
                ...(dto.endDate && { endDate: new Date(dto.endDate) }),
            },
        });
    }
    async lockTerm(termId, isLocked) {
        const term = await this.prismaService.term.findUnique({
            where: { id: termId },
            include: { academicYear: true },
        });
        if (!term) {
            throw new common_1.NotFoundException('Term not found');
        }
        return this.prismaService.term.update({
            where: { id: termId },
            data: { isLocked },
        });
    }
    async deleteTerm(termId) {
        const term = await this.prismaService.term.findUnique({
            where: { id: termId },
        });
        if (!term) {
            throw new common_1.NotFoundException('Term not found');
        }
        if (term.isLocked) {
            throw new common_1.ForbiddenException('Cannot delete a locked period');
        }
        const hasGrades = await this.prismaService.subjectGrade.findFirst({
            where: { termId },
        });
        if (hasGrades) {
            throw new common_1.ForbiddenException('Cannot delete a period that has grades');
        }
        return this.prismaService.term.delete({
            where: { id: termId },
        });
    }
    async getTermById(termId) {
        const term = await this.prismaService.term.findUnique({
            where: { id: termId },
            include: { academicYear: true },
        });
        if (!term) {
            throw new common_1.NotFoundException('Term not found');
        }
        return term;
    }
};
exports.AcademicYearService = AcademicYearService;
exports.AcademicYearService = AcademicYearService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        school_settings_service_1.SchoolSettingsService])
], AcademicYearService);
//# sourceMappingURL=academic-year.service.js.map