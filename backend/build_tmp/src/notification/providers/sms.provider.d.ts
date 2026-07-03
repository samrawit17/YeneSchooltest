import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { INotificationChannel, NotificationPayload, BulkNotificationPayload, SendResult } from './notification-provider.interface';
import { ProviderConfigService } from './provider-config.service';
export declare class SMSNotificationProvider implements INotificationChannel, OnModuleInit {
    private readonly configService;
    private readonly prisma;
    private readonly eventBus;
    readonly channelName = "sms";
    private readonly logger;
    constructor(configService: ProviderConfigService, prisma: PrismaService, eventBus: EventBusService);
    onModuleInit(): void;
    canHandle(_type: string): boolean;
    send(payload: NotificationPayload): Promise<SendResult>;
    sendBulk(payload: BulkNotificationPayload): Promise<SendResult>;
    private handleSendSms;
    private handleSendBulkSms;
    private sendToProvider;
    private sendTwilio;
    private sendAfricaSTalking;
    private sendTermii;
    private getUserPhone;
    private getUserPhones;
}
