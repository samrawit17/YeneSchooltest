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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const notification_service_1 = require("./notification.service");
const push_subscription_dto_1 = require("./dto/push-subscription.dto");
const notification_preferences_dto_1 = require("./dto/notification-preferences.dto");
let NotificationController = class NotificationController {
    notificationService;
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async getNotifications(req, unreadOnly, limit, type, types, category) {
        const options = {
            unreadOnly: unreadOnly === 'true',
            limit: limit ? parseInt(limit) : 20,
            type,
            types: types
                ? types
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean)
                : undefined,
            category,
            schoolId: req.user.schoolId,
        };
        const notifications = await this.notificationService.getUserNotifications(req.user.id, req.user.role, options);
        return notifications;
    }
    async getCategories(req) {
        const categories = await this.notificationService.getNotificationCategories(req.user.id, req.user.role, req.user.schoolId);
        return { categories };
    }
    async getUnreadCount(req, types) {
        const count = await this.notificationService.getUnreadCount(req.user.id, req.user.role, req.user.schoolId, types
            ? types
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
            : undefined);
        return { count };
    }
    async getPreferences(req) {
        return this.notificationService.getNotificationPreferences(req.user.id, req.user.role);
    }
    async updatePreferences(req, body) {
        return this.notificationService.updateNotificationPreferences(req.user.id, req.user.role, body);
    }
    async getPushPublicKey() {
        return {
            enabled: this.notificationService.isWebPushConfigured(),
            publicKey: this.notificationService.getWebPushPublicKey(),
        };
    }
    async savePushSubscription(req, body) {
        return this.notificationService.savePushSubscription({
            schoolId: req.user.schoolId,
            userId: req.user.id,
            subscription: body.subscription,
            userAgent: req.headers['user-agent'],
        });
    }
    async removePushSubscription(req, body) {
        return this.notificationService.removePushSubscription(req.user.id, body.endpoint);
    }
    async markAsRead(id, req) {
        return this.notificationService.markAsRead(id, req.user.id, req.user.schoolId, req.user.role);
    }
    async markAllAsRead(req, body) {
        return this.notificationService.markAllAsRead(req.user.id, req.user.schoolId, body?.types);
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('unreadOnly')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Query)('types')),
    __param(5, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('categories'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('types')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)('preferences'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Put)('preferences'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, notification_preferences_dto_1.UpdateNotificationPreferencesDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Get)('push/public-key'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getPushPublicKey", null);
__decorate([
    (0, common_1.Post)('push/subscriptions'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, push_subscription_dto_1.SavePushSubscriptionDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "savePushSubscription", null);
__decorate([
    (0, common_1.Delete)('push/subscriptions'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, push_subscription_dto_1.RemovePushSubscriptionDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "removePushSubscription", null);
__decorate([
    (0, common_1.Post)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Post)('mark-all-read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAllAsRead", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [notification_service_1.NotificationService])
], NotificationController);
//# sourceMappingURL=notification.controller.js.map