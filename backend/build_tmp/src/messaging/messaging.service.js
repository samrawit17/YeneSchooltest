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
const localization_1 = require("../core/localization");
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
            throw new localization_1.LocalizedException('messaging.school_context_is_required_92ef57a6', undefined, common_1.HttpStatus.FORBIDDEN, 'School context is required');
        }
        return schoolId;
    }
    async getAcademicYearDateRange(schoolId, academicYearId) {
        if (!academicYearId) {
            return null;
        }
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { id: academicYearId, schoolId },
            select: { startDate: true, endDate: true },
        });
        if (!academicYear) {
            throw new localization_1.LocalizedException('messaging.academic_year_not_found_561c725b', undefined, common_1.HttpStatus.NOT_FOUND, 'Academic year not found');
        }
        return {
            gte: academicYear.startDate,
            lte: academicYear.endDate,
        };
    }
    async createConversation(user, dto) {
        const schoolId = this.ensureSchoolId(user.schoolId);
        const participantIds = Array.from(new Set([...(dto.participants || []), user.id]));
        const subject = dto.subject?.trim() || undefined;
        if (participantIds.length < 2) {
            throw new localization_1.LocalizedException('messaging.at_least_one_other_participant_is_required_a4d90ddb', undefined, undefined, 'At least one other participant is required');
        }
        const users = await this.prisma.user.findMany({
            where: { id: { in: participantIds }, schoolId },
            select: { id: true, role: true },
        });
        if (users.length !== participantIds.length) {
            throw new localization_1.LocalizedException('messaging.one_or_more_participants_were_not_found_in_this_school_3fcd6390', undefined, common_1.HttpStatus.NOT_FOUND, 'One or more participants were not found in this school');
        }
        const nonStaff = users.filter((u) => !STAFF_ROLES.includes(u.role));
        if (nonStaff.length > 0) {
            throw new localization_1.LocalizedException('messaging.messaging_is_only_allowed_between_staff_users_fa85d89d', undefined, common_1.HttpStatus.FORBIDDEN, 'Messaging is only allowed between staff users');
        }
        if (!subject && participantIds.length === 2) {
            const [firstUserId, secondUserId] = participantIds;
            const existingDirectConversation = await this.prisma.conversation.findFirst({
                where: {
                    schoolId,
                    participants: {
                        every: { userId: { in: participantIds } },
                        some: { userId: firstUserId },
                    },
                    AND: [
                        {
                            participants: {
                                some: { userId: secondUserId },
                            },
                        },
                    ],
                },
                include: {
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    role: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                    },
                },
            });
            if (existingDirectConversation) {
                return existingDirectConversation;
            }
        }
        const conversation = await this.prisma.conversation.create({
            data: {
                schoolId,
                subject,
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
    async listConversations(user, academicYearId) {
        const schoolId = this.ensureSchoolId(user.schoolId);
        const academicYearDateRange = await this.getAcademicYearDateRange(schoolId, academicYearId);
        const conversations = await this.prisma.conversation.findMany({
            where: {
                schoolId,
                participants: { some: { userId: user.id } },
                ...(academicYearDateRange
                    ? {
                        OR: [
                            { createdAt: academicYearDateRange },
                            { messages: { some: { createdAt: academicYearDateRange } } },
                        ],
                    }
                    : {}),
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
                    where: academicYearDateRange
                        ? { createdAt: academicYearDateRange }
                        : undefined,
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
                                ...(academicYearDateRange
                                    ? { createdAt: academicYearDateRange }
                                    : {}),
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
    async getConversationMessages(user, conversationId, academicYearId) {
        const schoolId = this.ensureSchoolId(user.schoolId);
        const academicYearDateRange = await this.getAcademicYearDateRange(schoolId, academicYearId);
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                id: conversationId,
                schoolId,
                participants: { some: { userId: user.id } },
            },
            select: { id: true },
        });
        if (!conversation) {
            throw new localization_1.LocalizedException('messaging.conversation_not_found_ec3b7531', undefined, common_1.HttpStatus.NOT_FOUND, 'Conversation not found');
        }
        const messages = await this.prisma.message.findMany({
            where: {
                conversationId,
                ...(academicYearDateRange ? { createdAt: academicYearDateRange } : {}),
            },
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
            throw new localization_1.LocalizedException('messaging.conversation_not_found_ec3b7531', undefined, common_1.HttpStatus.NOT_FOUND, 'Conversation not found');
        }
        const content = dto.content.trim();
        if (!content) {
            throw new localization_1.LocalizedException('messaging.message_content_is_required_ad89fbab', undefined, undefined, 'Message content is required');
        }
        const [message] = await this.prisma.$transaction([
            this.prisma.message.create({
                data: {
                    conversationId,
                    senderId: user.id,
                    content,
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
            throw new localization_1.LocalizedException('messaging.message_not_found_1a5bbe00', undefined, common_1.HttpStatus.NOT_FOUND, 'Message not found');
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