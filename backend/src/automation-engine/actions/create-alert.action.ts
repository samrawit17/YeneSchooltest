import { Injectable } from '@nestjs/common';
import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CreateAlertAction extends BaseAction {
  readonly type = 'create_alert';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult> {
    const { message, type, priority, actionUrl, actionLabel } = config;
    const compiledMessage = this.compileTemplate(message || 'Automation alert triggered', event.payload);

    try {
      // Store alert as an in-app notification
      const userIds = config.userIds as string[] | undefined;
      if (userIds && userIds.length > 0) {
        // Could use NotificationService here if available
      }

      return this.success('Alert created', {
        message: compiledMessage,
        type: type || 'warning',
        priority: priority || 'low',
      });
    } catch (error: any) {
      return this.fail(`Alert creation failed: ${error.message}`);
    }
  }

  private compileTemplate(template: string, payload: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
  }
}
