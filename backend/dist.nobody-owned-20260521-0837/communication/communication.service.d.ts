import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateCommunicationDto, CreateCommunicationReplyDto, UpdateCommunicationStatusDto, CommunicationQueryDto } from './dto/create-communication.dto';
export declare class CommunicationService {
    private prisma;
    private notificationService;
    private readonly adminRoles;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    createCommunication(schoolId: string, createdById: string, creatorRole: string, dto: CreateCommunicationDto): Promise<{
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
    getCommunications(schoolId: string, userId: string, userRole: string, query: CommunicationQueryDto): Promise<{
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
    getUnreadCount(schoolId: string, userId: string, userRole: string): Promise<{
        count: number;
    }>;
    getMyCommunicationsCount(schoolId: string, userId: string, userRole: string, status?: string): Promise<{
        count: number;
    }>;
    getCommunicationById(schoolId: string, userId: string, userRole: string, communicationId: string): Promise<{
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
    updateStatus(schoolId: string, userId: string, userRole: string, communicationId: string, dto: UpdateCommunicationStatusDto): Promise<{
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
    deleteCommunication(schoolId: string, userId: string, userRole: string, communicationId: string): Promise<{
        message: string;
    }>;
    addReply(schoolId: string, userId: string, userRole: string, communicationId: string, dto: CreateCommunicationReplyDto): Promise<{
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
    deleteReply(schoolId: string, userId: string, userRole: string, replyId: string): Promise<{
        message: string;
    }>;
    private getBaseRbacWhereClause;
    private verifyAccess;
    private previewText;
    private isTeacherLinkedToParentChildren;
    private getTeacherAccessibleStudentIds;
    private getTeacherIncomingWhereClause;
    private safeNotify;
}
