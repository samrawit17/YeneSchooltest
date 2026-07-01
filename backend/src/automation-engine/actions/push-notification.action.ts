import { Injectable } from '@nestjs/common';
import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';
import { NotificationService } from '../../notification/notification.service';

@Injectable()
export class PushNotificationAction extends BaseAction {
  readonly type = 'push_notification';

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult> {
    const { title, message, userIds, role } = config;
    const compiledTitle = this.compileTemplate(title || 'Automation Alert', event.payload);
    const compiledMessage = this.compileTemplate(message || '', event.payload);

    try {
      if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        await this.notificationService.createBulkNotifications({
          userIds,
          title: compiledTitle,
          message: compiledMessage,
          type: 'AUTOMATION',
          schoolId: event.schoolId,
        });
      } else if (role) {
        await this.notificationService.createGlobalNotification({
          schoolId: event.schoolId,
          title: compiledTitle,
          message: compiledMessage,
          type: 'AUTOMATION',
        });
      } else {
        return this.fail('No userIds or role specified for push notification');
      }
      return this.success('Push notification sent', { title: compiledTitle, userIds, role });
    } catch (error: any) {
      return this.fail(`Push notification failed: ${error.message}`);
    }
  }

  private compileTemplate(template: string, payload: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
  }
}
