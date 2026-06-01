import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Notification as PrismaNotification } from '@prisma/client';
import * as webpush from 'web-push';
import { randomUUID } from 'crypto';
import { notificationMessages, NotificationLanguage } from './notification-messages';
import { formatSchoolDate, type CalendarType } from '../common/date.util';

type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type PushNotificationPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  type?: string;
  notificationId?: string;
  metadata?: Record<string, unknown>;
};

export enum NotificationType {
  // Attendance notifications
  ATTENDANCE_MARKED = 'ATTENDANCE_MARKED',
  ATTENDANCE_ABSENT = 'ATTENDANCE_ABSENT',
  ATTENDANCE_LATE = 'ATTENDANCE_LATE',
  ATTENDANCE_SESSION_OPENED = 'ATTENDANCE_SESSION_OPENED',
  ATTENDANCE_SESSION_SUBMITTED = 'ATTENDANCE_SESSION_SUBMITTED',

  // Enrollment notifications
  ENROLLMENT_SUBMITTED = 'ENROLLMENT_SUBMITTED',
  ENROLLMENT_APPROVED = 'ENROLLMENT_APPROVED',
  ENROLLMENT_REJECTED = 'ENROLLMENT_REJECTED',
  ENROLLMENT_PENDING = 'ENROLLMENT_PENDING',

  // Academic notifications
  ASSIGNMENT_CREATED = 'ASSIGNMENT_CREATED',
  ASSIGNMENT_DUE = 'ASSIGNMENT_DUE',
  ASSIGNMENT_GRADED = 'ASSIGNMENT_GRADED',
  RESULT_PUBLISHED = 'RESULT_PUBLISHED',
  GRADE_UPDATED = 'GRADE_UPDATED',
  ASSESSMENT_CREATED = 'ASSESSMENT_CREATED',

  // Schedule notifications
  SCHEDULE_CHANGED = 'SCHEDULE_CHANGED',
  CLASS_CANCELLED = 'CLASS_CANCELLED',
  TIMETABLE_UPDATED = 'TIMETABLE_UPDATED',
  PICKUP_REMINDER = 'PICKUP_REMINDER',

  // Communication notifications
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  COMMUNICATION = 'COMMUNICATION',

  // Event notifications
  EVENT = 'EVENT',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_DELETED = 'EVENT_DELETED',

  // Lesson notifications
  LESSON_PUBLISHED = 'LESSON_PUBLISHED',
  LESSON = 'LESSON',

  // Finance notifications
  FEE_DUE = 'FEE_DUE',
  FEE_PAID = 'FEE_PAID',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYROLL_PAYMENT_DUE = 'PAYROLL_PAYMENT_DUE',
  PAYROLL_RUN_REQUIRED = 'PAYROLL_RUN_REQUIRED',

  // System notifications
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SIREN_ALERT = 'SIREN_ALERT',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // General
  INFO = 'INFO',
  WARNING = 'WARNING',
  ALERT = 'ALERT',
}

