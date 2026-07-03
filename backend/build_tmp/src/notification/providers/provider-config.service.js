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
var ProviderConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderConfigService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const platform_settings_service_1 = require("../../platform-settings/platform-settings.service");
const PLATFORM_EMAIL_KEY = 'EMAIL_PROVIDER';
const PLATFORM_SMS_KEY = 'SMS_PROVIDER';
const SCHOOL_IN_APP_ENABLED_KEY = 'IN_APP_NOTIFICATIONS_ENABLED';
const SCHOOL_EMAIL_ENABLED_KEY = 'EMAIL_NOTIFICATIONS_ENABLED';
const SCHOOL_SMS_ENABLED_KEY = 'SMS_NOTIFICATIONS_ENABLED';
let ProviderConfigService = ProviderConfigService_1 = class ProviderConfigService {
    platformSettings;
    prisma;
    logger = new common_1.Logger(ProviderConfigService_1.name);
    constructor(platformSettings, prisma) {
        this.platformSettings = platformSettings;
        this.prisma = prisma;
    }
    async getEmailConfig(schoolId) {
        const platform = await this.platformSettings.getSetting(PLATFORM_EMAIL_KEY);
        if (schoolId) {
            const enabled = await this.getSchoolSettingRaw(schoolId, SCHOOL_EMAIL_ENABLED_KEY);
            if (!enabled || enabled === false || enabled === 'false') {
                return { provider: 'dummy' };
            }
        }
        return platform || { provider: 'dummy' };
    }
    async getSMSConfig(schoolId) {
        const platform = await this.platformSettings.getSetting(PLATFORM_SMS_KEY);
        if (schoolId) {
            const enabled = await this.getSchoolSettingRaw(schoolId, SCHOOL_SMS_ENABLED_KEY);
            if (!enabled || enabled === false || enabled === 'false') {
                return { provider: 'dummy' };
            }
        }
        return platform || { provider: 'dummy' };
    }
    async isInAppEnabled(schoolId) {
        const enabled = await this.getSchoolSettingRaw(schoolId, SCHOOL_IN_APP_ENABLED_KEY);
        return enabled === null || enabled === true || enabled === 'true';
    }
    async setSchoolInAppEnabled(schoolId, enabled) {
        await this.prisma.schoolSetting.upsert({
            where: { schoolId_key: { schoolId, key: SCHOOL_IN_APP_ENABLED_KEY } },
            update: { value: JSON.stringify(enabled) },
            create: { schoolId, key: SCHOOL_IN_APP_ENABLED_KEY, value: JSON.stringify(enabled) },
        });
    }
    async setSchoolEmailEnabled(schoolId, enabled) {
        await this.prisma.schoolSetting.upsert({
            where: { schoolId_key: { schoolId, key: SCHOOL_EMAIL_ENABLED_KEY } },
            update: { value: JSON.stringify(enabled) },
            create: { schoolId, key: SCHOOL_EMAIL_ENABLED_KEY, value: JSON.stringify(enabled) },
        });
    }
    async setSchoolSMSEnabled(schoolId, enabled) {
        await this.prisma.schoolSetting.upsert({
            where: { schoolId_key: { schoolId, key: SCHOOL_SMS_ENABLED_KEY } },
            update: { value: JSON.stringify(enabled) },
            create: { schoolId, key: SCHOOL_SMS_ENABLED_KEY, value: JSON.stringify(enabled) },
        });
    }
    async getSchoolSettingRaw(schoolId, key) {
        const row = await this.prisma.schoolSetting.findUnique({
            where: { schoolId_key: { schoolId, key } },
        });
        if (!row)
            return null;
        try {
            return JSON.parse(row.value);
        }
        catch {
            return row.value;
        }
    }
};
exports.ProviderConfigService = ProviderConfigService;
exports.ProviderConfigService = ProviderConfigService = ProviderConfigService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [platform_settings_service_1.PlatformSettingsService,
        prisma_service_1.PrismaService])
], ProviderConfigService);
//# sourceMappingURL=provider-config.service.js.map