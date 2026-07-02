import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InAppNotificationProvider } from './in-app.provider';
import { PushNotificationProvider } from './push.provider';
import { EmailNotificationProvider } from './email.provider';
import { SMSNotificationProvider } from './sms.provider';
import {
  INotificationChannel,
  NotificationPayload,
  BulkNotificationPayload,
  SendResult,
  NotificationChannelType,
} from './notification-provider.interface';

type PreferenceRecord = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  commBookEnabled: boolean;
  timetableEnabled: boolean;
  attendanceEnabled: boolean;
  announcementsEnabled: boolean;
  assignmentsEnabled: boolean;
  examsEnabled: boolean;
  feesEnabled: boolean;
  eventsEnabled: boolean;
};

const PREFERENCE_CATEGORY_MAP: Record<string, keyof PreferenceRecord> = {
  MESSAGE_RECEIVED: 'commBookEnabled',
  COMMUNICATION: 'commBookEnabled',
  SCHEDULE_CHANGED: 'timetableEnabled',
  CLASS_CANCELLED: 'timetableEnabled',
  TIMETABLE_UPDATED: 'timetableEnabled',
  PICKUP_REMINDER: 'timetableEnabled',
  ATTENDANCE_MARKED: 'attendanceEnabled',
  ATTENDANCE_ABSENT: 'attendanceEnabled',
  ATTENDANCE_LATE: 'attendanceEnabled',
  ATTENDANCE_SESSION_OPENED: 'attendanceEnabled',
  ATTENDANCE_SESSION_SUBMITTED: 'attendanceEnabled',
  ANNOUNCEMENT: 'announcementsEnabled',
  DISCIPLINE_INCIDENT_CREATED: 'announcementsEnabled',
  ASSIGNMENT_CREATED: 'assignmentsEnabled',
  ASSIGNMENT_DUE: 'assignmentsEnabled',
  ASSIGNMENT_GRADED: 'assignmentsEnabled',
  LESSON_PUBLISHED: 'assignmentsEnabled',
  LESSON: 'assignmentsEnabled',
  RESULT_PUBLISHED: 'examsEnabled',
  GRADE_UPDATED: 'examsEnabled',
  ASSESSMENT_CREATED: 'examsEnabled',
  FEE_DUE: 'feesEnabled',
  FEE_PAID: 'feesEnabled',
  PAYMENT_RECEIVED: 'feesEnabled',
  PAYROLL_PAYMENT_DUE: 'feesEnabled',
  PAYROLL_RUN_REQUIRED: 'feesEnabled',
  EVENT: 'eventsEnabled',
  EVENT_UPDATED: 'eventsEnabled',
  EVENT_DELETED: 'eventsEnabled',
};

const CHANNEL_PREFERENCE_MAP: Record<NotificationChannelType, keyof PreferenceRecord> = {
  email: 'emailEnabled',
  sms: 'smsEnabled',
  push: 'pushEnabled',
  'in-app': 'pushEnabled',
};

@Injectable()
export class NotificationChannelRouter {
  private readonly logger = new Logger(NotificationChannelRouter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppProvider: InAppNotificationProvider,
    private readonly pushProvider: PushNotificationProvider,
    private readonly emailProvider: EmailNotificationProvider,
    private readonly smsProvider: SMSNotificationProvider,
  ) {}

  getChannel(channel: NotificationChannelType): INotificationChannel {
    switch (channel) {
      case 'in-app': return this.inAppProvider;
      case 'push': return this.pushProvider;
      case 'email': return this.emailProvider;
      case 'sms': return this.smsProvider;
    }
  }

  async route(
    payload: NotificationPayload,
    channels: NotificationChannelType[],
    bypassPreferences = false,
  ): Promise<SendResult[]> {
    const results: SendResult[] = [];

    for (const channelType of channels) {
      const provider = this.getChannel(channelType);

      if (!provider.canHandle(payload.type)) continue;

      if (!bypassPreferences && payload.userId) {
        const allowed = await this.isChannelAllowedForUser(
          payload.userId,
          payload.type,
          channelType,
        );
        if (!allowed) continue;
      }

      results.push(await provider.send(payload));
    }

    return results;
  }

  async routeBulk(
    payload: BulkNotificationPayload,
    channels: NotificationChannelType[],
    bypassPreferences = false,
  ): Promise<{ channel: NotificationChannelType; result: SendResult }[]> {
    const results: { channel: NotificationChannelType; result: SendResult }[] = [];

    for (const channelType of channels) {
      const provider = this.getChannel(channelType);
      if (!provider.canHandle(payload.type)) continue;

      let eligibleIds = payload.userIds;

      if (!bypassPreferences && eligibleIds.length > 0) {
        const allowedMap = await this.getChannelAllowedUserIds(
          eligibleIds,
          payload.type,
          channelType,
        );
        eligibleIds = eligibleIds.filter((id) => allowedMap.get(id) !== false);
      }

      if (eligibleIds.length === 0) continue;

      const result = await provider.sendBulk({ ...payload, userIds: eligibleIds });
      results.push({ channel: channelType, result });
    }

    return results;
  }

