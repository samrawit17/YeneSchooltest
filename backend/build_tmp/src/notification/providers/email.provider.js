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
var EmailNotificationProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailNotificationProvider = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
const prisma_service_1 = require("../../prisma/prisma.service");
const provider_config_service_1 = require("./provider-config.service");
let EmailNotificationProvider = EmailNotificationProvider_1 = class EmailNotificationProvider {
    configService;
    prisma;
    channelName = 'email';
    logger = new common_1.Logger(EmailNotificationProvider_1.name);
    transportCache = new Map();
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
    }
    canHandle(_type) {
        return true;
    }
    async send(payload) {
        if (!payload.userId)
            return { success: true, recipientCount: 0 };
        try {
            const config = await this.configService.getEmailConfig(payload.schoolId);
            if (config.provider === 'dummy') {
                this.logger.debug(`[dummy] Email to user ${payload.userId}: ${payload.title}`);
                return { success: true, recipientCount: 1 };
            }
            const user = await this.prisma.user.findUnique({
                where: { id: payload.userId },
                select: { email: true },
            });
            if (!user?.email) {
                this.logger.warn(`No email for user ${payload.userId}`);
                return { success: false, recipientCount: 0, error: 'No email address' };
            }
            const transport = this.getTransport(config);
            await transport.sendMail({
                from: `"${config.fromName || 'School System'}" <${config.fromEmail || 'noreply@school.edu'}>`,
                to: user.email,
                subject: payload.title,
                text: payload.message,
                html: this.toHtml(payload.title, payload.message),
            });
            return { success: true, recipientCount: 1 };
        }
        catch (error) {
            this.logger.error(`Email send failed: ${error}`);
            return { success: false, recipientCount: 0, error: String(error) };
        }
    }
    async sendBulk(payload) {
        if (payload.userIds.length === 0)
            return { success: true, recipientCount: 0 };
        const config = await this.configService.getEmailConfig(payload.schoolId);
        if (config.provider === 'dummy') {
            this.logger.debug(`[dummy] Bulk email to ${payload.userIds.length} users: ${payload.title}`);
            return { success: true, recipientCount: payload.userIds.length };
        }
        const users = await this.prisma.user.findMany({
            where: { id: { in: payload.userIds } },
            select: { id: true, email: true },
        });
        const valid = users.filter((u) => u.email);
        if (valid.length === 0)
            return { success: true, recipientCount: 0 };
        const transport = this.getTransport(config);
        let sent = 0;
        for (const user of valid) {
            try {
                await transport.sendMail({
                    from: `"${config.fromName || 'School System'}" <${config.fromEmail || 'noreply@school.edu'}>`,
                    to: user.email,
                    subject: payload.title,
                    text: payload.message,
                    html: this.toHtml(payload.title, payload.message),
                });
                sent++;
            }
            catch (error) {
                this.logger.warn(`Email failed for ${user.email}: ${error}`);
            }
        }
        return { success: sent > 0, recipientCount: sent };
    }
    getTransport(config) {
        const key = `${config.provider}:${config.host || ''}:${config.user || ''}`;
        const cached = this.transportCache.get(key);
        if (cached)
            return cached;
        let transport;
        switch (config.provider) {
            case 'smtp':
                transport = nodemailer.createTransport({
                    host: config.host || 'localhost',
                    port: config.port || 587,
                    secure: config.secure ?? false,
                    auth: config.user && config.pass
                        ? { user: config.user, pass: config.pass }
                        : undefined,
                });
                break;
            case 'sendgrid':
                transport = nodemailer.createTransport({
                    host: 'smtp.sendgrid.net',
                    port: 587,
                    secure: false,
                    auth: { user: 'apikey', pass: config.apiKey || '' },
                });
                break;
            case 'ses':
                transport = nodemailer.createTransport({
                    host: config.host || 'email-smtp.us-east-1.amazonaws.com',
                    port: config.port || 587,
                    secure: config.secure ?? false,
                    auth: { user: config.user || '', pass: config.pass || '' },
                });
                break;
            default:
                throw new Error(`Unknown email provider: ${config.provider}`);
        }
        this.transportCache.set(key, transport);
        return transport;
    }
    toHtml(title, message) {
        return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a1a">${this.esc(title)}</h2>
      <p style="color:#333;line-height:1.6">${this.esc(message)}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="color:#999;font-size:12px">Sent by School Management System</p>
    </div>`;
    }
    esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};
exports.EmailNotificationProvider = EmailNotificationProvider;
exports.EmailNotificationProvider = EmailNotificationProvider = EmailNotificationProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [provider_config_service_1.ProviderConfigService,
        prisma_service_1.PrismaService])
], EmailNotificationProvider);
//# sourceMappingURL=email.provider.js.map