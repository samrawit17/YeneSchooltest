import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';
import { NotificationService } from '../notification/notification.service';
export declare class AnnouncementService {
    private prisma;
    private notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    private parseSettingValue;
    private ensureAnnouncementsEnabled;
    private createNotificationForAnnouncement;
    create(data: CreateAnnouncementDto, userId: string, schoolId: string): Promise<{
        school: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        visibleTo: string | null;
        priority: string | null;
        attachments: string | null;
    }>;
    findAll(schoolId: string, userRole?: string, userId?: string): Promise<{
        visibleTo: string[];
        school: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        priority: string | null;
        attachments: string | null;
    }[]>;
    findOne(id: string, schoolId: string): Promise<{
        visibleTo: string[];
        school: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        priority: string | null;
        attachments: string | null;
    }>;
    update(id: string, data: UpdateAnnouncementDto, userId: string, schoolId: string): Promise<{
        school: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        visibleTo: string | null;
        priority: string | null;
        attachments: string | null;
    }>;
    delete(id: string, schoolId: string): Promise<{
        content: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        createdById: string;
        visibleTo: string | null;
        priority: string | null;
        attachments: string | null;
    }>;
    getActiveCount(schoolId: string, userRole?: string): Promise<number>;
}
