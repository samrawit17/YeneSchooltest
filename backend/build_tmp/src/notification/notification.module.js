"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const notification_controller_1 = require("./notification.controller");
const notification_service_1 = require("./notification.service");
const prisma_module_1 = require("../prisma/prisma.module");
const platform_settings_module_1 = require("../platform-settings/platform-settings.module");
const in_app_provider_1 = require("./providers/in-app.provider");
const push_provider_1 = require("./providers/push.provider");
const email_provider_1 = require("./providers/email.provider");
const sms_provider_1 = require("./providers/sms.provider");
const channel_router_service_1 = require("./providers/channel-router.service");
const provider_config_service_1 = require("./providers/provider-config.service");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, platform_settings_module_1.PlatformSettingsModule],
        controllers: [notification_controller_1.NotificationController],
        providers: [
            notification_service_1.NotificationService,
            in_app_provider_1.InAppNotificationProvider,
            push_provider_1.PushNotificationProvider,
            email_provider_1.EmailNotificationProvider,
            sms_provider_1.SMSNotificationProvider,
            channel_router_service_1.NotificationChannelRouter,
            provider_config_service_1.ProviderConfigService,
        ],
        exports: [notification_service_1.NotificationService],
    })
], NotificationModule);
//# sourceMappingURL=notification.module.js.map