import { PrismaService } from '../../prisma/prisma.service';
import { PushNotificationProvider } from './push.provider';
import { INotificationChannel, NotificationPayload, BulkNotificationPayload, SendResult } from './notification-provider.interface';
export declare class InAppNotificationProvider implements INotificationChannel {
    private readonly prisma;
    private readonly pushProvider;
    readonly channelName = "in-app";
    private readonly logger;
    constructor(prisma: PrismaService, pushProvider: PushNotificationProvider);
    canHandle(_type: string): boolean;
    send(payload: NotificationPayload): Promise<SendResult>;
    sendBulk(payload: BulkNotificationPayload): Promise<SendResult>;
    createInApp(data: NotificationPayload): Promise<{
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
    }>;
    private serialize;
}