  private async isChannelAllowedForUser(
    userId: string,
    type: string,
    channel: NotificationChannelType,
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    const typePref = this.getTypePreference(type, prefs);
    if (!typePref) return false;

    const channelPref = CHANNEL_PREFERENCE_MAP[channel];
    if (channelPref && !prefs[channelPref]) return false;

    return true;
  }

  private async getChannelAllowedUserIds(
    userIds: string[],
    type: string,
    channel: NotificationChannelType,
  ): Promise<Map<string, boolean>> {
    const uniqueIds = Array.from(new Set(userIds));
    const users = await this.prisma.$queryRaw<
      Array<Record<string, any>>
    >(Prisma.sql`
      SELECT
        u.id,
        np."pushEnabled",
        np."emailEnabled",
        np."smsEnabled"
      FROM "User" u
      LEFT JOIN "NotificationPreference" np ON np."userId" = u.id
      WHERE u.id IN (${Prisma.join(uniqueIds)})
    `);

    const result = new Map<string, boolean>();

    for (const user of users) {
      const prefs: PreferenceRecord = {
        emailEnabled: Boolean(user.emailEnabled ?? true),
        smsEnabled: Boolean(user.smsEnabled ?? false),
        pushEnabled: Boolean(user.pushEnabled ?? true),
        commBookEnabled: Boolean(user.commBookEnabled ?? false),
        timetableEnabled: Boolean(user.timetableEnabled ?? false),
        attendanceEnabled: Boolean(user.attendanceEnabled ?? false),
        announcementsEnabled: Boolean(user.announcementsEnabled ?? false),
        assignmentsEnabled: Boolean(user.assignmentsEnabled ?? false),
        examsEnabled: Boolean(user.examsEnabled ?? false),
        feesEnabled: Boolean(user.feesEnabled ?? false),
        eventsEnabled: Boolean(user.eventsEnabled ?? false),
      };

      const typePref = this.getTypePreference(type, prefs);
      const channelPref = CHANNEL_PREFERENCE_MAP[channel];

      result.set(
        user.id,
        typePref && (!channelPref || prefs[channelPref]),
      );
    }

    return result;
  }

  private async getPreferences(userId: string): Promise<PreferenceRecord> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (pref) {
      return {
        emailEnabled: pref.emailEnabled,
        smsEnabled: pref.smsEnabled,
        pushEnabled: pref.pushEnabled,
        commBookEnabled: pref.commBookEnabled,
        timetableEnabled: pref.timetableEnabled,
        attendanceEnabled: pref.attendanceEnabled,
        announcementsEnabled: pref.announcementsEnabled,
        assignmentsEnabled: pref.assignmentsEnabled,
        examsEnabled: pref.examsEnabled,
        feesEnabled: pref.feesEnabled,
        eventsEnabled: pref.eventsEnabled,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return this.buildDefaults(user?.role || 'STUDENT');
  }

  private getTypePreference(type: string, prefs: PreferenceRecord): boolean {
    const category = PREFERENCE_CATEGORY_MAP[type];
    if (!category) return true;
    return prefs[category];
  }

  private buildDefaults(role: string): PreferenceRecord {
    const defaults: PreferenceRecord = {
      emailEnabled: true, smsEnabled: false, pushEnabled: true,
      commBookEnabled: false, timetableEnabled: false,
      attendanceEnabled: false, announcementsEnabled: false,
      assignmentsEnabled: false, examsEnabled: false,
      feesEnabled: false, eventsEnabled: false,
    };

    const r = role.toUpperCase();
    if (r === 'SUPER_ADMIN') {
      defaults.announcementsEnabled = true;
      defaults.eventsEnabled = true;
    } else if (r === 'IT_MANAGER') {
      defaults.timetableEnabled = true;
      defaults.attendanceEnabled = true;
      defaults.announcementsEnabled = true;
      defaults.eventsEnabled = true;
    } else if (r === 'TEACHER') {
      defaults.commBookEnabled = true;
      defaults.timetableEnabled = true;
      defaults.attendanceEnabled = true;
      defaults.announcementsEnabled = true;
      defaults.assignmentsEnabled = true;
      defaults.examsEnabled = true;
      defaults.eventsEnabled = true;
    } else if (r === 'STUDENT') {
      defaults.timetableEnabled = true;
      defaults.announcementsEnabled = true;
      defaults.assignmentsEnabled = true;
      defaults.examsEnabled = true;
      defaults.feesEnabled = true;
      defaults.eventsEnabled = true;
    } else if (r === 'PARENT') {
      defaults.commBookEnabled = true;
      defaults.timetableEnabled = true;
      defaults.attendanceEnabled = true;
      defaults.announcementsEnabled = true;
      defaults.assignmentsEnabled = true;
      defaults.examsEnabled = true;
      defaults.feesEnabled = true;
      defaults.eventsEnabled = true;
    } else if (r === 'REGISTRAR') {
      defaults.timetableEnabled = true;
      defaults.attendanceEnabled = true;
      defaults.announcementsEnabled = true;
      defaults.examsEnabled = true;
      defaults.eventsEnabled = true;
    } else if (r === 'FINANCE') {
      defaults.announcementsEnabled = true;
      defaults.feesEnabled = true;
      defaults.eventsEnabled = true;
    }

    return defaults;
  }
}
