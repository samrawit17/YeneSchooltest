import { PrismaService } from '../../prisma/prisma.service';
import { INotificationChannel, NotificationPayload, BulkNotificationPayload, SendResult } from './notification-provider.interface';
export declare class PushNotificationProvider implements INotificationChannel {
    private readonly prisma;
    readonly channelName = "push";
    private readonly logger;
    constructor(prisma: PrismaService);
    canHandle(_type: string): boolean;
    send(payload: NotificationPayload): Promise<SendResult>;
    sendBulk(payload: BulkNotificationPayload): Promise<SendResult>;
    isConfigured(): boolean;
    getPublicKey(): string | null;
    saveSubscription(data: {
        schoolId: string;
        userId: string;
        subscription: {
            endpoint: string;
            keys?: {
                p256dh?: string;
                auth?: string;
            };
            expirationTime?: number | null;
        };
        userAgent?: string;
    }): Promise<any>;
    removeSubscription(userId: string, endpoint: string): Promise<void>;
    private deliver;
    private configure;
}
