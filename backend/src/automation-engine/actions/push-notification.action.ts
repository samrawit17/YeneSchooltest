import { Injectable } from '@nestjs/common';
import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PushNotificationAction extends BaseAction {
  readonly type = 'push_notification';

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult> {
    const { title, message, userIds, role } = config;
    const compiledTitle = this.compileTemplate(title || 'Automation Alert', event.payload);
    const compiledMessage = this.compileTemplate(message || '', event.payload);

    try {
      const resolvedUserIds = await this.resolveUserIds(userIds, role, event);

      if (resolvedUserIds.length === 0) {
        return this.fail('No userIds or role specified for push notification');
      }

      await this.notificationService.createBulkNotifications({
        userIds: resolvedUserIds,
        title: compiledTitle,
        message: compiledMessage,
        type: 'AUTOMATION',
        schoolId: event.schoolId,
      });

      return this.success('Push notification sent', { title: compiledTitle, count: resolvedUserIds.length });
    } catch (error: any) {
      return this.fail(`Push notification failed: ${error.message}`);
    }
  }

  private async resolveUserIds(
    userIds: string | string[] | undefined,
    role: string | undefined,
    event: AutomationEvent,
  ): Promise<string[]> {
    if (userIds) {
      const ids = Array.isArray(userIds) ? userIds : userIds.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) return ids;
    }

    if (role) {
      const users = await this.prisma.user.findMany({
        where: { schoolId: event.schoolId, role: role as any, isActive: true },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    return [];
  }

  private compileTemplate(template: string, payload: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
  }
}
