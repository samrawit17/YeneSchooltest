import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Role } from '../auth/types/role.enum';

const STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.IT_MANAGER,
  Role.REGISTRAR,
  Role.TEACHER,
  Role.FINANCE,
];

@Injectable()
export class MessagingService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private ensureSchoolId(schoolId?: string): string {
    if (!schoolId) {
      throw new ForbiddenException('School context is required');
    }
    return schoolId;
  }

  async createConversation(
    user: { id: string; schoolId?: string },
    dto: CreateConversationDto,
  ) {
    const schoolId = this.ensureSchoolId(user.schoolId);

    const participantIds = Array.from(
      new Set([...(dto.participants || []), user.id]),
    );
    const subject = dto.subject?.trim() || undefined;

    if (participantIds.length < 2) {
      throw new BadRequestException(
        'At least one other participant is required',
      );
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: participantIds }, schoolId },
      select: { id: true, role: true },
    });

    if (users.length !== participantIds.length) {
      throw new NotFoundException(
        'One or more participants were not found in this school',
      );
    }

    const nonStaff = users.filter((u) => !STAFF_ROLES.includes(u.role as Role));
    if (nonStaff.length > 0) {
      throw new ForbiddenException(
        'Messaging is only allowed between staff users',
      );
    }

    if (!subject && participantIds.length === 2) {
      const [firstUserId, secondUserId] = participantIds;
      const existingDirectConversation =
        await this.prisma.conversation.findFirst({
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

  async listConversations(user: { id: string; schoolId?: string }) {
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

  async listStaff(user: { id: string; schoolId?: string }, search?: string) {
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

  async getConversationMessages(
    user: { id: string; schoolId?: string },
    conversationId: string,
  ) {
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
      throw new NotFoundException('Conversation not found');
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

  async sendMessage(
    user: { id: string; schoolId?: string; name?: string },
    conversationId: string,
    dto: SendMessageDto,
  ) {
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
      throw new NotFoundException('Conversation not found');
    }

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('Message content is required');
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

  async markMessageRead(
    user: { id: string; schoolId?: string },
    messageId: string,
  ) {
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
      throw new NotFoundException('Message not found');
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
}
