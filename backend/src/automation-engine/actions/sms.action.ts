import { Injectable } from '@nestjs/common';
import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';
import { EventBusService } from '../../core/events/event-bus.service';
import { QueueName } from '../../infrastructure/queue/queue.constants';

@Injectable()
export class SmsAction extends BaseAction {
  readonly type = 'send_sms';

  constructor(private readonly eventBus: EventBusService) {
    super();
  }

  async execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult> {
    const { to, message } = config;
    if (!to && !event.payload?.phone) {
      return this.fail('No recipient phone number configured');
    }
    const phone = to || event.payload.phone;
    const compiledMessage = this.compileTemplate(message || '', event.payload);

    try {
      await this.eventBus.emit(
        'communication.send-sms',
        {
          schoolId: event.schoolId,
          userId: event.payload?.userId || '',
          to: phone,
          message: compiledMessage,
        },
        { async: true, queue: QueueName.COMMUNICATION, schoolId: event.schoolId },
      );

      return this.success('SMS enqueued successfully', {
        to: phone,
        message: compiledMessage,
      });
    } catch (error: any) {
      return this.fail(`SMS queue failed: ${error.message}`);
    }
  }

  private compileTemplate(template: string, payload: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
  }
}
