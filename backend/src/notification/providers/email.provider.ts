import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import {
  INotificationChannel,
  NotificationPayload,
  BulkNotificationPayload,
  SendResult,
} from './notification-provider.interface';
import { ProviderConfigService, EmailProviderConfig } from './provider-config.service';

@Injectable()
export class EmailNotificationProvider implements INotificationChannel {
  readonly channelName = 'email';
  private readonly logger = new Logger(EmailNotificationProvider.name);
  private transportCache = new Map<string, Transporter>();

  constructor(
    private readonly configService: ProviderConfigService,
    private readonly prisma: PrismaService,
  ) {}

  canHandle(_type: string): boolean {
    return true;
  }

  async send(payload: NotificationPayload): Promise<SendResult> {
    if (!payload.userId) return { success: true, recipientCount: 0 };

    try {
      const config = await this.configService.getEmailConfig(payload.schoolId);
      if (config.provider === 'dummy') {
        this.logger.debug(`[dummy] Email to user ${payload.userId}: ${payload.title}`);
        return { success: true, recipientCount: 1 };
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true },
      });
      if (!user?.email) {
        this.logger.warn(`No email for user ${payload.userId}`);
        return { success: false, recipientCount: 0, error: 'No email address' };
      }

      const transport = this.getTransport(config);
      await transport.sendMail({
        from: `"${config.fromName || 'School System'}" <${config.fromEmail || 'noreply@school.edu'}>`,
        to: user.email!,
        subject: payload.title,
        text: payload.message,
        html: this.toHtml(payload.title, payload.message),
      });

      return { success: true, recipientCount: 1 };
    } catch (error) {
      this.logger.error(`Email send failed: ${error}`);
      return { success: false, recipientCount: 0, error: String(error) };
    }
  }

  async sendBulk(payload: BulkNotificationPayload): Promise<SendResult> {
    if (payload.userIds.length === 0) return { success: true, recipientCount: 0 };

    const config = await this.configService.getEmailConfig(payload.schoolId);
    if (config.provider === 'dummy') {
      this.logger.debug(`[dummy] Bulk email to ${payload.userIds.length} users: ${payload.title}`);
      return { success: true, recipientCount: payload.userIds.length };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: payload.userIds } },
      select: { id: true, email: true },
    });
    const valid = users.filter((u) => u.email);
    if (valid.length === 0) return { success: true, recipientCount: 0 };

    const transport = this.getTransport(config);
    let sent = 0;

    for (const user of valid) {
      try {
        await transport.sendMail({
          from: `"${config.fromName || 'School System'}" <${config.fromEmail || 'noreply@school.edu'}>`,
          to: user.email!,
          subject: payload.title,
          text: payload.message,
          html: this.toHtml(payload.title, payload.message),
        });
        sent++;
      } catch (error) {
        this.logger.warn(`Email failed for ${user.email}: ${error}`);
      }
    }

    return { success: sent > 0, recipientCount: sent };
  }

  private getTransport(config: EmailProviderConfig): Transporter {
    const key = `${config.provider}:${config.host || ''}:${config.user || ''}`;
    const cached = this.transportCache.get(key);
    if (cached) return cached;

    let transport: Transporter;

    switch (config.provider) {
      case 'smtp':
        transport = nodemailer.createTransport({
          host: config.host || 'localhost',
          port: config.port || 587,
          secure: config.secure ?? false,
          auth: config.user && config.pass
            ? { user: config.user, pass: config.pass }
            : undefined,
        });
        break;

      case 'sendgrid':
        transport = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: { user: 'apikey', pass: config.apiKey || '' },
        });
        break;

      case 'ses':
        transport = nodemailer.createTransport({
          host: config.host || 'email-smtp.us-east-1.amazonaws.com',
          port: config.port || 587,
          secure: config.secure ?? false,
          auth: { user: config.user || '', pass: config.pass || '' },
        });
        break;

      default:
        throw new Error(`Unknown email provider: ${config.provider}`);
    }

    this.transportCache.set(key, transport);
    return transport;
  }

  private toHtml(title: string, message: string): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a1a">${this.esc(title)}</h2>
      <p style="color:#333;line-height:1.6">${this.esc(message)}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="color:#999;font-size:12px">Sent by School Management System</p>
    </div>`;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
