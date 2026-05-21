import { NotificationService } from './notification.service';
import { RemovePushSubscriptionDto, SavePushSubscriptionDto } from './dto/push-subscription.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
export declare class NotificationController {
    private notificationService;
    constructor(notificationService: NotificationService);
    getNotifications(req: any, unreadOnly?: string, limit?: string, type?: string, types?: string, category?: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }[]>;
    getCategories(req: any): Promise<{
        categories: {
            all: {
                total: number;
                unread: number;
            };
            attendance: {
                total: number;
                unread: number;
            };
            enrollment: {
                total: number;
                unread: number;
            };
            academic: {
                total: number;
                unread: number;
            };
            schedule: {
                total: number;
                unread: number;
            };
            communication: {
                total: number;
                unread: number;
            };
            event: {
                total: number;
                unread: number;
            };
            finance: {
                total: number;
                unread: number;
            };
            system: {
                total: number;
                unread: number;
            };
        };
    }>;
    getUnreadCount(req: any, types?: string): Promise<{
        count: number;
    }>;
    getPreferences(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        commBookEnabled: boolean;
        timetableEnabled: boolean;
        attendanceEnabled: boolean;
        announcementsEnabled: boolean;
        assignmentsEnabled: boolean;
        examsEnabled: boolean;
        feesEnabled: boolean;
        eventsEnabled: boolean;
        emailEnabled: boolean;
        smsEnabled: boolean;
        pushEnabled: boolean;
    }>;
    updatePreferences(req: any, body: UpdateNotificationPreferencesDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        commBookEnabled: boolean;
        timetableEnabled: boolean;
        attendanceEnabled: boolean;
        announcementsEnabled: boolean;
        assignmentsEnabled: boolean;
        examsEnabled: boolean;
        feesEnabled: boolean;
        eventsEnabled: boolean;
        emailEnabled: boolean;
        smsEnabled: boolean;
        pushEnabled: boolean;
    }>;
    getPushPublicKey(): Promise<{
        enabled: boolean;
        publicKey: string | null;
    }>;
    savePushSubscription(req: any, body: SavePushSubscriptionDto): Promise<{
        id: string;
        endpoint: string;
    }>;
    removePushSubscription(req: any, body: RemovePushSubscriptionDto): Promise<{
        success: boolean;
    }>;
    markAsRead(id: string, req: any): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    } | null>;
    markAllAsRead(req: any, body?: {
        types?: string[];
    }): Promise<{
        success: boolean;
    }>;
}
