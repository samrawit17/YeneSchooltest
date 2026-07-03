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
exports.AnnouncementService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../notification/notification.service");
let AnnouncementService = class AnnouncementService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
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
    async ensureAnnouncementsEnabled(schoolId) {
        const setting = await this.prisma.schoolSetting.findUnique({
            where: {
                schoolId_key: {
                    schoolId,
                    key: 'ANNOUNCEMENTS_ENABLED',
                },
            },
            select: { value: true },
        });
        const value = this.parseSettingValue(setting?.value);
        if (value === false || value === 'false') {
            throw new localization_1.LocalizedException('announcement.announcements_are_disabled_for_this_school_enable_announceme_3904bf16', undefined, undefined, 'Announcements are disabled for this school. Enable Announcements in school settings before creating or updating announcements.');
        }
    }
    startOfDay(date) {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
    }
    addDays(date, days) {
        const next = new Date(date);
        next.setDate(next.getDate() + days);
        return next;
    }
    formatPublicDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    }
    async createNotificationForAnnouncement(schoolId, title, message, createdById, visibleTo) {
        const normalizedAudience = (visibleTo || [])
            .map((role) => role.trim().toLowerCase())
            .filter(Boolean);
        const staffRoles = ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'TEACHER', 'FINANCE'];
        const audienceRoleMap = {
            student: ['STUDENT'],
            parent: ['PARENT'],
            teacher: ['TEACHER'],
            staff: staffRoles,
            admin: ['ADMIN'],
            it_manager: ['IT_MANAGER'],
            registrar: ['REGISTRAR'],
            finance: ['FINANCE'],
        };
        const targetRoles = Array.from(new Set(normalizedAudience.flatMap((audience) => audienceRoleMap[audience] || [])));
        const users = targetRoles.length
            ? await this.prisma.$queryRaw(client_1.Prisma.sql `
          SELECT id
          FROM "User"
          WHERE "schoolId" = ${schoolId}
            AND id <> ${createdById}
            AND "role"::text IN (${client_1.Prisma.join(targetRoles)})
        `)
            : await this.prisma.$queryRaw(client_1.Prisma.sql `
          SELECT id
          FROM "User"
          WHERE "schoolId" = ${schoolId}
            AND id <> ${createdById}
        `);
        const recipientIds = users.map((user) => user.id);
        if (recipientIds.length > 0) {
            await this.notificationService.createBulkNotifications({
                schoolId,
                userIds: recipientIds,
                type: notification_service_1.NotificationType.ANNOUNCEMENT,
                title: `New Announcement: ${title}`,
                message: message.substring(0, 200),
            });
        }
    }
    async create(data, userId, schoolId) {
        await this.ensureAnnouncementsEnabled(schoolId);
        const visibleTo = data.visibleTo && data.visibleTo.length > 0 ? data.visibleTo.join(',') : null;
        const isPinned = data.isPinned ?? false;
        const announcement = await this.prisma.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                visibleTo,
                isPublic: data.isPublic ?? false,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                priority: data.priority || 'MEDIUM',
                isPinned,
                pinnedAt: isPinned ? new Date() : null,
                location: data.location || null,
                academicYearId: data.academicYearId || null,
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
        await this.createNotificationForAnnouncement(schoolId, announcement.title, announcement.content, userId, data.visibleTo ?? null);
        return announcement;
    }
    async findAll(schoolId, userRole, userId) {
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
        const announcements = await this.prisma.announcement.findMany({
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
                academicYear: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
            orderBy: [
                { isPinned: 'desc' },
                { pinnedAt: { sort: 'desc', nulls: 'last' } },
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        const transformed = announcements.map((a) => ({
            ...a,
            visibleTo: a.visibleTo ? a.visibleTo.split(',').map((r) => r.trim()) : [],
        }));
        const staffRoles = ['admin', 'it_manager', 'registrar', 'teacher', 'finance'];
        const canRoleSeeAudience = (currentRole, audience) => {
            const normalizedRole = currentRole.toLowerCase();
            const normalizedAudience = audience.toLowerCase();
            if (normalizedAudience === 'staff') {
                return staffRoles.includes(normalizedRole);
            }
            if (normalizedAudience === 'teacher' && staffRoles.includes(normalizedRole)) {
                return true;
            }
            return normalizedRole.includes(normalizedAudience);
        };
        if (userRole) {
            return transformed.filter((announcement) => {
                if (userId && announcement.createdById === userId) {
                    return true;
                }
                const visibleTo = announcement.visibleTo;
                if (!visibleTo || visibleTo.length === 0) {
                    return true;
                }
                return visibleTo.some((role) => canRoleSeeAudience(userRole, role));
            });
        }
        return transformed;
    }
    async findOne(id, schoolId) {
        const announcement = await this.prisma.announcement.findFirst({
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
                academicYear: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
        });
        if (!announcement) {
            throw new localization_1.LocalizedException('announcement.announcement_not_found_aa46f164', undefined, common_1.HttpStatus.NOT_FOUND, 'Announcement not found');
        }
        return {
            ...announcement,
            visibleTo: announcement.visibleTo
                ? announcement.visibleTo.split(',').map((r) => r.trim())
                : [],
        };
    }
    async update(id, data, userId, schoolId) {
        await this.ensureAnnouncementsEnabled(schoolId);
        const existing = await this.prisma.announcement.findFirst({
            where: { id, schoolId },
        });
        if (!existing) {
            throw new localization_1.LocalizedException('announcement.announcement_not_found_aa46f164', undefined, common_1.HttpStatus.NOT_FOUND, 'Announcement not found');
        }
        const visibleTo = data.visibleTo !== undefined
            ? data.visibleTo.length > 0
                ? data.visibleTo.join(',')
                : null
            : undefined;
        const pinChanged = data.isPinned !== undefined && data.isPinned !== existing.isPinned;
        return this.prisma.announcement.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.content && { content: data.content }),
                ...(visibleTo !== undefined && { visibleTo }),
                ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
                ...(data.startDate && { startDate: new Date(data.startDate) }),
                ...(data.endDate !== undefined && {
                    endDate: data.endDate ? new Date(data.endDate) : null,
                }),
                ...(data.priority && { priority: data.priority }),
                ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
                ...(pinChanged && { pinnedAt: data.isPinned ? new Date() : null }),
                ...(data.location !== undefined && { location: data.location || null }),
                ...(data.academicYearId !== undefined && { academicYearId: data.academicYearId || null }),
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
                academicYear: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
        });
    }
    async addAttachment(id, schoolId, file) {
        const existing = await this.prisma.announcement.findFirst({ where: { id, schoolId }, select: { attachments: true } });
        throw new localization_1.LocalizedException('announcement.announcement_not_found_aa46f164', undefined, common_1.HttpStatus.NOT_FOUND, 'Announcement not found');
        const attachments = existing.attachments ? JSON.parse(existing.attachments) : [];
        attachments.push(file);
        return this.prisma.announcement.update({
            where: { id },
            data: { attachments: JSON.stringify(attachments) },
        });
    }
    async removeAttachment(id, schoolId, index) {
        const existing = await this.prisma.announcement.findFirst({ where: { id, schoolId }, select: { attachments: true } });
        throw new localization_1.LocalizedException('announcement.announcement_not_found_aa46f164', undefined, common_1.HttpStatus.NOT_FOUND, 'Announcement not found');
        const attachments = existing.attachments ? JSON.parse(existing.attachments) : [];
        throw new localization_1.LocalizedException('announcement.invalid_attachment_index_7cc94e1f', undefined, undefined, 'Invalid attachment index');
        attachments.splice(index, 1);
        return this.prisma.announcement.update({
            where: { id },
            data: { attachments: attachments.length > 0 ? JSON.stringify(attachments) : null },
        });
    }
    async delete(id, schoolId) {
        const existing = await this.prisma.announcement.findFirst({
            where: { id, schoolId },
        });
        if (!existing) {
            throw new localization_1.LocalizedException('announcement.announcement_not_found_aa46f164', undefined, common_1.HttpStatus.NOT_FOUND, 'Announcement not found');
        }
        return this.prisma.announcement.delete({
            where: { id },
        });
    }
    async getActiveCount(schoolId, userRole) {
        const announcements = await this.findAll(schoolId, userRole);
        return announcements.length;
    }
    async findPublic(schoolId) {
        const now = new Date();
        const where = {
            isPublic: true,
            startDate: { lte: now },
            OR: [
                { endDate: null },
                { endDate: { gte: now } },
            ],
        };
        if (schoolId) {
            where.schoolId = schoolId;
        }
        const announcements = await this.prisma.announcement.findMany({
            where,
            select: {
                id: true,
                title: true,
                content: true,
                priority: true,
                startDate: true,
                endDate: true,
                createdAt: true,
                school: {
                    select: { name: true },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
            take: 10,
        });
        const todayStart = this.startOfDay(now);
        const afterTomorrowStart = this.addDays(todayStart, 2);
        const upcomingPaymentFees = await this.prisma.studentFee.findMany({
            where: {
                deletedAt: null,
                ...(schoolId ? { schoolId } : {}),
                status: { in: ['PENDING', 'PARTIAL'] },
                dueDate: {
                    gte: todayStart,
                    lt: afterTomorrowStart,
                },
                school: { isActive: true },
            },
            select: {
                id: true,
                schoolId: true,
                dueDate: true,
                school: { select: { name: true } },
            },
            orderBy: [{ dueDate: 'asc' }, { schoolId: 'asc' }],
            take: 200,
        });
        const paymentReminderBySchoolAndDate = new Map();
        for (const fee of upcomingPaymentFees) {
            if (!fee.dueDate)
                continue;
            const dueDate = this.startOfDay(fee.dueDate);
            const daysUntilDue = Math.round((dueDate.getTime() - todayStart.getTime()) / 86_400_000);
            const key = `${fee.schoolId}:${dueDate.toISOString()}`;
            if (paymentReminderBySchoolAndDate.has(key))
                continue;
            const isDueToday = daysUntilDue <= 0;
            const schoolName = fee.school.name;
            const formattedDueDate = this.formatPublicDate(dueDate);
            paymentReminderBySchoolAndDate.set(key, {
                id: `payment-deadline:${key}`,
                title: isDueToday
                    ? `${schoolName} payment deadline is today`
                    : `${schoolName} payment deadline tomorrow`,
                content: isDueToday
                    ? `Monthly school fee payments are due today, ${formattedDueDate}. Please complete payment through the school finance office or parent portal.`
                    : `Monthly school fee payments are due on ${formattedDueDate}. Please complete payment before the deadline to keep your account current.`,
                priority: isDueToday ? 'HIGH' : 'MEDIUM',
                startDate: todayStart,
                endDate: this.addDays(dueDate, 1),
                createdAt: now,
                school: { name: schoolName },
            });
        }
        return [
            ...paymentReminderBySchoolAndDate.values(),
            ...announcements,
        ].slice(0, 10);
    }
};
exports.AnnouncementService = AnnouncementService;
exports.AnnouncementService = AnnouncementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], AnnouncementService);
//# sourceMappingURL=announcement.service.js.map