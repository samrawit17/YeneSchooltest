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
var NotificationChannelRouter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationChannelRouter = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const in_app_provider_1 = require("./in-app.provider");
const push_provider_1 = require("./push.provider");
const email_provider_1 = require("./email.provider");
const sms_provider_1 = require("./sms.provider");
const PREFERENCE_CATEGORY_MAP = {
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
const CHANNEL_PREFERENCE_MAP = {
    email: 'emailEnabled',
    sms: 'smsEnabled',
    push: 'pushEnabled',
    'in-app': 'pushEnabled',
};
let NotificationChannelRouter = NotificationChannelRouter_1 = class NotificationChannelRouter {
    prisma;
    inAppProvider;
    pushProvider;
    emailProvider;
    smsProvider;
    logger = new common_1.Logger(NotificationChannelRouter_1.name);
    constructor(prisma, inAppProvider, pushProvider, emailProvider, smsProvider) {
        this.prisma = prisma;
        this.inAppProvider = inAppProvider;
        this.pushProvider = pushProvider;
        this.emailProvider = emailProvider;
        this.smsProvider = smsProvider;
    }
    getChannel(channel) {
        switch (channel) {
            case 'in-app': return this.inAppProvider;
            case 'push': return this.pushProvider;
            case 'email': return this.emailProvider;
            case 'sms': return this.smsProvider;
        }
    }
    async route(payload, channels, bypassPreferences = false) {
        const results = [];
        for (const channelType of channels) {
            const provider = this.getChannel(channelType);
            if (!provider.canHandle(payload.type))
                continue;
            if (!bypassPreferences && payload.userId) {
                const allowed = await this.isChannelAllowedForUser(payload.userId, payload.type, channelType);
                if (!allowed)
                    continue;
            }
            results.push(await provider.send(payload));
        }
        return results;
    }
    async routeBulk(payload, channels, bypassPreferences = false) {
        const results = [];
        for (const channelType of channels) {
            const provider = this.getChannel(channelType);
            if (!provider.canHandle(payload.type))
                continue;
            let eligibleIds = payload.userIds;
            if (!bypassPreferences && eligibleIds.length > 0) {
                const allowedMap = await this.getChannelAllowedUserIds(eligibleIds, payload.type, channelType);
                eligibleIds = eligibleIds.filter((id) => allowedMap.get(id) !== false);
            }
            if (eligibleIds.length === 0)
                continue;
            const result = await provider.sendBulk({ ...payload, userIds: eligibleIds });
            results.push({ channel: channelType, result });
        }
        return results;
    }
    async isChannelAllowedForUser(userId, type, channel) {
        const prefs = await this.getPreferences(userId);
        const typePref = this.getTypePreference(type, prefs);
        if (!typePref)
            return false;
        const channelPref = CHANNEL_PREFERENCE_MAP[channel];
        if (channelPref && !prefs[channelPref])
            return false;
        return true;
    }
    async getChannelAllowedUserIds(userIds, type, channel) {
        const uniqueIds = Array.from(new Set(userIds));
        const users = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        u.id,
        np."pushEnabled",
        np."emailEnabled",
        np."smsEnabled"
      FROM "User" u
      LEFT JOIN "NotificationPreference" np ON np."userId" = u.id
      WHERE u.id IN (${client_1.Prisma.join(uniqueIds)})
    `);
        const result = new Map();
        for (const user of users) {
            const prefs = {
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
            result.set(user.id, typePref && (!channelPref || prefs[channelPref]));
        }
        return result;
    }
    async getPreferences(userId) {
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
    getTypePreference(type, prefs) {
        const category = PREFERENCE_CATEGORY_MAP[type];
        if (!category)
            return true;
        return prefs[category];
    }
    buildDefaults(role) {
        const defaults = {
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
        }
        else if (r === 'IT_MANAGER') {
            defaults.timetableEnabled = true;
            defaults.attendanceEnabled = true;
            defaults.announcementsEnabled = true;
            defaults.eventsEnabled = true;
        }
        else if (r === 'TEACHER') {
            defaults.commBookEnabled = true;
            defaults.timetableEnabled = true;
            defaults.attendanceEnabled = true;
            defaults.announcementsEnabled = true;
            defaults.assignmentsEnabled = true;
            defaults.examsEnabled = true;
            defaults.eventsEnabled = true;
        }
        else if (r === 'STUDENT') {
            defaults.timetableEnabled = true;
            defaults.announcementsEnabled = true;
            defaults.assignmentsEnabled = true;
            defaults.examsEnabled = true;
            defaults.feesEnabled = true;
            defaults.eventsEnabled = true;
        }
        else if (r === 'PARENT') {
            defaults.commBookEnabled = true;
            defaults.timetableEnabled = true;
            defaults.attendanceEnabled = true;
            defaults.announcementsEnabled = true;
            defaults.assignmentsEnabled = true;
            defaults.examsEnabled = true;
            defaults.feesEnabled = true;
            defaults.eventsEnabled = true;
        }
        else if (r === 'REGISTRAR') {
            defaults.timetableEnabled = true;
            defaults.attendanceEnabled = true;
            defaults.announcementsEnabled = true;
            defaults.examsEnabled = true;
            defaults.eventsEnabled = true;
        }
        else if (r === 'FINANCE') {
            defaults.announcementsEnabled = true;
            defaults.feesEnabled = true;
            defaults.eventsEnabled = true;
        }
        return defaults;
    }
};
exports.NotificationChannelRouter = NotificationChannelRouter;
exports.NotificationChannelRouter = NotificationChannelRouter = NotificationChannelRouter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        in_app_provider_1.InAppNotificationProvider,
        push_provider_1.PushNotificationProvider,
        email_provider_1.EmailNotificationProvider,
        sms_provider_1.SMSNotificationProvider])
], NotificationChannelRouter);
//# sourceMappingURL=channel-router.service.js.map