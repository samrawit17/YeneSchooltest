import { CommunicationService } from './communication.service';
import { CreateCommunicationDto, CreateCommunicationReplyDto, UpdateCommunicationStatusDto, CommunicationQueryDto } from './dto/create-communication.dto';
export declare class CommunicationController {
    private readonly communicationService;
    constructor(communicationService: CommunicationService);
    createCommunication(req: any, dto: CreateCommunicationDto): Promise<{
        class: {
            section: string;
            id: string;
            name: string;
        } | null;
        student: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        subject: string;
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        classId: string | null;
        status: import("@prisma/client").$Enums.CommunicationStatus;
        category: import("@prisma/client").$Enums.CommunicationCategory;
        createdById: string;
    }>;
    getCommunications(req: any, query: CommunicationQueryDto): Promise<{
        data: ({
            class: {
                section: string;
                id: string;
                name: string;
            } | null;
            _count: {
                replies: number;
            };
            student: {
                studentProfile: {
                    section: string | null;
                    className: string | null;
                } | null;
                id: string;
                name: string;
            };
            createdBy: {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
            };
            replies: {
                message: string;
                id: string;
                createdAt: Date;
                sender: {
                    id: string;
                    name: string;
                    role: import("@prisma/client").$Enums.Role;
                };
            }[];
        } & {
            subject: string;
            message: string;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            classId: string | null;
            status: import("@prisma/client").$Enums.CommunicationStatus;
            category: import("@prisma/client").$Enums.CommunicationCategory;
            createdById: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getUnreadCount(req: any): Promise<{
        count: number;
    }>;
    getMyCount(req: any, status?: string): Promise<{
        count: number;
    }>;
    getCommunicationById(req: any, id: string): Promise<{
        class: {
            section: string;
            id: string;
            name: string;
        } | null;
        student: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
        };
        replies: {
            message: string;
            id: string;
            createdAt: Date;
            sender: {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
                avatarUrl: string | null;
            };
        }[];
    } & {
        subject: string;
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        classId: string | null;
        status: import("@prisma/client").$Enums.CommunicationStatus;
        category: import("@prisma/client").$Enums.CommunicationCategory;
        createdById: string;
    }>;
    updateStatus(req: any, id: string, dto: UpdateCommunicationStatusDto): Promise<{
        student: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        subject: string;
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        classId: string | null;
        status: import("@prisma/client").$Enums.CommunicationStatus;
        category: import("@prisma/client").$Enums.CommunicationCategory;
        createdById: string;
    }>;
    deleteCommunication(req: any, id: string): Promise<{
        message: string;
    }>;
    addReply(req: any, id: string, dto: CreateCommunicationReplyDto): Promise<{
        sender: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            avatarUrl: string | null;
        };
    } & {
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        communicationId: string;
        senderId: string;
    }>;
    deleteReply(req: any, replyId: string): Promise<{
        message: string;
    }>;
}
