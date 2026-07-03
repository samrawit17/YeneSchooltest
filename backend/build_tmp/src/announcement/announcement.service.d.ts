import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';
import { NotificationService } from '../notification/notification.service';
export declare class AnnouncementService {
    private prisma;
    private notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    private parseSettingValue;
    private ensureAnnouncementsEnabled;
    private startOfDay;
    private addDays;
    private formatPublicDate;
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }>;
    findAll(schoolId: string, userRole?: string, userId?: string): Promise<{
        visibleTo: string[];
        school: {
            id: string;
            name: string;
        };
        academicYear: {
            id: string;
            name: string;
            isActive: boolean;
        } | null;
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }[]>;
    findOne(id: string, schoolId: string): Promise<{
        visibleTo: string[];
        school: {
            id: string;
            name: string;
        };
        academicYear: {
            id: string;
            name: string;
            isActive: boolean;
        } | null;
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }>;
    update(id: string, data: UpdateAnnouncementDto, userId: string, schoolId: string): Promise<{
        school: {
            id: string;
            name: string;
        };
        academicYear: {
            id: string;
            name: string;
            isActive: boolean;
        } | null;
        createdBy: {
            id: string;
            name: string;
            email: string | null;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }>;
    addAttachment(id: string, schoolId: string, file: {
        name: string;
        url: string;
        mimeType: string;
        size: number;
    }): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }>;
    removeAttachment(id: string, schoolId: string, index: number): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }>;
    delete(id: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        academicYearId: string | null;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
        attachments: string | null;
        createdById: string;
        visibleTo: string | null;
        isPublic: boolean;
        location: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
    }>;
    getActiveCount(schoolId: string, userRole?: string): Promise<number>;
    findPublic(schoolId?: string): Promise<{
        id: string;
        createdAt: Date;
        school: {
            name: string;
        };
        content: string;
        startDate: Date;
        endDate: Date | null;
        priority: string | null;
        title: string;
    }[]>;
}
