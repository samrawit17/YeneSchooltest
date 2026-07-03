"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = exports.NotificationType = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const in_app_provider_1 = require("./providers/in-app.provider");
const push_provider_1 = require("./providers/push.provider");
const channel_router_service_1 = require("./providers/channel-router.service");
var NotificationType;
(function (NotificationType) {
    NotificationType["ATTENDANCE_MARKED"] = "ATTENDANCE_MARKED";
    NotificationType["ATTENDANCE_ABSENT"] = "ATTENDANCE_ABSENT";
    NotificationType["ATTENDANCE_LATE"] = "ATTENDANCE_LATE";
    NotificationType["ATTENDANCE_SESSION_OPENED"] = "ATTENDANCE_SESSION_OPENED";
    NotificationType["ATTENDANCE_SESSION_SUBMITTED"] = "ATTENDANCE_SESSION_SUBMITTED";
    NotificationType["ENROLLMENT_SUBMITTED"] = "ENROLLMENT_SUBMITTED";
    NotificationType["ENROLLMENT_APPROVED"] = "ENROLLMENT_APPROVED";
    NotificationType["ENROLLMENT_REJECTED"] = "ENROLLMENT_REJECTED";
    NotificationType["ENROLLMENT_PENDING"] = "ENROLLMENT_PENDING";
    NotificationType["ASSIGNMENT_CREATED"] = "ASSIGNMENT_CREATED";
    NotificationType["ASSIGNMENT_DUE"] = "ASSIGNMENT_DUE";
    NotificationType["ASSIGNMENT_GRADED"] = "ASSIGNMENT_GRADED";
    NotificationType["RESULT_PUBLISHED"] = "RESULT_PUBLISHED";
    NotificationType["GRADE_UPDATED"] = "GRADE_UPDATED";
    NotificationType["ASSESSMENT_CREATED"] = "ASSESSMENT_CREATED";
    NotificationType["SCHEDULE_CHANGED"] = "SCHEDULE_CHANGED";
    NotificationType["CLASS_CANCELLED"] = "CLASS_CANCELLED";
    NotificationType["TIMETABLE_UPDATED"] = "TIMETABLE_UPDATED";
    NotificationType["PICKUP_REMINDER"] = "PICKUP_REMINDER";
    NotificationType["DISCIPLINE_INCIDENT_CREATED"] = "DISCIPLINE_INCIDENT_CREATED";
    NotificationType["MESSAGE_RECEIVED"] = "MESSAGE_RECEIVED";
    NotificationType["ANNOUNCEMENT"] = "ANNOUNCEMENT";
    NotificationType["COMMUNICATION"] = "COMMUNICATION";
    NotificationType["EVENT"] = "EVENT";
    NotificationType["EVENT_UPDATED"] = "EVENT_UPDATED";
    NotificationType["EVENT_DELETED"] = "EVENT_DELETED";
    NotificationType["LESSON_PUBLISHED"] = "LESSON_PUBLISHED";
    NotificationType["LESSON"] = "LESSON";
    NotificationType["FEE_DUE"] = "FEE_DUE";
    NotificationType["FEE_PAID"] = "FEE_PAID";
    NotificationType["PAYMENT_RECEIVED"] = "PAYMENT_RECEIVED";
    NotificationType["PAYROLL_PAYMENT_DUE"] = "PAYROLL_PAYMENT_DUE";
    NotificationType["PAYROLL_RUN_REQUIRED"] = "PAYROLL_RUN_REQUIRED";
    NotificationType["SYSTEM_ALERT"] = "SYSTEM_ALERT";
    NotificationType["SIREN_ALERT"] = "SIREN_ALERT";
    NotificationType["ACCOUNT_CREATED"] = "ACCOUNT_CREATED";
    NotificationType["PASSWORD_RESET"] = "PASSWORD_RESET";
    NotificationType["INFO"] = "INFO";
    NotificationType["WARNING"] = "WARNING";
    NotificationType["ALERT"] = "ALERT";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
let NotificationService = NotificationService_1 = class NotificationService {
    prisma;
    inAppProvider;
    pushProvider;
    router;
    logger = new common_1.Logger(NotificationService_1.name);
    platformBackupReminderDays = this.parsePositiveInt(process.env.SUPERADMIN_BACKUP_REMINDER_DAYS, 28);
    platformDangerDbSizeMb = this.parsePositiveInt(process.env.SUPERADMIN_DB_DANGER_SIZE_MB, 10240);
    constructor(prisma, inAppProvider, pushProvider, router) {
        this.prisma = prisma;
        this.inAppProvider = inAppProvider;
        this.pushProvider = pushProvider;
        this.router = router;
    }
    async createNotification(data) {
        const channels = ['in-app', 'sms'];
        const results = await this.router.route({
            schoolId: data.schoolId,
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type,
            actionUrl: data.actionUrl,
            metadata: typeof data.metadata === 'object' ? data.metadata : {},
        }, channels, data.bypassPreferences);
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
        return { id: (0, crypto_1.randomUUID)(), ...data };
    }
    async createBulkNotifications(data) {
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
    async createGlobalNotification(data) {
        const users = await this.prisma.user.findMany({
            where: { schoolId: data.schoolId, isActive: true },
            select: { id: true },
        });
        const userIds = users.map((u) => u.id);
        if (userIds.length === 0)
            return { count: 0 };
        return this.createBulkNotifications({ ...data, userIds });
    }
    async createPlatformNotification(data) {
        const id = (0, crypto_1.randomUUID)();
        await this.prisma.$executeRaw(client_1.Prisma.sql `
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
        }).catch(() => { });
        return { id, ...data, schoolId: null };
    }
    async getUserNotifications(userId, userRole, options) {
        const canViewSchoolGlobal = userRole === 'ADMIN' || userRole === 'IT_MANAGER';
        const canViewPlatform = userRole === 'SUPER_ADMIN';
        const where = { userId };
        if (canViewSchoolGlobal) {
            where.OR = [{ userId }, { userId: null }];
            delete where.userId;
        }
        if (canViewPlatform) {
            where.OR = [{ userId, schoolId: null }, { userId: null, schoolId: null }];
            delete where.userId;
        }
        else if (options?.schoolId) {
            where.schoolId = options.schoolId;
        }
        if (options?.unreadOnly)
            where.isRead = false;
        if (options?.type)
            where.type = options.type;
        if (options?.types?.length)
            where.type = { in: options.types };
        if (options?.category) {
            const map = {
                attendance: ['ATTENDANCE_MARKED', 'ATTENDANCE_ABSENT', 'ATTENDANCE_LATE', 'ATTENDANCE_SESSION_OPENED', 'ATTENDANCE_SESSION_SUBMITTED'],
                enrollment: ['ENROLLMENT_SUBMITTED', 'ENROLLMENT_APPROVED', 'ENROLLMENT_REJECTED', 'ENROLLMENT_PENDING'],
                academic: ['ASSIGNMENT_CREATED', 'ASSIGNMENT_DUE', 'ASSIGNMENT_GRADED', 'RESULT_PUBLISHED', 'GRADE_UPDATED'],
                schedule: ['SCHEDULE_CHANGED', 'CLASS_CANCELLED', 'TIMETABLE_UPDATED', 'PICKUP_REMINDER'],
                communication: ['MESSAGE_RECEIVED', 'ANNOUNCEMENT', 'COMMUNICATION'],
                event: ['EVENT', 'EVENT_UPDATED', 'EVENT_DELETED'],
                finance: ['FEE_DUE', 'FEE_PAID', 'PAYMENT_RECEIVED', 'PAYROLL_PAYMENT_DUE', 'PAYROLL_RUN_REQUIRED'],
                system: ['SYSTEM_ALERT', 'SIREN_ALERT', 'ACCOUNT_CREATED', 'PASSWORD_RESET', 'INFO', 'WARNING', 'ALERT'],
            };
            where.type = { in: map[options.category.toLowerCase()] || [] };
        }
        const limit = Math.min(options?.limit || 20, 100);
        return this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
    }
    async getNotificationCategories(userId, userRole, schoolId) {
        const canViewSchoolGlobal = userRole === 'ADMIN' || userRole === 'IT_MANAGER';
        const canViewPlatform = userRole === 'SUPER_ADMIN';
        const where = { userId };
        if (canViewSchoolGlobal) {
            where.OR = [{ userId }, { userId: null }];
            delete where.userId;
        }
        if (canViewPlatform) {
            where.OR = [{ userId, schoolId: null }, { userId: null, schoolId: null }];
            delete where.userId;
        }
        else if (schoolId) {
            where.schoolId = schoolId;
        }
        const notifications = await this.prisma.notification.findMany({
            where, select: { type: true, isRead: true },
        });
        const categories = {
            all: { total: notifications.length, unread: notifications.filter((n) => !n.isRead).length },
            attendance: { total: 0, unread: 0 }, enrollment: { total: 0, unread: 0 },
            academic: { total: 0, unread: 0 }, schedule: { total: 0, unread: 0 },
            communication: { total: 0, unread: 0 }, event: { total: 0, unread: 0 },
            finance: { total: 0, unread: 0 }, system: { total: 0, unread: 0 },
        };
        const map = {
            attendance: ['ATTENDANCE_MARKED', 'ATTENDANCE_ABSENT', 'ATTENDANCE_LATE', 'ATTENDANCE_SESSION_OPENED', 'ATTENDANCE_SESSION_SUBMITTED'],
            enrollment: ['ENROLLMENT_SUBMITTED', 'ENROLLMENT_APPROVED', 'ENROLLMENT_REJECTED', 'ENROLLMENT_PENDING'],
            academic: ['ASSIGNMENT_CREATED', 'ASSIGNMENT_DUE', 'ASSIGNMENT_GRADED', 'RESULT_PUBLISHED', 'GRADE_UPDATED'],
            schedule: ['SCHEDULE_CHANGED', 'CLASS_CANCELLED', 'TIMETABLE_UPDATED', 'PICKUP_REMINDER'],
            communication: ['MESSAGE_RECEIVED', 'ANNOUNCEMENT', 'COMMUNICATION'],
            event: ['EVENT', 'EVENT_UPDATED', 'EVENT_DELETED'],
            finance: ['FEE_DUE', 'FEE_PAID', 'PAYMENT_RECEIVED', 'PAYROLL_PAYMENT_DUE', 'PAYROLL_RUN_REQUIRED'],
            system: ['SYSTEM_ALERT', 'SIREN_ALERT', 'ACCOUNT_CREATED', 'PASSWORD_RESET', 'INFO', 'WARNING', 'ALERT'],
        };
        for (const n of notifications) {
            for (const [cat, types] of Object.entries(map)) {
                if (types.includes(n.type)) {
                    categories[cat].total++;
                    if (!n.isRead)
                        categories[cat].unread++;
                    break;
                }
            }
        }
        return categories;
    }
    async getUnreadCount(userId, userRole, schoolId, types) {
        const canViewSchoolGlobal = userRole === 'ADMIN' || userRole === 'IT_MANAGER';
        const canViewPlatform = userRole === 'SUPER_ADMIN';
        const where = { isRead: false, userId };
        if (canViewSchoolGlobal) {
            where.OR = [{ userId, isRead: false }, { userId: null, isRead: false }];
            delete where.userId;
            delete where.isRead;
        }
        if (canViewPlatform) {
            where.OR = [{ userId, schoolId: null, isRead: false }, { userId: null, schoolId: null, isRead: false }];
            delete where.userId;
            delete where.isRead;
        }
        else if (schoolId) {
            where.schoolId = schoolId;
        }
        if (types?.length)
            where.type = { in: types };
        return this.prisma.notification.count({ where });
    }
    async markAsRead(notificationId, userId, schoolId, userRole) {
        const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
        if (!notification)
            return null;
        const canReadSchoolGlobal = notification.userId === null && schoolId &&
            notification.schoolId === schoolId && (userRole === 'ADMIN' || userRole === 'IT_MANAGER');
        if (notification.userId === userId || canReadSchoolGlobal) {
            if (notification.userId === userId) {
                if (schoolId && notification.schoolId !== schoolId)
                    return null;
                return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
            }
            return notification;
        }
        return null;
    }
    async markAllAsRead(userId, schoolId, types) {
        await this.prisma.notification.updateMany({
            where: { userId, isRead: false, ...(schoolId ? { schoolId } : {}), ...(types?.length ? { type: { in: types } } : {}) },
            data: { isRead: true },
        });
        return { success: true };
    }
    async getNotificationPreferences(userId, userRole) {
        try {
            return await this.prisma.notificationPreference.upsert({
                where: { userId },
                update: {},
                create: { userId, emailEnabled: true, smsEnabled: false, pushEnabled: true },
            });
        }
        catch {
            return this.prisma.notificationPreference.findUnique({ where: { userId } });
        }
    }
    async updateNotificationPreferences(userId, userRole, data) {
        await this.prisma.notificationPreference.upsert({
            where: { userId }, update: data,
            create: { userId, emailEnabled: true, smsEnabled: false, pushEnabled: true, ...data },
        });
        return this.prisma.notificationPreference.findUnique({ where: { userId } });
    }
    async savePushSubscription(data) {
        return this.pushProvider.saveSubscription(data);
    }
    async removePushSubscription(userId, endpoint) {
        await this.pushProvider.removeSubscription(userId, endpoint);
        return { success: true };
    }
    isWebPushConfigured() {
        return this.pushProvider.isConfigured();
    }
    getWebPushPublicKey() {
        return this.pushProvider.getPublicKey();
    }
    async notifyAdminsOfNewEnrollment(schoolId, studentName, grade) {
        const users = await this.prisma.user.findMany({
            where: { schoolId, role: { in: ['ADMIN', 'REGISTRAR'] } }, select: { id: true },
        });
        if (users.length === 0)
            return { count: 0 };
        return Promise.all(users.map((u) => this.createNotification({
            schoolId, userId: u.id, title: 'New Enrollment', message: `${studentName} - ${grade}`,
            type: NotificationType.ENROLLMENT_PENDING, actionUrl: '/admin/enrollment',
            metadata: { studentName, grade },
        }))).then((r) => ({ count: r.length }));
    }
    async notifyEnrollmentApproval(schoolId, userId, studentName, className) {
        return this.createNotification({
            schoolId, userId, title: 'Enrollment Approved', message: `${studentName} approved for ${className}`,
            type: NotificationType.ENROLLMENT_APPROVED, actionUrl: '/student/profile',
            metadata: { studentName, className },
        });
    }
    async notifyEnrollmentRejection(schoolId, userId, studentName, reason) {
        return this.createNotification({
            schoolId, userId, title: 'Enrollment Rejected', message: reason ? `${studentName}: ${reason}` : `${studentName} was not approved`,
            type: NotificationType.ENROLLMENT_REJECTED, actionUrl: '/enroll',
            metadata: { studentName, reason },
        });
    }
    async notifyParentOfAbsence(schoolId, parentId, studentName, date, className) {
        return this.createNotification({
            schoolId, userId: parentId, title: 'Absence Alert', message: `${studentName} was absent on ${date} (${className})`,
            type: NotificationType.ATTENDANCE_ABSENT, actionUrl: '/parent/attendance',
            metadata: { studentName, date, className },
        });
    }
    async notifyParentOfLate(schoolId, parentId, studentName, time, className) {
        return this.createNotification({
            schoolId, userId: parentId, title: 'Late Arrival', message: `${studentName} arrived late at ${time} (${className})`,
            type: NotificationType.ATTENDANCE_LATE, actionUrl: '/parent/attendance',
            metadata: { studentName, time, className },
        });
    }
    async notifyTeacherAttendanceSession(schoolId, teacherId, className, subject) {
        return this.createNotification({
            schoolId, userId: teacherId, title: 'Attendance Session', message: `Session opened for ${className} - ${subject}`,
            type: NotificationType.ATTENDANCE_SESSION_OPENED, actionUrl: '/teacher/attendance',
            metadata: { className, subject },
        });
    }
    async notifyTeacherAttendanceReminder(schoolId, teacherId, className, subject, startTime) {
        return this.createNotification({
            schoolId, userId: teacherId, title: 'Attendance Reminder', message: `Please take attendance for ${className} - ${subject} at ${startTime}`,
            type: NotificationType.ATTENDANCE_SESSION_OPENED, actionUrl: '/teacher/attendance',
            metadata: { className, subject, startTime },
        });
    }
    async notifyHomeroomMissingAttendance(schoolId, teacherId, className, grade, section, date) {
        return this.createNotification({
            schoolId, userId: teacherId, title: 'Missing Attendance', message: `Attendance not recorded for ${className} (Grade ${grade} - ${section}) on ${date}`,
            type: NotificationType.ATTENDANCE_SESSION_OPENED, actionUrl: '/teacher/attendance',
            metadata: { className, grade, section, date }, bypassPreferences: true,
        });
    }
    async notifyStudentsOfAssignment(schoolId, studentIds, assignmentTitle, dueDate, className) {
        const results = await Promise.allSettled(studentIds.map((id) => this.createNotification({
            schoolId, userId: id, title: 'New Assignment', message: `${assignmentTitle} due ${dueDate} (${className})`,
            type: NotificationType.ASSIGNMENT_CREATED, actionUrl: '/student/assignments',
            metadata: { assignmentTitle, dueDate, className },
        })));
        return { count: results.filter((r) => r.status === 'fulfilled').length };
    }
    async notifyParentsOfAssignment(schoolId, parentIds, assignmentTitle, dueDate, studentName) {
        const results = await Promise.allSettled(parentIds.map((id) => this.createNotification({
            schoolId, userId: id, title: 'Assignment for Your Child', message: `${studentName} - ${assignmentTitle} due ${dueDate}`,
            type: NotificationType.ASSIGNMENT_CREATED, actionUrl: '/parent/assignments',
            metadata: { assignmentTitle, dueDate, studentName },
        })));
        return { count: results.filter((r) => r.status === 'fulfilled').length };
    }
    async notifyStudentOfGrade(schoolId, studentId, assignmentTitle, grade, className) {
        return this.createNotification({
            schoolId, userId: studentId, title: 'Assignment Graded', message: `${assignmentTitle}: ${grade} (${className})`,
            type: NotificationType.ASSIGNMENT_GRADED, actionUrl: '/student/results',
            metadata: { assignmentTitle, grade, className },
        });
    }
    async notifyParentOfChildGrade(schoolId, parentId, studentName, assignmentTitle, grade) {
        return this.createNotification({
            schoolId, userId: parentId, title: 'Grade Update', message: `${studentName} received ${grade} on ${assignmentTitle}`,
            type: NotificationType.ASSIGNMENT_GRADED, actionUrl: '/parent/results',
            metadata: { studentName, assignmentTitle, grade },
        });
    }
    async notifyResultPublished(schoolId, userIds, term, className) {
        const results = await Promise.allSettled(userIds.map((id) => this.createNotification({
            schoolId, userId: id, title: 'Results Published', message: `Results for ${term} (${className}) are now available`,
            type: NotificationType.RESULT_PUBLISHED, actionUrl: '/results',
            metadata: { term, className },
        })));
        return { count: results.filter((r) => r.status === 'fulfilled').length };
    }
    async notifyAssessmentStarted(schoolId, teacherIds, assessmentTitle, assessmentType, className, subjectName, metadata) {
        const results = await Promise.allSettled(teacherIds.map((id) => this.createNotification({
            schoolId, userId: id, title: 'Assessment Started', message: `${assessmentType}: ${assessmentTitle} - ${className} (${subjectName})`,
            type: NotificationType.ASSESSMENT_CREATED, actionUrl: '/teacher/exams',
            metadata: { assessmentTitle, assessmentType, className, subjectName, ...metadata },
        })));
        return { count: results.filter((r) => r.status === 'fulfilled').length };
    }
    async notifyScheduleChange(schoolId, userIds, message) {
        const results = await Promise.allSettled(userIds.map((id) => this.createNotification({
            schoolId, userId: id, title: 'Schedule Changed', message,
            type: NotificationType.SCHEDULE_CHANGED, actionUrl: '/schedule',
        })));
        return { count: results.filter((r) => r.status === 'fulfilled').length };
    }
    async notifyTimetableUpdate(schoolId, userIds, className) {
        const results = await Promise.allSettled(userIds.map((id) => this.createNotification({
            schoolId, userId: id, title: 'Timetable Updated', message: `Timetable updated for ${className}`,
            type: NotificationType.TIMETABLE_UPDATED, actionUrl: '/timetable',
            metadata: { className },
        })));
        return { count: results.filter((r) => r.status === 'fulfilled').length };
    }
    async notifyFeeDue(schoolId, userId, amount, dueDate, studentName) {
        return this.createNotification({
            schoolId, userId, title: 'Fee Due', message: `${amount} due by ${dueDate}${studentName ? ` for ${studentName}` : ''}`,
            type: NotificationType.FEE_DUE, actionUrl: '/fees',
            metadata: { amount, dueDate, studentName },
        });
    }
    async notifyPaymentReceived(schoolId, userId, amount, receiptNumber) {
        return this.createNotification({
            schoolId, userId, title: 'Payment Received', message: `${amount} received (Receipt: ${receiptNumber})`,
            type: NotificationType.PAYMENT_RECEIVED, actionUrl: '/fees',
            metadata: { amount, receiptNumber },
        });
    }
    async notifyNewMessage(schoolId, userId, senderName, preview) {
        const short = preview.length > 50 ? `${preview.slice(0, 50)}...` : preview;
        return this.createNotification({
            schoolId, userId, title: 'New Message', message: `${senderName}: ${short}`,
            type: NotificationType.MESSAGE_RECEIVED, actionUrl: '/messages',
            metadata: { senderName },
        });
    }
    async notifyAccountCreated(schoolId, userId, tempPassword) {
        return this.createNotification({
            schoolId, userId, title: 'Account Created', message: tempPassword ? 'Welcome! Use your temporary password to log in.' : 'Welcome!',
            type: NotificationType.ACCOUNT_CREATED, actionUrl: '/profile',
        });
    }
    async sendSchoolAnnouncement(schoolId, title, message) {
        return this.createGlobalNotification({ schoolId, title, message, type: NotificationType.ANNOUNCEMENT });
    }
    async sendRoleAnnouncement(schoolId, role, title, message) {
        const users = await this.prisma.user.findMany({ where: { schoolId, role: role }, select: { id: true } });
        if (users.length === 0)
            return { count: 0 };
        return this.createBulkNotifications({ schoolId, userIds: users.map((u) => u.id), title, message, type: NotificationType.ANNOUNCEMENT });
    }
    async createSystemAlert(schoolId, title, message, actionUrl) {
        return this.createGlobalNotification({ schoolId, title, message, type: NotificationType.SYSTEM_ALERT, actionUrl });
    }
    async notifyClassCancellation(schoolId, teacherIds, className, date, reason) {
        const results = await Promise.allSettled(teacherIds.map((id) => this.createNotification({
            schoolId, userId: id, title: 'Class Cancelled', message: `${className} on ${date}${reason ? `: ${reason}` : ''}`,
            type: NotificationType.CLASS_CANCELLED, actionUrl: '/schedule',
            metadata: { className, date, reason },
        })));
        return { count: results.filter((r) => r.status === 'fulfilled').length };
    }
    async notifyStudentsOfClassCancellation(schoolId, studentIds, className, subject, date) {
        const results = await Promise.allSettled(studentIds.map((id) => this.createNotification({
            schoolId, userId: id, title: 'Class Cancelled', message: `${subject} (${className}) cancelled on ${date}`,
            type: NotificationType.CLASS_CANCELLED, actionUrl: '/student/schedule',
            metadata: { className, subject, date },
        })));
        return { count: results.filter((r) => r.status === 'fulfilled').length };
    }
    async notifyAccountDeactivated(userId, schoolId, reason) {
        return this.createNotification({
            schoolId, userId, title: 'Account Deactivated', message: reason ? `Reason: ${reason}` : 'Your account has been deactivated.',
            type: NotificationType.ALERT, actionUrl: '/profile', metadata: { reason },
        });
    }
    async notifyAccountActivated(userId, schoolId) {
        return this.createNotification({
            schoolId, userId, title: 'Account Activated', message: 'Your account has been reactivated.',
            type: NotificationType.INFO, actionUrl: '/login',
        });
    }
    async notifyTeachersOfSiren(schoolId, type, triggerType, targetTeacherIds) {
        const teacherIds = targetTeacherIds ?? (await this.prisma.user.findMany({ where: { schoolId, role: 'TEACHER' }, select: { id: true } })).map((t) => t.id);
        if (teacherIds.length === 0)
            return { count: 0 };
        const results = await Promise.allSettled(teacherIds.map((id) => this.createNotification({
            schoolId, userId: id, title: 'Siren Alert', message: `${type} triggered`,
            type: NotificationType.SIREN_ALERT, actionUrl: '/teacher',
            metadata: { source: 'siren', sirenType: type, triggerType },
        })));
        return { count: results.filter((r) => r.status === 'fulfilled').length };
    }
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
                if (weekday === 'Sat' || weekday === 'Sun')
                    continue;
                const schoolEndTime = endTimeBySchool.get(school.id) || '15:00';
                if (schoolEndTime !== targetTime)
                    continue;
                const lockKey = `pickup-reminder:${school.id}:${schoolEndTime}:${now.toISOString().slice(0, 10)}`;
                await this.prisma.$transaction(async (tx) => {
                    await tx.$executeRaw(client_1.Prisma.sql `SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
                    const parentLinks = await tx.parentStudent.findMany({
                        where: { schoolId: school.id, student: { enrollmentStatus: 'APPROVED' } },
                        select: { parent: { select: { userId: true } } },
                    });
                    const parentIds = [...new Set(parentLinks.map((l) => l.parent.userId).filter(Boolean))];
                    if (parentIds.length === 0)
                        return;
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
        }
        catch (error) {
            this.logger.error('Failed to send school pickup reminders', error);
        }
    }
    async sendSuperAdminPlatformNotifications() {
        const superAdmins = await this.prisma.user.findMany({
            where: { role: 'SUPER_ADMIN', isActive: true },
            select: { id: true },
        });
        if (superAdmins.length === 0)
            return;
        const lastBackupRows = await this.prisma.$queryRaw(client_1.Prisma.sql `SELECT MAX("createdAt") AS "lastBackupAt" FROM "SystemAuditLog" WHERE "action" = 'BACKUP_DOWNLOAD' AND "entityType" = 'PLATFORM_BACKUP'`);
        const lastBackupAt = lastBackupRows[0]?.lastBackupAt || null;
        const daysSince = lastBackupAt ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000) : null;
        const isOverdue = !lastBackupAt || (daysSince !== null && daysSince >= this.platformBackupReminderDays);
        const dbSizeRows = await this.prisma.$queryRaw(client_1.Prisma.sql `SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 AS "sizeMb"`).catch(() => [{ sizeMb: 0 }]);
        const dbSize = dbSizeRows[0]?.sizeMb ?? null;
        for (const sa of superAdmins) {
            const id = (0, crypto_1.randomUUID)();
            if (isOverdue) {
                await this.prisma.$executeRaw(client_1.Prisma.sql `
          INSERT INTO "Notification" ("id", "schoolId", "userId", "title", "message", "type", "actionUrl", "metadata", "createdAt", "updatedAt")
          VALUES (${id}, NULL, ${sa.id}, 'Platform Backup Overdue', ${`Last backup ${daysSince ? `${daysSince} days ago` : 'never recorded'}`}, ${NotificationType.ALERT}, '/superadmin/backups', ${JSON.stringify({ severity: 'HIGH' })}, NOW(), NOW())
        `);
            }
            if (dbSize !== null && dbSize >= this.platformDangerDbSizeMb) {
                await this.prisma.$executeRaw(client_1.Prisma.sql `
          INSERT INTO "Notification" ("id", "schoolId", "userId", "title", "message", "type", "actionUrl", "metadata", "createdAt", "updatedAt")
          VALUES (${(0, crypto_1.randomUUID)()}, NULL, ${sa.id}, 'Database Size Critical', ${`Database is ${Math.round(dbSize)} MB (threshold: ${this.platformDangerDbSizeMb} MB)`}, ${NotificationType.SYSTEM_ALERT}, '/superadmin', ${JSON.stringify({ severity: 'HIGH' })}, NOW(), NOW())
        `);
            }
            if (new Date().getDay() === 1) {
                const [schoolCounts, userCounts] = await Promise.all([
                    this.prisma.school.groupBy({ by: ['isActive'], _count: { _all: true } }),
                    this.prisma.user.groupBy({ by: ['isActive'], _count: { _all: true } }),
                ]);
                const activeSchools = schoolCounts.find((r) => r.isActive)?._count._all || 0;
                const activeUsers = userCounts.find((r) => r.isActive)?._count._all || 0;
                await this.prisma.$executeRaw(client_1.Prisma.sql `
          INSERT INTO "Notification" ("id", "schoolId", "userId", "title", "message", "type", "actionUrl", "metadata", "createdAt", "updatedAt")
          VALUES (${(0, crypto_1.randomUUID)()}, NULL, ${sa.id}, 'Weekly Platform Summary', ${`${activeSchools} active schools, ${activeUsers} active users, DB ${Math.round(dbSize || 0)} MB`}, ${NotificationType.INFO}, '/superadmin', ${JSON.stringify({ activeSchools, activeUsers })}, NOW(), NOW())
        `);
            }
        }
    }
    parsePositiveInt(value, fallback) {
        const parsed = Number.parseInt(String(value || ''), 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }
};
exports.NotificationService = NotificationService;
__decorate([
    (0, schedule_1.Cron)('0 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationService.prototype, "sendSchoolPickupReminders", null);
__decorate([
    (0, schedule_1.Cron)('0 9 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationService.prototype, "sendSuperAdminPlatformNotifications", null);
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        in_app_provider_1.InAppNotificationProvider,
        push_provider_1.PushNotificationProvider,
        channel_router_service_1.NotificationChannelRouter])
], NotificationService);
//# sourceMappingURL=notification.service.js.map