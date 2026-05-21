"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const webpush = __importStar(require("web-push"));
const crypto_1 = require("crypto");
const notification_messages_1 = require("./notification-messages");
const date_util_1 = require("../common/date.util");
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
    logger = new common_1.Logger(NotificationService_1.name);
    canViewSchoolGlobalNotifications(userRole) {
        return userRole === 'ADMIN' || userRole === 'IT_MANAGER';
    }
    constructor(prisma) {
        this.prisma = prisma;
        this.configureWebPush();
    }
    async getUserLanguage(userId) {
        if (!userId)
            return 'en';
        try {
            const users = await this.prisma.$queryRaw(client_1.Prisma.sql `SELECT language FROM "User" WHERE id = ${userId} LIMIT 1`);
            const lang = users[0]?.language;
            if (lang && ['en', 'am', 'ar', 'om', 'so'].includes(lang)) {
                return lang;
            }
        }
        catch {
        }
        return 'en';
    }
    parseDateOnlyAsLocalDay(date) {
        const [year, month, day] = String(date).split('-').map(Number);
        if (!year || !month || !day) {
            return new Date(date);
        }
        return new Date(year, month - 1, day);
    }
    async getSchoolCalendarType(schoolId) {
        if (!schoolId)
            return 'ETHIOPIAN';
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
    translate(key, language, ...args) {
        const langMessages = notification_messages_1.notificationMessages[language] || notification_messages_1.notificationMessages.en;
        const template = langMessages[key];
        if (!template) {
            const fallback = notification_messages_1.notificationMessages.en[key];
            if (!fallback)
                return { title: '', message: '' };
            return typeof fallback === 'function' ? fallback(...args) : fallback;
        }
        return typeof template === 'function' ? template(...args) : template;
    }
    buildDefaultPreferencesForRole(userRole) {
        const role = userRole?.toUpperCase();
        const defaults = {
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
    getPreferenceCategoryForNotificationType(type) {
        if ([
            NotificationType.MESSAGE_RECEIVED,
            NotificationType.COMMUNICATION,
        ].includes(type)) {
            return 'commBookEnabled';
        }
        if ([
            NotificationType.SCHEDULE_CHANGED,
            NotificationType.CLASS_CANCELLED,
            NotificationType.TIMETABLE_UPDATED,
            NotificationType.PICKUP_REMINDER,
        ].includes(type)) {
            return 'timetableEnabled';
        }
        if ([
            NotificationType.ATTENDANCE_MARKED,
            NotificationType.ATTENDANCE_ABSENT,
            NotificationType.ATTENDANCE_LATE,
            NotificationType.ATTENDANCE_SESSION_OPENED,
            NotificationType.ATTENDANCE_SESSION_SUBMITTED,
        ].includes(type)) {
            return 'attendanceEnabled';
        }
        if (type === NotificationType.ANNOUNCEMENT) {
            return 'announcementsEnabled';
        }
        if ([
            NotificationType.ASSIGNMENT_CREATED,
            NotificationType.ASSIGNMENT_DUE,
            NotificationType.ASSIGNMENT_GRADED,
            NotificationType.LESSON_PUBLISHED,
            NotificationType.LESSON,
        ].includes(type)) {
            return 'assignmentsEnabled';
        }
        if ([
            NotificationType.RESULT_PUBLISHED,
            NotificationType.GRADE_UPDATED,
            NotificationType.ASSESSMENT_CREATED,
        ].includes(type)) {
            return 'examsEnabled';
        }
        if ([
            NotificationType.FEE_DUE,
            NotificationType.FEE_PAID,
            NotificationType.PAYMENT_RECEIVED,
        ].includes(type)) {
            return 'feesEnabled';
        }
        if ([
            NotificationType.EVENT,
            NotificationType.EVENT_UPDATED,
            NotificationType.EVENT_DELETED,
        ].includes(type)) {
            return 'eventsEnabled';
        }
        return null;
    }
    isNotificationTypeEnabled(type, preferences) {
        const category = this.getPreferenceCategoryForNotificationType(type);
        if (!category) {
            return true;
        }
        return preferences[category];
    }
    async ensureNotificationPreferences(userId, userRole) {
        let role = userRole;
        if (!role) {
            const users = await this.prisma.$queryRaw(client_1.Prisma.sql `
          SELECT "role"::text AS role
          FROM "User"
          WHERE id = ${userId}
          LIMIT 1
        `);
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
        }
        catch (error) {
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
    async getNotificationPreferences(userId, userRole) {
        return this.ensureNotificationPreferences(userId, userRole);
    }
    async updateNotificationPreferences(userId, userRole, data) {
        await this.ensureNotificationPreferences(userId, userRole);
        return this.prisma.notificationPreference.update({
            where: { userId },
            data,
        });
    }
    async getPreferenceSnapshotsForUsers(userIds) {
        const uniqueUserIds = Array.from(new Set(userIds));
        const users = await this.prisma.$queryRaw(client_1.Prisma.sql `
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
      WHERE u.id IN (${client_1.Prisma.join(uniqueUserIds)})
    `);
        const preferenceMap = new Map();
        for (const user of users) {
            const preference = user.preferenceId
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
    async filterEligibleUserIdsForNotification(userIds, type) {
        const preferences = await this.getPreferenceSnapshotsForUsers(userIds);
        return userIds.filter((userId) => {
            const preference = preferences.get(userId);
            return (preference && this.isNotificationTypeEnabled(type, preference));
        });
    }
    async filterPushEligibleUserIdsForNotification(userIds, type) {
        const preferences = await this.getPreferenceSnapshotsForUsers(userIds);
        return userIds.filter((userId) => {
            const preference = preferences.get(userId);
            return (preference &&
                preference.pushEnabled &&
                this.isNotificationTypeEnabled(type, preference));
        });
    }
    configureWebPush() {
        const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
        const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
        if (!publicKey || !privateKey) {
            return;
        }
        webpush.setVapidDetails(process.env.WEB_PUSH_CONTACT_EMAIL || 'mailto:admin@example.com', publicKey, privateKey);
    }
    isWebPushConfigured() {
        return Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY);
    }
    getWebPushPublicKey() {
        return process.env.WEB_PUSH_PUBLIC_KEY || null;
    }
    async getUserNotifications(userId, userRole, options) {
        const canSeeSchoolGlobalNotifications = this.canViewSchoolGlobalNotifications(userRole);
        const where = {
            userId,
        };
        if (canSeeSchoolGlobalNotifications) {
            where.OR = [{ userId }, { userId: null }];
            delete where.userId;
        }
        if (options?.schoolId) {
            where.schoolId = options.schoolId;
        }
        if (options?.unreadOnly) {
            where.isRead = false;
        }
        if (options?.type) {
            where.type = options.type;
        }
        if (options?.types?.length) {
            where.type = { in: options.types };
        }
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
        return notifications.filter((notification) => this.isNotificationTypeEnabled(notification.type, preferences));
    }
    getTypesForCategory(category) {
        const categoryMap = {
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
    async getNotificationCategories(userId, userRole, schoolId) {
        const canSeeSchoolGlobalNotifications = this.canViewSchoolGlobalNotifications(userRole);
        const where = {
            userId,
        };
        if (canSeeSchoolGlobalNotifications) {
            where.OR = [{ userId }, { userId: null }];
            delete where.userId;
        }
        if (schoolId) {
            where.schoolId = schoolId;
        }
        const notifications = await this.prisma.notification.findMany({
            where,
            select: { type: true, isRead: true },
        });
        const preferences = await this.getNotificationPreferences(userId, userRole);
        const visibleNotifications = notifications.filter((notification) => this.isNotificationTypeEnabled(notification.type, preferences));
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
            if ([
                'ATTENDANCE_MARKED',
                'ATTENDANCE_ABSENT',
                'ATTENDANCE_LATE',
                'ATTENDANCE_SESSION_OPENED',
                'ATTENDANCE_SESSION_SUBMITTED',
            ].includes(type)) {
                categories.attendance.total++;
                if (isUnread)
                    categories.attendance.unread++;
            }
            else if ([
                'ENROLLMENT_SUBMITTED',
                'ENROLLMENT_APPROVED',
                'ENROLLMENT_REJECTED',
                'ENROLLMENT_PENDING',
            ].includes(type)) {
                categories.enrollment.total++;
                if (isUnread)
                    categories.enrollment.unread++;
            }
            else if ([
                'ASSIGNMENT_CREATED',
                'ASSIGNMENT_DUE',
                'ASSIGNMENT_GRADED',
                'RESULT_PUBLISHED',
                'GRADE_UPDATED',
            ].includes(type)) {
                categories.academic.total++;
                if (isUnread)
                    categories.academic.unread++;
            }
            else if ([
                'SCHEDULE_CHANGED',
                'CLASS_CANCELLED',
                'TIMETABLE_UPDATED',
                'PICKUP_REMINDER',
            ].includes(type)) {
                categories.schedule.total++;
                if (isUnread)
                    categories.schedule.unread++;
            }
            else if (['MESSAGE_RECEIVED', 'ANNOUNCEMENT', 'COMMUNICATION'].includes(type)) {
                categories.communication.total++;
                if (isUnread)
                    categories.communication.unread++;
            }
            else if (['EVENT', 'EVENT_UPDATED', 'EVENT_DELETED'].includes(type)) {
                categories.event.total++;
                if (isUnread)
                    categories.event.unread++;
            }
            else if (['FEE_DUE', 'FEE_PAID', 'PAYMENT_RECEIVED'].includes(type)) {
                categories.finance.total++;
                if (isUnread)
                    categories.finance.unread++;
            }
            else if ([
                'SYSTEM_ALERT',
                'SIREN_ALERT',
                'ACCOUNT_CREATED',
                'PASSWORD_RESET',
                'INFO',
                'WARNING',
                'ALERT',
            ].includes(type)) {
                categories.system.total++;
                if (isUnread)
                    categories.system.unread++;
            }
        });
        return categories;
    }
    async getUnreadCount(userId, userRole, schoolId, types) {
        const canSeeSchoolGlobalNotifications = this.canViewSchoolGlobalNotifications(userRole);
        const where = {
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
        return notifications.filter((notification) => !notification.isRead &&
            this.isNotificationTypeEnabled(notification.type, preferences)).length;
    }
    async markAsRead(notificationId, userId, schoolId, userRole) {
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            return null;
        }
        const canReadSchoolGlobal = notification.userId === null &&
            schoolId &&
            notification.schoolId === schoolId &&
            this.canViewSchoolGlobalNotifications(userRole || '');
        if (notification.userId === userId || canReadSchoolGlobal) {
            if (notification.userId === userId) {
                if (schoolId && notification.schoolId !== schoolId) {
                    return null;
                }
                return this.prisma.notification.update({
                    where: { id: notificationId },
                    data: { isRead: true },
                });
            }
            return notification;
        }
        return null;
    }
    async markAllAsRead(userId, schoolId, types) {
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
    async createNotification(data) {
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
            try {
                await this.sendPushToUsers([data.userId], {
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    actionUrl: data.actionUrl,
                    notificationId: notification.id,
                    metadata: data.metadata,
                });
            }
            catch (error) {
                this.logger.warn(`Push delivery lookup failed for notification ${notification.id}: ${error?.message || 'unknown error'}`);
            }
        }
        return notification;
    }
    async createBulkNotifications(data) {
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
    toHHMM(date, timeZone = 'Africa/Addis_Ababa') {
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
    normalizeHHMM(value) {
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
    parseSettingValue(value) {
        if (value === undefined) {
            return undefined;
        }
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    isWeekend(date, timeZone = 'Africa/Addis_Ababa') {
        const weekday = new Intl.DateTimeFormat('en-US', {
            timeZone,
            weekday: 'short',
        }).format(date);
        return weekday === 'Sat' || weekday === 'Sun';
    }
    getLocalDayRange(date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }
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
            const endTimeBySchoolId = new Map(endTimeSettings
                .filter((setting) => setting.key === 'SCHOOL_END_TIME')
                .map((setting) => [setting.schoolId, setting.value]));
            const calendarTypeBySchoolId = new Map(endTimeSettings
                .filter((setting) => setting.key === 'calendar_type')
                .map((setting) => [
                setting.schoolId,
                this.parseSettingValue(setting.value),
            ]));
            for (const school of schools) {
                const calendarType = calendarTypeBySchoolId.get(school.id);
                const timeZone = calendarType === 'ETHIOPIAN'
                    ? 'Africa/Addis_Ababa'
                    : school.timezone || 'Africa/Addis_Ababa';
                const targetTime = this.toHHMM(reminderTime, timeZone);
                if (this.isWeekend(now, timeZone)) {
                    continue;
                }
                const schoolEndTime = this.normalizeHHMM(this.parseSettingValue(endTimeBySchoolId.get(school.id)) || '15:00');
                if (schoolEndTime !== targetTime) {
                    continue;
                }
                await this.sendPickupReminderForSchool(school.id, school.name, schoolEndTime, now);
            }
        }
        catch (error) {
            this.logger.error('Failed to send school pickup reminders', error);
        }
    }
    async sendPickupReminderForSchool(schoolId, schoolName, schoolEndTime, now) {
        const { start, end } = this.getLocalDayRange(now);
        const lockKey = `pickup-reminder:${schoolId}:${schoolEndTime}:${start.toISOString().slice(0, 10)}`;
        const notifications = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
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
            const parentNameByUserId = new Map();
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
            const alreadySent = new Set(existing
                .filter((notification) => {
                const metadata = notification.metadata;
                return metadata?.schoolEndTime === schoolEndTime;
            })
                .map((notification) => notification.userId));
            const unsentParentIds = parentUserIds.filter((userId) => !alreadySent.has(userId));
            if (unsentParentIds.length === 0) {
                return [];
            }
            return Promise.all(unsentParentIds.map(async (parentUserId) => {
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
            }));
        });
        await Promise.all(notifications.map((notification) => this.sendPushToUsers([notification.userId].filter(Boolean), {
            title: notification.title,
            message: notification.message,
            type: notification.type,
            actionUrl: notification.actionUrl || undefined,
            notificationId: notification.id,
            metadata: {
                schoolEndTime,
                reminderMinutes: 20,
            },
        }).catch((error) => {
            this.logger.warn(`Push delivery lookup failed for notification ${notification.id}: ${error?.message || 'unknown error'}`);
        })));
    }
    async createGlobalNotification(data) {
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
    async savePushSubscription(data) {
        if (!data.subscription?.endpoint) {
            throw new common_1.BadRequestException('Subscription endpoint is required');
        }
        if (!data.schoolId && data.userId) {
            this.logger.warn(`Saving push subscription for user ${data.userId} without schoolId (super admin)`);
        }
        if (!data.subscription.keys?.p256dh || !data.subscription.keys?.auth) {
            throw new common_1.BadRequestException('Subscription keys are required');
        }
        const id = (0, crypto_1.randomUUID)().replace(/-/g, '');
        const expirationTime = typeof data.subscription.expirationTime === 'number'
            ? BigInt(Math.trunc(data.subscription.expirationTime))
            : null;
        await this.prisma.$executeRaw `
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
        const rows = await this.prisma.$queryRaw `
      SELECT id, endpoint
      FROM "PushSubscription"
      WHERE endpoint = ${data.subscription.endpoint}
      LIMIT 1
    `;
        return rows[0] ?? { endpoint: data.subscription.endpoint };
    }
    async removePushSubscription(userId, endpoint) {
        await this.prisma.$executeRaw `
      DELETE FROM "PushSubscription"
      WHERE userId = ${userId} AND endpoint = ${endpoint}
    `;
        return { success: true };
    }
    buildPushPayload(data) {
        const payload = {
            title: data.title,
            body: data.message,
            tag: data.type,
            url: data.actionUrl,
            type: data.type,
            notificationId: data.notificationId,
            metadata: data.metadata && typeof data.metadata === 'object'
                ? data.metadata
                : undefined,
        };
        return JSON.stringify(payload);
    }
    async sendPushToSubscriptions(subscriptions, payload) {
        if (!this.isWebPushConfigured() || subscriptions.length === 0) {
            return;
        }
        await Promise.allSettled(subscriptions.map(async (subscription) => {
            try {
                await webpush.sendNotification({
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh,
                        auth: subscription.auth,
                    },
                }, payload);
                await this.prisma.$executeRaw `
            UPDATE "PushSubscription"
            SET
              "lastSuccessfulAt" = NOW(),
              "lastFailureAt" = NULL,
              "failureCount" = 0,
              "updatedAt" = NOW()
            WHERE id = ${subscription.id}
          `;
            }
            catch (error) {
                const statusCode = error?.statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    await this.prisma.$executeRaw `
              DELETE FROM "PushSubscription"
              WHERE id = ${subscription.id}
            `;
                    return;
                }
                await this.prisma.$executeRaw `
            UPDATE "PushSubscription"
            SET
              "lastFailureAt" = NOW(),
              "failureCount" = "failureCount" + 1,
              "updatedAt" = NOW()
            WHERE id = ${subscription.id}
          `;
                this.logger.warn(`Push delivery failed for subscription ${subscription.id}: ${error?.message || 'unknown error'}`);
            }
        }));
    }
    async sendPushToUsers(userIds, data) {
        if (!this.isWebPushConfigured() || userIds.length === 0) {
            return;
        }
        const uniqueUserIds = Array.from(new Set(await this.filterPushEligibleUserIdsForNotification(userIds, data.type)));
        if (uniqueUserIds.length === 0) {
            return;
        }
        const subscriptions = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id, endpoint, p256dh, auth
      FROM "PushSubscription"
      WHERE "userId" IN (${client_1.Prisma.join(uniqueUserIds)})
    `);
        if (subscriptions.length === 0) {
            return;
        }
        const payload = this.buildPushPayload(data);
        await this.sendPushToSubscriptions(subscriptions, payload);
    }
    async sendPushToSchool(schoolId, data) {
        if (!this.isWebPushConfigured()) {
            return;
        }
        const subscriptions = await this.prisma.$queryRaw `
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
    async notifyAdminsOfNewEnrollment(schoolId, studentName, grade) {
        const users = await this.prisma.user.findMany({
            where: {
                schoolId,
                role: { in: ['ADMIN', 'REGISTRAR'] },
            },
            select: { id: true },
        });
        if (users.length === 0)
            return;
        const notifications = await Promise.all(users.map(async (u) => {
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
        }));
        return { count: notifications.length };
    }
    async notifyEnrollmentApproval(schoolId, userId, studentName, className) {
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
    async notifyEnrollmentRejection(schoolId, userId, studentName, reason) {
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
    async notifyParentOfAbsence(schoolId, parentId, studentName, date, className) {
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
    async notifyParentOfLate(schoolId, parentId, studentName, time, className) {
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
    async notifyTeacherAttendanceSession(schoolId, teacherId, className, subject) {
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
    async notifyTeacherAttendanceReminder(schoolId, teacherId, className, subject, startTime) {
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
    async notifyHomeroomMissingAttendance(schoolId, teacherId, className, grade, section, date) {
        const lang = await this.getUserLanguage(teacherId);
        const calendarType = await this.getSchoolCalendarType(schoolId);
        const displayDate = (0, date_util_1.formatSchoolDate)(this.parseDateOnlyAsLocalDay(date), { calendarType });
        const t = this.translate('missingAttendanceReminder', lang, className, String(grade), section, displayDate);
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
    async notifyStudentsOfAssignment(schoolId, studentIds, assignmentTitle, dueDate, className) {
        const notifications = await Promise.all(studentIds.map(async (studentId) => {
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
        }));
        return { count: notifications.length };
    }
    async notifyParentsOfAssignment(schoolId, parentIds, assignmentTitle, dueDate, studentName) {
        const notifications = await Promise.all(parentIds.map(async (parentId) => {
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
        }));
        return { count: notifications.length };
    }
    async notifyStudentOfGrade(schoolId, studentId, assignmentTitle, grade, className) {
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
    async notifyParentOfChildGrade(schoolId, parentId, studentName, assignmentTitle, grade) {
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
    async notifyResultPublished(schoolId, userIds, term, className) {
        const notifications = await Promise.all(userIds.map(async (userId) => {
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
        }));
        return { count: notifications.length };
    }
    async notifyAssessmentStarted(schoolId, teacherIds, assessmentTitle, assessmentType, className, subjectName, metadata) {
        const notifications = await Promise.all(teacherIds.map(async (teacherId) => {
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
        }));
        return { count: notifications.length };
    }
    async notifyScheduleChange(schoolId, userIds, message) {
        const notifications = await Promise.all(userIds.map(async (userId) => {
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
        }));
        return { count: notifications.length };
    }
    async notifyTimetableUpdate(schoolId, userIds, className) {
        const notifications = await Promise.all(userIds.map(async (userId) => {
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
        }));
        return { count: notifications.length };
    }
    async notifyFeeDue(schoolId, userId, amount, dueDate, studentName) {
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
    async notifyPaymentReceived(schoolId, userId, amount, receiptNumber) {
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
    async notifyNewMessage(schoolId, userId, senderName, preview) {
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
    async notifyAccountCreated(schoolId, userId, tempPassword) {
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
    async sendSchoolAnnouncement(schoolId, title, message) {
        return this.createGlobalNotification({
            schoolId,
            title,
            message,
            type: NotificationType.ANNOUNCEMENT,
        });
    }
    async sendRoleAnnouncement(schoolId, role, title, message) {
        const users = await this.prisma.user.findMany({
            where: { schoolId, role: role },
            select: { id: true },
        });
        if (users.length === 0)
            return;
        return this.createBulkNotifications({
            schoolId,
            userIds: users.map((u) => u.id),
            title,
            message,
            type: NotificationType.ANNOUNCEMENT,
        });
    }
    async createSystemAlert(schoolId, title, message, actionUrl) {
        return this.createGlobalNotification({
            schoolId,
            title,
            message,
            type: NotificationType.SYSTEM_ALERT,
            actionUrl,
        });
    }
    async notifyClassCancellation(schoolId, teacherIds, className, date, reason) {
        const notifications = await Promise.all(teacherIds.map(async (teacherId) => {
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
        }));
        return { count: notifications.length };
    }
    async notifyStudentsOfClassCancellation(schoolId, studentIds, className, subject, date) {
        const notifications = await Promise.all(studentIds.map(async (studentId) => {
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
        }));
        return { count: notifications.length };
    }
    async notifyAccountDeactivated(userId, schoolId, reason) {
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
    async notifyAccountActivated(userId, schoolId) {
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
    async notifyTeachersOfSiren(schoolId, type, triggerType, targetTeacherIds) {
        const teacherIds = targetTeacherIds !== undefined
            ? [...new Set(targetTeacherIds)]
            : (await this.prisma.user.findMany({
                where: {
                    schoolId,
                    role: 'TEACHER',
                },
                select: { id: true },
            })).map((teacher) => teacher.id);
        if (teacherIds.length === 0)
            return;
        const isDynamic = triggerType === 'DYNAMIC';
        const isPeriodStart = type === 'PERIOD_START';
        const isPeriodEnd = type === 'PERIOD_END';
        const notifications = await Promise.all(teacherIds.map(async (teacherId) => {
            const lang = await this.getUserLanguage(teacherId);
            let t;
            if (isDynamic) {
                if (isPeriodStart) {
                    t = this.translate('classStarting', lang);
                }
                else if (isPeriodEnd) {
                    t = this.translate('classEnded', lang);
                }
                else {
                    const sirenLabel = this.formatSirenLabel(type);
                    t = this.translate('classBell', lang, sirenLabel);
                }
            }
            else {
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
        }));
        return { count: notifications.length };
    }
    formatSirenLabel(type) {
        return type
            .toLowerCase()
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
};
exports.NotificationService = NotificationService;
__decorate([
    (0, schedule_1.Cron)('0 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationService.prototype, "sendSchoolPickupReminders", null);
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map