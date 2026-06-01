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
exports.MessagingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
const role_enum_1 = require("../auth/types/role.enum");
const STAFF_ROLES = [
    role_enum_1.Role.ADMIN,
    role_enum_1.Role.IT_MANAGER,
    role_enum_1.Role.REGISTRAR,
    role_enum_1.Role.TEACHER,
    role_enum_1.Role.FINANCE,
];
let MessagingService = class MessagingService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    ensureSchoolId(schoolId) {
        if (!schoolId) {
            throw new common_1.ForbiddenException('School context is required');
        }
        return schoolId;
    }
    async createConversation(user, dto) {
        const schoolId = this.ensureSchoolId(user.schoolId);
        const participantIds = Array.from(new Set([...(dto.participants || []), user.id]));
        const users = await this.prisma.user.findMany({
            where: { id: { in: participantIds }, schoolId },
            select: { id: true, role: true },
        });
        if (users.length !== participantIds.length) {
            throw new common_1.NotFoundException('One or more participants were not found in this school');
        }
        const nonStaff = users.filter((u) => !STAFF_ROLES.includes(u.role));
        if (nonStaff.length > 0) {
            throw new common_1.ForbiddenException('Messaging is only allowed between staff users');
        }
        const conversation = await this.prisma.conversation.create({
            data: {
                schoolId,
                subject: dto.subject,
                participants: {
                    create: participantIds.map((userId) => ({ userId })),
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true, avatarUrl: true },
                        },
                    },
                },
            },
        });
        return conversation;
    }
    async listConversations(user) {
        const schoolId = this.ensureSchoolId(user.schoolId);
        const conversations = await this.prisma.conversation.findMany({
            where: {
                schoolId,
                participants: { some: { userId: user.id } },
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true, avatarUrl: true },
                        },
                    },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        sender: { select: { id: true, name: true } },
                    },
                },
                _count: {
                    select: {
                        messages: {
                            where: {
                                senderId: { not: user.id },
                                reads: { none: { userId: user.id } },
                            },
                        },
                    },
                },
            },
        });
        return conversations.map((c) => {
            const lastMessage = c.messages[0] || null;
            return {
                conversationId: c.id,
                subject: c.subject,
                participants: c.participants.map((p) => p.user),
                lastMessage: lastMessage
                    ? {
                        id: lastMessage.id,
                        content: lastMessage.content,
                        createdAt: lastMessage.createdAt,
                        sender: lastMessage.sender,
                    }
                    : null,
                unreadCount: c._count.messages,
                updatedAt: c.updatedAt,
            };
        });
    }
    async listStaff(user, search) {
        const schoolId = this.ensureSchoolId(user.schoolId);
        return this.prisma.user.findMany({
            where: {
                schoolId,
                id: { not: user.id },
                role: { in: STAFF_ROLES },
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search } },
                            { email: { contains: search } },
                            { username: { contains: search } },
                        ],
                    }
                    : {}),
            },
            select: {
                id: true,
                name: true,
                role: true,
                avatarUrl: true,
                email: true,
            },
            orderBy: { name: 'asc' },
            take: 50,
        });
    }
    async getConversationMessages(user, conversationId) {
        const schoolId = this.ensureSchoolId(user.schoolId);
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                id: conversationId,
                schoolId,
                participants: { some: { userId: user.id } },
            },
            select: { id: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: { id: true, name: true, role: true, avatarUrl: true },
                },
                reads: { where: { userId: user.id }, select: { readAt: true } },
            },
        });
        return messages.map((m) => ({
            id: m.id,
            content: m.content,
            createdAt: m.createdAt,
            sender: m.sender,
            readAt: m.reads[0]?.readAt ?? null,
        }));
    }
    async sendMessage(user, conversationId, dto) {
        const schoolId = this.ensureSchoolId(user.schoolId);
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                id: conversationId,
                schoolId,
                participants: { some: { userId: user.id } },
            },
            select: {
                id: true,
                subject: true,
                participants: { select: { userId: true } },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const [message] = await this.prisma.$transaction([
            this.prisma.message.create({
                data: {
                    conversationId,
                    senderId: user.id,
                    content: dto.content,
                },
                include: {
                    sender: {
                        select: { id: true, name: true, role: true, avatarUrl: true },
                    },
                },
            }),
            this.prisma.conversation.update({
                where: { id: conversationId },
                data: {},
                select: { id: true },
            }),
        ]);
        const recipientIds = conversation.participants
            .map((p) => p.userId)
            .filter((id) => id !== user.id);
        if (recipientIds.length > 0) {
            const senderName = user.name || message.sender.name || 'Someone';
            await this.notificationService.createBulkNotifications({
                schoolId,
                userIds: recipientIds,
                title: 'New message',
                message: conversation.subject
                    ? `${senderName}: ${conversation.subject}`
                    : `${senderName} sent you a message`,
                type: 'MESSAGE_RECEIVED',
                actionUrl: `/messages?conversationId=${conversationId}`,
                metadata: { conversationId, messageId: message.id },
            });
        }
        return {
            id: message.id,
            conversationId: message.conversationId,
            content: message.content,
            createdAt: message.createdAt,
            sender: message.sender,
        };
    }
    async markMessageRead(user, messageId) {
        const schoolId = this.ensureSchoolId(user.schoolId);
        const message = await this.prisma.message.findFirst({
            where: {
                id: messageId,
                conversation: {
                    schoolId,
                    participants: { some: { userId: user.id } },
                },
            },
            select: { id: true, conversationId: true },
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        const read = await this.prisma.messageRead.upsert({
            where: {
                messageId_userId: { messageId, userId: user.id },
            },
            create: { messageId, userId: user.id, readAt: new Date() },
            update: { readAt: new Date() },
        });
        return {
            messageId: read.messageId,
            userId: read.userId,
            readAt: read.readAt,
            conversationId: message.conversationId,
        };
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], MessagingService);
//# sourceMappingURL=messaging.service.js.map