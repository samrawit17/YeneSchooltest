import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { notificationMessages, NotificationLanguage } from './notification-messages';
import { formatSchoolDate, type CalendarType } from '../common/date.util';
import { InAppNotificationProvider } from './providers/in-app.provider';
import { PushNotificationProvider } from './providers/push.provider';
import { NotificationChannelRouter } from './providers/channel-router.service';
import type { NotificationChannelType } from './providers/notification-provider.interface';

export enum NotificationType {
  ATTENDANCE_MARKED = 'ATTENDANCE_MARKED',
  ATTENDANCE_ABSENT = 'ATTENDANCE_ABSENT',
  ATTENDANCE_LATE = 'ATTENDANCE_LATE',
  ATTENDANCE_SESSION_OPENED = 'ATTENDANCE_SESSION_OPENED',
  ATTENDANCE_SESSION_SUBMITTED = 'ATTENDANCE_SESSION_SUBMITTED',
  ENROLLMENT_SUBMITTED = 'ENROLLMENT_SUBMITTED',
  ENROLLMENT_APPROVED = 'ENROLLMENT_APPROVED',
  ENROLLMENT_REJECTED = 'ENROLLMENT_REJECTED',
  ENROLLMENT_PENDING = 'ENROLLMENT_PENDING',
  ASSIGNMENT_CREATED = 'ASSIGNMENT_CREATED',
  ASSIGNMENT_DUE = 'ASSIGNMENT_DUE',
  ASSIGNMENT_GRADED = 'ASSIGNMENT_GRADED',
  RESULT_PUBLISHED = 'RESULT_PUBLISHED',
  GRADE_UPDATED = 'GRADE_UPDATED',
  ASSESSMENT_CREATED = 'ASSESSMENT_CREATED',
  SCHEDULE_CHANGED = 'SCHEDULE_CHANGED',
  CLASS_CANCELLED = 'CLASS_CANCELLED',
  TIMETABLE_UPDATED = 'TIMETABLE_UPDATED',
  PICKUP_REMINDER = 'PICKUP_REMINDER',
  DISCIPLINE_INCIDENT_CREATED = 'DISCIPLINE_INCIDENT_CREATED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  COMMUNICATION = 'COMMUNICATION',
  EVENT = 'EVENT',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_DELETED = 'EVENT_DELETED',
  LESSON_PUBLISHED = 'LESSON_PUBLISHED',
  LESSON = 'LESSON',
  FEE_DUE = 'FEE_DUE',
  FEE_PAID = 'FEE_PAID',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYROLL_PAYMENT_DUE = 'PAYROLL_PAYMENT_DUE',
  PAYROLL_RUN_REQUIRED = 'PAYROLL_RUN_REQUIRED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SIREN_ALERT = 'SIREN_ALERT',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ALERT = 'ALERT',
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly platformBackupReminderDays = this.parsePositiveInt(
    process.env.SUPERADMIN_BACKUP_REMINDER_DAYS, 28,
  );
  private readonly platformDangerDbSizeMb = this.parsePositiveInt(
    process.env.SUPERADMIN_DB_DANGER_SIZE_MB, 10240,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppProvider: InAppNotificationProvider,
    private readonly pushProvider: PushNotificationProvider,
    private readonly router: NotificationChannelRouter,
  ) {}

  // ─── In-App CRUD ─────────────────────────────────────────────────

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
    const channels: NotificationChannelType[] = ['in-app', 'sms'];
    const results = await this.router.route(
      {
        schoolId: data.schoolId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl,
        metadata: typeof data.metadata === 'object' ? data.metadata : {},
      },
      channels,
      data.bypassPreferences,
    );

    const inAppResult = results[0];
    if (!inAppResult?.success) {
      return this.inAppProvider.createInApp({
        schoolId: data.schoolId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl,
        metadata: typeof data.metadata === 'object' ? data.metadata : {},
      });
    }

