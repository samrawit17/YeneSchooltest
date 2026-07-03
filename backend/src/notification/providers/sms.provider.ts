import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { QueueName } from '../../infrastructure/queue/queue.constants';
import {
  INotificationChannel,
  NotificationPayload,
  BulkNotificationPayload,
  SendResult,
} from './notification-provider.interface';
import { ProviderConfigService, SMSProviderConfig } from './provider-config.service';

@Injectable()
export class SMSNotificationProvider implements INotificationChannel, OnModuleInit {
  readonly channelName = 'sms';
  private readonly logger = new Logger(SMSNotificationProvider.name);

  constructor(
    private readonly configService: ProviderConfigService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit(): void {
    this.eventBus.on('communication.send-sms', (event) => this.handleSendSms(event));
    this.eventBus.on('communication.send-bulk-sms', (event) => this.handleSendBulkSms(event));
  }

  canHandle(_type: string): boolean {
    return true;
  }

  async send(payload: NotificationPayload): Promise<SendResult> {
    if (!payload.userId) return { success: true, recipientCount: 0 };

    const phone = await this.getUserPhone(payload.userId);
    if (!phone) return { success: true, recipientCount: 0 };

    await this.eventBus.emit(
      'communication.send-sms',
      {
        schoolId: payload.schoolId,
        userId: payload.userId,
        to: phone,
        message: payload.title || payload.message,
        title: payload.title,
      },
      { async: true, queue: QueueName.COMMUNICATION },
    );

    return { success: true, recipientCount: 1 };
  }

  async sendBulk(payload: BulkNotificationPayload): Promise<SendResult> {
    if (payload.userIds.length === 0) return { success: true, recipientCount: 0 };

    const phones = await this.getUserPhones(payload.userIds);
    const valid = phones.filter((p) => p.phone);
    if (valid.length === 0) return { success: true, recipientCount: 0 };

    const messages = valid.map((p) => ({
      userId: p.userId,
      to: p.phone,
    }));

    await this.eventBus.emit(
      'communication.send-bulk-sms',
      {
        schoolId: payload.schoolId,
        userIds: valid.map((p) => p.userId),
        messages,
        title: payload.title,
        message: payload.title || payload.message,
      },
      { async: true, queue: QueueName.COMMUNICATION },
    );

    return { success: true, recipientCount: valid.length };
  }

  private async handleSendSms(
    event: any,
  ): Promise<void> {
    const { schoolId, to, message } = event.payload;
    try {
      const config = await this.configService.getSMSConfig(schoolId);
      if (config.provider === 'dummy') {
        this.logger.debug(`[dummy] SMS to ${to}: ${message}`);
        return;
      }
      await this.sendToProvider(config, to, message);
    } catch (error) {
      this.logger.error(`SMS send failed to ${to}: ${error}`);
    }
  }

  private async handleSendBulkSms(event: any): Promise<void> {
    const { schoolId, messages } = event.payload;
    try {
      const config = await this.configService.getSMSConfig(schoolId);
      if (config.provider === 'dummy') {
        this.logger.debug(`[dummy] Bulk SMS to ${messages.length} recipients`);
        return;
      }
      for (const msg of messages) {
        try {
          await this.sendToProvider(config, msg.to, event.payload.message);
        } catch (error) {
          this.logger.warn(`SMS failed for ${msg.to}: ${error}`);
        }
      }
    } catch (error) {
      this.logger.error(`Bulk SMS failed: ${error}`);
    }
  }

  private async sendToProvider(
    config: SMSProviderConfig,
    to: string,
    text: string,
  ): Promise<void> {
    switch (config.provider) {
      case 'twilio':
        await this.sendTwilio(config, to, text);
        break;
      case 'africastalking':
        await this.sendAfricaSTalking(config, to, text);
        break;
      case 'termii':
        await this.sendTermii(config, to, text);
        break;
      default:
        throw new Error(`Unknown SMS provider: ${config.provider}`);
    }
  }

  private async sendTwilio(config: SMSProviderConfig, to: string, text: string): Promise<void> {
    if (!config.accountSid || !config.authToken) {
      throw new Error('Twilio accountSid and authToken required');
    }
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: config.fromNumber || '',
          Body: text,
        }),
      },
    );
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Twilio error ${resp.status}: ${body}`);
    }
  }

  private async sendAfricaSTalking(config: SMSProviderConfig, to: string, text: string): Promise<void> {
    if (!config.apiKey) {
      throw new Error('AfricaSTalking apiKey required');
    }
    const resp = await fetch(
      'https://api.africastalking.com/version1/messaging',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          apiKey: config.apiKey,
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          username: config.accountSid || 'sandbox',
          to,
          message: text,
          from: config.fromNumber || config.senderId || '',
        }),
      },
    );
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`AfricaSTalking error ${resp.status}: ${body}`);
    }
  }

  private async sendTermii(config: SMSProviderConfig, to: string, text: string): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Termii apiKey required');
    }
    const resp = await fetch('https://api.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.apiKey,
        to,
        from: config.fromNumber || config.senderId || 'School',
        sms: text,
        type: 'plain',
        channel: 'generic',
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Termii error ${resp.status}: ${body}`);
    }
  }

  private async getUserPhone(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    return user?.phone || null;
  }

  private async getUserPhones(userIds: string[]): Promise<Array<{ userId: string; phone: string }>> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, phone: true },
    });
    return users.filter((u) => u.phone).map((u) => ({ userId: u.id, phone: u.phone! }));
  }
}
