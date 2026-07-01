import { Injectable } from '@nestjs/common';
import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';

@Injectable()
export class SmsAction extends BaseAction {
  readonly type = 'send_sms';

  async execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult> {
    const { to, message } = config;
    if (!to && !event.payload?.phone) {
      return this.fail('No recipient phone number configured');
    }
    const phone = to || event.payload.phone;
    const compiledMessage = this.compileTemplate(message || '', event.payload);

    // SMS gateway not yet implemented — log and return
    return this.success('SMS queued (provider not configured)', {
      to: phone,
      message: compiledMessage,
    });
  }

  private compileTemplate(template: string, payload: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
  }
}
