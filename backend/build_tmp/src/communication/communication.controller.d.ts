import { CommunicationService } from './communication.service';
import { CreateCommunicationDto, CreateCommunicationReplyDto, UpdateCommunicationStatusDto, CommunicationQueryDto } from './dto/create-communication.dto';
export declare class CommunicationController {
    private readonly communicationService;
    constructor(communicationService: CommunicationService);
    createCommunication(req: any, dto: CreateCommunicationDto): Promise<{
        class: {
            id: string;
            name: string;
            section: string;
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        subject: string;
        message: string;
        studentId: string;
        classId: string | null;
        status: import("@prisma/client").$Enums.CommunicationStatus;
        category: import("@prisma/client").$Enums.CommunicationCategory;
        createdById: string;
    }>;
    getCommunications(req: any, query: CommunicationQueryDto): Promise<{
        data: ({
            _count: {
                replies: number;
            };
            class: {
                id: string;
                name: string;
                section: string;
            } | null;
            student: {
                id: string;
                name: string;
                studentProfile: {
                    section: string | null;
                    className: string | null;
                } | null;
            };
            createdBy: {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
            };
            replies: {
                id: string;
                createdAt: Date;
                message: string;
                sender: {
                    id: string;
                    name: string;
                    role: import("@prisma/client").$Enums.Role;
                };
            }[];
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            subject: string;
            message: string;
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
    getCommunicationById(req: any, id: string, academicYearId?: string): Promise<{
        class: {
            id: string;
            name: string;
            section: string;
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
            id: string;
            createdAt: Date;
            message: string;
            sender: {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.Role;
                avatarUrl: string | null;
            };
        }[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        subject: string;
        message: string;
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        subject: string;
        message: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        senderId: string;
        communicationId: string;
    }>;
    deleteReply(req: any, replyId: string): Promise<{
        message: string;
    }>;
}
