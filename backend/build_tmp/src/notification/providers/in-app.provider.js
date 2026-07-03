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
var InAppNotificationProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppNotificationProvider = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const push_provider_1 = require("./push.provider");
let InAppNotificationProvider = InAppNotificationProvider_1 = class InAppNotificationProvider {
    prisma;
    pushProvider;
    channelName = 'in-app';
    logger = new common_1.Logger(InAppNotificationProvider_1.name);
    constructor(prisma, pushProvider) {
        this.prisma = prisma;
        this.pushProvider = pushProvider;
    }
    canHandle(_type) {
        return true;
    }
    async send(payload) {
        try {
            const notification = await this.createInApp(payload);
            if (payload.userId) {
                await this.pushProvider.send({
                    ...payload,
                    metadata: { ...payload.metadata, notificationId: notification.id },
                }).catch(() => { });
            }
            return { success: true, recipientCount: 1 };
        }
        catch (error) {
            this.logger.error(`In-app send failed: ${error}`);
            return { success: false, recipientCount: 0, error: String(error) };
        }
    }
    async sendBulk(payload) {
        try {
            const eligibleIds = Array.from(new Set(payload.userIds)).filter(Boolean);
            if (eligibleIds.length === 0)
                return { success: true, recipientCount: 0 };
            const metadata = this.serialize(payload.metadata);
            const actionUrl = payload.actionUrl || null;
            await this.prisma.notification.createMany({
                data: eligibleIds.map((userId) => ({
                    schoolId: payload.schoolId,
                    userId,
                    title: payload.title,
                    message: payload.message,
                    type: payload.type,
                    actionUrl,
                    metadata,
                })),
                skipDuplicates: true,
            });
            await this.pushProvider.sendBulk({
                ...payload,
                userIds: eligibleIds,
            }).catch(() => { });
            return { success: true, recipientCount: eligibleIds.length };
        }
        catch (error) {
            this.logger.error(`In-app bulk send failed: ${error}`);
            return { success: false, recipientCount: 0, error: String(error) };
        }
    }
    async createInApp(data) {
        const metadata = this.serialize(data.metadata);
        const actionUrl = data.actionUrl || null;
        return this.prisma.notification.create({
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
    }
    serialize(metadata) {
        if (metadata === undefined || metadata === null)
            return null;
        return JSON.stringify(metadata);
    }
};
exports.InAppNotificationProvider = InAppNotificationProvider;
exports.InAppNotificationProvider = InAppNotificationProvider = InAppNotificationProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        push_provider_1.PushNotificationProvider])
], InAppNotificationProvider);
//# sourceMappingURL=in-app.provider.js.map