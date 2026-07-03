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
exports.EventService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const role_enum_1 = require("../auth/types/role.enum");
const notification_service_1 = require("../notification/notification.service");
const date_util_1 = require("../common/date.util");
let EventService = class EventService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    parseAudience(audience) {
        if (!audience)
            return [];
        try {
            const parsed = JSON.parse(audience);
            return Array.isArray(parsed)
                ? parsed.filter((item) => typeof item === 'string')
                : [];
        }
        catch {
            return audience
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }
    serializeAudience(audience) {
        return audience?.length ? JSON.stringify(audience) : null;
    }
    resolveDateRange(from, to) {
        const now = new Date();
        const defaultFrom = new Date(now);
        defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);
        defaultFrom.setHours(0, 0, 0, 0);
        const defaultTo = new Date(now);
        defaultTo.setFullYear(defaultTo.getFullYear() + 2);
        defaultTo.setHours(23, 59, 59, 999);
        const parsedFrom = from ? new Date(from) : defaultFrom;
        const parsedTo = to ? new Date(to) : defaultTo;
        const rangeFrom = Number.isNaN(parsedFrom.getTime())
            ? defaultFrom
            : parsedFrom;
        const rangeTo = Number.isNaN(parsedTo.getTime()) ? defaultTo : parsedTo;
        if (rangeFrom > rangeTo) {
            return { from: rangeTo, to: rangeFrom };
        }
        return { from: rangeFrom, to: rangeTo };
    }
    getDateOverlapWhere(from, to) {
        return {
            OR: [
                { startDate: { gte: from, lte: to } },
                { endDate: { gte: from, lte: to } },
                {
                    AND: [{ startDate: { lte: from } }, { endDate: { gte: to } }],
                },
            ],
        };
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
    formatFeeDeadlineMonth(date, calendarType) {
        if (calendarType === 'ETHIOPIAN') {
            const ethiopianDate = (0, date_util_1.toEthiopianDate)(date);
            return date_util_1.ETHIOPIAN_MONTH_NAMES[ethiopianDate.month - 1] || 'Monthly';
        }
        return date.toLocaleDateString('en-US', { month: 'long' });
    }
    getTermLabel(term, fallbackPrefix) {
        if (!term)
            return null;
        return term.name?.trim() || `${fallbackPrefix} ${term.order}`;
    }
    getFeeDeadlinePeriodLabel(dueDate, context) {
        const matchingTerm = context.terms.find((term) => term.startDate <= dueDate && term.endDate >= dueDate);
        if (context.billingMode === 'MONTHLY') {
            return this.formatFeeDeadlineMonth(dueDate, context.calendarType);
        }
        if (context.billingMode === 'QUARTERLY') {
            return (this.getTermLabel(matchingTerm, 'Quarter') ||
                this.formatFeeDeadlineMonth(dueDate, context.calendarType));
        }
        if (context.billingMode === 'SEMESTERLY') {
            return (this.getTermLabel(matchingTerm, 'Semester') ||
                this.formatFeeDeadlineMonth(dueDate, context.calendarType));
        }
        if (context.billingMode === 'YEARLY') {
            return 'Annual';
        }
        return (this.getTermLabel(matchingTerm, 'Term') ||
            this.formatFeeDeadlineMonth(dueDate, context.calendarType));
    }
    getFeeDeadlineTitle(dueDate, context) {
        return `${this.getFeeDeadlinePeriodLabel(dueDate, context)} fee`;
    }
    async getFeeDeadlineLabelContext(schoolId, from, to) {
        const [settings, terms] = await Promise.all([
            this.prisma.schoolSetting.findMany({
                where: {
                    schoolId,
                    key: { in: ['fee_structure_mode', 'curriculum_type', 'calendar_type'] },
                },
                select: { key: true, value: true },
            }),
            this.prisma.term.findMany({
                where: {
                    academicYear: { schoolId },
                    OR: [
                        { startDate: { gte: from, lte: to } },
                        { endDate: { gte: from, lte: to } },
                        {
                            AND: [{ startDate: { lte: from } }, { endDate: { gte: to } }],
                        },
                    ],
                },
                select: { name: true, order: true, startDate: true, endDate: true },
                orderBy: [{ academicYear: { startDate: 'asc' } }, { order: 'asc' }],
            }),
        ]);
        const settingValue = (key) => settings.find((setting) => setting.key === key)?.value;
        return {
            billingMode: this.normalizeBillingMode(settingValue('fee_structure_mode') || settingValue('curriculum_type')),
            calendarType: String(settingValue('calendar_type') || '').toUpperCase() ===
                'GREGORIAN'
                ? 'GREGORIAN'
                : 'ETHIOPIAN',
            terms,
        };
    }
    audienceAllowsRole(audience, userRole) {
        if (!audience || audience.length === 0)
            return true;
        if (!userRole)
            return true;
        const normalizedUserRole = userRole.toUpperCase();
        return audience.some((role) => role.toUpperCase() === normalizedUserRole);
    }
    mapStoredEvent(event) {
        return {
            id: event.id,
            title: event.title,
            description: event.description,
            location: event.location,
            startDate: event.startDate,
            endDate: event.endDate,
            audience: this.parseAudience(event.audience),
            category: event.category || 'OTHER',
            color: event.color,
            createdById: event.createdById,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            source: 'EVENT',
            eventType: 'SCHOOL_EVENT',
        };
    }
    async create(data, userId, schoolId) {
        const event = await this.prisma.schoolEvent.create({
            data: {
                title: data.title,
                description: data.description,
                location: data.location,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                audience: this.serializeAudience(data.audience),
                category: data.category || 'OTHER',
                color: data.color,
                createdById: userId,
                schoolId,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        await this.createNotificationForEvent(schoolId, event.title, event.description || '', userId);
        return event;
    }
    async createNotificationForEvent(schoolId, title, description, createdById) {
        const users = await this.prisma.user.findMany({
            where: { schoolId },
            select: { id: true },
        });
        const recipientIds = users
            .filter((user) => user.id !== createdById)
            .map((user) => user.id);
        if (recipientIds.length > 0) {
            await this.notificationService.createBulkNotifications({
                schoolId,
                userIds: recipientIds,
                type: notification_service_1.NotificationType.EVENT,
                title: `New Event: ${title}`,
                message: description
                    ? description.substring(0, 200)
                    : 'New event scheduled',
            });
        }
    }
    async findAll(schoolId, userRole) {
        const now = new Date();
        const whereClause = {
            schoolId,
            OR: [
                {
                    endDate: null,
                },
                {
                    endDate: {
                        gte: now,
                    },
                },
            ],
            startDate: {
                gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            },
        };
        const events = await this.prisma.schoolEvent.findMany({
            where: whereClause,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { startDate: 'asc' },
        });
        if (userRole) {
            return events.filter((event) => {
                const audience = this.parseAudience(event.audience);
                if (!audience || audience.length === 0) {
                    return true;
                }
                return audience.some((role) => userRole.toLowerCase().includes(role.toLowerCase()));
            });
        }
        return events;
    }
    async findCalendarFeed(schoolId, user, params) {
        const { from, to } = this.resolveDateRange(params?.from, params?.to);
        const role = String(user.role || '').toUpperCase();
        const [storedEvents, terms, feeDeadlines] = await Promise.all([
            this.prisma.schoolEvent.findMany({
                where: {
                    schoolId,
                    ...this.getDateOverlapWhere(from, to),
                },
                orderBy: { startDate: 'asc' },
            }),
            this.prisma.term.findMany({
                where: {
                    academicYear: { schoolId },
                    OR: [
                        { startDate: { gte: from, lte: to } },
                        { endDate: { gte: from, lte: to } },
                        {
                            AND: [
                                { startDate: { lte: from } },
                                { endDate: { gte: to } },
                            ],
                        },
                    ],
                },
                include: {
                    academicYear: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: [{ academicYear: { startDate: 'asc' } }, { order: 'asc' }],
            }),
            this.getFeeDeadlineItems(schoolId, user, from, to),
        ]);
        const eventItems = storedEvents
            .map((event) => this.mapStoredEvent(event))
            .filter((event) => this.audienceAllowsRole(event.audience, role));
        const termItems = terms.map((term) => ({
            id: `term:${term.id}`,
            title: `${term.name} - ${term.academicYear.name}`,
            description: 'Academic period dates.',
            location: null,
            startDate: term.startDate,
            endDate: term.endDate,
            audience: ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'TEACHER', 'STUDENT', 'PARENT'],
            category: 'ACADEMIC',
            color: '#0891b2',
            createdById: null,
            createdAt: term.createdAt,
            updatedAt: term.updatedAt,
            source: 'TERM',
            eventType: 'ACADEMIC_TERM',
        }));
        return [...eventItems, ...termItems, ...feeDeadlines]
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }
    async getFeeDeadlineItems(schoolId, user, from, to) {
        const role = String(user.role || '').toUpperCase();
        const baseWhere = {
            schoolId,
            deletedAt: null,
            dueDate: { gte: from, lte: to },
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        };
        if (role === role_enum_1.Role.STUDENT) {
            baseWhere.studentId = user.id;
            return this.getPersonalFeeDeadlineItems(baseWhere, schoolId, from, to);
        }
        if (role === role_enum_1.Role.PARENT) {
            const parentProfile = await this.prisma.parentProfile.findFirst({
                where: { schoolId, userId: user.id },
                include: {
                    children: {
                        include: {
                            student: { select: { userId: true } },
                        },
                    },
                },
            });
            const studentUserIds = parentProfile?.children
                .map((link) => link.student?.userId)
                .filter((value) => Boolean(value)) || [];
            if (studentUserIds.length === 0)
                return [];
            baseWhere.studentId = { in: studentUserIds };
            return this.getPersonalFeeDeadlineItems(baseWhere, schoolId, from, to);
        }
        if (![role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR, role_enum_1.Role.FINANCE].includes(role)) {
            return [];
        }
        const fees = await this.prisma.studentFee.findMany({
            where: baseWhere,
            select: {
                id: true,
                dueDate: true,
                finalAmount: true,
            },
            orderBy: { dueDate: 'asc' },
            take: 1000,
        });
        const grouped = new Map();
        fees.forEach((fee) => {
            if (!fee.dueDate)
                return;
            const key = fee.dueDate.toISOString().slice(0, 10);
            const existing = grouped.get(key) ||
                { dueDate: fee.dueDate, count: 0, amount: 0 };
            existing.count += 1;
            existing.amount += Number(fee.finalAmount || 0);
            grouped.set(key, existing);
        });
        const labelContext = await this.getFeeDeadlineLabelContext(schoolId, from, to);
        return Array.from(grouped.entries()).map(([key, item]) => {
            const title = this.getFeeDeadlineTitle(item.dueDate, labelContext);
            return {
                id: `fee-deadline:${key}`,
                title,
                description: `${title} due.`,
                location: null,
                startDate: item.dueDate,
                endDate: item.dueDate,
                audience: ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'FINANCE'],
                category: 'OTHER',
                color: '#ca8a04',
                createdById: null,
                createdAt: item.dueDate,
                updatedAt: item.dueDate,
                source: 'FEE_DEADLINE',
                eventType: 'FEE_DEADLINE',
            };
        });
    }
    async getPersonalFeeDeadlineItems(where, schoolId, from, to) {
        const fees = await this.prisma.studentFee.findMany({
            where,
            include: {
                student: { select: { id: true, name: true } },
            },
            orderBy: { dueDate: 'asc' },
            take: 100,
        });
        const labelContext = await this.getFeeDeadlineLabelContext(schoolId, from, to);
        return fees
            .filter((fee) => fee.dueDate)
            .map((fee) => {
            const title = this.getFeeDeadlineTitle(fee.dueDate, labelContext);
            return {
                id: `fee-deadline:${fee.id}`,
                title,
                description: `${title} due.`,
                location: null,
                startDate: fee.dueDate,
                endDate: fee.dueDate,
                audience: ['STUDENT', 'PARENT'],
                category: 'OTHER',
                color: '#ca8a04',
                createdById: null,
                createdAt: fee.createdAt,
                updatedAt: fee.updatedAt,
                source: 'FEE_DEADLINE',
                eventType: 'FEE_DEADLINE',
            };
        });
    }
    async findOne(id, schoolId) {
        const event = await this.prisma.schoolEvent.findFirst({
            where: { id, schoolId },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!event) {
            throw new localization_1.LocalizedException('event.event_not_found_a3bf16d4', undefined, common_1.HttpStatus.NOT_FOUND, 'Event not found');
        }
        return event;
    }
    async update(id, data, schoolId) {
        const existing = await this.prisma.schoolEvent.findFirst({
            where: { id, schoolId },
        });
        if (!existing) {
            throw new localization_1.LocalizedException('event.event_not_found_a3bf16d4', undefined, common_1.HttpStatus.NOT_FOUND, 'Event not found');
        }
        return this.prisma.schoolEvent.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.description !== undefined && {
                    description: data.description,
                }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.startDate && { startDate: new Date(data.startDate) }),
                ...(data.endDate !== undefined && {
                    endDate: data.endDate ? new Date(data.endDate) : null,
                }),
                ...(data.audience !== undefined && {
                    audience: this.serializeAudience(data.audience),
                }),
                ...(data.category && { category: data.category }),
                ...(data.color !== undefined && { color: data.color }),
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    async delete(id, schoolId) {
        const existing = await this.prisma.schoolEvent.findFirst({
            where: { id, schoolId },
        });
        if (!existing) {
            throw new localization_1.LocalizedException('event.event_not_found_a3bf16d4', undefined, common_1.HttpStatus.NOT_FOUND, 'Event not found');
        }
        return this.prisma.schoolEvent.delete({
            where: { id },
        });
    }
    async getUpcomingCount(schoolId, userRole) {
        const events = await this.findAll(schoolId, userRole);
        return events.length;
    }
    async getActiveCount(schoolId, userRole) {
        const now = new Date();
        const whereClause = {
            schoolId,
            OR: [
                {
                    endDate: null,
                },
                {
                    endDate: {
                        gte: now,
                    },
                },
            ],
            startDate: {
                lte: now,
            },
        };
        const events = await this.prisma.schoolEvent.findMany({
            where: whereClause,
            select: { id: true },
        });
        if (userRole && events.length > 0) {
            const fullEvents = await this.prisma.schoolEvent.findMany({
                where: { id: { in: events.map((e) => e.id) } },
            });
            return fullEvents.filter((event) => {
                const audience = this.parseAudience(event.audience);
                if (!audience || audience.length === 0) {
                    return true;
                }
                return audience.some((role) => userRole.toLowerCase().includes(role.toLowerCase()));
            }).length;
        }
        return events.length;
    }
};
exports.EventService = EventService;
exports.EventService = EventService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], EventService);
//# sourceMappingURL=event.service.js.map