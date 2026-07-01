import { Injectable } from '@nestjs/common';
import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';

@Injectable()
export class EmailAction extends BaseAction {
  readonly type = 'send_email';

  async execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult> {
    const { to, subject, body } = config;
    if (!to && !event.payload?.email) {
      return this.fail('No recipient email configured');
    }
    const recipient = to || event.payload.email;
    const compiledSubject = this.compileTemplate(subject || 'Notification', event.payload);
    const compiledBody = this.compileTemplate(body || '', event.payload);

    // Email service not yet implemented — log and return
    return this.success('Email queued (provider not configured)', {
      to: recipient,
      subject: compiledSubject,
      body: compiledBody,
    });
  }

  private compileTemplate(template: string, payload: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
  }
}
