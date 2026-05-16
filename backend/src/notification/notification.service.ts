import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as webpush from 'web-push';
import { randomUUID } from 'crypto';

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

  private canViewSchoolGlobalNotifications(userRole: string) {
    return userRole === 'ADMIN' || userRole === 'IT_MANAGER';
  }

  constructor(private prisma: PrismaService) {
    this.configureWebPush();
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

    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        ...this.buildDefaultPreferencesForRole(role),
      },
    });
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

    const where: any = {
      userId, // User-specific notifications
    };

    // Add global notifications for both school admins and super admins
    if (canSeeSchoolGlobalNotifications) {
      where.OR = [{ userId }, { userId: null }];
      delete where.userId;
    }

    // Filter by schoolId for school-specific notifications (not for super admin)
    if (options?.schoolId) {
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

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 20,
    });

    const preferences = await this.getNotificationPreferences(userId, userRole);

    return notifications.filter((notification) =>
      this.isNotificationTypeEnabled(notification.type, preferences),
    );
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
      schedule: ['SCHEDULE_CHANGED', 'CLASS_CANCELLED', 'TIMETABLE_UPDATED'],
      communication: ['MESSAGE_RECEIVED', 'ANNOUNCEMENT', 'COMMUNICATION'],
      event: ['EVENT', 'EVENT_UPDATED', 'EVENT_DELETED'],
      finance: ['FEE_DUE', 'FEE_PAID', 'PAYMENT_RECEIVED'],
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

    const where: any = {
      userId,
    };

    if (canSeeSchoolGlobalNotifications) {
      where.OR = [{ userId }, { userId: null }];
      delete where.userId;
    }

    // Filter by schoolId for school-specific notifications
    if (schoolId) {
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
        ['SCHEDULE_CHANGED', 'CLASS_CANCELLED', 'TIMETABLE_UPDATED'].includes(
          type,
        )
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
      } else if (['FEE_DUE', 'FEE_PAID', 'PAYMENT_RECEIVED'].includes(type)) {
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

    // Filter by schoolId for school-specific notifications
    if (schoolId) {
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
    const notification = await this.prisma.notification.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    if (data.userId) {
      await this.sendPushToUsers([data.userId], {
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl,
        notificationId: notification.id,
        metadata: data.metadata,
      });
    }

    return notification;
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
    // Get all admins and registrars for this school
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ['ADMIN', 'REGISTRAR'] },
      },
      select: { id: true },
    });

    if (users.length === 0) return;

    return this.createBulkNotifications({
      schoolId,
      userIds: users.map((u) => u.id),
      title: 'New Enrollment Request',
      message: `${studentName} has submitted an enrollment request for Grade ${grade}`,
      type: NotificationType.ENROLLMENT_PENDING,
      actionUrl: '/admin/enrollment',
      metadata: { studentName, grade },
    });
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
    return this.createNotification({
      schoolId,
      userId,
      title: 'Enrollment Approved',
      message: `Congratulations! ${studentName}'s enrollment has been approved for ${className}`,
      type: NotificationType.ENROLLMENT_APPROVED,
      actionUrl: '/student/profile',
      metadata: { studentName, className },
    });
  }

  /**
   * Notify student/parent of enrollment rejection
   */
  async notifyEnrollmentRejection(
    schoolId: string,
    userId: string,
    studentName: string,
    reason?: string,
  ) {
    return this.createNotification({
      schoolId,
      userId,
      title: 'Enrollment Update',
      message: `We regret to inform you that ${studentName}'s enrollment application was not approved. ${reason ? `Reason: ${reason}` : ''}`,
      type: NotificationType.ENROLLMENT_REJECTED,
      actionUrl: '/enroll',
      metadata: { studentName, reason },
    });
  }

  /**
   * Notify parents when their child is marked absent
   */
  async notifyParentOfAbsence(
    schoolId: string,
    parentId: string,
    studentName: string,
    date: string,
    className: string,
  ) {
    return this.createNotification({
      schoolId,
      userId: parentId,
      title: 'Attendance Alert',
      message: `${studentName} was marked absent in ${className} on ${date}`,
      type: NotificationType.ATTENDANCE_ABSENT,
      actionUrl: '/parent/attendance',
      metadata: { studentName, date, className },
    });
  }

  /**
   * Notify parents when their child is late
   */
  async notifyParentOfLate(
    schoolId: string,
    parentId: string,
    studentName: string,
    time: string,
    className: string,
  ) {
    return this.createNotification({
      schoolId,
      userId: parentId,
      title: 'Late Arrival Notice',
      message: `${studentName} arrived late at ${time} for ${className}`,
      type: NotificationType.ATTENDANCE_LATE,
      actionUrl: '/parent/attendance',
      metadata: { studentName, time, className },
    });
  }

  /**
   * Notify teacher that attendance session is ready
   */
  async notifyTeacherAttendanceSession(
    schoolId: string,
    teacherId: string,
    className: string,
    subject: string,
  ) {
    return this.createNotification({
      schoolId,
      userId: teacherId,
      title: 'Attendance Session Opened',
      message: `Attendance session is ready for ${className} - ${subject}`,
      type: NotificationType.ATTENDANCE_SESSION_OPENED,
      actionUrl: '/teacher/attendance',
      metadata: { className, subject },
    });
  }

  /**
   * Notify teacher that attendance time is approaching
   */
  async notifyTeacherAttendanceReminder(
    schoolId: string,
    teacherId: string,
    className: string,
    subject: string,
    startTime: string,
  ) {
    return this.createNotification({
      schoolId,
      userId: teacherId,
      title: 'Attendance Reminder',
      message: `Attendance for ${className} - ${subject} starts at ${startTime}. Don't forget to take attendance!`,
      type: NotificationType.ATTENDANCE_SESSION_OPENED,
      actionUrl: '/teacher/attendance',
      metadata: { className, subject, startTime },
    });
  }

  /**
   * Notify homeroom teachers about missing attendance for their classes
   */
  async notifyHomeroomMissingAttendance(
    schoolId: string,
    teacherId: string,
    className: string,
    grade: number,
    section: string,
    date: string,
  ) {
    return this.createNotification({
      schoolId,
      userId: teacherId,
      title: 'Missing Attendance Reminder',
      message: `Please take attendance for Grade ${grade} - ${section} (${className}) for ${date}. Attendance has not been recorded yet.`,
      type: NotificationType.ATTENDANCE_SESSION_OPENED,
      actionUrl: '/teacher/attendance',
      metadata: { className, grade, section, date },
      bypassPreferences: true,
    });
  }

  /**
   * Notify students of new assignment
   */
  async notifyStudentsOfAssignment(
    schoolId: string,
    studentIds: string[],
    assignmentTitle: string,
    dueDate: string,
    className: string,
  ) {
    return this.createBulkNotifications({
      schoolId,
      userIds: studentIds,
      title: 'New Assignment',
      message: `New assignment "${assignmentTitle}" has been posted for ${className}. Due: ${dueDate}`,
      type: NotificationType.ASSIGNMENT_CREATED,
      actionUrl: '/student/assignments',
      metadata: { assignmentTitle, dueDate, className },
    });
  }

  /**
   * Notify parents of new assignment for their children
   */
  async notifyParentsOfAssignment(
    schoolId: string,
    parentIds: string[],
    assignmentTitle: string,
    dueDate: string,
    studentName: string,
  ) {
    return this.createBulkNotifications({
      schoolId,
      userIds: parentIds,
      title: 'New Assignment for Your Child',
      message: `${studentName} has a new assignment "${assignmentTitle}" due on ${dueDate}`,
      type: NotificationType.ASSIGNMENT_CREATED,
      actionUrl: '/parent/assignments',
      metadata: { assignmentTitle, dueDate, studentName },
    });
  }

  /**
   * Notify student of assignment grade
   */
  async notifyStudentOfGrade(
    schoolId: string,
    studentId: string,
    assignmentTitle: string,
    grade: string,
    className: string,
  ) {
    return this.createNotification({
      schoolId,
      userId: studentId,
      title: 'Assignment Graded',
      message: `Your assignment "${assignmentTitle}" for ${className} has been graded. Grade: ${grade}`,
      type: NotificationType.ASSIGNMENT_GRADED,
      actionUrl: '/student/results',
      metadata: { assignmentTitle, grade, className },
    });
  }

  /**
   * Notify parent of child's grade
   */
  async notifyParentOfChildGrade(
    schoolId: string,
    parentId: string,
    studentName: string,
    assignmentTitle: string,
    grade: string,
  ) {
    return this.createNotification({
      schoolId,
      userId: parentId,
      title: "Child's Assignment Graded",
      message: `${studentName}'s assignment "${assignmentTitle}" has been graded. Grade: ${grade}`,
      type: NotificationType.ASSIGNMENT_GRADED,
      actionUrl: '/parent/results',
      metadata: { studentName, assignmentTitle, grade },
    });
  }

  /**
   * Notify of result publication
   */
  async notifyResultPublished(
    schoolId: string,
    userIds: string[],
    term: string,
    className: string,
  ) {
    return this.createBulkNotifications({
      schoolId,
      userIds,
      title: 'Results Published',
      message: `Results for ${term} in ${className} have been published`,
      type: NotificationType.RESULT_PUBLISHED,
      actionUrl: '/results',
      metadata: { term, className },
    });
  }

  /**
   * Notify teachers of new assessment created by admin
   */
  async notifyAssessmentStarted(
    schoolId: string,
    teacherIds: string[],
    assessmentTitle: string,
    assessmentType: string,
    className: string,
    subjectName: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.createBulkNotifications({
      schoolId,
      userIds: teacherIds,
      title: 'Assessment Started',
      message: `${assessmentType} "${assessmentTitle}" is now active for ${className} - ${subjectName}. Please enter scores.`,
      type: NotificationType.ASSESSMENT_CREATED,
      actionUrl: '/teacher/exams',
      metadata: {
        assessmentTitle,
        assessmentType,
        className,
        subjectName,
        ...metadata,
      },
    });
  }

  /**
   * Notify of schedule change
   */
  async notifyScheduleChange(
    schoolId: string,
    userIds: string[],
    message: string,
  ) {
    return this.createBulkNotifications({
      schoolId,
      userIds,
      title: 'Schedule Change',
      message,
      type: NotificationType.SCHEDULE_CHANGED,
      actionUrl: '/schedule',
    });
  }

  /**
   * Notify of timetable update
   */
  async notifyTimetableUpdate(
    schoolId: string,
    userIds: string[],
    className: string,
  ) {
    return this.createBulkNotifications({
      schoolId,
      userIds,
      title: 'Timetable Updated',
      message: `The timetable for ${className} has been updated. Please check your new schedule.`,
      type: NotificationType.TIMETABLE_UPDATED,
      actionUrl: '/timetable',
      metadata: { className },
    });
  }

  /**
   * Notify of fee due
   */
  async notifyFeeDue(
    schoolId: string,
    userId: string,
    amount: string,
    dueDate: string,
    studentName?: string,
  ) {
    return this.createNotification({
      schoolId,
      userId,
      title: 'Fee Payment Reminder',
      message: `${studentName ? `Fee for ${studentName}: ` : ''}Payment of ${amount} is due on ${dueDate}`,
      type: NotificationType.FEE_DUE,
      actionUrl: '/fees',
      metadata: { amount, dueDate, studentName },
    });
  }

  /**
   * Notify of payment received
   */
  async notifyPaymentReceived(
    schoolId: string,
    userId: string,
    amount: string,
    receiptNumber: string,
  ) {
    return this.createNotification({
      schoolId,
      userId,
      title: 'Payment Received',
      message: `Your payment of ${amount} has been received. Receipt #: ${receiptNumber}`,
      type: NotificationType.PAYMENT_RECEIVED,
      actionUrl: '/fees',
      metadata: { amount, receiptNumber },
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
   * Notify of new message
   */
  async notifyNewMessage(
    schoolId: string,
    userId: string,
    senderName: string,
    preview: string,
  ) {
    return this.createNotification({
      schoolId,
      userId,
      title: 'New Message',
      message: `${senderName}: ${preview.substring(0, 50)}...`,
      type: NotificationType.MESSAGE_RECEIVED,
      actionUrl: '/messages',
      metadata: { senderName },
    });
  }

  /**
   * Notify user of account creation
   */
  async notifyAccountCreated(
    schoolId: string,
    userId: string,
    tempPassword?: boolean,
  ) {
    return this.createNotification({
      schoolId,
      userId,
      title: 'Welcome to School Management System',
      message: tempPassword
        ? 'Your account has been created. Please check your email for login credentials.'
        : 'Your account has been created. You can now log in.',
      type: NotificationType.ACCOUNT_CREATED,
      actionUrl: '/profile',
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

  /**
   * Notify teachers of class cancellation
   */
  async notifyClassCancellation(
    schoolId: string,
    teacherIds: string[],
    className: string,
    date: string,
    reason?: string,
  ) {
    return this.createBulkNotifications({
      schoolId,
      userIds: teacherIds,
      title: 'Class Cancelled',
      message: `${className} on ${date} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      type: NotificationType.CLASS_CANCELLED,
      actionUrl: '/schedule',
      metadata: { className, date, reason },
    });
  }

  /**
   * Notify students of class cancellation
   */
  async notifyStudentsOfClassCancellation(
    schoolId: string,
    studentIds: string[],
    className: string,
    subject: string,
    date: string,
  ) {
    return this.createBulkNotifications({
      schoolId,
      userIds: studentIds,
      title: 'Class Cancelled',
      message: `${subject} class for ${className} on ${date} has been cancelled`,
      type: NotificationType.CLASS_CANCELLED,
      actionUrl: '/student/schedule',
      metadata: { className, subject, date },
    });
  }

  async notifyAccountDeactivated(
    userId: string,
    schoolId: string,
    reason?: string,
  ) {
    return this.createNotification({
      schoolId,
      userId,
      title: 'Account Deactivated',
      message:
        reason ||
        'Your account has been deactivated. Please contact school administration for more information.',
      type: NotificationType.ALERT,
      actionUrl: '/profile',
      metadata: { reason },
    });
  }

  async notifyAccountActivated(userId: string, schoolId: string) {
    return this.createNotification({
      schoolId,
      userId,
      title: 'Account Activated',
      message: 'Your account has been activated. You can now log in.',
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

    const sirenLabel = this.formatSirenLabel(type);
    const isDynamic = triggerType === 'DYNAMIC';
    const isPeriodStart = type === 'PERIOD_START';
    const isPeriodEnd = type === 'PERIOD_END';
    const title = isDynamic
      ? isPeriodStart
        ? 'Your Class Is Starting'
        : isPeriodEnd
          ? 'Your Class Has Ended'
          : 'Class Bell'
      : 'School Bell';
    const message = isDynamic
      ? isPeriodStart
        ? 'The bell has rung for your current class. Please proceed to your classroom.'
        : isPeriodEnd
          ? 'The bell has rung to end your current class.'
          : `${sirenLabel} bell has rung for your timetable.`
      : 'The school bell has been triggered.';

    return this.createBulkNotifications({
      schoolId,
      userIds: teacherIds,
      title,
      message,
      type: NotificationType.SIREN_ALERT,
      actionUrl: '/teacher',
      metadata: {
        source: 'siren',
        sirenType: type,
        triggerType,
      },
    });
  }

  private formatSirenLabel(type: string) {
    return type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
