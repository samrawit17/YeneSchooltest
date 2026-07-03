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
var SMSNotificationProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSNotificationProvider = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const event_bus_service_1 = require("../../core/events/event-bus.service");
const queue_constants_1 = require("../../infrastructure/queue/queue.constants");
const provider_config_service_1 = require("./provider-config.service");
let SMSNotificationProvider = SMSNotificationProvider_1 = class SMSNotificationProvider {
    configService;
    prisma;
    eventBus;
    channelName = 'sms';
    logger = new common_1.Logger(SMSNotificationProvider_1.name);
    constructor(configService, prisma, eventBus) {
        this.configService = configService;
        this.prisma = prisma;
        this.eventBus = eventBus;
    }
    onModuleInit() {
        this.eventBus.on('communication.send-sms', (event) => this.handleSendSms(event));
        this.eventBus.on('communication.send-bulk-sms', (event) => this.handleSendBulkSms(event));
    }
    canHandle(_type) {
        return true;
    }
    async send(payload) {
        if (!payload.userId)
            return { success: true, recipientCount: 0 };
        const phone = await this.getUserPhone(payload.userId);
        if (!phone)
            return { success: true, recipientCount: 0 };
        await this.eventBus.emit('communication.send-sms', {
            schoolId: payload.schoolId,
            userId: payload.userId,
            to: phone,
            message: payload.title || payload.message,
            title: payload.title,
        }, { async: true, queue: queue_constants_1.QueueName.COMMUNICATION });
        return { success: true, recipientCount: 1 };
    }
    async sendBulk(payload) {
        if (payload.userIds.length === 0)
            return { success: true, recipientCount: 0 };
        const phones = await this.getUserPhones(payload.userIds);
        const valid = phones.filter((p) => p.phone);
        if (valid.length === 0)
            return { success: true, recipientCount: 0 };
        const messages = valid.map((p) => ({
            userId: p.userId,
            to: p.phone,
        }));
        await this.eventBus.emit('communication.send-bulk-sms', {
            schoolId: payload.schoolId,
            userIds: valid.map((p) => p.userId),
            messages,
            title: payload.title,
            message: payload.title || payload.message,
        }, { async: true, queue: queue_constants_1.QueueName.COMMUNICATION });
        return { success: true, recipientCount: valid.length };
    }
    async handleSendSms(event) {
        const { schoolId, to, message } = event.payload;
        try {
            const config = await this.configService.getSMSConfig(schoolId);
            if (config.provider === 'dummy') {
                this.logger.debug(`[dummy] SMS to ${to}: ${message}`);
                return;
            }
            await this.sendToProvider(config, to, message);
        }
        catch (error) {
            this.logger.error(`SMS send failed to ${to}: ${error}`);
        }
    }
    async handleSendBulkSms(event) {
        const { schoolId, messages } = event.payload;
        try {
            const config = await this.configService.getSMSConfig(schoolId);
            if (config.provider === 'dummy') {
                this.logger.debug(`[dummy] Bulk SMS to ${messages.length} recipients`);
                return;
            }
            for (const msg of messages) {
                try {
                    await this.sendToProvider(config, msg.to, event.payload.message);
                }
                catch (error) {
                    this.logger.warn(`SMS failed for ${msg.to}: ${error}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Bulk SMS failed: ${error}`);
        }
    }
    async sendToProvider(config, to, text) {
        switch (config.provider) {
            case 'twilio':
                await this.sendTwilio(config, to, text);
                break;
            case 'africastalking':
                await this.sendAfricaSTalking(config, to, text);
                break;
            case 'termii':
                await this.sendTermii(config, to, text);
                break;
            default:
                throw new Error(`Unknown SMS provider: ${config.provider}`);
        }
    }
    async sendTwilio(config, to, text) {
        if (!config.accountSid || !config.authToken) {
            throw new Error('Twilio accountSid and authToken required');
        }
        const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: to,
                From: config.fromNumber || '',
                Body: text,
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`Twilio error ${resp.status}: ${body}`);
        }
    }
    async sendAfricaSTalking(config, to, text) {
        if (!config.apiKey) {
            throw new Error('AfricaSTalking apiKey required');
        }
        const resp = await fetch('https://api.africastalking.com/version1/messaging', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                apiKey: config.apiKey,
                Accept: 'application/json',
            },
            body: new URLSearchParams({
                username: config.accountSid || 'sandbox',
                to,
                message: text,
                from: config.fromNumber || config.senderId || '',
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`AfricaSTalking error ${resp.status}: ${body}`);
        }
    }
    async sendTermii(config, to, text) {
        if (!config.apiKey) {
            throw new Error('Termii apiKey required');
        }
        const resp = await fetch('https://api.termii.com/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: config.apiKey,
                to,
                from: config.fromNumber || config.senderId || 'School',
                sms: text,
                type: 'plain',
                channel: 'generic',
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`Termii error ${resp.status}: ${body}`);
        }
    }
    async getUserPhone(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true },
        });
        return user?.phone || null;
    }
    async getUserPhones(userIds) {
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, phone: true },
        });
        return users.filter((u) => u.phone).map((u) => ({ userId: u.id, phone: u.phone }));
    }
};
exports.SMSNotificationProvider = SMSNotificationProvider;
exports.SMSNotificationProvider = SMSNotificationProvider = SMSNotificationProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [provider_config_service_1.ProviderConfigService,
        prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], SMSNotificationProvider);
//# sourceMappingURL=sms.provider.js.map