type NotificationPreferenceRecord = {
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

type NotificationPreferenceCategory =
  | 'commBookEnabled'
  | 'timetableEnabled'
  | 'attendanceEnabled'
  | 'announcementsEnabled'
  | 'assignmentsEnabled'
  | 'examsEnabled'
  | 'feesEnabled'
  | 'eventsEnabled';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly platformBackupReminderDays = this.parsePositiveInt(
    process.env.SUPERADMIN_BACKUP_REMINDER_DAYS,
    28,
  );
  private readonly platformDangerDbSizeMb = this.parsePositiveInt(
    process.env.SUPERADMIN_DB_DANGER_SIZE_MB,
    10240,
  );

  private canViewSchoolGlobalNotifications(userRole: string) {
    return userRole === 'ADMIN' || userRole === 'IT_MANAGER';
  }

  private canViewPlatformNotifications(userRole: string) {
    return userRole === 'SUPER_ADMIN';
  }

  constructor(private prisma: PrismaService) {
    this.configureWebPush();
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async getUserLanguage(userId: string): Promise<NotificationLanguage> {
    if (!userId) return 'en';
    try {
      const users = await this.prisma.$queryRaw<Array<{ language: string | null }>>(
        Prisma.sql`SELECT language FROM "User" WHERE id = ${userId} LIMIT 1`,
      );
      const lang = users[0]?.language;
      if (lang && ['en', 'am', 'ar', 'om', 'so'].includes(lang)) {
        return lang as NotificationLanguage;
      }
    } catch {
      // Ignore errors, default to English
    }
    return 'en';
  }

  private parseDateOnlyAsLocalDay(date: string): Date {
    const [year, month, day] = String(date).split('-').map(Number);
    if (!year || !month || !day) {
      return new Date(date);
    }

    return new Date(year, month - 1, day);
  }

  private async getSchoolCalendarType(schoolId: string): Promise<CalendarType> {
    if (!schoolId) return 'ETHIOPIAN';

    const setting = await this.prisma.schoolSetting.findUnique({
      where: {
        schoolId_key: {
          schoolId,
          key: 'calendar_type',
        },
      },
      select: {
        value: true,
      },
    });

    return setting?.value === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN';
  }

  private translate(key: string, language: NotificationLanguage, ...args: string[]): { title: string; message: string } {
    const langMessages = notificationMessages[language] || notificationMessages.en;
    const template = langMessages[key];
    if (!template) {
      const fallback = notificationMessages.en[key];
      if (!fallback) return { title: '', message: '' };
      return typeof fallback === 'function' ? fallback(...args) : fallback;
    }
    return typeof template === 'function' ? template(...args) : template;
  }

  private buildDefaultPreferencesForRole(
    userRole: string,
  ): NotificationPreferenceRecord {
    const role = userRole?.toUpperCase();

    const defaults: NotificationPreferenceRecord = {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      commBookEnabled: false,
      timetableEnabled: false,
      attendanceEnabled: false,
      announcementsEnabled: false,
      assignmentsEnabled: false,
      examsEnabled: false,
      feesEnabled: false,
      eventsEnabled: false,
    };

    switch (role) {
      case 'SUPER_ADMIN':
        defaults.announcementsEnabled = true;
        defaults.eventsEnabled = true;
        break;
      case 'IT_MANAGER':
        defaults.timetableEnabled = true;
        defaults.attendanceEnabled = true;
        defaults.announcementsEnabled = true;
        defaults.eventsEnabled = true;
        break;
      case 'TEACHER':
        defaults.commBookEnabled = true;
        defaults.timetableEnabled = true;
        defaults.attendanceEnabled = true;
        defaults.announcementsEnabled = true;
        defaults.assignmentsEnabled = true;
        defaults.examsEnabled = true;
        defaults.eventsEnabled = true;
        break;
      case 'STUDENT':
        defaults.timetableEnabled = true;
        defaults.announcementsEnabled = true;
        defaults.assignmentsEnabled = true;
        defaults.examsEnabled = true;
        defaults.feesEnabled = true;
        defaults.eventsEnabled = true;
        break;
      case 'PARENT':
        defaults.commBookEnabled = true;
        defaults.timetableEnabled = true;
        defaults.attendanceEnabled = true;
        defaults.announcementsEnabled = true;
        defaults.assignmentsEnabled = true;
        defaults.examsEnabled = true;
        defaults.feesEnabled = true;
        defaults.eventsEnabled = true;
        break;
      case 'REGISTRAR':
        defaults.timetableEnabled = true;
        defaults.attendanceEnabled = true;
        defaults.announcementsEnabled = true;
        defaults.examsEnabled = true;
        defaults.eventsEnabled = true;
        break;
      case 'FINANCE':
        defaults.announcementsEnabled = true;
        defaults.feesEnabled = true;
        defaults.eventsEnabled = true;
        break;
      default:
        break;
    }

    return defaults;
  }

  private getPreferenceCategoryForNotificationType(
    type: string,
  ): NotificationPreferenceCategory | null {
    if (
      [
        NotificationType.MESSAGE_RECEIVED,
        NotificationType.COMMUNICATION,
      ].includes(type as NotificationType)
    ) {
      return 'commBookEnabled';
    }

    if (
      [
        NotificationType.SCHEDULE_CHANGED,
        NotificationType.CLASS_CANCELLED,
        NotificationType.TIMETABLE_UPDATED,
        NotificationType.PICKUP_REMINDER,
      ].includes(type as NotificationType)
    ) {
      return 'timetableEnabled';
    }

    if (
      [
        NotificationType.ATTENDANCE_MARKED,
        NotificationType.ATTENDANCE_ABSENT,
        NotificationType.ATTENDANCE_LATE,
        NotificationType.ATTENDANCE_SESSION_OPENED,
        NotificationType.ATTENDANCE_SESSION_SUBMITTED,
      ].includes(type as NotificationType)
    ) {
      return 'attendanceEnabled';
    }

    if (type === NotificationType.ANNOUNCEMENT) {
      return 'announcementsEnabled';
    }

    if (
      [
        NotificationType.ASSIGNMENT_CREATED,
        NotificationType.ASSIGNMENT_DUE,
        NotificationType.ASSIGNMENT_GRADED,
        NotificationType.LESSON_PUBLISHED,
        NotificationType.LESSON,
      ].includes(type as NotificationType)
    ) {
      return 'assignmentsEnabled';
    }

    if (
      [
        NotificationType.RESULT_PUBLISHED,
        NotificationType.GRADE_UPDATED,
        NotificationType.ASSESSMENT_CREATED,
      ].includes(type as NotificationType)
    ) {
      return 'examsEnabled';
    }

    if (
      [
        NotificationType.FEE_DUE,
        NotificationType.FEE_PAID,
        NotificationType.PAYMENT_RECEIVED,
        NotificationType.PAYROLL_PAYMENT_DUE,
        NotificationType.PAYROLL_RUN_REQUIRED,
      ].includes(type as NotificationType)
    ) {
      return 'feesEnabled';
    }

    if (
      [
        NotificationType.EVENT,
        NotificationType.EVENT_UPDATED,
        NotificationType.EVENT_DELETED,
      ].includes(type as NotificationType)
    ) {
      return 'eventsEnabled';
    }

    return null;
  }

  private isNotificationTypeEnabled(
    type: string,
    preferences: NotificationPreferenceRecord,
  ) {
    const category = this.getPreferenceCategoryForNotificationType(type);
    if (!category) {
      return true;
    }

    return preferences[category];
  }

  private async ensureNotificationPreferences(
    userId: string,
    userRole?: string,
  ) {
    let role = userRole;
    if (!role) {
      const users = await this.prisma.$queryRaw<Array<{ role: string | null }>>(
        Prisma.sql`
          SELECT "role"::text AS role
          FROM "User"
          WHERE id = ${userId}
          LIMIT 1
        `,
      );
      role = users[0]?.role || 'STUDENT';
    }

    try {
      return await this.prisma.notificationPreference.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          ...this.buildDefaultPreferencesForRole(role),
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const existing = await this.prisma.notificationPreference.findUnique({
          where: { userId },
        });

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async getNotificationPreferences(userId: string, userRole: string) {
    return this.ensureNotificationPreferences(userId, userRole);
  }

  async updateNotificationPreferences(
    userId: string,
    userRole: string,
    data: Partial<NotificationPreferenceRecord>,
  ) {
    await this.ensureNotificationPreferences(userId, userRole);

    return this.prisma.notificationPreference.update({
      where: { userId },
      data,
    });
  }

  private async getPreferenceSnapshotsForUsers(
    userIds: string[],
  ): Promise<Map<string, NotificationPreferenceRecord>> {
    const uniqueUserIds = Array.from(new Set(userIds));
    const users = await this.prisma.$queryRaw<
      Array<{
        id: string;
        role: string | null;
        preferenceId: string | null;
        emailEnabled: boolean | null;
        smsEnabled: boolean | null;
        pushEnabled: boolean | null;
        commBookEnabled: boolean | null;
        timetableEnabled: boolean | null;
        attendanceEnabled: boolean | null;
        announcementsEnabled: boolean | null;
        assignmentsEnabled: boolean | null;
        examsEnabled: boolean | null;
        feesEnabled: boolean | null;
        eventsEnabled: boolean | null;
      }>
    >(Prisma.sql`
      SELECT
        u.id,
        u."role"::text AS role,
        np.id AS "preferenceId",
        np."emailEnabled",
        np."smsEnabled",
        np."pushEnabled",
        np."commBookEnabled",
        np."timetableEnabled",
        np."attendanceEnabled",
        np."announcementsEnabled",
        np."assignmentsEnabled",
        np."examsEnabled",
        np."feesEnabled",
        np."eventsEnabled"
      FROM "User" u
      LEFT JOIN "NotificationPreference" np ON np."userId" = u.id
      WHERE u.id IN (${Prisma.join(uniqueUserIds)})
    `);

    const preferenceMap = new Map<string, NotificationPreferenceRecord>();

    for (const user of users) {
      const preference =
        user.preferenceId
          ? {
              emailEnabled: Boolean(user.emailEnabled),
              smsEnabled: Boolean(user.smsEnabled),
              pushEnabled: Boolean(user.pushEnabled),
              commBookEnabled: Boolean(user.commBookEnabled),
              timetableEnabled: Boolean(user.timetableEnabled),
              attendanceEnabled: Boolean(user.attendanceEnabled),
              announcementsEnabled: Boolean(user.announcementsEnabled),
              assignmentsEnabled: Boolean(user.assignmentsEnabled),
              examsEnabled: Boolean(user.examsEnabled),
              feesEnabled: Boolean(user.feesEnabled),
              eventsEnabled: Boolean(user.eventsEnabled),
            }
          : await this.ensureNotificationPreferences(user.id, user.role || 'STUDENT');

      preferenceMap.set(user.id, preference);
    }

    return preferenceMap;
  }

  private async filterEligibleUserIdsForNotification(
    userIds: string[],
    type: string,
  ) {
    const preferences = await this.getPreferenceSnapshotsForUsers(userIds);

    return userIds.filter((userId) => {
      const preference = preferences.get(userId);
      return (
        preference && this.isNotificationTypeEnabled(type, preference)
      );
    });
  }

  private async filterPushEligibleUserIdsForNotification(
    userIds: string[],
    type: string,
  ) {
    const preferences = await this.getPreferenceSnapshotsForUsers(userIds);

    return userIds.filter((userId) => {
      const preference = preferences.get(userId);
      return (
        preference &&
        preference.pushEnabled &&
        this.isNotificationTypeEnabled(type, preference)
      );
    });
  }

  private configureWebPush() {
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return;
    }

    webpush.setVapidDetails(
      process.env.WEB_PUSH_CONTACT_EMAIL || 'mailto:admin@example.com',
      publicKey,
      privateKey,
    );
  }

  isWebPushConfigured() {
    return Boolean(
      process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY,
    );
  }

  getWebPushPublicKey() {
    return process.env.WEB_PUSH_PUBLIC_KEY || null;
  }

  async getUserNotifications(
    userId: string,
    userRole: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      type?: string;
      types?: string[];
      category?: string;
      schoolId?: string;
    },
  ) {
    // SUPER_ADMIN is a global SaaS admin - can see all global notifications but not school-specific notifications.
    // School operational roles that share the admin bell should also receive school-global notifications.
    const canSeeSchoolGlobalNotifications =
      this.canViewSchoolGlobalNotifications(userRole);
    const canSeePlatformNotifications =
      this.canViewPlatformNotifications(userRole);

    const where: any = {
      userId, // User-specific notifications
    };

    if (canSeeSchoolGlobalNotifications) {
      where.OR = [{ userId }, { userId: null }];
      delete where.userId;
    }

    if (canSeePlatformNotifications) {
      where.OR = [
        { userId, schoolId: null },
        { userId: null, schoolId: null },
      ];
      delete where.userId;
    } else if (options?.schoolId) {
      where.schoolId = options.schoolId;
    }

    if (options?.unreadOnly) {
      where.isRead = false;
    }

    // Filter by specific type
    if (options?.type) {
      where.type = options.type;
    }

    if (options?.types?.length) {
      where.type = { in: options.types };
    }

    // Filter by category
    if (options?.category) {
      const typesInCategory = this.getTypesForCategory(options.category);
      where.type = { in: typesInCategory };
    }

    const requestedLimit = options?.limit || 20;
    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(requestedLimit * 3, 100),
    });

    const preferences = await this.getNotificationPreferences(userId, userRole);

    return this.dedupeNotifications(
      notifications.filter((notification) =>
        this.isNotificationTypeEnabled(notification.type, preferences),
      ),
    ).slice(0, requestedLimit);
  }

  private parseNotificationMetadata(metadata: string | null) {
    if (!metadata) return {};
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private getNotificationDisplayDedupeKey(notification: PrismaNotification) {
    const metadata = this.parseNotificationMetadata(notification.metadata);
    const day = notification.createdAt.toISOString().slice(0, 10);
    const owner = `${notification.schoolId || 'platform'}:${notification.userId || 'global'}`;
    const metadataDedupeKey =
      typeof metadata.dedupeKey === 'string' ? metadata.dedupeKey.trim() : '';

    if (metadataDedupeKey) {
      return `${owner}:${notification.type}:metadata:${metadataDedupeKey}:${day}`;
    }

    return [
      owner,
      notification.type,
      notification.title.trim(),
      notification.message.trim(),
      notification.actionUrl || '',
      day,
    ].join('|');
  }

  private dedupeNotifications(notifications: PrismaNotification[]) {
    const seen = new Set<string>();

    return notifications.filter((notification) => {
      const key = this.getNotificationDisplayDedupeKey(notification);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Helper to map categories to notification types
  private getTypesForCategory(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      attendance: [
        'ATTENDANCE_MARKED',
        'ATTENDANCE_ABSENT',
        'ATTENDANCE_LATE',
        'ATTENDANCE_SESSION_OPENED',
        'ATTENDANCE_SESSION_SUBMITTED',
      ],
      enrollment: [
        'ENROLLMENT_SUBMITTED',
        'ENROLLMENT_APPROVED',
        'ENROLLMENT_REJECTED',
        'ENROLLMENT_PENDING',
      ],
      academic: [
        'ASSIGNMENT_CREATED',
        'ASSIGNMENT_DUE',
        'ASSIGNMENT_GRADED',
        'RESULT_PUBLISHED',
        'GRADE_UPDATED',
      ],
      schedule: [
        'SCHEDULE_CHANGED',
        'CLASS_CANCELLED',
        'TIMETABLE_UPDATED',
        'PICKUP_REMINDER',
      ],
      communication: ['MESSAGE_RECEIVED', 'ANNOUNCEMENT', 'COMMUNICATION'],
      event: ['EVENT', 'EVENT_UPDATED', 'EVENT_DELETED'],
      finance: [
        'FEE_DUE',
        'FEE_PAID',
        'PAYMENT_RECEIVED',
        'PAYROLL_PAYMENT_DUE',
        'PAYROLL_RUN_REQUIRED',
      ],
      system: [
        'SYSTEM_ALERT',
        'SIREN_ALERT',
        'ACCOUNT_CREATED',
        'PASSWORD_RESET',
        'INFO',
        'WARNING',
        'ALERT',
      ],
    };

    return categoryMap[category.toLowerCase()] || [];
  }

  // Get notification categories with counts
  async getNotificationCategories(
    userId: string,
    userRole: string,
    schoolId?: string,
  ) {
    const canSeeSchoolGlobalNotifications =
      this.canViewSchoolGlobalNotifications(userRole);
    const canSeePlatformNotifications =
      this.canViewPlatformNotifications(userRole);

    const where: any = {
      userId,
    };

    if (canSeeSchoolGlobalNotifications) {
      where.OR = [{ userId }, { userId: null }];
      delete where.userId;
    }

    if (canSeePlatformNotifications) {
      where.OR = [
        { userId, schoolId: null },
        { userId: null, schoolId: null },
      ];
      delete where.userId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      select: { type: true, isRead: true },
    });
    const preferences = await this.getNotificationPreferences(userId, userRole);
    const visibleNotifications = notifications.filter((notification) =>
      this.isNotificationTypeEnabled(notification.type, preferences),
    );

    const categories = {
      all: {
        total: visibleNotifications.length,
        unread: visibleNotifications.filter((n) => !n.isRead).length,
      },
      attendance: { total: 0, unread: 0 },
      enrollment: { total: 0, unread: 0 },
      academic: { total: 0, unread: 0 },
      schedule: { total: 0, unread: 0 },
      communication: { total: 0, unread: 0 },
      event: { total: 0, unread: 0 },
      finance: { total: 0, unread: 0 },
      system: { total: 0, unread: 0 },
    };

    visibleNotifications.forEach((n) => {
      const type = n.type;
      const isUnread = !n.isRead;

      // Map types to categories
      if (
        [
          'ATTENDANCE_MARKED',
          'ATTENDANCE_ABSENT',
          'ATTENDANCE_LATE',
          'ATTENDANCE_SESSION_OPENED',
          'ATTENDANCE_SESSION_SUBMITTED',
        ].includes(type)
      ) {
        categories.attendance.total++;
        if (isUnread) categories.attendance.unread++;
      } else if (
        [
          'ENROLLMENT_SUBMITTED',
          'ENROLLMENT_APPROVED',
          'ENROLLMENT_REJECTED',
          'ENROLLMENT_PENDING',
        ].includes(type)
      ) {
        categories.enrollment.total++;
        if (isUnread) categories.enrollment.unread++;
      } else if (
        [
          'ASSIGNMENT_CREATED',
          'ASSIGNMENT_DUE',
          'ASSIGNMENT_GRADED',
          'RESULT_PUBLISHED',
          'GRADE_UPDATED',
        ].includes(type)
      ) {
        categories.academic.total++;
        if (isUnread) categories.academic.unread++;
      } else if (
        [
          'SCHEDULE_CHANGED',
          'CLASS_CANCELLED',
          'TIMETABLE_UPDATED',
          'PICKUP_REMINDER',
        ].includes(type)
      ) {
        categories.schedule.total++;
        if (isUnread) categories.schedule.unread++;
      } else if (
        ['MESSAGE_RECEIVED', 'ANNOUNCEMENT', 'COMMUNICATION'].includes(type)
      ) {
        categories.communication.total++;
        if (isUnread) categories.communication.unread++;
      } else if (['EVENT', 'EVENT_UPDATED', 'EVENT_DELETED'].includes(type)) {
        categories.event.total++;
        if (isUnread) categories.event.unread++;
      } else if (
        [
          'FEE_DUE',
          'FEE_PAID',
          'PAYMENT_RECEIVED',
          'PAYROLL_PAYMENT_DUE',
          'PAYROLL_RUN_REQUIRED',
        ].includes(type)
      ) {
        categories.finance.total++;
        if (isUnread) categories.finance.unread++;
      } else if (
        [
          'SYSTEM_ALERT',
          'SIREN_ALERT',
          'ACCOUNT_CREATED',
          'PASSWORD_RESET',
          'INFO',
          'WARNING',
          'ALERT',
        ].includes(type)
      ) {
        categories.system.total++;
        if (isUnread) categories.system.unread++;
      }
    });

    return categories;
  }

  async getUnreadCount(
    userId: string,
    userRole: string,
    schoolId?: string,
    types?: string[],
  ) {
    const canSeeSchoolGlobalNotifications =
      this.canViewSchoolGlobalNotifications(userRole);
    const canSeePlatformNotifications =
      this.canViewPlatformNotifications(userRole);

    const where: any = {
      userId,
      isRead: false,
    };

    if (canSeeSchoolGlobalNotifications) {
      where.OR = [
        { userId, isRead: false },
        { userId: null, isRead: false },
      ];
      delete where.userId;
      delete where.isRead;
    }

    if (canSeePlatformNotifications) {
      where.OR = [
        { userId, schoolId: null, isRead: false },
        { userId: null, schoolId: null, isRead: false },
      ];
      delete where.userId;
      delete where.isRead;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    if (types?.length) {
      where.type = { in: types };
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      select: {
        type: true,
        isRead: true,
      },
    });
    const preferences = await this.getNotificationPreferences(userId, userRole);

    return notifications.filter(
      (notification) =>
        !notification.isRead &&
        this.isNotificationTypeEnabled(notification.type, preferences),
    ).length;
  }

  async markAsRead(
    notificationId: string,
    userId: string,
    schoolId?: string,
    userRole?: string,
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return null;
    }

    const canReadSchoolGlobal =
      notification.userId === null &&
      schoolId &&
      notification.schoolId === schoolId &&
      this.canViewSchoolGlobalNotifications(userRole || '');

    // Only allow marking as read if notification belongs to user or is global
    if (notification.userId === userId || canReadSchoolGlobal) {
      // For global notifications, we need to track read status differently
      // For now, we'll just update the notification if it belongs to the user
      if (notification.userId === userId) {
        if (schoolId && notification.schoolId !== schoolId) {
          return null;
        }
        return this.prisma.notification.update({
          where: { id: notificationId },
          data: { isRead: true },
        });
      }
      // For global notifications, return as-is (would need a separate read tracking table)
      return notification;
    }

    return null;
  }

  async markAllAsRead(userId: string, schoolId?: string, types?: string[]) {
    // Mark all user-specific notifications as read
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        ...(schoolId ? { schoolId } : {}),
        ...(types?.length ? { type: { in: types } } : {}),
      },
      data: {
        isRead: true,
      },
    });

    return { success: true };
  }

  async createNotification(data: {
    schoolId: string;
    userId?: string;
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
    metadata?: any;
    bypassPreferences?: boolean;
  }) {
    const metadata = this.serializeNotificationMetadata(data.metadata);
    const actionUrl = data.actionUrl || null;
    const since = this.getNotificationCreateDedupeSince();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${this.getNotificationCreateLockKey({
          schoolId: data.schoolId,
          userId: data.userId || null,
          title: data.title,
          message: data.message,
          type: data.type,
          actionUrl,
          metadata,
        })}))`,
      );

      const existing = await tx.notification.findFirst({
        where: {
          schoolId: data.schoolId,
          userId: data.userId || null,
          title: data.title,
          message: data.message,
          type: data.type,
          actionUrl,
          metadata,
          createdAt: { gte: since },
        },
      });

      if (existing) return { notification: existing, created: false };

      const notification = await tx.notification.create({
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

      return { notification, created: true };
    });

    if (data.userId && result.created) {
      try {
        await this.sendPushToUsers([data.userId], {
          title: data.title,
          message: data.message,
          type: data.type,
          actionUrl: data.actionUrl,
          notificationId: result.notification.id,
          metadata: data.metadata,
        });
      } catch (error: any) {
        this.logger.warn(
          `Push delivery lookup failed for notification ${result.notification.id}: ${error?.message || 'unknown error'}`,
        );
      }
    }

    return result.notification;
  }

  async createBulkNotifications(data: {
    schoolId: string;
    userIds: string[];
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    const eligibleUserIds = Array.from(new Set(data.userIds)).filter(Boolean);

    if (eligibleUserIds.length === 0) {
      return { count: 0 };
    }

    const metadata = this.serializeNotificationMetadata(data.metadata);
    const actionUrl = data.actionUrl || null;
    const since = this.getNotificationCreateDedupeSince();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${this.getNotificationCreateLockKey({
          schoolId: data.schoolId,
          userId: 'bulk',
          title: data.title,
          message: data.message,
          type: data.type,
          actionUrl,
          metadata,
        })}))`,
      );

      const existingNotifications = await tx.notification.findMany({
        where: {
          schoolId: data.schoolId,
          userId: { in: eligibleUserIds },
          title: data.title,
          message: data.message,
          type: data.type,
          actionUrl,
          metadata,
          createdAt: { gte: since },
        },
        select: { userId: true },
      });
      const existingUserIds = new Set(
        existingNotifications
          .map((notification) => notification.userId)
          .filter((userId): userId is string => Boolean(userId)),
      );
      const userIdsToCreate = eligibleUserIds.filter(
        (userId) => !existingUserIds.has(userId),
      );

      if (userIdsToCreate.length === 0) {
        return { notifications: { count: 0 }, userIdsToCreate };
      }

      const notifications = await tx.notification.createMany({
        data: userIdsToCreate.map((userId) => ({
          schoolId: data.schoolId,
          userId,
          title: data.title,
          message: data.message,
          type: data.type,
          actionUrl,
          metadata,
        })),
      });

      return { notifications, userIdsToCreate };
    });

    if (result.userIdsToCreate.length > 0) {
      await this.sendPushToUsers(result.userIdsToCreate, {
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
      });
    }

    return result.notifications;
  }

  private getNotificationCreateDedupeSince() {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    return since;
  }

  private getNotificationCreateLockKey(data: {
    schoolId: string;
    userId: string | null;
    title: string;
    message: string;
    type: string;
    actionUrl: string | null;
    metadata: string | null;
  }) {
    return [
      'notification-create',
      data.schoolId,
      data.userId || 'global',
      data.type,
      data.title,
      data.message,
      data.actionUrl || '',
      data.metadata || '',
    ].join('|');
  }

  private serializeNotificationMetadata(metadata: any) {
    if (metadata === undefined || metadata === null) return null;
    return JSON.stringify(this.normalizeNotificationMetadata(metadata));
  }

  private normalizeNotificationMetadata(value: any): unknown {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeNotificationMetadata(item));
    }
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = this.normalizeNotificationMetadata(value[key]);
          return acc;
        }, {});
    }
    return value;
  }

  private toHHMM(date: Date, timeZone = 'Africa/Addis_Ababa') {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hours = parts.find((part) => part.type === 'hour')?.value || '00';
    const minutes = parts.find((part) => part.type === 'minute')?.value || '00';
    return `${hours}:${minutes}`;
  }

  private normalizeHHMM(value: unknown) {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private parseSettingValue(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private isWeekend(date: Date, timeZone = 'Africa/Addis_Ababa') {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    }).format(date);
    return weekday === 'Sat' || weekday === 'Sun';
  }

  private getLocalDayRange(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  @Cron('0 * * * * *')
  async sendSchoolPickupReminders() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 20 * 60 * 1000);

      const schools = await this.prisma.school.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          timezone: true,
        },
      });
      const endTimeSettings = await this.prisma.schoolSetting.findMany({
        where: {
          key: { in: ['SCHOOL_END_TIME', 'calendar_type'] },
          schoolId: { in: schools.map((school) => school.id) },
        },
        select: {
          schoolId: true,
          key: true,
          value: true,
        },
      });
      const endTimeBySchoolId = new Map(
        endTimeSettings
          .filter((setting) => setting.key === 'SCHOOL_END_TIME')
          .map((setting) => [setting.schoolId, setting.value]),
      );
      const calendarTypeBySchoolId = new Map(
        endTimeSettings
          .filter((setting) => setting.key === 'calendar_type')
          .map((setting) => [
            setting.schoolId,
            this.parseSettingValue(setting.value),
          ]),
      );

      for (const school of schools) {
        const calendarType = calendarTypeBySchoolId.get(school.id);
        const timeZone =
          calendarType === 'ETHIOPIAN'
            ? 'Africa/Addis_Ababa'
            : school.timezone || 'Africa/Addis_Ababa';
        const targetTime = this.toHHMM(reminderTime, timeZone);

        if (this.isWeekend(now, timeZone)) {
          continue;
        }

        const schoolEndTime = this.normalizeHHMM(
          this.parseSettingValue(endTimeBySchoolId.get(school.id)) || '15:00',
        );

        if (schoolEndTime !== targetTime) {
          continue;
        }

        await this.sendPickupReminderForSchool(
          school.id,
          school.name,
          schoolEndTime,
          now,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send school pickup reminders', error);
    }
  }

  private async sendPickupReminderForSchool(
    schoolId: string,
    schoolName: string,
    schoolEndTime: string,
    now: Date,
  ) {
    const { start, end } = this.getLocalDayRange(now);
    const lockKey = `pickup-reminder:${schoolId}:${schoolEndTime}:${start.toISOString().slice(0, 10)}`;
    const notifications = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const parentLinks = await tx.parentStudent.findMany({
        where: {
          schoolId,
          student: {
            enrollmentStatus: 'APPROVED',
          },
        },
        select: {
          parent: {
            select: {
              userId: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      const parentNameByUserId = new Map<string, string>();
      for (const link of parentLinks) {
        if (link.parent.userId) {
          parentNameByUserId.set(link.parent.userId, link.parent.user.name);
        }
      }
      const parentUserIds = Array.from(parentNameByUserId.keys());

      if (parentUserIds.length === 0) {
        return [];
      }

      const existing = await tx.notification.findMany({
        where: {
          schoolId,
          userId: { in: parentUserIds },
          type: NotificationType.PICKUP_REMINDER,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: { userId: true, metadata: true },
      });
      const alreadySent = new Set(
        existing
          .filter((notification) => {
            const metadata = notification.metadata as Record<string, unknown> | null;
            return metadata?.schoolEndTime === schoolEndTime;
          })
          .map((notification) => notification.userId),
      );
      const unsentParentIds = parentUserIds.filter((userId) => !alreadySent.has(userId));

      if (unsentParentIds.length === 0) {
        return [];
      }

      return Promise.all(
        unsentParentIds.map(async (parentUserId) => {
          const lang = await this.getUserLanguage(parentUserId);
          const t = this.translate('pickupReminder', lang);
          return tx.notification.create({
            data: {
              schoolId,
              userId: parentUserId,
              title: t.title,
              message: t.message,
              type: NotificationType.PICKUP_REMINDER,
              actionUrl: '/parent',
              metadata: JSON.stringify({
                schoolEndTime,
                reminderMinutes: 20,
              }),
            },
          });
        })
      );
    });

    await Promise.all(
      notifications.map((notification) =>
        this.sendPushToUsers([notification.userId].filter(Boolean) as string[], {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          actionUrl: notification.actionUrl || undefined,
          notificationId: notification.id,
          metadata: {
            schoolEndTime,
            reminderMinutes: 20,
          },
        }).catch((error: any) => {
          this.logger.warn(
            `Push delivery lookup failed for notification ${notification.id}: ${error?.message || 'unknown error'}`,
          );
        }),
      ),
    );
  }

  async createGlobalNotification(data: {
    schoolId: string;
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    const users = await this.prisma.user.findMany({
      where: {
        schoolId: data.schoolId,
        isActive: true,
      },
      select: { id: true },
    });

    const eligibleUserIds = Array.from(new Set(users.map((user) => user.id))).filter(Boolean);

    if (eligibleUserIds.length === 0) {
      return { count: 0 };
    }

    const notifications = await this.prisma.notification.createMany({
      data: eligibleUserIds.map((userId) => ({
        schoolId: data.schoolId,
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      })),
    });

    await this.sendPushToUsers(eligibleUserIds, {
      title: data.title,
      message: data.message,
      type: data.type,
      actionUrl: data.actionUrl,
      metadata: data.metadata,
    });

    return notifications;
  }

  async createPlatformNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    const id = randomUUID();
    await this.prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "Notification" (
          "id",
          "schoolId",
          "userId",
          "title",
          "message",
          "type",
          "actionUrl",
          "metadata",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          NULL,
          ${data.userId},
          ${data.title},
          ${data.message},
          ${data.type},
          ${data.actionUrl || null},
          ${data.metadata ? JSON.stringify(data.metadata) : null},
          NOW(),
          NOW()
        )
      `,
    );

    await this.sendPushToUsers([data.userId], {
      title: data.title,
      message: data.message,
      type: data.type,
      actionUrl: data.actionUrl,
      notificationId: id,
      metadata: data.metadata,
    }).catch((error: any) => {
      this.logger.warn(
        `Push delivery lookup failed for platform notification ${id}: ${error?.message || 'unknown error'}`,
      );
    });

    return { id, ...data, schoolId: null };
  }

  @Cron('0 9 * * *')
  async sendSuperAdminPlatformNotifications() {
    const superAdmins = await this.prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN' as any,
        isActive: true,
      },
      select: { id: true },
    });

    if (superAdmins.length === 0) {
      this.logger.warn('No active SUPER_ADMIN user exists for platform notifications');
      return;
    }

    const backupState = await this.getPlatformBackupState();
    if (backupState.isOverdue) {
      await this.notifySuperAdminsOnce({
        userIds: superAdmins.map((user) => user.id),
        title: backupState.lastBackupAt
          ? 'Platform backup is overdue'
          : 'No platform backup has been recorded',
        message: backupState.lastBackupAt
          ? `The last full platform backup was ${backupState.daysSinceLastBackup} days ago. Download a fresh backup from Super Admin backups.`
          : 'No full platform backup download has been recorded yet. Download a full platform backup from Super Admin backups.',
        type: NotificationType.ALERT,
        actionUrl: '/superadmin/backups',
        dedupeKey: 'platform-backup-overdue',
        dedupeDays: 1,
        metadata: {
          lastBackupAt: backupState.lastBackupAt?.toISOString() || null,
          daysSinceLastBackup: backupState.daysSinceLastBackup,
          reminderDays: this.platformBackupReminderDays,
          severity: 'HIGH',
        },
      });
    }

    const dbSize = await this.getDatabaseSizeMb();
    if (dbSize !== null && dbSize >= this.platformDangerDbSizeMb) {
      await this.notifySuperAdminsOnce({
        userIds: superAdmins.map((user) => user.id),
        title: 'Database size is above danger threshold',
        message: `The database is about ${Math.round(dbSize)} MB, above the configured ${this.platformDangerDbSizeMb} MB danger threshold. Review storage and backup status.`,
        type: NotificationType.SYSTEM_ALERT,
        actionUrl: '/superadmin',
        dedupeKey: 'database-size-danger',
        dedupeDays: 1,
        metadata: {
          databaseSizeMb: Math.round(dbSize),
          thresholdMb: this.platformDangerDbSizeMb,
          severity: 'HIGH',
        },
      });
    }

    if (new Date().getDay() === 1) {
      const summary = await this.getPlatformSummary(dbSize);
      await this.notifySuperAdminsOnce({
        userIds: superAdmins.map((user) => user.id),
        title: 'Weekly platform status summary',
        message: `${summary.activeSchools} active schools, ${summary.activeUsers} active users, database ${summary.databaseSizeMb ?? 'unknown'} MB. Last platform backup: ${summary.lastBackupLabel}.`,
        type: NotificationType.INFO,
        actionUrl: '/superadmin',
        dedupeKey: 'weekly-platform-summary',
        dedupeDays: 6,
        metadata: summary,
      });
    }
  }

  private async notifySuperAdminsOnce(data: {
    userIds: string[];
    title: string;
    message: string;
    type: NotificationType;
    actionUrl: string;
    dedupeKey: string;
    dedupeDays: number;
    metadata?: Record<string, unknown>;
  }) {
    const since = new Date(Date.now() - data.dedupeDays * 24 * 60 * 60 * 1000);
    const createdNotifications = await Promise.all(
      data.userIds.map(async (userId) => {
        return this.prisma.$transaction(async (tx) => {
          const lockKey = `platform-notification:${userId}:${data.dedupeKey}`;
          await tx.$queryRaw(
            Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`,
          );

          const existing = await tx.notification.findFirst({
            where: {
              userId,
              schoolId: null as any,
              type: data.type,
              title: data.title,
              createdAt: { gte: since },
            },
            select: { id: true },
          });
          if (existing) return null;

          const id = randomUUID();
          const metadata = {
            ...data.metadata,
            dedupeKey: data.dedupeKey,
          };

          await tx.$executeRaw(
            Prisma.sql`
              INSERT INTO "Notification" (
                "id",
                "schoolId",
                "userId",
                "title",
                "message",
                "type",
                "actionUrl",
                "metadata",
                "createdAt",
                "updatedAt"
              )
              VALUES (
                ${id},
                NULL,
                ${userId},
                ${data.title},
                ${data.message},
                ${data.type},
                ${data.actionUrl || null},
                ${JSON.stringify(metadata)},
                NOW(),
                NOW()
              )
            `,
          );

          return { id, userId, metadata };
        });
      }),
    );

    await Promise.all(
      createdNotifications
        .filter(
          (
            notification,
          ): notification is NonNullable<(typeof createdNotifications)[number]> =>
            notification !== null,
        )
        .map((notification) =>
          this.sendPushToUsers([notification.userId], {
            title: data.title,
            message: data.message,
            type: data.type,
            actionUrl: data.actionUrl,
            notificationId: notification.id,
            metadata: notification.metadata,
          }).catch((error: any) => {
            this.logger.warn(
              `Push delivery lookup failed for platform notification ${notification.id}: ${error?.message || 'unknown error'}`,
            );
          }),
        ),
    );
  }

  private async getPlatformBackupState() {
    const rows = await this.prisma.$queryRaw<Array<{ lastBackupAt: Date | null }>>(
      Prisma.sql`
        SELECT MAX("createdAt") AS "lastBackupAt"
        FROM "SystemAuditLog"
        WHERE "action" = 'BACKUP_DOWNLOAD'
          AND "entityType" = 'PLATFORM_BACKUP'
      `,
    );
    const lastBackupAt = rows[0]?.lastBackupAt || null;
    const daysSinceLastBackup = lastBackupAt
      ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (24 * 60 * 60 * 1000))
      : null;

    return {
      lastBackupAt: lastBackupAt ? new Date(lastBackupAt) : null,
      daysSinceLastBackup,
      isOverdue:
        !lastBackupAt ||
        (daysSinceLastBackup !== null &&
          daysSinceLastBackup >= this.platformBackupReminderDays),
    };
  }

  private async getDatabaseSizeMb() {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ sizeMb: number }>>(
        Prisma.sql`SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 AS "sizeMb"`,
      );
      return Number(rows[0]?.sizeMb ?? null);
    } catch (error: any) {
      this.logger.warn(`Unable to check database size: ${error?.message || 'unknown error'}`);
      return null;
    }
  }

  private async getPlatformSummary(databaseSizeMb: number | null) {
    const [schoolCounts, userCounts, backupState] = await Promise.all([
      this.prisma.school.groupBy({
        by: ['isActive'],
        _count: { _all: true },
      }),
      this.prisma.user.groupBy({
        by: ['isActive'],
        _count: { _all: true },
      }),
      this.getPlatformBackupState(),
    ]);

    const activeSchools =
      schoolCounts.find((row) => row.isActive)?._count._all || 0;
    const activeUsers = userCounts.find((row) => row.isActive)?._count._all || 0;

    return {
      activeSchools,
      activeUsers,
      databaseSizeMb:
        databaseSizeMb === null ? null : Math.round(databaseSizeMb),
      lastBackupAt: backupState.lastBackupAt?.toISOString() || null,
      lastBackupLabel: backupState.lastBackupAt
        ? `${backupState.daysSinceLastBackup} days ago`
        : 'never recorded',
      backupReminderDays: this.platformBackupReminderDays,
    };
  }

  async savePushSubscription(data: {
    schoolId: string;
    userId: string;
    subscription: PushSubscriptionPayload;
    userAgent?: string;
  }) {
    if (!data.subscription?.endpoint) {
      throw new BadRequestException('Subscription endpoint is required');
    }

    // For super admin, schoolId might not be present - that's okay
    if (!data.schoolId && data.userId) {
      // Allow super admin to have push subscriptions without school
      this.logger.warn(`Saving push subscription for user ${data.userId} without schoolId (super admin)`);
    }

    if (!data.subscription.keys?.p256dh || !data.subscription.keys?.auth) {
      throw new BadRequestException('Subscription keys are required');
    }

    const id = randomUUID().replace(/-/g, '');
    const expirationTime =
      typeof data.subscription.expirationTime === 'number'
        ? BigInt(Math.trunc(data.subscription.expirationTime))
        : null;

    await this.prisma.$executeRaw`
      INSERT INTO "PushSubscription" (
        id,
        "schoolId",
        "userId",
        endpoint,
        p256dh,
        auth,
        "expirationTime",
        "userAgent",
        "failureCount",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${data.schoolId || null},
        ${data.userId},
        ${data.subscription.endpoint},
        ${data.subscription.keys.p256dh},
        ${data.subscription.keys.auth},
        ${expirationTime},
        ${data.userAgent?.slice(0, 500) || null},
        0,
        NOW(),
        NOW()
      )
      ON CONFLICT (endpoint) DO UPDATE SET
        "schoolId" = EXCLUDED."schoolId",
        "userId" = EXCLUDED."userId",
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        "expirationTime" = EXCLUDED."expirationTime",
        "userAgent" = EXCLUDED."userAgent",
        "failureCount" = 0,
        "lastFailureAt" = NULL,
        "updatedAt" = NOW()
    `;

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; endpoint: string }>
    >`
      SELECT id, endpoint
      FROM "PushSubscription"
      WHERE endpoint = ${data.subscription.endpoint}
      LIMIT 1
    `;

    return rows[0] ?? { endpoint: data.subscription.endpoint };
  }

  async removePushSubscription(userId: string, endpoint: string) {
    await this.prisma.$executeRaw`
      DELETE FROM "PushSubscription"
      WHERE userId = ${userId} AND endpoint = ${endpoint}
    `;

    return { success: true };
  }

  private buildPushPayload(data: {
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
    notificationId?: string;
    metadata?: any;
  }): string {
    const payload: PushNotificationPayload = {
      title: data.title,
      body: data.message,
      tag: data.type,
      url: data.actionUrl,
      type: data.type,
      notificationId: data.notificationId,
      metadata:
        data.metadata && typeof data.metadata === 'object'
          ? data.metadata
          : undefined,
    };

    return JSON.stringify(payload);
  }

  private async sendPushToSubscriptions(
    subscriptions: Array<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>,
    payload: string,
  ) {
    if (!this.isWebPushConfigured() || subscriptions.length === 0) {
      return;
    }

    await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
          );

          await this.prisma.$executeRaw`
            UPDATE "PushSubscription"
            SET
              "lastSuccessfulAt" = NOW(),
              "lastFailureAt" = NULL,
              "failureCount" = 0,
              "updatedAt" = NOW()
            WHERE id = ${subscription.id}
          `;
        } catch (error: any) {
          const statusCode = error?.statusCode;

          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.$executeRaw`
              DELETE FROM "PushSubscription"
              WHERE id = ${subscription.id}
            `;
            return;
          }

          await this.prisma.$executeRaw`
            UPDATE "PushSubscription"
            SET
              "lastFailureAt" = NOW(),
              "failureCount" = "failureCount" + 1,
              "updatedAt" = NOW()
            WHERE id = ${subscription.id}
          `;

          this.logger.warn(
            `Push delivery failed for subscription ${subscription.id}: ${error?.message || 'unknown error'}`,
          );
        }
      }),
    );
  }

  private async sendPushToUsers(
    userIds: string[],
    data: {
      title: string;
      message: string;
      type: string;
      actionUrl?: string;
      notificationId?: string;
      metadata?: any;
    },
  ) {
    if (!this.isWebPushConfigured() || userIds.length === 0) {
      return;
    }

    const uniqueUserIds = Array.from(
      new Set(
        await this.filterPushEligibleUserIdsForNotification(userIds, data.type),
      ),
    );

    if (uniqueUserIds.length === 0) {
      return;
    }

    const subscriptions = await this.prisma.$queryRaw<
      Array<{
        id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
      }>
    >(Prisma.sql`
      SELECT id, endpoint, p256dh, auth
      FROM "PushSubscription"
      WHERE "userId" IN (${Prisma.join(uniqueUserIds)})
    `);

    if (subscriptions.length === 0) {
      return;
    }

    const payload = this.buildPushPayload(data);
    await this.sendPushToSubscriptions(subscriptions, payload);
  }

  private async sendPushToSchool(
    schoolId: string,
    data: {
      title: string;
      message: string;
      type: string;
      actionUrl?: string;
      notificationId?: string;
      metadata?: any;
    },
  ) {
    if (!this.isWebPushConfigured()) {
      return;
    }

    const subscriptions = await this.prisma.$queryRaw<
      Array<{
        id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
      }>
    >`
      SELECT id, endpoint, p256dh, auth
      FROM "PushSubscription"
      WHERE "schoolId" = ${schoolId}
    `;

    if (subscriptions.length === 0) {
      return;
    }

    const payload = this.buildPushPayload(data);
    await this.sendPushToSubscriptions(subscriptions, payload);
  }

  // ==================== ROLE-SPECIFIC NOTIFICATION METHODS ====================

  /**
   * Notify admins/registrars about new enrollment
   */
  async notifyAdminsOfNewEnrollment(
    schoolId: string,
    studentName: string,
    grade: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ['ADMIN', 'REGISTRAR'] },
      },
      select: { id: true },
    });

    if (users.length === 0) return;

    const notifications = await Promise.all(
      users.map(async (u) => {
        const lang = await this.getUserLanguage(u.id);
        const t = this.translate('newEnrollment', lang, studentName, grade);
        return this.createNotification({
          schoolId,
          userId: u.id,
          title: t.title,
          message: t.message,
          type: NotificationType.ENROLLMENT_PENDING,
          actionUrl: '/admin/enrollment',
          metadata: { studentName, grade },
        });
      })
    );

    return { count: notifications.length };
  }

  /**
   * Notify student/parent of enrollment approval
   */
  async notifyEnrollmentApproval(
    schoolId: string,
    userId: string,
    studentName: string,
    className: string,
  ) {
    const lang = await this.getUserLanguage(userId);
    const t = this.translate('enrollmentApproved', lang, studentName, className);
    return this.createNotification({
      schoolId,
      userId,
      title: t.title,
      message: t.message,
      type: NotificationType.ENROLLMENT_APPROVED,
      actionUrl: '/student/profile',
      metadata: { studentName, className },
    });
  }

  async notifyEnrollmentRejection(
    schoolId: string,
    userId: string,
    studentName: string,
    reason?: string,
  ) {
    const lang = await this.getUserLanguage(userId);
    const t = this.translate('enrollmentRejected', lang, studentName, reason || '');
    return this.createNotification({
      schoolId,
      userId,
      title: t.title,
      message: t.message,
      type: NotificationType.ENROLLMENT_REJECTED,
      actionUrl: '/enroll',
      metadata: { studentName, reason },
    });
  }

  async notifyParentOfAbsence(
    schoolId: string,
    parentId: string,
    studentName: string,
    date: string,
    className: string,
  ) {
    const lang = await this.getUserLanguage(parentId);
    const t = this.translate('attendanceAlert', lang, studentName, date, className);
    return this.createNotification({
      schoolId,
      userId: parentId,
      title: t.title,
      message: t.message,
      type: NotificationType.ATTENDANCE_ABSENT,
      actionUrl: '/parent/attendance',
      metadata: { studentName, date, className },
    });
  }

  async notifyParentOfLate(
    schoolId: string,
    parentId: string,
    studentName: string,
    time: string,
    className: string,
  ) {
    const lang = await this.getUserLanguage(parentId);
    const t = this.translate('lateArrival', lang, studentName, time, className);
    return this.createNotification({
      schoolId,
      userId: parentId,
      title: t.title,
      message: t.message,
      type: NotificationType.ATTENDANCE_LATE,
      actionUrl: '/parent/attendance',
      metadata: { studentName, time, className },
    });
  }

  async notifyTeacherAttendanceSession(
    schoolId: string,
    teacherId: string,
    className: string,
    subject: string,
  ) {
    const lang = await this.getUserLanguage(teacherId);
    const t = this.translate('attendanceSessionOpened', lang, className, subject);
    return this.createNotification({
      schoolId,
      userId: teacherId,
      title: t.title,
      message: t.message,
      type: NotificationType.ATTENDANCE_SESSION_OPENED,
      actionUrl: '/teacher/attendance',
      metadata: { className, subject },
    });
  }

  async notifyTeacherAttendanceReminder(
    schoolId: string,
    teacherId: string,
    className: string,
    subject: string,
    startTime: string,
  ) {
    const lang = await this.getUserLanguage(teacherId);
    const t = this.translate('attendanceReminder', lang, className, subject, startTime);
    return this.createNotification({
      schoolId,
      userId: teacherId,
      title: t.title,
      message: t.message,
      type: NotificationType.ATTENDANCE_SESSION_OPENED,
      actionUrl: '/teacher/attendance',
      metadata: { className, subject, startTime },
    });
  }

  async notifyHomeroomMissingAttendance(
    schoolId: string,
    teacherId: string,
    className: string,
    grade: number,
    section: string,
    date: string,
  ) {
    const lang = await this.getUserLanguage(teacherId);
    const calendarType = await this.getSchoolCalendarType(schoolId);
    const displayDate = formatSchoolDate(
      this.parseDateOnlyAsLocalDay(date),
      { calendarType },
    );
    const t = this.translate(
      'missingAttendanceReminder',
      lang,
      className,
      String(grade),
      section,
      displayDate,
    );
    return this.createNotification({
      schoolId,
      userId: teacherId,
      title: t.title,
      message: t.message,
      type: NotificationType.ATTENDANCE_SESSION_OPENED,
      actionUrl: '/teacher/attendance',
      metadata: { className, grade, section, date, displayDate, calendarType },
      bypassPreferences: true,
    });
  }

  async notifyStudentsOfAssignment(
    schoolId: string,
    studentIds: string[],
    assignmentTitle: string,
    dueDate: string,
    className: string,
  ) {
    const notifications = await Promise.all(
      studentIds.map(async (studentId) => {
        const lang = await this.getUserLanguage(studentId);
        const t = this.translate('newAssignment', lang, assignmentTitle, dueDate, className);
        return this.createNotification({
          schoolId,
          userId: studentId,
          title: t.title,
          message: t.message,
          type: NotificationType.ASSIGNMENT_CREATED,
          actionUrl: '/student/assignments',
          metadata: { assignmentTitle, dueDate, className },
        });
      })
    );
    return { count: notifications.length };
  }

  async notifyParentsOfAssignment(
    schoolId: string,
    parentIds: string[],
    assignmentTitle: string,
    dueDate: string,
    studentName: string,
  ) {
    const notifications = await Promise.all(
      parentIds.map(async (parentId) => {
        const lang = await this.getUserLanguage(parentId);
        const t = this.translate('assignmentForChild', lang, studentName, assignmentTitle, dueDate);
        return this.createNotification({
          schoolId,
          userId: parentId,
          title: t.title,
          message: t.message,
          type: NotificationType.ASSIGNMENT_CREATED,
          actionUrl: '/parent/assignments',
          metadata: { assignmentTitle, dueDate, studentName },
        });
      })
    );
    return { count: notifications.length };
  }

  async notifyStudentOfGrade(
    schoolId: string,
    studentId: string,
    assignmentTitle: string,
    grade: string,
    className: string,
  ) {
    const lang = await this.getUserLanguage(studentId);
    const t = this.translate('assignmentGraded', lang, assignmentTitle, grade, className);
    return this.createNotification({
      schoolId,
      userId: studentId,
      title: t.title,
      message: t.message,
      type: NotificationType.ASSIGNMENT_GRADED,
      actionUrl: '/student/results',
      metadata: { assignmentTitle, grade, className },
    });
  }

  async notifyParentOfChildGrade(
    schoolId: string,
    parentId: string,
    studentName: string,
    assignmentTitle: string,
    grade: string,
  ) {
    const lang = await this.getUserLanguage(parentId);
    const t = this.translate('childAssignmentGraded', lang, studentName, assignmentTitle, grade);
    return this.createNotification({
      schoolId,
      userId: parentId,
      title: t.title,
      message: t.message,
      type: NotificationType.ASSIGNMENT_GRADED,
      actionUrl: '/parent/results',
      metadata: { studentName, assignmentTitle, grade },
    });
  }

  async notifyResultPublished(
    schoolId: string,
    userIds: string[],
    term: string,
    className: string,
  ) {
    const notifications = await Promise.all(
      userIds.map(async (userId) => {
        const lang = await this.getUserLanguage(userId);
        const t = this.translate('resultsPublished', lang, term, className);
        return this.createNotification({
          schoolId,
          userId,
          title: t.title,
          message: t.message,
          type: NotificationType.RESULT_PUBLISHED,
          actionUrl: '/results',
          metadata: { term, className },
        });
      })
    );
    return { count: notifications.length };
  }

  async notifyAssessmentStarted(
    schoolId: string,
    teacherIds: string[],
    assessmentTitle: string,
    assessmentType: string,
    className: string,
    subjectName: string,
    metadata?: Record<string, unknown>,
  ) {
    const notifications = await Promise.all(
      teacherIds.map(async (teacherId) => {
        const lang = await this.getUserLanguage(teacherId);
        const t = this.translate('assessmentStarted', lang, assessmentType, assessmentTitle, className, subjectName);
        return this.createNotification({
          schoolId,
          userId: teacherId,
          title: t.title,
          message: t.message,
          type: NotificationType.ASSESSMENT_CREATED,
          actionUrl: '/teacher/exams',
          metadata: { assessmentTitle, assessmentType, className, subjectName, ...metadata },
        });
      })
    );
    return { count: notifications.length };
  }

  async notifyScheduleChange(
    schoolId: string,
    userIds: string[],
    message: string,
  ) {
    const notifications = await Promise.all(
      userIds.map(async (userId) => {
        const lang = await this.getUserLanguage(userId);
        const t = this.translate('scheduleChange', lang);
        return this.createNotification({
          schoolId,
          userId,
          title: t.title,
          message: message || t.message,
          type: NotificationType.SCHEDULE_CHANGED,
          actionUrl: '/schedule',
        });
      })
    );
    return { count: notifications.length };
  }

  async notifyTimetableUpdate(
    schoolId: string,
    userIds: string[],
    className: string,
  ) {
    const notifications = await Promise.all(
      userIds.map(async (userId) => {
        const lang = await this.getUserLanguage(userId);
        const t = this.translate('timetableUpdated', lang, className);
        return this.createNotification({
          schoolId,
          userId,
          title: t.title,
          message: t.message,
          type: NotificationType.TIMETABLE_UPDATED,
          actionUrl: '/timetable',
          metadata: { className },
        });
      })
    );
    return { count: notifications.length };
  }

  async notifyFeeDue(
    schoolId: string,
    userId: string,
    amount: string,
    dueDate: string,
    studentName?: string,
  ) {
    const lang = await this.getUserLanguage(userId);
    const t = this.translate('feeReminder', lang, amount, dueDate, studentName || '');
    return this.createNotification({
      schoolId,
      userId,
      title: t.title,
      message: t.message,
      type: NotificationType.FEE_DUE,
      actionUrl: '/fees',
      metadata: { amount, dueDate, studentName },
    });
  }

  async notifyPaymentReceived(
    schoolId: string,
    userId: string,
    amount: string,
    receiptNumber: string,
  ) {
    const lang = await this.getUserLanguage(userId);
    const t = this.translate('paymentReceived', lang, amount, receiptNumber);
    return this.createNotification({
      schoolId,
      userId,
      title: t.title,
      message: t.message,
      type: NotificationType.PAYMENT_RECEIVED,
      actionUrl: '/fees',
      metadata: { amount, receiptNumber },
    });
  }

  async notifyNewMessage(
    schoolId: string,
    userId: string,
    senderName: string,
    preview: string,
  ) {
    const lang = await this.getUserLanguage(userId);
    const shortPreview = preview.length > 50 ? `${preview.substring(0, 50)}...` : preview;
    const t = this.translate('newMessage', lang, senderName, shortPreview);
    return this.createNotification({
      schoolId,
      userId,
      title: t.title,
      message: t.message,
      type: NotificationType.MESSAGE_RECEIVED,
      actionUrl: '/messages',
      metadata: { senderName },
    });
  }

  async notifyAccountCreated(
    schoolId: string,
    userId: string,
    tempPassword?: boolean,
  ) {
    const lang = await this.getUserLanguage(userId);
    const t = this.translate('welcome', lang, tempPassword ? 'true' : 'false');
    return this.createNotification({
      schoolId,
      userId,
      title: t.title,
      message: t.message,
      type: NotificationType.ACCOUNT_CREATED,
      actionUrl: '/profile',
    });
  }

  /**
   * Send announcement to all users in school
   */
  async sendSchoolAnnouncement(
    schoolId: string,
    title: string,
    message: string,
  ) {
    return this.createGlobalNotification({
      schoolId,
      title,
      message,
      type: NotificationType.ANNOUNCEMENT,
    });
  }

  /**
   * Send announcement to specific roles
   */
  async sendRoleAnnouncement(
    schoolId: string,
    role: string,
    title: string,
    message: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: { schoolId, role: role as any },
      select: { id: true },
    });

    if (users.length === 0) return;

    return this.createBulkNotifications({
      schoolId,
      userIds: users.map((u) => u.id),
      title,
      message,
      type: NotificationType.ANNOUNCEMENT,
    });
  }

  /**
   * Create system alert
   */
  async createSystemAlert(
    schoolId: string,
    title: string,
    message: string,
    actionUrl?: string,
  ) {
    return this.createGlobalNotification({
      schoolId,
      title,
      message,
      type: NotificationType.SYSTEM_ALERT,
      actionUrl,
    });
  }

  async notifyClassCancellation(
    schoolId: string,
    teacherIds: string[],
    className: string,
    date: string,
    reason?: string,
  ) {
    const notifications = await Promise.all(
      teacherIds.map(async (teacherId) => {
        const lang = await this.getUserLanguage(teacherId);
        const t = this.translate('classCancelled', lang, className, date, reason || '');
        return this.createNotification({
          schoolId,
          userId: teacherId,
          title: t.title,
          message: t.message,
          type: NotificationType.CLASS_CANCELLED,
          actionUrl: '/schedule',
          metadata: { className, date, reason },
        });
      })
    );
    return { count: notifications.length };
  }

  async notifyStudentsOfClassCancellation(
    schoolId: string,
    studentIds: string[],
    className: string,
    subject: string,
    date: string,
  ) {
    const notifications = await Promise.all(
      studentIds.map(async (studentId) => {
        const lang = await this.getUserLanguage(studentId);
        const t = this.translate('studentClassCancelled', lang, subject, className, date);
        return this.createNotification({
          schoolId,
          userId: studentId,
          title: t.title,
          message: t.message,
          type: NotificationType.CLASS_CANCELLED,
          actionUrl: '/student/schedule',
          metadata: { className, subject, date },
        });
      })
    );
    return { count: notifications.length };
  }

  async notifyAccountDeactivated(
    userId: string,
    schoolId: string,
    reason?: string,
  ) {
    const lang = await this.getUserLanguage(userId);
    const t = this.translate('accountDeactivated', lang, reason || '');
    return this.createNotification({
      schoolId,
      userId,
      title: t.title,
      message: t.message,
      type: NotificationType.ALERT,
      actionUrl: '/profile',
      metadata: { reason },
    });
  }

  async notifyAccountActivated(userId: string, schoolId: string) {
    const lang = await this.getUserLanguage(userId);
    const t = this.translate('accountActivated', lang);
    return this.createNotification({
      schoolId,
      userId,
      title: t.title,
      message: t.message,
      type: NotificationType.INFO,
      actionUrl: '/login',
      metadata: {},
    });
  }

  async notifyTeachersOfSiren(
    schoolId: string,
    type: string,
    triggerType: string,
    targetTeacherIds?: string[],
  ) {
    const teacherIds = targetTeacherIds !== undefined
      ? [...new Set(targetTeacherIds)]
      : (
          await this.prisma.user.findMany({
            where: {
              schoolId,
              role: 'TEACHER',
            },
            select: { id: true },
          })
        ).map((teacher) => teacher.id);

    if (teacherIds.length === 0) return;

    const isDynamic = triggerType === 'DYNAMIC';
    const isPeriodStart = type === 'PERIOD_START';
    const isPeriodEnd = type === 'PERIOD_END';

    const notifications = await Promise.all(
      teacherIds.map(async (teacherId) => {
        const lang = await this.getUserLanguage(teacherId);
        let t: { title: string; message: string };
        if (isDynamic) {
          if (isPeriodStart) {
            t = this.translate('classStarting', lang);
          } else if (isPeriodEnd) {
            t = this.translate('classEnded', lang);
          } else {
            const sirenLabel = this.formatSirenLabel(type);
            t = this.translate('classBell', lang, sirenLabel);
          }
        } else {
          t = this.translate('schoolBell', lang);
        }
        return this.createNotification({
          schoolId,
          userId: teacherId,
          title: t.title,
          message: t.message,
          type: NotificationType.SIREN_ALERT,
          actionUrl: '/teacher',
          metadata: {
            source: 'siren',
            sirenType: type,
            triggerType,
          },
        });
      })
    );
    return { count: notifications.length };
  }

  private formatSirenLabel(type: string) {
    return type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
