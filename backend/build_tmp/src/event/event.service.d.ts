import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { Role } from '../auth/types/role.enum';
import { NotificationService } from '../notification/notification.service';
type CalendarFeedItem = {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startDate: Date;
    endDate: Date | null;
    audience: string[] | null;
    category: 'ACADEMIC' | 'SPORTS' | 'CULTURAL' | 'HOLIDAY' | 'OTHER';
    color: string | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
    source: 'EVENT' | 'TERM' | 'FEE_DEADLINE';
    eventType: 'SCHOOL_EVENT' | 'ACADEMIC_TERM' | 'FEE_DEADLINE';
};
export declare class EventService {
    private prisma;
    private notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    private parseAudience;
    private serializeAudience;
    private resolveDateRange;
    private getDateOverlapWhere;
    private normalizeBillingMode;
    private formatFeeDeadlineMonth;
    private getTermLabel;
    private getFeeDeadlinePeriodLabel;
    private getFeeDeadlineTitle;
    private getFeeDeadlineLabelContext;
    private audienceAllowsRole;
    private mapStoredEvent;
    create(data: CreateEventDto, userId: string, schoolId: string): Promise<{
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
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    }>;
    private createNotificationForEvent;
    findAll(schoolId: string, userRole?: string): Promise<({
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
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    })[]>;
    findCalendarFeed(schoolId: string, user: {
        id: string;
        role: Role | string;
    }, params?: {
        from?: string;
        to?: string;
    }): Promise<CalendarFeedItem[]>;
    private getFeeDeadlineItems;
    private getPersonalFeeDeadlineItems;
    findOne(id: string, schoolId: string): Promise<{
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
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    }>;
    update(id: string, data: UpdateEventDto, schoolId: string): Promise<{
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
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    }>;
    delete(id: string, schoolId: string): Promise<{
        id: string;
        description: string | null;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    }>;
    getUpcomingCount(schoolId: string, userRole?: string): Promise<number>;
    getActiveCount(schoolId: string, userRole?: string): Promise<number>;
}
export {};
