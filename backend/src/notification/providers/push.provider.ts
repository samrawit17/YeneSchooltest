import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  INotificationChannel,
  NotificationPayload,
  BulkNotificationPayload,
  SendResult,
} from './notification-provider.interface';

@Injectable()
export class PushNotificationProvider implements INotificationChannel {
  readonly channelName = 'push';
  private readonly logger = new Logger(PushNotificationProvider.name);

  constructor(private readonly prisma: PrismaService) {
    this.configure();
  }

  canHandle(_type: string): boolean {
    return this.isConfigured();
  }

  async send(payload: NotificationPayload): Promise<SendResult> {
    if (!payload.userId) return { success: true, recipientCount: 0 };
    return this.sendBulk({
      schoolId: payload.schoolId || '',
      userIds: [payload.userId],
      title: payload.title,
      message: payload.message,
      type: payload.type,
      actionUrl: payload.actionUrl,
      metadata: payload.metadata,
    });
  }

  async sendBulk(payload: BulkNotificationPayload): Promise<SendResult> {
    if (!this.isConfigured() || payload.userIds.length === 0) {
      return { success: true, recipientCount: 0 };
    }

    const uniqueIds = Array.from(new Set(payload.userIds));

    try {
      const subscriptions = await this.prisma.$queryRaw<
        Array<{ id: string; endpoint: string; p256dh: string; auth: string }>
      >`
        SELECT id, endpoint, p256dh, auth
        FROM "PushSubscription"
        WHERE "userId" IN (${Prisma.join(uniqueIds)})
      `;

      if (subscriptions.length === 0) {
        return { success: true, recipientCount: 0 };
      }

      const body = JSON.stringify({
        title: payload.title,
        body: payload.message,
        tag: payload.type,
        url: payload.actionUrl,
        type: payload.type,
        notificationId: (payload.metadata as any)?.notificationId,
        metadata: typeof payload.metadata === 'object' ? payload.metadata : undefined,
      });

      await Promise.allSettled(
        subscriptions.map((sub) => this.deliver(sub, body)),
      );

      return { success: true, recipientCount: subscriptions.length };
    } catch (error) {
      this.logger.error(`Push bulk send failed: ${error}`);
      return { success: false, recipientCount: 0, error: String(error) };
    }
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY,
    );
  }

  getPublicKey(): string | null {
    return process.env.WEB_PUSH_PUBLIC_KEY || null;
  }

  async saveSubscription(data: {
    schoolId: string;
    userId: string;
    subscription: { endpoint: string; keys?: { p256dh?: string; auth?: string }; expirationTime?: number | null };
    userAgent?: string;
  }): Promise<any> {
    if (!data.subscription?.endpoint) {
      throw new Error('Subscription endpoint is required');
    }

    const id = randomUUID().replace(/-/g, '');
    const expirationTime = typeof data.subscription.expirationTime === 'number'
      ? BigInt(Math.trunc(data.subscription.expirationTime))
      : null;

    await this.prisma.$executeRaw`
      INSERT INTO "PushSubscription" (
        id, "schoolId", "userId", endpoint, p256dh, auth,
        "expirationTime", "userAgent", "failureCount", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${data.schoolId || null}, ${data.userId},
        ${data.subscription.endpoint},
        ${data.subscription.keys?.p256dh || ''},
        ${data.subscription.keys?.auth || ''},
        ${expirationTime},
        ${data.userAgent?.slice(0, 500) || null},
        0, NOW(), NOW()
      )
      ON CONFLICT (endpoint) DO UPDATE SET
        "userId" = EXCLUDED."userId",
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        "expirationTime" = EXCLUDED."expirationTime",
        "failureCount" = 0,
        "lastFailureAt" = NULL,
        "updatedAt" = NOW()
    `;

    return { id, endpoint: data.subscription.endpoint };
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "PushSubscription"
      WHERE "userId" = ${userId} AND endpoint = ${endpoint}
    `;
  }

  private async deliver(
    sub: { id: string; endpoint: string; p256dh: string; auth: string },
    payload: string,
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      await this.prisma.$executeRaw`
        UPDATE "PushSubscription"
        SET "lastSuccessfulAt" = NOW(), "lastFailureAt" = NULL,
            "failureCount" = 0, "updatedAt" = NOW()
        WHERE id = ${sub.id}
      `;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await this.prisma.$executeRaw`DELETE FROM "PushSubscription" WHERE id = ${sub.id}`;
        return;
      }
      await this.prisma.$executeRaw`
        UPDATE "PushSubscription"
        SET "lastFailureAt" = NOW(), "failureCount" = "failureCount" + 1, "updatedAt" = NOW()
        WHERE id = ${sub.id}
      `;
    }
  }

  private configure(): void {
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails(
        process.env.WEB_PUSH_CONTACT_EMAIL || 'mailto:admin@example.com',
        publicKey,
        privateKey,
      );
    }
  }
}
