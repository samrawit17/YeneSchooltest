import { NotificationService } from './notification.service';
import { RemovePushSubscriptionDto, SavePushSubscriptionDto } from './dto/push-subscription.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
export declare class NotificationController {
    private notificationService;
    constructor(notificationService: NotificationService);
    getNotifications(req: any, unreadOnly?: string, limit?: string, type?: string, types?: string, category?: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    }[]>;
    getCategories(req: any): Promise<{
        categories: Record<string, {
            total: number;
            unread: number;
        }>;
    }>;
    getUnreadCount(req: any, types?: string): Promise<{
        count: number;
    }>;
    getPreferences(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        emailEnabled: boolean;
        smsEnabled: boolean;
        pushEnabled: boolean;
        commBookEnabled: boolean;
        timetableEnabled: boolean;
        attendanceEnabled: boolean;
        announcementsEnabled: boolean;
        assignmentsEnabled: boolean;
        examsEnabled: boolean;
        feesEnabled: boolean;
        eventsEnabled: boolean;
    } | null>;
    updatePreferences(req: any, body: UpdateNotificationPreferencesDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        emailEnabled: boolean;
        smsEnabled: boolean;
        pushEnabled: boolean;
        commBookEnabled: boolean;
        timetableEnabled: boolean;
        attendanceEnabled: boolean;
        announcementsEnabled: boolean;
        assignmentsEnabled: boolean;
        examsEnabled: boolean;
        feesEnabled: boolean;
        eventsEnabled: boolean;
    } | null>;
    getPushPublicKey(): Promise<{
        enabled: boolean;
        publicKey: string | null;
    }>;
    savePushSubscription(req: any, body: SavePushSubscriptionDto): Promise<any>;
    removePushSubscription(req: any, body: RemovePushSubscriptionDto): Promise<{
        success: boolean;
    }>;
    markAsRead(id: string, req: any): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | null>;
    markAllAsRead(req: any, body?: {
        types?: string[];
    }): Promise<{
        success: boolean;
    }>;
}
