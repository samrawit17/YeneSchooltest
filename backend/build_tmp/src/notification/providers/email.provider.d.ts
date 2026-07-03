import { PrismaService } from '../../prisma/prisma.service';
import { INotificationChannel, NotificationPayload, BulkNotificationPayload, SendResult } from './notification-provider.interface';
import { ProviderConfigService } from './provider-config.service';
export declare class EmailNotificationProvider implements INotificationChannel {
    private readonly configService;
    private readonly prisma;
    readonly channelName = "email";
    private readonly logger;
    private transportCache;
    constructor(configService: ProviderConfigService, prisma: PrismaService);
    canHandle(_type: string): boolean;
    send(payload: NotificationPayload): Promise<SendResult>;
    sendBulk(payload: BulkNotificationPayload): Promise<SendResult>;
    private getTransport;
    private toHtml;
    private esc;
}
