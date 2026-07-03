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
var FinanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const CHUNK_SIZE = 50;
const prisma_service_1 = require("../prisma/prisma.service");
const role_enum_1 = require("../auth/types/role.enum");
const schedule_1 = require("@nestjs/schedule");
const notification_service_1 = require("../notification/notification.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const date_util_1 = require("../common/date.util");
let FinanceService = FinanceService_1 = class FinanceService {
    prisma;
    notificationService;
    eventBus;
    logger = new common_1.Logger(FinanceService_1.name);
    FAMILY_DISCOUNT_POLICY_NAME = 'Automatic Family Discount';
    constructor(prisma, notificationService, eventBus) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.eventBus = eventBus;
    }
    normalizeCurriculumType(value) {
        const normalized = String(value || '')
            .trim()
            .toUpperCase();
        if (normalized === 'QUARTER' || normalized === 'QUARTERLY')
            return 'QUARTER';
        if (normalized === 'SEMESTER' || normalized === 'SEMESTERLY')
            return 'SEMESTER';
        return 'TERM';
    }
    normalizeBillingMode(value) {
        const normalized = String(value || '')
            .trim()
            .toUpperCase();
        if (normalized === 'MONTH' || normalized === 'MONTHLY')
            return 'MONTHLY';
        if (normalized === 'QUARTER' || normalized === 'QUARTERLY')
            return 'QUARTERLY';
        if (normalized === 'SEMESTER' || normalized === 'SEMESTERLY')
            return 'SEMESTERLY';
        if (normalized === 'TERM' || normalized === 'TERMLY')
            return 'TERMLY';
        if (normalized === 'YEAR' || normalized === 'YEARLY')
            return 'YEARLY';
        return 'TERMLY';
    }
    getCurriculumPeriodCount(curriculumType) {
        const counts = {
            TERM: 3,
            QUARTER: 4,
            SEMESTER: 2,
        };
        return counts[curriculumType];
    }
    getBillingPeriodsPerYear(billingMode, curriculumPeriodCount) {
        const counts = {
            QUARTERLY: 4,
            SEMESTERLY: 2,
            YEARLY: 1,
        };
        if (billingMode === 'MONTHLY')
            return curriculumPeriodCount * 2;
        if (billingMode === 'TERMLY')
            return curriculumPeriodCount;
        return counts[billingMode];
    }
    async getBillingConfig(schoolId, academicYearId) {
        const settings = await this.prisma.schoolSetting.findMany({
            where: {
                schoolId,
                key: {
                    in: [
                        'curriculum_type',
                        'fee_structure_mode',
                        'calendar_type',
                        'fee_payment_due_day',
                    ],
                },
            },
            select: { key: true, value: true },
        });
        const settingValue = (key) => settings.find((setting) => setting.key === key)?.value;
        const curriculumType = this.normalizeCurriculumType(settingValue('curriculum_type'));
        const billingMode = this.normalizeBillingMode(settingValue('fee_structure_mode'));
        const calendarType = String(settingValue('calendar_type') || '').toUpperCase() === 'GREGORIAN'
            ? 'GREGORIAN'
            : 'ETHIOPIAN';
        const dueDay = Math.max(1, Math.min(30, Number.parseInt(settingValue('fee_payment_due_day') || '15', 10) || 15));
        const curriculumPeriodCount = this.getCurriculumPeriodCount(curriculumType);
        const billingPeriodsPerYear = this.getBillingPeriodsPerYear(billingMode, curriculumPeriodCount);
        const config = {
            curriculumType,
            billingMode,
            calendarType,
            dueDay,
            curriculumPeriodCount,
            billingPeriodsPerYear,
            installmentsPerCurriculumPeriod: Math.round(billingPeriodsPerYear / curriculumPeriodCount),
        };
        if (academicYearId) {
            config.periods = await this.getTermsForAcademicYear(academicYearId, schoolId);
        }
        return config;
    }
    splitAmount(total, count) {
        const safeCount = Math.max(1, count);
        const baseAmount = Math.floor((Number(total || 0) / safeCount) * 100) / 100;
        const remainder = Math.round((Number(total || 0) - baseAmount * safeCount) * 100) / 100;
        return Array.from({ length: safeCount }, (_, index) => index === safeCount - 1
            ? Math.round((baseAmount + remainder) * 100) / 100
            : baseAmount);
    }
    getCurriculumPeriodForInstallment(config, zeroBasedIndex, periods) {
        if (periods.length === 0 || config.billingMode === 'YEARLY')
            return null;
        const sortedPeriods = periods
            .slice()
            .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        const billingCount = Math.max(1, config.billingPeriodsPerYear);
        let periodIndex;
        if (billingCount >= config.curriculumPeriodCount || billingCount === 1) {
            periodIndex = Math.floor((zeroBasedIndex * config.curriculumPeriodCount) / billingCount);
        }
        else {
            periodIndex = Math.round((zeroBasedIndex * (config.curriculumPeriodCount - 1)) /
                Math.max(1, billingCount - 1));
        }
        return (sortedPeriods[Math.max(0, Math.min(periodIndex, sortedPeriods.length - 1))] || null);
    }
    getBillingIndexWithinPeriod(config, zeroBasedIndex, periods) {
        const period = this.getCurriculumPeriodForInstallment(config, zeroBasedIndex, periods);
        if (!period)
            return 0;
        let offset = 0;
        for (let i = 0; i < zeroBasedIndex; i += 1) {
            const previousPeriod = this.getCurriculumPeriodForInstallment(config, i, periods);
            if (previousPeriod?.id === period.id)
                offset += 1;
        }
        return offset;
    }
    enumerateCalendarMonths(startDate, endDate, calendarType) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
            return [];
        const labels = [];
        const addLabel = (label) => {
            if (label && !labels.includes(label))
                labels.push(label);
        };
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
            const month = (absoluteMonth % 13) + 1;
            addLabel(date_util_1.ETHIOPIAN_MONTH_NAMES[month - 1]);
            absoluteMonth += 1;
        }
        return labels;
    }
    getBillingMonthLabelForPeriod(period, billingIndexWithinPeriod, config, calendarType) {
        if (config.billingMode === 'YEARLY')
            return 'Full Year';
        if (config.billingMode === 'TERMLY') {
            return period?.name || `Period ${billingIndexWithinPeriod + 1}`;
        }
        if (config.billingMode === 'MONTHLY' &&
            period?.startDate &&
            period?.endDate) {
            const months = this.enumerateCalendarMonths(new Date(period.startDate), new Date(period.endDate), calendarType);
            return (months[billingIndexWithinPeriod] ||
                `Month ${billingIndexWithinPeriod + 1}`);
        }
        if (period?.name)
            return period.name;
        const modeLabel = config.billingMode === 'QUARTERLY'
            ? 'Quarter'
            : config.billingMode === 'SEMESTERLY'
                ? 'Semester'
                : 'Installment';
        return `${modeLabel} ${billingIndexWithinPeriod + 1}`;
    }
    getFeeStructureInstallmentIndex(feeType) {
        const match = String(feeType || '').match(/_INSTALLMENT_(\d+)$/i);
        return match ? Number(match[1]) : null;
    }
    getClassGradeNumber(classInfo) {
        if (classInfo?.grade != null && Number.isFinite(Number(classInfo.grade))) {
            return Number(classInfo.grade);
        }
        const match = String(classInfo?.name || '').match(/\d+/);
        return match ? Number(match[0]) : null;
    }
    getInstallmentDueDate(params) {
        const resolvedCalendarType = String(params.calendarType || '').toUpperCase() === 'GREGORIAN'
            ? 'GREGORIAN'
            : 'ETHIOPIAN';
        const safeDueDay = Math.max(1, Math.min(30, Number(params.dueDay) || 15));
        const billingIndexWithinPeriod = params.periods?.length
            ? this.getBillingIndexWithinPeriod(params.config, params.zeroBasedIndex, params.periods)
            : params.zeroBasedIndex;
        const isMonthlyBilling = params.config.billingMode === 'MONTHLY';
        const usePeriodEndMonth = !isMonthlyBilling && Boolean(params.period?.endDate);
        const periodBaseDate = !usePeriodEndMonth
            ? params.period?.startDate
            : params.period?.endDate;
        const baseDate = periodBaseDate
            ? new Date(periodBaseDate)
            : params.academicYearStartDate
                ? new Date(params.academicYearStartDate)
                : new Date();
        const monthOffset = isMonthlyBilling ? billingIndexWithinPeriod : 0;
        if (resolvedCalendarType === 'ETHIOPIAN') {
            const eth = (0, date_util_1.toEthiopianDate)(baseDate);
            const zeroBasedTargetMonth = eth.month - 1 + monthOffset;
            const targetYear = eth.year + Math.floor(zeroBasedTargetMonth / 13);
            const targetMonth = (zeroBasedTargetMonth % 13) + 1;
            const maxDayInPeriodMonth = usePeriodEndMonth ? eth.day : safeDueDay;
            const day = Math.min(safeDueDay, maxDayInPeriodMonth, this.getEthiopianMonthLength(targetYear, targetMonth));
            return (0, date_util_1.toGregorianDate)({ year: targetYear, month: targetMonth, day });
        }
        const result = new Date(baseDate);
        result.setMonth(result.getMonth() + monthOffset);
        result.setDate(1);
        const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
        const maxDayInPeriodMonth = usePeriodEndMonth
            ? new Date(baseDate).getDate()
            : safeDueDay;
        result.setDate(Math.min(safeDueDay, maxDayInPeriodMonth, lastDay));
        return result;
    }
    getEthiopianMonthLength(year, month) {
        if (month >= 1 && month <= 12)
            return 30;
        return year % 4 === 3 ? 6 : 5;
    }
    normalizeFeeBreakdownType(feeType) {
        return String(feeType || '')
            .trim()
            .toUpperCase()
            .replace(/_INSTALLMENT_\d+$/i, '')
            .replace(/_ANNUAL$/i, '');
    }
    formatFeeTypeLabel(feeType) {
        return this.normalizeFeeBreakdownType(feeType)
            .split('_')
            .filter(Boolean)
            .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
            .join(' ');
    }
    getMonthOffsetBetweenDates(from, to, calendarType) {
        if (String(calendarType).toUpperCase() === 'ETHIOPIAN') {
            const fromEth = (0, date_util_1.toEthiopianDate)(from);
            const toEth = (0, date_util_1.toEthiopianDate)(to);
            return (toEth.year - fromEth.year) * 13 + (toEth.month - fromEth.month);
        }
        return ((to.getFullYear() - from.getFullYear()) * 12 +
            (to.getMonth() - from.getMonth()));
    }
    getInstallmentRangeForTerm(academicYearStartDate, term, installmentCount, calendarType = 'ETHIOPIAN') {
        if (!academicYearStartDate ||
            !term?.startDate ||
            installmentCount <= 1 ||
            Number.isNaN(academicYearStartDate.getTime()) ||
            Number.isNaN(term.startDate.getTime())) {
            return null;
        }
        const start = Math.max(1, Math.min(installmentCount, this.getMonthOffsetBetweenDates(academicYearStartDate, term.startDate, calendarType) + 1));
        const end = term.endDate && !Number.isNaN(term.endDate.getTime())
            ? Math.max(start, Math.min(installmentCount, this.getMonthOffsetBetweenDates(academicYearStartDate, term.endDate, calendarType) + 1))
            : start;
        return { start, end };
    }
    getInstallmentRangeForSelectedTerm(params) {
        if (!params.selectedTerm || params.terms.length === 0)
            return null;
        if (params.config.billingMode === 'YEARLY')
            return null;
        const indexes = [];
        for (let i = 0; i < params.config.billingPeriodsPerYear; i += 1) {
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
            where: {
                academicYearId,
                ...(schoolId ? { academicYear: { schoolId } } : {}),
            },
            orderBy: { order: 'asc' },
        });
    }
    async assertAcademicYearInSchool(schoolId, academicYearId) {
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { id: academicYearId, schoolId },
            select: { id: true, name: true, curriculumType: true },
        });
        if (!academicYear) {
            throw new Error('Academic year not found for this school');
        }
        return academicYear;
    }
    getCurriculumPeriodDisplayName(curriculumType) {
        const normalized = String(curriculumType || '')
            .trim()
            .toUpperCase();
        if (normalized === 'QUARTER')
            return 'Quarter';
        if (normalized === 'SEMESTER')
            return 'Semester';
        return 'Academic period';
    }
    async assertTermInSchool(schoolId, termId) {
        if (!termId || termId === 'all')
            return null;
        const term = await this.prisma.term.findFirst({
            where: { id: termId, academicYear: { schoolId } },
            select: {
                id: true,
                name: true,
                order: true,
                academicYearId: true,
                startDate: true,
                endDate: true,
            },
        });
        if (!term) {
            throw new Error('Term not found for this school');
        }
        return term;
    }
    async notifyParentsForStartingCurriculumPeriods() {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        const startingTerms = await this.prisma.term.findMany({
            where: {
                startDate: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                academicYear: {
                    select: {
                        id: true,
                        schoolId: true,
                        name: true,
                    },
                },
            },
        });
        for (const term of startingTerms) {
            try {
                await this.notifyParentsForTermFeeDue(term);
            }
            catch (error) {
                this.logger.error(`Failed to send fee reminders for ${term.name}: ${error?.message || error}`);
            }
        }
    }
    async notifyFinanceForUpcomingPayrollPayments() {
        for (const daysBefore of [5, 2]) {
            const targetStart = new Date();
            targetStart.setDate(targetStart.getDate() + daysBefore);
            targetStart.setHours(0, 0, 0, 0);
            const targetEnd = new Date(targetStart);
            targetEnd.setHours(23, 59, 59, 999);
            const payrollRuns = await this.prisma.payrollRun.findMany({
                where: {
                    status: { notIn: ['PAID', 'CANCELLED'] },
                    paymentDate: {
                        gte: targetStart,
                        lte: targetEnd,
                    },
                },
                select: {
                    id: true,
                    schoolId: true,
                    title: true,
                    periodMonth: true,
                    periodYear: true,
                    periodCalendarType: true,
                    paymentDate: true,
                    netAmount: true,
                },
            });
            for (const run of payrollRuns) {
                try {
                    await this.notifyFinanceForPayrollRunDue(run, daysBefore);
                }
                catch (error) {
                    this.logger.error(`Failed to send payroll reminder for ${run.title}: ${error?.message || error}`);
                }
            }
        }
    }
    async notifyFinanceToCreateCurrentPayrollRun() {
        const schools = await this.prisma.school.findMany({
            where: {
                isActive: true,
                payrollSalaries: { some: { isActive: true } },
            },
            select: { id: true, name: true },
        });
        for (const school of schools) {
            try {
                const calendarType = await this.getSchoolCalendarType(school.id);
                const period = this.getCurrentPayrollPeriod(calendarType);
                const existingRun = await this.prisma.payrollRun.findFirst({
                    where: {
                        schoolId: school.id,
                        periodCalendarType: calendarType,
                        periodMonth: period.month,
                        periodYear: period.year,
                        status: { not: 'CANCELLED' },
                    },
                    select: { id: true },
                });
                if (existingRun)
                    continue;
                await this.notifyFinanceForMissingPayrollRun(school, period.month, period.year, calendarType);
            }
            catch (error) {
                this.logger.error(`Failed to send payroll run creation reminder for ${school.name}: ${error?.message || error}`);
            }
        }
    }
    async getSchoolCalendarType(schoolId) {
        const setting = await this.prisma.schoolSetting.findUnique({
            where: { schoolId_key: { schoolId, key: 'calendar_type' } },
            select: { value: true },
        });
        return setting?.value === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN';
    }
    getCurrentPayrollPeriod(calendarType) {
        const today = new Date();
        if (calendarType === 'ETHIOPIAN') {
            const ethiopian = (0, date_util_1.toEthiopianDate)(today);
            return { month: ethiopian.month, year: ethiopian.year };
        }
        return { month: today.getMonth() + 1, year: today.getFullYear() };
    }
    getPayrollPeriodLabel(month, year, calendarType) {
        if (calendarType === 'ETHIOPIAN') {
            const monthName = date_util_1.ETHIOPIAN_MONTH_NAMES[month - 1] || `Month ${month}`;
            return `${monthName} ${year} E.C.`;
        }
        return new Date(year, month - 1, 1).toLocaleString('en-US', {
            month: 'long',
            year: 'numeric',
        });
    }
    async notifyFinanceForMissingPayrollRun(school, periodMonth, periodYear, calendarType) {
        const financeUsers = await this.prisma.user.findMany({
            where: {
                schoolId: school.id,
                role: role_enum_1.Role.FINANCE,
                isActive: true,
                deletedAt: null,
            },
            select: { id: true },
        });
        if (financeUsers.length === 0)
            return;
        const periodLabel = this.getPayrollPeriodLabel(periodMonth, periodYear, calendarType);
        const title = `Create ${periodLabel} payroll run`;
        const message = `No payroll run has been created for ${periodLabel}. Create the monthly run so salaries can be reviewed, approved, and paid.`;
        const metadata = {
            periodMonth,
            periodYear,
            periodCalendarType: calendarType,
            reminder: 'create-payroll-run',
        };
        for (const financeUser of financeUsers) {
            const existing = await this.prisma.notification.findFirst({
                where: {
                    schoolId: school.id,
                    userId: financeUser.id,
                    type: notification_service_1.NotificationType.PAYROLL_RUN_REQUIRED,
                    metadata: {
                        contains: `"periodCalendarType":"${calendarType}"`,
                    },
                    AND: [
                        { metadata: { contains: `"periodMonth":${periodMonth}` } },
                        { metadata: { contains: `"periodYear":${periodYear}` } },
                        { metadata: { contains: `"reminder":"create-payroll-run"` } },
                    ],
                },
                select: { id: true },
            });
            if (existing)
                continue;
            await this.notificationService.createNotification({
                schoolId: school.id,
                userId: financeUser.id,
                title,
                message,
                type: notification_service_1.NotificationType.PAYROLL_RUN_REQUIRED,
                actionUrl: '/finance/payroll',
                metadata,
            });
        }
    }
    async notifyFinanceForPayrollRunDue(run, daysBefore) {
        const financeUsers = await this.prisma.user.findMany({
            where: {
                schoolId: run.schoolId,
                role: role_enum_1.Role.FINANCE,
                isActive: true,
                deletedAt: null,
            },
            select: { id: true },
        });
        if (financeUsers.length === 0)
            return;
        const schoolCalendarType = await this.getSchoolCalendarType(run.schoolId);
        const calendarType = run.periodCalendarType === 'ETHIOPIAN' ||
            run.periodCalendarType === 'GREGORIAN'
            ? run.periodCalendarType
            : schoolCalendarType;
        const periodLabel = this.getPayrollPeriodLabel(run.periodMonth, run.periodYear, calendarType);
        const paymentDateLabel = run.paymentDate
            ? (0, date_util_1.formatSchoolDate)(run.paymentDate, { calendarType })
            : 'the scheduled payment date';
        const amount = new Intl.NumberFormat('en-ET', {
            style: 'currency',
            currency: 'ETB',
            maximumFractionDigits: 0,
        }).format(run.netAmount);
        const title = `${periodLabel} payroll payment due in ${daysBefore} days`;
        const message = `${periodLabel} payroll is scheduled for payment on ${paymentDateLabel}. Net payroll: ${amount}.`;
        const metadata = {
            payrollRunId: run.id,
            daysBefore,
            paymentDate: run.paymentDate?.toISOString() || null,
            periodMonth: run.periodMonth,
            periodYear: run.periodYear,
            periodCalendarType: calendarType,
        };
        for (const financeUser of financeUsers) {
            const existing = await this.prisma.notification.findFirst({
                where: {
                    schoolId: run.schoolId,
                    userId: financeUser.id,
                    type: notification_service_1.NotificationType.PAYROLL_PAYMENT_DUE,
                    metadata: { contains: `"payrollRunId":"${run.id}"` },
                    AND: [{ metadata: { contains: `"daysBefore":${daysBefore}` } }],
                },
                select: { id: true },
            });
            if (existing)
                continue;
            await this.notificationService.createNotification({
                schoolId: run.schoolId,
                userId: financeUser.id,
                title,
                message,
                type: notification_service_1.NotificationType.PAYROLL_PAYMENT_DUE,
                actionUrl: '/finance/payroll',
                metadata,
            });
        }
    }
    async sendPeriodFeeReminders(schoolId, termId) {
        const term = await this.prisma.term.findFirst({
            where: { id: termId, academicYear: { schoolId } },
            include: {
                academicYear: {
                    select: {
                        id: true,
                        schoolId: true,
                        name: true,
                    },
                },
            },
        });
        if (!term) {
            throw new Error('Selected curriculum period was not found for this school');
        }
        const sent = await this.notifyParentsForTermFeeDue(term, true);
        return { sent, termName: term.name };
    }
    async notifyParentsForTermFeeDue(term, force = false) {
        const schoolId = term.academicYear.schoolId;
        const config = await this.getBillingConfig(schoolId, term.academicYearId);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        let sent = 0;
        const fees = await this.prisma.studentFee.findMany({
            where: {
                schoolId,
                academicYearId: term.academicYearId,
                OR: [{ termId: term.id }, { termId: null }],
            },
            include: {
                payments: true,
                feeStructure: { select: { feeType: true } },
                student: { select: { id: true, name: true } },
            },
        });
        for (const fee of fees) {
            const expectedForPeriod = fee.termId
                ? fee.finalAmount
                : Math.round((fee.finalAmount / Math.max(config.billingPeriodsPerYear, 1)) * 100) / 100;
            const paidForPeriod = fee.termId
                ? fee.payments.reduce((sum, payment) => sum + payment.amountPaid, 0)
                : fee.payments
                    .filter((payment) => payment.termId === term.id)
                    .reduce((sum, payment) => sum + payment.amountPaid, 0);
            const balance = Math.max(0, expectedForPeriod - paidForPeriod);
            if (balance <= 0)
                continue;
            const studentProfile = await this.prisma.studentProfile.findFirst({
                where: {
                    schoolId,
                    OR: [{ id: fee.studentId }, { userId: fee.studentId }],
                },
                select: {
                    id: true,
                    user: { select: { name: true } },
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
            });
            const parentUserIds = [
                ...new Set((studentProfile?.parents || [])
                    .map((link) => link.parent.userId)
                    .filter((value) => Boolean(value))),
            ];
            for (const parentUserId of parentUserIds) {
                const alreadyNotified = await this.prisma.notification.findFirst({
                    where: {
                        schoolId,
                        userId: parentUserId,
                        type: notification_service_1.NotificationType.FEE_DUE,
                        createdAt: { gte: startOfToday },
                        metadata: {
                            contains: `"termId":"${term.id}"`,
                        },
                    },
                    select: { id: true },
                });
                if (!force && alreadyNotified)
                    continue;
                await this.notificationService.createNotification({
                    schoolId,
                    userId: parentUserId,
                    title: `${term.name} fee payment due`,
                    message: `Please pay ${this.formatBirr(balance)} for ${studentProfile?.user?.name || fee.student?.name || 'your child'} for ${term.name}.`,
                    type: notification_service_1.NotificationType.FEE_DUE,
                    actionUrl: '/parent/fees',
                    metadata: {
                        termId: term.id,
                        termName: term.name,
                        academicYearId: term.academicYearId,
                        studentId: studentProfile?.id || fee.studentId,
                        feeType: fee.feeStructure.feeType,
                        amountDue: balance,
                    },
                });
                sent += 1;
            }
        }
        return sent;
    }
    formatBirr(amount) {
        return `Birr ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    async calculateInstallmentFees(dto) {
        const config = await this.getBillingConfig(dto.schoolId, dto.academicYearId);
        const terms = config.periods || [];
        const amounts = this.splitAmount(dto.annualAmount, config.billingPeriodsPerYear);
        const installmentAmount = amounts[0] || 0;
        const remainder = Math.round((dto.annualAmount - installmentAmount * amounts.length) * 100) / 100;
        const modeLabels = {
            MONTHLY: 'Monthly',
            QUARTERLY: 'Quarterly',
            SEMESTERLY: 'Semesterly',
            TERMLY: 'Termly',
            YEARLY: 'Full Year',
        };
        return {
            mode: config.billingMode,
            curriculumType: config.curriculumType,
            modeLabel: modeLabels[config.billingMode] || config.billingMode,
            installmentCount: config.billingPeriodsPerYear,
            installmentAmount,
            remainder,
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
        const gradeWhere = dto.grade != null ? { grade: dto.grade } : { grade: null };
        const baseType = dto.feeType || 'TUITION';
        const existingStructures = await this.prisma.feeStructure.findMany({
            where: {
                schoolId: dto.schoolId,
                academicYearId: dto.academicYearId,
                feeType: baseType,
                ...gradeWhere,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (existingStructures.length === 0 && !dto.annualAmount) {
            return {
                created: 0,
                message: 'No base fee structure found. Create an annual fee structure first or provide annualAmount.',
            };
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
                        schoolId: dto.schoolId,
                        academicYearId: dto.academicYearId,
                        feeType: `${installmentFeePrefix}${i + 1}`,
                        termId: installmentTermId || null,
                        ...gradeWhere,
                    },
                    orderBy: { updatedAt: 'desc' },
                });
                if (!existingInstallment) {
                    const createdInstallment = await tx.feeStructure.create({
                        data: {
                            schoolId: dto.schoolId,
                            academicYearId: dto.academicYearId,
                            termId: installmentTermId || null,
                            feeType: `${installmentFeePrefix}${i + 1}`,
                            amount: amounts[i],
                            grade: dto.grade ?? null,
                            description: dto.description ||
                                `${displayFeeType} installment for ${periodName}`,
                            isActive: true,
                        },
                    });
                    expectedInstallmentIds.push(createdInstallment.id);
                    created++;
                }
                else {
                    const updatedInstallment = await tx.feeStructure.update({
                        where: { id: existingInstallment.id },
                        data: {
                            termId: installmentTermId || null,
                            amount: amounts[i],
                            description: dto.description ||
                                `${displayFeeType} installment for ${periodName}`,
                            isActive: true,
                        },
                    });
                    expectedInstallmentIds.push(updatedInstallment.id);
                }
            }
            await tx.feeStructure.updateMany({
                where: {
                    schoolId: dto.schoolId,
                    academicYearId: dto.academicYearId,
                    feeType: { startsWith: installmentFeePrefix },
                    ...gradeWhere,
                    id: { notIn: expectedInstallmentIds },
                },
                data: { isActive: false },
            });
        });
        return {
            created,
            message: created > 0
                ? `Generated ${created} installment fee structures`
                : `Installment fee structures updated for ${config.billingMode}`,
            breakdown: amounts.map((amount, index) => ({
                installment: index + 1,
                amount,
            })),
        };
    }
    async getFeeCollectionMode(schoolId) {
        const config = await this.getBillingConfig(schoolId);
        return config.billingMode;
    }
    getPayrollStaffRoles() {
        return [
            role_enum_1.Role.ADMIN,
            role_enum_1.Role.IT_MANAGER,
            role_enum_1.Role.REGISTRAR,
            role_enum_1.Role.TEACHER,
            role_enum_1.Role.FINANCE,
        ];
    }
    getPayrollRunTitle(month, year, calendarType = 'GREGORIAN') {
        if (calendarType === 'ETHIOPIAN') {
            const monthName = date_util_1.ETHIOPIAN_MONTH_NAMES[month - 1] || `Month ${month}`;
            return `${monthName} ${year} E.C. Payroll`;
        }
        return `${new Date(year, month - 1, 1).toLocaleString('en-US', {
            month: 'long',
        })} ${year} Payroll`;
    }
    calculatePayrollTotals(row) {
        const baseSalary = Number(row.baseSalary || 0);
        const allowances = Number(row.allowances || 0);
        const deductions = Number(row.deductions || 0);
        const bonus = Number(row.bonus || 0);
        const tax = Number(row.tax || 0);
        const grossPay = baseSalary + allowances + bonus;
        const netPay = Math.max(0, grossPay - deductions - tax);
        return {
            grossPay: Math.round(grossPay * 100) / 100,
            deductionsAmount: Math.round((deductions + tax) * 100) / 100,
            netPay: Math.round(netPay * 100) / 100,
        };
    }
    async refreshPayrollRunTotals(tx, runId) {
        const entries = await tx.payrollEntry.findMany({
            where: { runId },
            select: {
                grossPay: true,
                deductions: true,
                tax: true,
                netPay: true,
                status: true,
            },
        });
        const payableEntries = entries.filter((entry) => entry.status !== 'HELD');
        const totals = payableEntries.reduce((sum, entry) => ({
            grossAmount: sum.grossAmount + Number(entry.grossPay || 0),
            deductionsAmount: sum.deductionsAmount +
                Number(entry.deductions || 0) +
                Number(entry.tax || 0),
            netAmount: sum.netAmount + Number(entry.netPay || 0),
        }), { grossAmount: 0, deductionsAmount: 0, netAmount: 0 });
        return tx.payrollRun.update({
            where: { id: runId },
            data: {
                grossAmount: Math.round(totals.grossAmount * 100) / 100,
                deductionsAmount: Math.round(totals.deductionsAmount * 100) / 100,
                netAmount: Math.round(totals.netAmount * 100) / 100,
                entryCount: payableEntries.length,
            },
        });
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
};
exports.FinanceService = FinanceService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_8AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceService.prototype, "notifyParentsForStartingCurriculumPeriods", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_8AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceService.prototype, "notifyFinanceForUpcomingPayrollPayments", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_8AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceService.prototype, "notifyFinanceToCreateCurrentPayrollRun", null);
exports.FinanceService = FinanceService = FinanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        event_bus_service_1.EventBusService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map