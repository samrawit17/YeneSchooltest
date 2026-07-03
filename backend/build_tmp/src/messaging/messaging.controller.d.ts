import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class MessagingController {
    private readonly messagingService;
    constructor(messagingService: MessagingService);
    listStaff(req: any, search?: string): Promise<{
        id: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        email: string | null;
        avatarUrl: string | null;
    }[]>;
    createConversation(req: any, dto: CreateConversationDto): Promise<{
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        subject: string | null;
    }>;
    listConversations(req: any, academicYearId?: string): Promise<{
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
    getConversationMessages(req: any, conversationId: string, academicYearId?: string): Promise<{
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
    sendMessage(req: any, conversationId: string, dto: SendMessageDto): Promise<{
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
    markRead(req: any, messageId: string): Promise<{
        messageId: string;
        userId: string;
        readAt: Date | null;
        conversationId: string;
    }>;
}
