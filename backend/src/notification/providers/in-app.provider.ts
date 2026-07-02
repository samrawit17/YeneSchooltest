import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushNotificationProvider } from './push.provider';
import {
  INotificationChannel,
  NotificationPayload,
  BulkNotificationPayload,
  SendResult,
} from './notification-provider.interface';

@Injectable()
export class InAppNotificationProvider implements INotificationChannel {
  readonly channelName = 'in-app';
  private readonly logger = new Logger(InAppNotificationProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushProvider: PushNotificationProvider,
  ) {}

  canHandle(_type: string): boolean {
    return true;
  }

  async send(payload: NotificationPayload): Promise<SendResult> {
    try {
      const notification = await this.createInApp(payload);

      if (payload.userId) {
        await this.pushProvider.send({
          ...payload,
          metadata: { ...payload.metadata, notificationId: notification.id },
        }).catch(() => {});
      }

      return { success: true, recipientCount: 1 };
    } catch (error) {
      this.logger.error(`In-app send failed: ${error}`);
      return { success: false, recipientCount: 0, error: String(error) };
    }
  }

  async sendBulk(payload: BulkNotificationPayload): Promise<SendResult> {
    try {
      const eligibleIds = Array.from(new Set(payload.userIds)).filter(Boolean);
      if (eligibleIds.length === 0) return { success: true, recipientCount: 0 };

      const metadata = this.serialize(payload.metadata);
      const actionUrl = payload.actionUrl || null;

      await this.prisma.notification.createMany({
        data: eligibleIds.map((userId) => ({
          schoolId: payload.schoolId,
          userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          actionUrl,
          metadata,
        })),
        skipDuplicates: true,
      });

      await this.pushProvider.sendBulk({
        ...payload,
        userIds: eligibleIds,
      }).catch(() => {});

      return { success: true, recipientCount: eligibleIds.length };
    } catch (error) {
      this.logger.error(`In-app bulk send failed: ${error}`);
      return { success: false, recipientCount: 0, error: String(error) };
    }
  }

  async createInApp(data: NotificationPayload) {
    const metadata = this.serialize(data.metadata);
    const actionUrl = data.actionUrl || null;

    return this.prisma.notification.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl,
        metadata,
      },
    });
  }

  private serialize(metadata: any): string | null {
    if (metadata === undefined || metadata === null) return null;
    return JSON.stringify(metadata);
  }
}
