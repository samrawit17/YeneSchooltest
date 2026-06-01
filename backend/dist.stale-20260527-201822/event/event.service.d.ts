import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { NotificationService } from '../notification/notification.service';
export declare class EventService {
    private prisma;
    private notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    private parseAudience;
    private serializeAudience;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    })[]>;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
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
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    }>;
    delete(id: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date | null;
        title: string;
        category: string | null;
        description: string | null;
        color: string | null;
        createdById: string;
        location: string | null;
        audience: string | null;
    }>;
    getUpcomingCount(schoolId: string, userRole?: string): Promise<number>;
    getActiveCount(schoolId: string, userRole?: string): Promise<number>;
}
