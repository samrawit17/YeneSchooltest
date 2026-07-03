import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateCommunicationDto, CreateCommunicationReplyDto, UpdateCommunicationStatusDto, CommunicationQueryDto } from './dto/create-communication.dto';
export declare class CommunicationService {
    private prisma;
    private notificationService;
    private readonly adminRoles;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    private getAcademicYearDateRange;
    createCommunication(schoolId: string, createdById: string, creatorRole: string, dto: CreateCommunicationDto): Promise<{
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
    getCommunications(schoolId: string, userId: string, userRole: string, query: CommunicationQueryDto): Promise<{
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
    getUnreadCount(schoolId: string, userId: string, userRole: string): Promise<{
        count: number;
    }>;
    getMyCommunicationsCount(schoolId: string, userId: string, userRole: string, status?: string): Promise<{
        count: number;
    }>;
    getCommunicationById(schoolId: string, userId: string, userRole: string, communicationId: string, academicYearId?: string): Promise<{
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        senderId: string;
        communicationId: string;
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
