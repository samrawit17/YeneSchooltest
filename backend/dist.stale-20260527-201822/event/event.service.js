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
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
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
            throw new common_1.NotFoundException('Event not found');
        }
        return event;
    }
    async update(id, data, schoolId) {
        const existing = await this.prisma.schoolEvent.findFirst({
            where: { id, schoolId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Event not found');
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
            throw new common_1.NotFoundException('Event not found');
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