    return { id: randomUUID(), ...data };
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
    const result = await this.inAppProvider.sendBulk({
      schoolId: data.schoolId,
      userIds: data.userIds,
      title: data.title,
      message: data.message,
      type: data.type,
      actionUrl: data.actionUrl,
      metadata: typeof data.metadata === 'object' ? data.metadata : {},
    });
    return { count: result.recipientCount };
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
      where: { schoolId: data.schoolId, isActive: true },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) return { count: 0 };

    return this.createBulkNotifications({ ...data, userIds });
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
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Notification" ("id", "schoolId", "userId", "title", "message", "type", "actionUrl", "metadata", "createdAt", "updatedAt")
      VALUES (${id}, NULL, ${data.userId}, ${data.title}, ${data.message}, ${data.type}, ${data.actionUrl || null}, ${data.metadata ? JSON.stringify(data.metadata) : null}, NOW(), NOW())
    `);

    await this.pushProvider.send({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      actionUrl: data.actionUrl,
      metadata: { ...(data.metadata || {}), notificationId: id },
    }).catch(() => {});

    return { id, ...data, schoolId: null as any };
  }

  async getUserNotifications(userId: string, userRole: string, options?: {
    unreadOnly?: boolean; limit?: number; type?: string; types?: string[];
    category?: string; schoolId?: string;
  }) {
    const canViewSchoolGlobal = userRole === 'ADMIN' || userRole === 'IT_MANAGER';
    const canViewPlatform = userRole === 'SUPER_ADMIN';
    const where: any = { userId };

    if (canViewSchoolGlobal) {
      where.OR = [{ userId }, { userId: null }];
      delete where.userId;
    }
    if (canViewPlatform) {
      where.OR = [{ userId, schoolId: null }, { userId: null, schoolId: null }];
      delete where.userId;
    } else if (options?.schoolId) {
      where.schoolId = options.schoolId;
    }
    if (options?.unreadOnly) where.isRead = false;
    if (options?.type) where.type = options.type;
    if (options?.types?.length) where.type = { in: options.types };
    if (options?.category) {
      const map: Record<string, string[]> = {
        attendance: ['ATTENDANCE_MARKED','ATTENDANCE_ABSENT','ATTENDANCE_LATE','ATTENDANCE_SESSION_OPENED','ATTENDANCE_SESSION_SUBMITTED'],
        enrollment: ['ENROLLMENT_SUBMITTED','ENROLLMENT_APPROVED','ENROLLMENT_REJECTED','ENROLLMENT_PENDING'],
        academic: ['ASSIGNMENT_CREATED','ASSIGNMENT_DUE','ASSIGNMENT_GRADED','RESULT_PUBLISHED','GRADE_UPDATED'],
        schedule: ['SCHEDULE_CHANGED','CLASS_CANCELLED','TIMETABLE_UPDATED','PICKUP_REMINDER'],
        communication: ['MESSAGE_RECEIVED','ANNOUNCEMENT','COMMUNICATION'],
        event: ['EVENT','EVENT_UPDATED','EVENT_DELETED'],
        finance: ['FEE_DUE','FEE_PAID','PAYMENT_RECEIVED','PAYROLL_PAYMENT_DUE','PAYROLL_RUN_REQUIRED'],
        system: ['SYSTEM_ALERT','SIREN_ALERT','ACCOUNT_CREATED','PASSWORD_RESET','INFO','WARNING','ALERT'],
      };
      where.type = { in: map[options.category.toLowerCase()] || [] };
    }

    const limit = Math.min(options?.limit || 20, 100);
    return this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
  }

  async getNotificationCategories(userId: string, userRole: string, schoolId?: string) {
    const canViewSchoolGlobal = userRole === 'ADMIN' || userRole === 'IT_MANAGER';
    const canViewPlatform = userRole === 'SUPER_ADMIN';
    const where: any = { userId };

    if (canViewSchoolGlobal) {
      where.OR = [{ userId }, { userId: null }];
      delete where.userId;
    }
    if (canViewPlatform) {
      where.OR = [{ userId, schoolId: null }, { userId: null, schoolId: null }];
      delete where.userId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    const notifications = await this.prisma.notification.findMany({
      where, select: { type: true, isRead: true },
    });

    const categories: Record<string, { total: number; unread: number }> = {
      all: { total: notifications.length, unread: notifications.filter((n) => !n.isRead).length },
      attendance: { total: 0, unread: 0 }, enrollment: { total: 0, unread: 0 },
      academic: { total: 0, unread: 0 }, schedule: { total: 0, unread: 0 },
      communication: { total: 0, unread: 0 }, event: { total: 0, unread: 0 },
      finance: { total: 0, unread: 0 }, system: { total: 0, unread: 0 },
    };

    const map: Record<string, string[]> = {
      attendance: ['ATTENDANCE_MARKED','ATTENDANCE_ABSENT','ATTENDANCE_LATE','ATTENDANCE_SESSION_OPENED','ATTENDANCE_SESSION_SUBMITTED'],
      enrollment: ['ENROLLMENT_SUBMITTED','ENROLLMENT_APPROVED','ENROLLMENT_REJECTED','ENROLLMENT_PENDING'],
      academic: ['ASSIGNMENT_CREATED','ASSIGNMENT_DUE','ASSIGNMENT_GRADED','RESULT_PUBLISHED','GRADE_UPDATED'],
      schedule: ['SCHEDULE_CHANGED','CLASS_CANCELLED','TIMETABLE_UPDATED','PICKUP_REMINDER'],
      communication: ['MESSAGE_RECEIVED','ANNOUNCEMENT','COMMUNICATION'],
      event: ['EVENT','EVENT_UPDATED','EVENT_DELETED'],
      finance: ['FEE_DUE','FEE_PAID','PAYMENT_RECEIVED','PAYROLL_PAYMENT_DUE','PAYROLL_RUN_REQUIRED'],
      system: ['SYSTEM_ALERT','SIREN_ALERT','ACCOUNT_CREATED','PASSWORD_RESET','INFO','WARNING','ALERT'],
    };

    for (const n of notifications) {
      for (const [cat, types] of Object.entries(map)) {
        if (types.includes(n.type)) {
          categories[cat].total++;
          if (!n.isRead) categories[cat].unread++;
          break;
        }
      }
    }

    return categories;
  }

  async getUnreadCount(userId: string, userRole: string, schoolId?: string, types?: string[]) {
    const canViewSchoolGlobal = userRole === 'ADMIN' || userRole === 'IT_MANAGER';
    const canViewPlatform = userRole === 'SUPER_ADMIN';
    const where: any = { isRead: false, userId };

    if (canViewSchoolGlobal) {
      where.OR = [{ userId, isRead: false }, { userId: null, isRead: false }];
      delete where.userId; delete where.isRead;
    }
    if (canViewPlatform) {
      where.OR = [{ userId, schoolId: null, isRead: false }, { userId: null, schoolId: null, isRead: false }];
      delete where.userId; delete where.isRead;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }
    if (types?.length) where.type = { in: types };

    return this.prisma.notification.count({ where });
  }

  async markAsRead(notificationId: string, userId: string, schoolId?: string, userRole?: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) return null;

    const canReadSchoolGlobal = notification.userId === null && schoolId &&
      notification.schoolId === schoolId && (userRole === 'ADMIN' || userRole === 'IT_MANAGER');

    if (notification.userId === userId || canReadSchoolGlobal) {
      if (notification.userId === userId) {
        if (schoolId && notification.schoolId !== schoolId) return null;
        return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
      }
      return notification;
    }
    return null;
  }

  async markAllAsRead(userId: string, schoolId?: string, types?: string[]) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false, ...(schoolId ? { schoolId } : {}), ...(types?.length ? { type: { in: types } } : {}) },
      data: { isRead: true },
    });
    return { success: true };
  }

  // ─── Preferences ────────────────────────────────────────────────

  async getNotificationPreferences(userId: string, userRole: string) {
    try {
      return await this.prisma.notificationPreference.upsert({
        where: { userId },
        update: {},
        create: { userId, emailEnabled: true, smsEnabled: false, pushEnabled: true },
      });
    } catch {
      return this.prisma.notificationPreference.findUnique({ where: { userId } });
    }
  }

  async updateNotificationPreferences(userId: string, userRole: string, data: Record<string, any>) {
    await this.prisma.notificationPreference.upsert({
      where: { userId }, update: data,
      create: { userId, emailEnabled: true, smsEnabled: false, pushEnabled: true, ...data },
    });
    return this.prisma.notificationPreference.findUnique({ where: { userId } });
  }

  // ─── Push Subscriptions ─────────────────────────────────────────

  async savePushSubscription(data: {
    schoolId: string; userId: string;
    subscription: { endpoint: string; keys?: { p256dh?: string; auth?: string }; expirationTime?: number | null };
    userAgent?: string;
  }) {
    return this.pushProvider.saveSubscription(data);
  }

  async removePushSubscription(userId: string, endpoint: string) {
    await this.pushProvider.removeSubscription(userId, endpoint);
    return { success: true };
  }

  isWebPushConfigured() {
    return this.pushProvider.isConfigured();
  }

  getWebPushPublicKey() {
    return this.pushProvider.getPublicKey();
  }

  // ─── Convenience Notification Methods ───────────────────────────
  // All delegate to in-app provider + router for multi-channel

  async notifyAdminsOfNewEnrollment(schoolId: string, studentName: string, grade: string) {
    const users = await this.prisma.user.findMany({
      where: { schoolId, role: { in: ['ADMIN', 'REGISTRAR'] } }, select: { id: true },
    });
    if (users.length === 0) return { count: 0 };
    return Promise.all(users.map((u) =>
      this.createNotification({
        schoolId, userId: u.id, title: 'New Enrollment', message: `${studentName} - ${grade}`,
        type: NotificationType.ENROLLMENT_PENDING, actionUrl: '/admin/enrollment',
        metadata: { studentName, grade },
      }),
    )).then((r) => ({ count: r.length }));
  }

  async notifyEnrollmentApproval(schoolId: string, userId: string, studentName: string, className: string) {
    return this.createNotification({
      schoolId, userId, title: 'Enrollment Approved', message: `${studentName} approved for ${className}`,
      type: NotificationType.ENROLLMENT_APPROVED, actionUrl: '/student/profile',
      metadata: { studentName, className },
    });
  }

  async notifyEnrollmentRejection(schoolId: string, userId: string, studentName: string, reason?: string) {
    return this.createNotification({
      schoolId, userId, title: 'Enrollment Rejected', message: reason ? `${studentName}: ${reason}` : `${studentName} was not approved`,
      type: NotificationType.ENROLLMENT_REJECTED, actionUrl: '/enroll',
      metadata: { studentName, reason },
    });
  }

  async notifyParentOfAbsence(schoolId: string, parentId: string, studentName: string, date: string, className: string) {
    return this.createNotification({
      schoolId, userId: parentId, title: 'Absence Alert', message: `${studentName} was absent on ${date} (${className})`,
      type: NotificationType.ATTENDANCE_ABSENT, actionUrl: '/parent/attendance',
      metadata: { studentName, date, className },
    });
  }

  async notifyParentOfLate(schoolId: string, parentId: string, studentName: string, time: string, className: string) {
    return this.createNotification({
      schoolId, userId: parentId, title: 'Late Arrival', message: `${studentName} arrived late at ${time} (${className})`,
      type: NotificationType.ATTENDANCE_LATE, actionUrl: '/parent/attendance',
      metadata: { studentName, time, className },
    });
  }

  async notifyTeacherAttendanceSession(schoolId: string, teacherId: string, className: string, subject: string) {
    return this.createNotification({
      schoolId, userId: teacherId, title: 'Attendance Session', message: `Session opened for ${className} - ${subject}`,
      type: NotificationType.ATTENDANCE_SESSION_OPENED, actionUrl: '/teacher/attendance',
      metadata: { className, subject },
    });
  }

  async notifyTeacherAttendanceReminder(schoolId: string, teacherId: string, className: string, subject: string, startTime: string) {
    return this.createNotification({
      schoolId, userId: teacherId, title: 'Attendance Reminder', message: `Please take attendance for ${className} - ${subject} at ${startTime}`,
      type: NotificationType.ATTENDANCE_SESSION_OPENED, actionUrl: '/teacher/attendance',
      metadata: { className, subject, startTime },
    });
  }

  async notifyHomeroomMissingAttendance(schoolId: string, teacherId: string, className: string, grade: number, section: string, date: string) {
    return this.createNotification({
      schoolId, userId: teacherId, title: 'Missing Attendance', message: `Attendance not recorded for ${className} (Grade ${grade} - ${section}) on ${date}`,
      type: NotificationType.ATTENDANCE_SESSION_OPENED, actionUrl: '/teacher/attendance',
      metadata: { className, grade, section, date }, bypassPreferences: true,
    });
  }

  async notifyStudentsOfAssignment(schoolId: string, studentIds: string[], assignmentTitle: string, dueDate: string, className: string) {
    const results = await Promise.allSettled(studentIds.map((id) =>
      this.createNotification({
        schoolId, userId: id, title: 'New Assignment', message: `${assignmentTitle} due ${dueDate} (${className})`,
        type: NotificationType.ASSIGNMENT_CREATED, actionUrl: '/student/assignments',
        metadata: { assignmentTitle, dueDate, className },
      }),
    ));
    return { count: results.filter((r) => r.status === 'fulfilled').length };
  }

  async notifyParentsOfAssignment(schoolId: string, parentIds: string[], assignmentTitle: string, dueDate: string, studentName: string) {
    const results = await Promise.allSettled(parentIds.map((id) =>
      this.createNotification({
        schoolId, userId: id, title: 'Assignment for Your Child', message: `${studentName} - ${assignmentTitle} due ${dueDate}`,
        type: NotificationType.ASSIGNMENT_CREATED, actionUrl: '/parent/assignments',
        metadata: { assignmentTitle, dueDate, studentName },
      }),
    ));
    return { count: results.filter((r) => r.status === 'fulfilled').length };
  }

  async notifyStudentOfGrade(schoolId: string, studentId: string, assignmentTitle: string, grade: string, className: string) {
    return this.createNotification({
      schoolId, userId: studentId, title: 'Assignment Graded', message: `${assignmentTitle}: ${grade} (${className})`,
      type: NotificationType.ASSIGNMENT_GRADED, actionUrl: '/student/results',
      metadata: { assignmentTitle, grade, className },
    });
  }

  async notifyParentOfChildGrade(schoolId: string, parentId: string, studentName: string, assignmentTitle: string, grade: string) {
    return this.createNotification({
      schoolId, userId: parentId, title: 'Grade Update', message: `${studentName} received ${grade} on ${assignmentTitle}`,
      type: NotificationType.ASSIGNMENT_GRADED, actionUrl: '/parent/results',
      metadata: { studentName, assignmentTitle, grade },
    });
  }

  async notifyResultPublished(schoolId: string, userIds: string[], term: string, className: string) {
    const results = await Promise.allSettled(userIds.map((id) =>
      this.createNotification({
        schoolId, userId: id, title: 'Results Published', message: `Results for ${term} (${className}) are now available`,
        type: NotificationType.RESULT_PUBLISHED, actionUrl: '/results',
        metadata: { term, className },
      }),
    ));
    return { count: results.filter((r) => r.status === 'fulfilled').length };
  }

  async notifyAssessmentStarted(schoolId: string, teacherIds: string[], assessmentTitle: string, assessmentType: string, className: string, subjectName: string, metadata?: Record<string, unknown>) {
    const results = await Promise.allSettled(teacherIds.map((id) =>
      this.createNotification({
        schoolId, userId: id, title: 'Assessment Started', message: `${assessmentType}: ${assessmentTitle} - ${className} (${subjectName})`,
        type: NotificationType.ASSESSMENT_CREATED, actionUrl: '/teacher/exams',
        metadata: { assessmentTitle, assessmentType, className, subjectName, ...metadata },
      }),
    ));
    return { count: results.filter((r) => r.status === 'fulfilled').length };
  }

  async notifyScheduleChange(schoolId: string, userIds: string[], message: string) {
    const results = await Promise.allSettled(userIds.map((id) =>
      this.createNotification({
        schoolId, userId: id, title: 'Schedule Changed', message,
        type: NotificationType.SCHEDULE_CHANGED, actionUrl: '/schedule',
      }),
    ));
    return { count: results.filter((r) => r.status === 'fulfilled').length };
  }

  async notifyTimetableUpdate(schoolId: string, userIds: string[], className: string) {
    const results = await Promise.allSettled(userIds.map((id) =>
      this.createNotification({
        schoolId, userId: id, title: 'Timetable Updated', message: `Timetable updated for ${className}`,
        type: NotificationType.TIMETABLE_UPDATED, actionUrl: '/timetable',
        metadata: { className },
      }),
    ));
    return { count: results.filter((r) => r.status === 'fulfilled').length };
  }

  async notifyFeeDue(schoolId: string, userId: string, amount: string, dueDate: string, studentName?: string) {
    return this.createNotification({
      schoolId, userId, title: 'Fee Due', message: `${amount} due by ${dueDate}${studentName ? ` for ${studentName}` : ''}`,
      type: NotificationType.FEE_DUE, actionUrl: '/fees',
      metadata: { amount, dueDate, studentName },
    });
  }

  async notifyPaymentReceived(schoolId: string, userId: string, amount: string, receiptNumber: string) {
    return this.createNotification({
      schoolId, userId, title: 'Payment Received', message: `${amount} received (Receipt: ${receiptNumber})`,
      type: NotificationType.PAYMENT_RECEIVED, actionUrl: '/fees',
      metadata: { amount, receiptNumber },
    });
  }

  async notifyNewMessage(schoolId: string, userId: string, senderName: string, preview: string) {
    const short = preview.length > 50 ? `${preview.slice(0, 50)}...` : preview;
    return this.createNotification({
      schoolId, userId, title: 'New Message', message: `${senderName}: ${short}`,
      type: NotificationType.MESSAGE_RECEIVED, actionUrl: '/messages',
      metadata: { senderName },
    });
  }

  async notifyAccountCreated(schoolId: string, userId: string, tempPassword?: boolean) {
    return this.createNotification({
      schoolId, userId, title: 'Account Created', message: tempPassword ? 'Welcome! Use your temporary password to log in.' : 'Welcome!',
      type: NotificationType.ACCOUNT_CREATED, actionUrl: '/profile',
    });
  }

  async sendSchoolAnnouncement(schoolId: string, title: string, message: string) {
    return this.createGlobalNotification({ schoolId, title, message, type: NotificationType.ANNOUNCEMENT });
  }

  async sendRoleAnnouncement(schoolId: string, role: string, title: string, message: string) {
    const users = await this.prisma.user.findMany({ where: { schoolId, role: role as any }, select: { id: true } });
    if (users.length === 0) return { count: 0 };
    return this.createBulkNotifications({ schoolId, userIds: users.map((u) => u.id), title, message, type: NotificationType.ANNOUNCEMENT });
  }

  async createSystemAlert(schoolId: string, title: string, message: string, actionUrl?: string) {
    return this.createGlobalNotification({ schoolId, title, message, type: NotificationType.SYSTEM_ALERT, actionUrl });
  }

  async notifyClassCancellation(schoolId: string, teacherIds: string[], className: string, date: string, reason?: string) {
    const results = await Promise.allSettled(teacherIds.map((id) =>
      this.createNotification({
        schoolId, userId: id, title: 'Class Cancelled', message: `${className} on ${date}${reason ? `: ${reason}` : ''}`,
        type: NotificationType.CLASS_CANCELLED, actionUrl: '/schedule',
        metadata: { className, date, reason },
      }),
    ));
    return { count: results.filter((r) => r.status === 'fulfilled').length };
  }

  async notifyStudentsOfClassCancellation(schoolId: string, studentIds: string[], className: string, subject: string, date: string) {
    const results = await Promise.allSettled(studentIds.map((id) =>
      this.createNotification({
        schoolId, userId: id, title: 'Class Cancelled', message: `${subject} (${className}) cancelled on ${date}`,
        type: NotificationType.CLASS_CANCELLED, actionUrl: '/student/schedule',
        metadata: { className, subject, date },
      }),
    ));
    return { count: results.filter((r) => r.status === 'fulfilled').length };
  }

  async notifyAccountDeactivated(userId: string, schoolId: string, reason?: string) {
    return this.createNotification({
      schoolId, userId, title: 'Account Deactivated', message: reason ? `Reason: ${reason}` : 'Your account has been deactivated.',
      type: NotificationType.ALERT, actionUrl: '/profile', metadata: { reason },
    });
  }

  async notifyAccountActivated(userId: string, schoolId: string) {
    return this.createNotification({
      schoolId, userId, title: 'Account Activated', message: 'Your account has been reactivated.',
      type: NotificationType.INFO, actionUrl: '/login',
    });
  }

  async notifyTeachersOfSiren(schoolId: string, type: string, triggerType: string, targetTeacherIds?: string[]) {
    const teacherIds = targetTeacherIds ?? (
      await this.prisma.user.findMany({ where: { schoolId, role: 'TEACHER' }, select: { id: true } })
    ).map((t) => t.id);

    if (teacherIds.length === 0) return { count: 0 };

    const results = await Promise.allSettled(teacherIds.map((id) =>
      this.createNotification({
        schoolId, userId: id, title: 'Siren Alert', message: `${type} triggered`,
        type: NotificationType.SIREN_ALERT, actionUrl: '/teacher',
        metadata: { source: 'siren', sirenType: type, triggerType },
      }),
    ));
    return { count: results.filter((r) => r.status === 'fulfilled').length };
  }

  // ─── Cron Jobs ──────────────────────────────────────────────────

  @Cron('0 * * * * *')
  async sendSchoolPickupReminders() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 20 * 60 * 1000);

      const schools = await this.prisma.school.findMany({
        where: { isActive: true },
        select: { id: true, name: true, timezone: true },
      });
      const settings = await this.prisma.schoolSetting.findMany({
        where: { key: { in: ['SCHOOL_END_TIME', 'calendar_type'] }, schoolId: { in: schools.map((s) => s.id) } },
        select: { schoolId: true, key: true, value: true },
      });

      const endTimeBySchool = new Map(settings.filter((s) => s.key === 'SCHOOL_END_TIME').map((s) => [s.schoolId, s.value]));
      const calTypeBySchool = new Map(settings.filter((s) => s.key === 'calendar_type').map((s) => [s.schoolId, s.value]));

      for (const school of schools) {
        const calType = calTypeBySchool.get(school.id);
        const tz = calType === 'ETHIOPIAN' ? 'Africa/Addis_Ababa' : school.timezone || 'Africa/Addis_Ababa';
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(reminderTime);
        const targetTime = `${parts.find((p) => p.type === 'hour')?.value || '00'}:${parts.find((p) => p.type === 'minute')?.value || '00'}`;

        const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now);
        if (weekday === 'Sat' || weekday === 'Sun') continue;

        const schoolEndTime = endTimeBySchool.get(school.id) || '15:00';
        if (schoolEndTime !== targetTime) continue;

        const lockKey = `pickup-reminder:${school.id}:${schoolEndTime}:${now.toISOString().slice(0, 10)}`;
        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
          const parentLinks = await tx.parentStudent.findMany({
            where: { schoolId: school.id, student: { enrollmentStatus: 'APPROVED' } },
            select: { parent: { select: { userId: true } } },
          });
          const parentIds = [...new Set(parentLinks.map((l) => l.parent.userId).filter(Boolean))];
          if (parentIds.length === 0) return;

          const existing = await tx.notification.findMany({
            where: { schoolId: school.id, userId: { in: parentIds }, type: NotificationType.PICKUP_REMINDER, createdAt: { gte: new Date(now.toISOString().slice(0, 10)) } },
            select: { userId: true },
          });
          const sent = new Set(existing.map((n) => n.userId));
          const unsent = parentIds.filter((id) => !sent.has(id));

          for (const parentId of unsent) {
            await tx.notification.create({
              data: {
                schoolId: school.id, userId: parentId, title: 'Pickup Reminder',
                message: `School ends at ${schoolEndTime}. Please arrange pickup.`,
                type: NotificationType.PICKUP_REMINDER, actionUrl: '/parent',
                metadata: JSON.stringify({ schoolEndTime, reminderMinutes: 20 }),
              },
            });
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to send school pickup reminders', error);
    }
  }

  @Cron('0 9 * * *')
  async sendSuperAdminPlatformNotifications() {
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' as any, isActive: true },
      select: { id: true },
    });
    if (superAdmins.length === 0) return;

    const lastBackupRows = await this.prisma.$queryRaw<Array<{ lastBackupAt: Date | null }>>(
      Prisma.sql`SELECT MAX("createdAt") AS "lastBackupAt" FROM "SystemAuditLog" WHERE "action" = 'BACKUP_DOWNLOAD' AND "entityType" = 'PLATFORM_BACKUP'`,
    );
    const lastBackupAt = lastBackupRows[0]?.lastBackupAt || null;
    const daysSince = lastBackupAt ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000) : null;
    const isOverdue = !lastBackupAt || (daysSince !== null && daysSince >= this.platformBackupReminderDays);

    const dbSizeRows = await this.prisma.$queryRaw<Array<{ sizeMb: number }>>(
      Prisma.sql`SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 AS "sizeMb"`,
    ).catch(() => [{ sizeMb: 0 }]);
    const dbSize = dbSizeRows[0]?.sizeMb ?? null;

    for (const sa of superAdmins) {
      const id = randomUUID();
      if (isOverdue) {
        await this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO "Notification" ("id", "schoolId", "userId", "title", "message", "type", "actionUrl", "metadata", "createdAt", "updatedAt")
          VALUES (${id}, NULL, ${sa.id}, 'Platform Backup Overdue', ${`Last backup ${daysSince ? `${daysSince} days ago` : 'never recorded'}`}, ${NotificationType.ALERT}, '/superadmin/backups', ${JSON.stringify({ severity: 'HIGH' })}, NOW(), NOW())
        `);
      }
      if (dbSize !== null && dbSize >= this.platformDangerDbSizeMb) {
        await this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO "Notification" ("id", "schoolId", "userId", "title", "message", "type", "actionUrl", "metadata", "createdAt", "updatedAt")
          VALUES (${randomUUID()}, NULL, ${sa.id}, 'Database Size Critical', ${`Database is ${Math.round(dbSize)} MB (threshold: ${this.platformDangerDbSizeMb} MB)`}, ${NotificationType.SYSTEM_ALERT}, '/superadmin', ${JSON.stringify({ severity: 'HIGH' })}, NOW(), NOW())
        `);
      }
      if (new Date().getDay() === 1) {
        const [schoolCounts, userCounts] = await Promise.all([
          this.prisma.school.groupBy({ by: ['isActive'], _count: { _all: true } }),
          this.prisma.user.groupBy({ by: ['isActive'], _count: { _all: true } }),
        ]);
        const activeSchools = schoolCounts.find((r) => r.isActive)?._count._all || 0;
        const activeUsers = userCounts.find((r) => r.isActive)?._count._all || 0;

        await this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO "Notification" ("id", "schoolId", "userId", "title", "message", "type", "actionUrl", "metadata", "createdAt", "updatedAt")
          VALUES (${randomUUID()}, NULL, ${sa.id}, 'Weekly Platform Summary', ${`${activeSchools} active schools, ${activeUsers} active users, DB ${Math.round(dbSize || 0)} MB`}, ${NotificationType.INFO}, '/superadmin', ${JSON.stringify({ activeSchools, activeUsers })}, NOW(), NOW())
        `);
      }
    }
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
