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
            throw new common_1.BadRequestException('Announcements are disabled for this school. Enable Announcements in school settings before creating or updating announcements.');
        }
    }
    async createNotificationForAnnouncement(schoolId, title, message, createdById, visibleTo) {
        const normalizedAudience = (visibleTo || [])
            .map((role) => role.trim().toLowerCase())
            .filter(Boolean);
        const audienceRoleMap = {
            student: ['STUDENT'],
            parent: ['PARENT'],
            teacher: ['TEACHER'],
            staff: ['TEACHER'],
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
        const announcement = await this.prisma.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                visibleTo,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                priority: data.priority || 'MEDIUM',
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
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        const transformed = announcements.map((a) => ({
            ...a,
            visibleTo: a.visibleTo ? a.visibleTo.split(',').map((r) => r.trim()) : [],
        }));
        if (userRole) {
            return transformed.filter((announcement) => {
                if (userId && announcement.createdById === userId) {
                    return true;
                }
                const visibleTo = announcement.visibleTo;
                if (!visibleTo || visibleTo.length === 0) {
                    return true;
                }
                return visibleTo.some((role) => userRole.toLowerCase().includes(role.toLowerCase()));
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
            },
        });
        if (!announcement) {
            throw new common_1.NotFoundException('Announcement not found');
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
            throw new common_1.NotFoundException('Announcement not found');
        }
        const visibleTo = data.visibleTo !== undefined
            ? data.visibleTo.length > 0
                ? data.visibleTo.join(',')
                : null
            : undefined;
        return this.prisma.announcement.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.content && { content: data.content }),
                ...(visibleTo !== undefined && { visibleTo }),
                ...(data.startDate && { startDate: new Date(data.startDate) }),
                ...(data.endDate !== undefined && {
                    endDate: data.endDate ? new Date(data.endDate) : null,
                }),
                ...(data.priority && { priority: data.priority }),
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
        const existing = await this.prisma.announcement.findFirst({
            where: { id, schoolId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Announcement not found');
        }
        return this.prisma.announcement.delete({
            where: { id },
        });
    }
    async getActiveCount(schoolId, userRole) {
        const announcements = await this.findAll(schoolId, userRole);
        return announcements.length;
    }
};
exports.AnnouncementService = AnnouncementService;
exports.AnnouncementService = AnnouncementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], AnnouncementService);
//# sourceMappingURL=announcement.service.js.map