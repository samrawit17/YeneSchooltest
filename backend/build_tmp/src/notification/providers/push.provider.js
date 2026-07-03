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
var PushNotificationProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationProvider = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const webpush = __importStar(require("web-push"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let PushNotificationProvider = PushNotificationProvider_1 = class PushNotificationProvider {
    prisma;
    channelName = 'push';
    logger = new common_1.Logger(PushNotificationProvider_1.name);
    constructor(prisma) {
        this.prisma = prisma;
        this.configure();
    }
    canHandle(_type) {
        return this.isConfigured();
    }
    async send(payload) {
        if (!payload.userId)
            return { success: true, recipientCount: 0 };
        return this.sendBulk({
            schoolId: payload.schoolId || '',
            userIds: [payload.userId],
            title: payload.title,
            message: payload.message,
            type: payload.type,
            actionUrl: payload.actionUrl,
            metadata: payload.metadata,
        });
    }
    async sendBulk(payload) {
        if (!this.isConfigured() || payload.userIds.length === 0) {
            return { success: true, recipientCount: 0 };
        }
        const uniqueIds = Array.from(new Set(payload.userIds));
        try {
            const subscriptions = await this.prisma.$queryRaw `
        SELECT id, endpoint, p256dh, auth
        FROM "PushSubscription"
        WHERE "userId" IN (${client_1.Prisma.join(uniqueIds)})
      `;
            if (subscriptions.length === 0) {
                return { success: true, recipientCount: 0 };
            }
            const body = JSON.stringify({
                title: payload.title,
                body: payload.message,
                tag: payload.type,
                url: payload.actionUrl,
                type: payload.type,
                notificationId: payload.metadata?.notificationId,
                metadata: typeof payload.metadata === 'object' ? payload.metadata : undefined,
            });
            await Promise.allSettled(subscriptions.map((sub) => this.deliver(sub, body)));
            return { success: true, recipientCount: subscriptions.length };
        }
        catch (error) {
            this.logger.error(`Push bulk send failed: ${error}`);
            return { success: false, recipientCount: 0, error: String(error) };
        }
    }
    isConfigured() {
        return Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY);
    }
    getPublicKey() {
        return process.env.WEB_PUSH_PUBLIC_KEY || null;
    }
    async saveSubscription(data) {
        if (!data.subscription?.endpoint) {
            throw new Error('Subscription endpoint is required');
        }
        const id = (0, crypto_1.randomUUID)().replace(/-/g, '');
        const expirationTime = typeof data.subscription.expirationTime === 'number'
            ? BigInt(Math.trunc(data.subscription.expirationTime))
            : null;
        await this.prisma.$executeRaw `
      INSERT INTO "PushSubscription" (
        id, "schoolId", "userId", endpoint, p256dh, auth,
        "expirationTime", "userAgent", "failureCount", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${data.schoolId || null}, ${data.userId},
        ${data.subscription.endpoint},
        ${data.subscription.keys?.p256dh || ''},
        ${data.subscription.keys?.auth || ''},
        ${expirationTime},
        ${data.userAgent?.slice(0, 500) || null},
        0, NOW(), NOW()
      )
      ON CONFLICT (endpoint) DO UPDATE SET
        "userId" = EXCLUDED."userId",
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        "expirationTime" = EXCLUDED."expirationTime",
        "failureCount" = 0,
        "lastFailureAt" = NULL,
        "updatedAt" = NOW()
    `;
        return { id, endpoint: data.subscription.endpoint };
    }
    async removeSubscription(userId, endpoint) {
        await this.prisma.$executeRaw `
      DELETE FROM "PushSubscription"
      WHERE "userId" = ${userId} AND endpoint = ${endpoint}
    `;
    }
    async deliver(sub, payload) {
        try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
            await this.prisma.$executeRaw `
        UPDATE "PushSubscription"
        SET "lastSuccessfulAt" = NOW(), "lastFailureAt" = NULL,
            "failureCount" = 0, "updatedAt" = NOW()
        WHERE id = ${sub.id}
      `;
        }
        catch (error) {
            if (error?.statusCode === 404 || error?.statusCode === 410) {
                await this.prisma.$executeRaw `DELETE FROM "PushSubscription" WHERE id = ${sub.id}`;
                return;
            }
            await this.prisma.$executeRaw `
        UPDATE "PushSubscription"
        SET "lastFailureAt" = NOW(), "failureCount" = "failureCount" + 1, "updatedAt" = NOW()
        WHERE id = ${sub.id}
      `;
        }
    }
    configure() {
        const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
        const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
        if (publicKey && privateKey) {
            webpush.setVapidDetails(process.env.WEB_PUSH_CONTACT_EMAIL || 'mailto:admin@example.com', publicKey, privateKey);
        }
    }
};
exports.PushNotificationProvider = PushNotificationProvider;
exports.PushNotificationProvider = PushNotificationProvider = PushNotificationProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PushNotificationProvider);
//# sourceMappingURL=push.provider.js.map