import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  INotificationChannel,
  NotificationPayload,
  BulkNotificationPayload,
  SendResult,
} from './notification-provider.interface';
import { ProviderConfigService, SMSProviderConfig } from './provider-config.service';

@Injectable()
export class SMSNotificationProvider implements INotificationChannel {
  readonly channelName = 'sms';
  private readonly logger = new Logger(SMSNotificationProvider.name);

  constructor(
    private readonly configService: ProviderConfigService,
    private readonly prisma: PrismaService,
  ) {}

  canHandle(_type: string): boolean {
    return true;
  }

  async send(payload: NotificationPayload): Promise<SendResult> {
    try {
      const config = await this.configService.getSMSConfig(payload.schoolId);
      if (config.provider === 'dummy') {
        this.logger.debug(`[dummy] SMS to user ${payload.userId}: ${payload.title}`);
        return { success: true, recipientCount: 1 };
      }

      if (!payload.userId) return { success: true, recipientCount: 0 };

      const phone = await this.getUserPhone(payload.userId);
      if (!phone) {
        this.logger.warn(`No phone for user ${payload.userId}`);
        return { success: false, recipientCount: 0, error: 'No phone number' };
      }

      await this.sendToProvider(config, phone, payload.title || payload.message);
      return { success: true, recipientCount: 1 };
    } catch (error) {
      this.logger.error(`SMS send failed: ${error}`);
      return { success: false, recipientCount: 0, error: String(error) };
    }
  }

  async sendBulk(payload: BulkNotificationPayload): Promise<SendResult> {
    if (payload.userIds.length === 0) return { success: true, recipientCount: 0 };

    const config = await this.configService.getSMSConfig(payload.schoolId);
    if (config.provider === 'dummy') {
      this.logger.debug(`[dummy] Bulk SMS to ${payload.userIds.length} users: ${payload.title}`);
      return { success: true, recipientCount: payload.userIds.length };
    }

    const phones = await this.getUserPhones(payload.userIds);
    const valid = phones.filter((p) => p.phone);
    if (valid.length === 0) return { success: true, recipientCount: 0 };

    let sent = 0;
    for (const { phone } of valid) {
      try {
        await this.sendToProvider(config, phone, payload.title || payload.message);
        sent++;
      } catch (error) {
        this.logger.warn(`SMS failed for ${phone}: ${error}`);
      }
    }

    return { success: sent > 0, recipientCount: sent };
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

  private async getUserPhones(userIds: string[]): Promise<Array<{ phone: string }>> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { phone: true },
    });
    return users.filter((u) => u.phone).map((u) => ({ phone: u.phone! }));
  }
}
