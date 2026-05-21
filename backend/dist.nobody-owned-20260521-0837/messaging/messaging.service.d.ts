import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class MessagingService {
    private prisma;
    private notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    private ensureSchoolId;
    createConversation(user: {
        id: string;
        schoolId?: string;
    }, dto: CreateConversationDto): Promise<{
        participants: ({
            user: {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            userId: string;
            joinedAt: Date;
            conversationId: string;
        })[];
    } & {
        subject: string | null;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listConversations(user: {
        id: string;
        schoolId?: string;
    }): Promise<{
        conversationId: string;
        subject: string | null;
        participants: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            avatarUrl: string | null;
        }[];
        lastMessage: {
            id: string;
            content: string;
            createdAt: Date;
            sender: {
                id: string;
                name: string;
            };
        } | null;
        unreadCount: number;
        updatedAt: Date;
    }[]>;
    listStaff(user: {
        id: string;
        schoolId?: string;
    }, search?: string): Promise<{
        id: string;
        name: string;
        email: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatarUrl: string | null;
    }[]>;
    getConversationMessages(user: {
        id: string;
        schoolId?: string;
    }, conversationId: string): Promise<{
        id: string;
        content: string;
        createdAt: Date;
        sender: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            avatarUrl: string | null;
        };
        readAt: Date | null;
    }[]>;
    sendMessage(user: {
        id: string;
        schoolId?: string;
        name?: string;
    }, conversationId: string, dto: SendMessageDto): Promise<{
        id: string;
        conversationId: string;
        content: string;
        createdAt: Date;
        sender: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            avatarUrl: string | null;
        };
    }>;
    markMessageRead(user: {
        id: string;
        schoolId?: string;
    }, messageId: string): Promise<{
        messageId: string;
        userId: string;
        readAt: Date | null;
        conversationId: string;
    }>;
}
