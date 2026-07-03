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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationAction = void 0;
const common_1 = require("@nestjs/common");
const base_action_1 = require("./base-action");
const notification_service_1 = require("../../notification/notification.service");
const prisma_service_1 = require("../../prisma/prisma.service");
let PushNotificationAction = class PushNotificationAction extends base_action_1.BaseAction {
    notificationService;
    prisma;
    type = 'push_notification';
    constructor(notificationService, prisma) {
        super();
        this.notificationService = notificationService;
        this.prisma = prisma;
    }
    async execute(event, config) {
        const { title, message, userIds, role } = config;
        const compiledTitle = this.compileTemplate(title || 'Automation Alert', event.payload);
        const compiledMessage = this.compileTemplate(message || '', event.payload);
        try {
            const resolvedUserIds = await this.resolveUserIds(userIds, role, event);
            if (resolvedUserIds.length === 0) {
                return this.fail('No userIds or role specified for push notification');
            }
            await this.notificationService.createBulkNotifications({
                userIds: resolvedUserIds,
                title: compiledTitle,
                message: compiledMessage,
                type: 'AUTOMATION',
                schoolId: event.schoolId,
            });
            return this.success('Push notification sent', { title: compiledTitle, count: resolvedUserIds.length });
        }
        catch (error) {
            return this.fail(`Push notification failed: ${error.message}`);
        }
    }
    async resolveUserIds(userIds, role, event) {
        if (userIds) {
            const ids = Array.isArray(userIds) ? userIds : userIds.split(',').map((s) => s.trim()).filter(Boolean);
            if (ids.length > 0)
                return ids;
        }
        if (role) {
            const users = await this.prisma.user.findMany({
                where: { schoolId: event.schoolId, role: role, isActive: true },
                select: { id: true },
            });
            return users.map((u) => u.id);
        }
        return [];
    }
    compileTemplate(template, payload) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? `{{${key}}}`));
    }
};
exports.PushNotificationAction = PushNotificationAction;
exports.PushNotificationAction = PushNotificationAction = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_service_1.NotificationService,
        prisma_service_1.PrismaService])
], PushNotificationAction);
//# sourceMappingURL=push-notification.action.js.map