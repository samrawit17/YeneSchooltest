import { PrismaService } from '../../prisma/prisma.service';
import { InAppNotificationProvider } from './in-app.provider';
import { PushNotificationProvider } from './push.provider';
import { EmailNotificationProvider } from './email.provider';
import { SMSNotificationProvider } from './sms.provider';
import { INotificationChannel, NotificationPayload, BulkNotificationPayload, SendResult, NotificationChannelType } from './notification-provider.interface';
export declare class NotificationChannelRouter {
    private readonly prisma;
    private readonly inAppProvider;
    private readonly pushProvider;
    private readonly emailProvider;
    private readonly smsProvider;
    private readonly logger;
    constructor(prisma: PrismaService, inAppProvider: InAppNotificationProvider, pushProvider: PushNotificationProvider, emailProvider: EmailNotificationProvider, smsProvider: SMSNotificationProvider);
    getChannel(channel: NotificationChannelType): INotificationChannel;
    route(payload: NotificationPayload, channels: NotificationChannelType[], bypassPreferences?: boolean): Promise<SendResult[]>;
    routeBulk(payload: BulkNotificationPayload, channels: NotificationChannelType[], bypassPreferences?: boolean): Promise<{
        channel: NotificationChannelType;
        result: SendResult;
    }[]>;
    private isChannelAllowedForUser;
    private getChannelAllowedUserIds;
    private getPreferences;
    private getTypePreference;
    private buildDefaults;
}
