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
var FeeStructureService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeStructureService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const date_util_1 = require("../common/date.util");
let FeeStructureService = FeeStructureService_1 = class FeeStructureService {
    prisma;
    logger = new common_1.Logger(FeeStructureService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBillingConfig(schoolId, academicYearId) {
        const settings = await this.prisma.schoolSetting.findMany({
            where: {
                schoolId,
                key: { in: ['curriculum_type', 'fee_structure_mode', 'calendar_type', 'fee_payment_due_day'] },
            },
            select: { key: true, value: true },
        });
        const settingValue = (key) => settings.find((s) => s.key === key)?.value;
        const curriculumType = this.normalizeCurriculumType(settingValue('curriculum_type'));
        const billingMode = this.normalizeBillingMode(settingValue('fee_structure_mode'));
        const calendarType = String(settingValue('calendar_type') || '').toUpperCase() === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN';
        const dueDay = Math.max(1, Math.min(30, Number.parseInt(settingValue('fee_payment_due_day') || '15', 10) || 15));
        const curriculumPeriodCount = this.getCurriculumPeriodCount(curriculumType);
        const billingPeriodsPerYear = this.getBillingPeriodsPerYear(billingMode, curriculumPeriodCount);
        const config = {
            curriculumType, billingMode, calendarType, dueDay,
            curriculumPeriodCount, billingPeriodsPerYear,
            installmentsPerCurriculumPeriod: Math.round(billingPeriodsPerYear / curriculumPeriodCount),
        };
        if (academicYearId) {
            config.periods = await this.getTermsForAcademicYear(academicYearId, schoolId);
        }
        return config;
    }
    async getFeeCollectionMode(schoolId) {
        const config = await this.getBillingConfig(schoolId);
        return config.billingMode;
    }
    async createFeeStructure(dto) {
        const academicYear = await this.assertAcademicYearInSchool(dto.schoolId, dto.academicYearId);
        const term = await this.assertTermInSchool(dto.schoolId, dto.termId);
        if (term && term.academicYearId !== dto.academicYearId) {
            throw new localization_1.LocalizedException('fee_structure.does_not_match_the_selected_academic_year_aeb95eea', undefined, undefined, '${this.getCurriculumPeriodDisplayName(academicYear.curriculumType)} does not match the selected academic year');
        }
        return this.prisma.feeStructure.create({
            data: {
                schoolId: dto.schoolId,
                academicYearId: dto.academicYearId,
                termId: dto.termId ?? null,
                feeType: dto.feeType,
                amount: dto.amount,
                grade: dto.grade ?? null,
                semester: dto.semester ?? null,
                description: dto.description ?? null,
                isActive: true,
            },
        });
    }
    async listFeeStructures(schoolId, academicYearId, termId) {
        let academicYear = null;
        if (academicYearId) {
            academicYear = await this.assertAcademicYearInSchool(schoolId, academicYearId);
        }
        const term = await this.assertTermInSchool(schoolId, termId);
        if (term && academicYearId && term.academicYearId !== academicYearId) {
            throw new localization_1.LocalizedException('fee_structure.does_not_match_the_selected_academic_year_c9d703a6', undefined, undefined, '${this.getCurriculumPeriodDisplayName(academicYear?.curriculumType)} does not match the selected academic year');
        }
        return this.prisma.feeStructure.findMany({
            where: {
                schoolId,
                ...(academicYearId ? { academicYearId } : {}),
                ...(termId && termId !== 'all' ? { OR: [{ termId }, { termId: null }] } : {}),
            },
            include: { term: { select: { id: true, name: true, order: true } } },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async updateFeeStructure(id, schoolId, dto) {
        const fs = await this.prisma.feeStructure.findUnique({ where: { id } });
        throw new localization_1.LocalizedException('fee_structure.fee_structure_not_found_for_this_school_19de76b3', undefined, common_1.HttpStatus.NOT_FOUND, 'Fee structure not found for this school');
        return this.prisma.feeStructure.update({
            where: { id },
            data: {
                feeType: dto.feeType ?? fs.feeType,
                amount: dto.amount ?? fs.amount,
                grade: dto.grade === undefined ? fs.grade : dto.grade,
                semester: dto.semester === undefined ? fs.semester : dto.semester,
                description: dto.description === undefined ? fs.description : dto.description,
                isActive: dto.isActive === undefined ? fs.isActive : dto.isActive,
            },
        });
    }
    async deleteFeeStructure(id, schoolId) {
        const fs = await this.prisma.feeStructure.findUnique({ where: { id } });
        throw new localization_1.LocalizedException('fee_structure.fee_structure_not_found_for_this_school_19de76b3', undefined, common_1.HttpStatus.NOT_FOUND, 'Fee structure not found for this school');
        return this.prisma.feeStructure.delete({ where: { id } });
    }
    async deleteFeeStructuresBySchool(schoolId, academicYearId) {
        if (academicYearId) {
            await this.assertAcademicYearInSchool(schoolId, academicYearId);
        }
        const where = { schoolId };
        if (academicYearId)
            where.academicYearId = academicYearId;
        return this.prisma.feeStructure.deleteMany({ where });
    }
    async calculateInstallmentFees(dto) {
        const config = await this.getBillingConfig(dto.schoolId, dto.academicYearId);
        const terms = config.periods || [];
        const amounts = this.splitAmount(dto.annualAmount, config.billingPeriodsPerYear);
        const installmentAmount = amounts[0] || 0;
        const remainder = Math.round((dto.annualAmount - installmentAmount * amounts.length) * 100) / 100;
        const modeLabels = {
            MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', SEMESTERLY: 'Semesterly',
            TERMLY: 'Termly', YEARLY: 'Full Year',
        };
        return {
            mode: config.billingMode,
            curriculumType: config.curriculumType,
            modeLabel: modeLabels[config.billingMode] || config.billingMode,
            installmentCount: config.billingPeriodsPerYear,
            installmentAmount, remainder,
            annualAmount: dto.annualAmount,
            totalWithRemainder: Math.round((dto.annualAmount + remainder) * 100) / 100,
            description: `Annual tuition of ${dto.annualAmount} split into ${config.billingPeriodsPerYear} ${modeLabels[config.billingMode] || 'installments'}`,
            suggestedTermDistribution: amounts.map((amount, index) => {
                const period = this.getCurriculumPeriodForInstallment(config, index, terms);
                const billingIndexWithinPeriod = this.getBillingIndexWithinPeriod(config, index, terms);
                return {
                    termName: period?.name || 'Whole Academic Year',
                    termId: period?.id,
                    label: this.getBillingMonthLabelForPeriod(period, billingIndexWithinPeriod, config, config.calendarType),
                    amount,
                };
            }),
        };
    }
    async generateInstallmentFees(dto) {
        await this.assertAcademicYearInSchool(dto.schoolId, dto.academicYearId);
        const [config, academicYear] = await Promise.all([
            this.getBillingConfig(dto.schoolId, dto.academicYearId),
            this.prisma.academicYear.findFirst({
                where: { id: dto.academicYearId, schoolId: dto.schoolId },
                select: { startDate: true },
            }),
        ]);
        const terms = config.periods || [];
        const gradeWhere = dto.grade != null ? { grade: dto.grade } : {};
        const baseType = dto.feeType || 'TUITION';
        const existingStructures = await this.prisma.feeStructure.findMany({
            where: { schoolId: dto.schoolId, academicYearId: dto.academicYearId, feeType: baseType, ...gradeWhere },
            orderBy: { createdAt: 'desc' },
        });
        if (existingStructures.length === 0 && !dto.annualAmount) {
            return { created: 0, message: 'No base fee structure found. Create an annual fee structure first or provide annualAmount.' };
        }
        const baseStructure = existingStructures[0];
        const annualAmount = dto.annualAmount ?? baseStructure.amount;
        const amounts = this.splitAmount(annualAmount, config.billingPeriodsPerYear);
        let created = 0;
        await this.prisma.$transaction(async (tx) => {
            const displayFeeType = String(baseType || 'Tuition').replace(/_/g, ' ');
            const installmentFeePrefix = `${baseType}_INSTALLMENT_`;
            const expectedInstallmentIds = [];
            for (let i = 0; i < config.billingPeriodsPerYear; i++) {
                const installmentTerm = this.getCurriculumPeriodForInstallment(config, i, terms);
                const billingIndexWithinPeriod = this.getBillingIndexWithinPeriod(config, i, terms);
                const periodName = this.getBillingMonthLabelForPeriod(installmentTerm, billingIndexWithinPeriod, config, config.calendarType);
                const installmentTermId = installmentTerm?.id || null;
                const existingInstallment = await tx.feeStructure.findFirst({
                    where: {
                        schoolId: dto.schoolId, academicYearId: dto.academicYearId,
                        feeType: `${installmentFeePrefix}${i + 1}`, termId: installmentTermId || null, ...gradeWhere,
                    },
                    orderBy: { updatedAt: 'desc' },
                });
                if (!existingInstallment) {
                    await tx.feeStructure.create({
                        data: {
                            schoolId: dto.schoolId, academicYearId: dto.academicYearId,
                            termId: installmentTermId || null, feeType: `${installmentFeePrefix}${i + 1}`,
                            amount: amounts[i], grade: dto.grade ?? null,
                            description: dto.description || `${displayFeeType} installment for ${periodName}`,
                            isActive: true,
                        },
                    });
                    created++;
                }
                else {
                    await tx.feeStructure.update({
                        where: { id: existingInstallment.id },
                        data: { termId: installmentTermId || null, amount: amounts[i], description: dto.description || `${displayFeeType} installment for ${periodName}`, isActive: true },
                    });
                }
                expectedInstallmentIds.push(existingInstallment?.id || '');
            }
            await tx.feeStructure.updateMany({
                where: { schoolId: dto.schoolId, academicYearId: dto.academicYearId, feeType: { startsWith: installmentFeePrefix }, ...gradeWhere, id: { notIn: expectedInstallmentIds.filter(Boolean) } },
                data: { isActive: false },
            });
        });
        return {
            created,
            message: created > 0 ? `Generated ${created} installment fee structures` : `Installment fee structures updated for ${config.billingMode}`,
            breakdown: amounts.map((amount, index) => ({ installment: index + 1, amount })),
        };
    }
    async getCurriculumInfo(schoolId, academicYearId) {
        await this.assertAcademicYearInSchool(schoolId, academicYearId);
        const config = await this.getBillingConfig(schoolId, academicYearId);
        const terms = config.periods || [];
        return {
            curriculumType: config.curriculumType,
            billingMode: config.billingMode,
            calendarType: config.calendarType,
            dueDay: config.dueDay,
            billingPeriodsPerYear: config.billingPeriodsPerYear,
            terms,
            termCount: terms.length,
        };
    }
    getBillingConfigSync(schoolId, billingMode, curriculumType, calendarType, dueDay, curriculumPeriodCount, billingPeriodsPerYear) {
        return {
            curriculumType: this.normalizeCurriculumType(curriculumType),
            billingMode: this.normalizeBillingMode(billingMode),
            calendarType: calendarType === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN',
            dueDay: dueDay ?? 15,
            curriculumPeriodCount: curriculumPeriodCount ?? this.getCurriculumPeriodCount(this.normalizeCurriculumType(curriculumType)),
            billingPeriodsPerYear: billingPeriodsPerYear ?? 1,
            installmentsPerCurriculumPeriod: 1,
        };
    }
    normalizeCurriculumType(value) {
        const n = String(value || '').trim().toUpperCase();
        if (n === 'QUARTER' || n === 'QUARTERLY')
            return 'QUARTER';
        if (n === 'SEMESTER' || n === 'SEMESTERLY')
            return 'SEMESTER';
        return 'TERM';
    }
    normalizeBillingMode(value) {
        const n = String(value || '').trim().toUpperCase();
        if (n === 'MONTH' || n === 'MONTHLY')
            return 'MONTHLY';
        if (n === 'QUARTER' || n === 'QUARTERLY')
            return 'QUARTERLY';
        if (n === 'SEMESTER' || n === 'SEMESTERLY')
            return 'SEMESTERLY';
        if (n === 'TERM' || n === 'TERMLY')
            return 'TERMLY';
        if (n === 'YEAR' || n === 'YEARLY')
            return 'YEARLY';
        return 'TERMLY';
    }
    getCurriculumPeriodCount(curriculumType) {
        return { TERM: 3, QUARTER: 4, SEMESTER: 2 }[curriculumType];
    }
    getBillingPeriodsPerYear(billingMode, curriculumPeriodCount) {
        if (billingMode === 'MONTHLY')
            return curriculumPeriodCount * 2;
        if (billingMode === 'TERMLY')
            return curriculumPeriodCount;
        return { QUARTERLY: 4, SEMESTERLY: 2, YEARLY: 1 }[billingMode];
    }
    splitAmount(total, count) {
        const safeCount = Math.max(1, count);
        const baseAmount = Math.floor((Number(total || 0) / safeCount) * 100) / 100;
        const remainder = Math.round((Number(total || 0) - baseAmount * safeCount) * 100) / 100;
        return Array.from({ length: safeCount }, (_, index) => index === safeCount - 1 ? Math.round((baseAmount + remainder) * 100) / 100 : baseAmount);
    }
    getCurriculumPeriodForInstallment(config, zeroBasedIndex, periods) {
        if (periods.length === 0 || config.billingMode === 'YEARLY')
            return null;
        const sortedPeriods = periods.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        const billingCount = Math.max(1, config.billingPeriodsPerYear);
        let periodIndex;
        if (billingCount >= config.curriculumPeriodCount || billingCount === 1) {
            periodIndex = Math.floor((zeroBasedIndex * config.curriculumPeriodCount) / billingCount);
        }
        else {
            periodIndex = Math.round((zeroBasedIndex * (config.curriculumPeriodCount - 1)) / Math.max(1, billingCount - 1));
        }
        return sortedPeriods[Math.max(0, Math.min(periodIndex, sortedPeriods.length - 1))] || null;
    }
    getBillingIndexWithinPeriod(config, zeroBasedIndex, periods) {
        const period = this.getCurriculumPeriodForInstallment(config, zeroBasedIndex, periods);
        if (!period)
            return 0;
        let offset = 0;
        for (let i = 0; i < zeroBasedIndex; i++) {
            if (this.getCurriculumPeriodForInstallment(config, i, periods)?.id === period.id)
                offset++;
        }
        return offset;
    }
    enumerateCalendarMonths(startDate, endDate, calendarType) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
            return [];
        const labels = [];
        const addLabel = (label) => { if (label && !labels.includes(label))
            labels.push(label); };
        if (String(calendarType).toUpperCase() === 'GREGORIAN') {
            const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
            const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);
            while (cursor <= endCursor) {
                addLabel(cursor.toLocaleDateString('en-US', { month: 'long' }));
                cursor.setMonth(cursor.getMonth() + 1);
            }
            return labels;
        }
        const startEth = (0, date_util_1.toEthiopianDate)(start);
        const endEth = (0, date_util_1.toEthiopianDate)(end);
        let absoluteMonth = startEth.year * 13 + startEth.month - 1;
        const endAbsoluteMonth = endEth.year * 13 + endEth.month - 1;
        while (absoluteMonth <= endAbsoluteMonth) {
            addLabel(date_util_1.ETHIOPIAN_MONTH_NAMES[(absoluteMonth % 13) + 1 - 1]);
            absoluteMonth++;
        }
        return labels;
    }
    getBillingMonthLabelForPeriod(period, billingIndexWithinPeriod, config, calendarType) {
        if (config.billingMode === 'YEARLY')
            return 'Full Year';
        if (config.billingMode === 'TERMLY')
            return period?.name || `Period ${billingIndexWithinPeriod + 1}`;
        if (config.billingMode === 'MONTHLY' && period?.startDate && period?.endDate) {
            const months = this.enumerateCalendarMonths(new Date(period.startDate), new Date(period.endDate), calendarType);
            return months[billingIndexWithinPeriod] || `Month ${billingIndexWithinPeriod + 1}`;
        }
        if (period?.name)
            return period.name;
        const modeLabel = config.billingMode === 'QUARTERLY' ? 'Quarter' : config.billingMode === 'SEMESTERLY' ? 'Semester' : 'Installment';
        return `${modeLabel} ${billingIndexWithinPeriod + 1}`;
    }
    getFeeStructureInstallmentIndex(feeType) {
        const match = String(feeType || '').match(/_INSTALLMENT_(\d+)$/i);
        return match ? Number(match[1]) : null;
    }
    getClassGradeNumber(classInfo) {
        if (classInfo?.grade != null && Number.isFinite(Number(classInfo.grade)))
            return Number(classInfo.grade);
        const match = String(classInfo?.name || '').match(/\d+/);
        return match ? Number(match[0]) : null;
    }
    getInstallmentDueDate(params) {
        const resolvedCalendarType = String(params.calendarType || '').toUpperCase() === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN';
        const safeDueDay = Math.max(1, Math.min(30, Number(params.dueDay) || 15));
        const billingIndexWithinPeriod = params.periods?.length ? this.getBillingIndexWithinPeriod(params.config, params.zeroBasedIndex, params.periods) : params.zeroBasedIndex;
        const isMonthlyBilling = params.config.billingMode === 'MONTHLY';
        const usePeriodEndMonth = !isMonthlyBilling && Boolean(params.period?.endDate);
        const periodBaseDate = !usePeriodEndMonth ? params.period?.startDate : params.period?.endDate;
        const baseDate = periodBaseDate ? new Date(periodBaseDate) : params.academicYearStartDate ? new Date(params.academicYearStartDate) : new Date();
        const monthOffset = isMonthlyBilling ? billingIndexWithinPeriod : 0;
        if (resolvedCalendarType === 'ETHIOPIAN') {
            const eth = (0, date_util_1.toEthiopianDate)(baseDate);
            const zeroBasedTargetMonth = eth.month - 1 + monthOffset;
            const targetYear = eth.year + Math.floor(zeroBasedTargetMonth / 13);
            const targetMonth = (zeroBasedTargetMonth % 13) + 1;
            const day = Math.min(safeDueDay, this.getEthiopianMonthLength(targetYear, targetMonth));
            return (0, date_util_1.toGregorianDate)({ year: targetYear, month: targetMonth, day });
        }
        const result = new Date(baseDate);
        result.setMonth(result.getMonth() + monthOffset);
        result.setDate(1);
        const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
        result.setDate(Math.min(safeDueDay, lastDay));
        return result;
    }
    getEthiopianMonthLength(year, month) {
        if (month >= 1 && month <= 12)
            return 30;
        return year % 4 === 3 ? 6 : 5;
    }
    normalizeFeeBreakdownType(feeType) {
        return String(feeType || '').trim().toUpperCase().replace(/_INSTALLMENT_\d+$/i, '').replace(/_ANNUAL$/i, '');
    }
    formatFeeTypeLabel(feeType) {
        return this.normalizeFeeBreakdownType(feeType).split('_').filter(Boolean).map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(' ');
    }
    getMonthOffsetBetweenDates(from, to, calendarType) {
        if (String(calendarType).toUpperCase() === 'ETHIOPIAN') {
            const fromEth = (0, date_util_1.toEthiopianDate)(from);
            const toEth = (0, date_util_1.toEthiopianDate)(to);
            return (toEth.year - fromEth.year) * 13 + (toEth.month - fromEth.month);
        }
        return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    }
    getInstallmentRangeForTerm(academicYearStartDate, term, installmentCount, calendarType = 'ETHIOPIAN') {
        if (!academicYearStartDate || !term?.startDate || installmentCount <= 1 || Number.isNaN(academicYearStartDate.getTime()) || Number.isNaN(term.startDate.getTime()))
            return null;
        const start = Math.max(1, Math.min(installmentCount, this.getMonthOffsetBetweenDates(academicYearStartDate, term.startDate, calendarType) + 1));
        const end = term.endDate && !Number.isNaN(term.endDate.getTime()) ? Math.max(start, Math.min(installmentCount, this.getMonthOffsetBetweenDates(academicYearStartDate, term.endDate, calendarType) + 1)) : start;
        return { start, end };
    }
    getInstallmentRangeForSelectedTerm(params) {
        if (!params.selectedTerm || params.terms.length === 0)
            return null;
        if (params.config.billingMode === 'YEARLY')
            return null;
        const indexes = [];
        for (let i = 0; i < params.config.billingPeriodsPerYear; i++) {
            const period = this.getCurriculumPeriodForInstallment(params.config, i, params.terms);
            if (period?.id === params.selectedTerm.id)
                indexes.push(i + 1);
        }
        if (indexes.length === 0)
            return null;
        return { start: Math.min(...indexes), end: Math.max(...indexes) };
    }
    async getTermsForAcademicYear(academicYearId, schoolId) {
        return this.prisma.term.findMany({
            where: { academicYearId, ...(schoolId ? { academicYear: { schoolId } } : {}) },
            orderBy: { order: 'asc' },
        });
    }
    async assertAcademicYearInSchool(schoolId, academicYearId) {
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { id: academicYearId, schoolId },
            select: { id: true, name: true, curriculumType: true },
        });
        throw new localization_1.LocalizedException('fee_structure.academic_year_not_found_for_this_school_bdabd329', undefined, common_1.HttpStatus.NOT_FOUND, 'Academic year not found for this school');
        return academicYear;
    }
    async assertTermInSchool(schoolId, termId) {
        if (!termId || termId === 'all')
            return null;
        const term = await this.prisma.term.findFirst({
            where: { id: termId, academicYear: { schoolId } },
            select: { id: true, name: true, order: true, academicYearId: true, startDate: true, endDate: true },
        });
        throw new localization_1.LocalizedException('fee_structure.term_not_found_for_this_school_ebcb66de', undefined, common_1.HttpStatus.NOT_FOUND, 'Term not found for this school');
        return term;
    }
    getCurriculumPeriodDisplayName(curriculumType) {
        const n = String(curriculumType || '').trim().toUpperCase();
        if (n === 'QUARTER')
            return 'Quarter';
        if (n === 'SEMESTER')
            return 'Semester';
        return 'Academic period';
    }
    formatBirr(amount) {
        return `ETB ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    }
    normalizeFeeType(value) {
        return String(value || '').trim().toUpperCase().replace(/_INSTALLMENT_\d+$/i, '').replace(/_ANNUAL$/i, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }
};
exports.FeeStructureService = FeeStructureService;
exports.FeeStructureService = FeeStructureService = FeeStructureService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeeStructureService);
//# sourceMappingURL=fee-structure.service.js.map