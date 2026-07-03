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
exports.PlatformSettingsService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const cache_service_1 = require("../infrastructure/cache/cache.service");
const cache_constants_1 = require("../infrastructure/cache/cache.constants");
let PlatformSettingsService = class PlatformSettingsService {
    prisma;
    eventBus;
    cacheService;
    constructor(prisma, eventBus, cacheService) {
        this.prisma = prisma;
        this.eventBus = eventBus;
        this.cacheService = cacheService;
    }
    getSettingCacheKey(key) {
        return `platform-settings:key:${key}`;
    }
    getAllSettingsCacheKey() {
        return 'platform-settings:all';
    }
    defaultSettings = {
        MAX_SCHOOLS_ALLOWED: null,
        MAINTENANCE_MODE: false,
        EMAIL_PROVIDER: {},
        SMS_PROVIDER: {},
        STORAGE_TYPE: 'local',
        STORAGE_CONFIG: {},
    };
    async invalidateCache(...keys) {
        await this.cacheService.del(this.getAllSettingsCacheKey(), ...keys.map((key) => this.getSettingCacheKey(key)));
    }
    async getSetting(key) {
        return this.cacheService.getOrSet(this.getSettingCacheKey(key), cache_constants_1.CACHE_TTL.PLATFORM_SETTINGS, async () => {
            const setting = await this.prisma.platformSetting.findUnique({
                where: { key },
            });
            return setting
                ? this.parseStoredValue(setting.value)
                : (this.defaultSettings[key] ?? null);
        });
    }
    async getAllSettings() {
        return this.cacheService.getOrSet(this.getAllSettingsCacheKey(), cache_constants_1.CACHE_TTL.PLATFORM_SETTINGS, async () => {
            const settings = await this.prisma.platformSetting.findMany();
            const result = { ...this.defaultSettings };
            for (const setting of settings) {
                result[setting.key] = this.parseStoredValue(setting.value);
            }
            return result;
        });
    }
    async setSetting(key, value) {
        const normalizedValue = this.normalizeSettingValue(key, value);
        const storedValue = this.serializeValue(normalizedValue);
        const setting = await this.prisma.platformSetting.upsert({
            where: { key },
            update: { value: storedValue },
            create: { key, value: storedValue },
        });
        await this.invalidateCache(key);
        void this.eventBus.emit('platform.settings.updated', {
            settings: { [key]: normalizedValue },
            keys: [key],
        });
        return {
            ...setting,
            value: this.parseStoredValue(setting.value),
        };
    }
    async deleteSetting(key) {
        await this.prisma.platformSetting.delete({
            where: { key },
        });
        await this.invalidateCache(key);
        void this.eventBus.emit('platform.settings.updated', {
            settings: { [key]: null },
            keys: [key],
        });
        return { message: 'Setting deleted successfully' };
    }
    async getEffectiveSetting(key, systemDefault = null) {
        const value = await this.getSetting(key);
        return value ?? systemDefault;
    }
    async isMaintenanceModeEnabled() {
        const value = await this.getSetting('MAINTENANCE_MODE');
        return this.toBoolean(value);
    }
    async batchUpdate(settings) {
        const normalizedSettings = Object.fromEntries(Object.entries(settings).map(([key, value]) => [
            key,
            this.normalizeSettingValue(key, value),
        ]));
        const results = await this.prisma.$transaction(Object.entries(normalizedSettings).map(([key, value]) => this.prisma.platformSetting.upsert({
            where: { key },
            update: { value: this.serializeValue(value) },
            create: { key, value: this.serializeValue(value) },
        })));
        await this.invalidateCache(...Object.keys(normalizedSettings));
        void this.eventBus.emit('platform.settings.updated', {
            settings: normalizedSettings,
            keys: Object.keys(normalizedSettings),
        });
        return results.map((setting) => ({
            ...setting,
            value: this.parseStoredValue(setting.value),
        }));
    }
    async getAttendanceCutoffTime(schoolId) {
        const key = schoolId
            ? `attendance_cutoff_${schoolId}`
            : 'attendance_cutoff_default';
        const value = await this.getSetting(key);
        if (value &&
            typeof value === 'object' &&
            'hour' in value &&
            'minute' in value) {
            return value;
        }
        return { hour: 3, minute: 0 };
    }
    async setAttendanceCutoffTime(schoolId, hour, minute) {
        const key = `attendance_cutoff_${schoolId}`;
        await this.setSetting(key, { hour, minute });
    }
    toBoolean(value) {
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'number')
            return value !== 0;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1' || normalized === 'yes';
        }
        return false;
    }
    normalizeSettingValue(key, value) {
        if (!key || typeof key !== 'string') {
            throw new localization_1.LocalizedException('platform_settings.setting_key_is_required_8dd60c81', undefined, undefined, 'Setting key is required');
        }
        if (key === 'MAX_SCHOOLS_ALLOWED') {
            if (value === null || value === undefined || value === '')
                return null;
            const parsed = typeof value === 'number' ? value : Number(String(value).trim());
            if (!Number.isInteger(parsed) || parsed < 1) {
                throw new localization_1.LocalizedException('platform_settings.max_schools_allowed_must_be_a_positive_whole_number_or_empty_63a5bf72', undefined, undefined, 'MAX_SCHOOLS_ALLOWED must be a positive whole number or empty for unlimited');
            }
            return parsed;
        }
        if (key === 'MAINTENANCE_MODE' || key.startsWith('FEATURE_FLAG_')) {
            if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase();
                if (['true', '1', 'yes'].includes(normalized))
                    return true;
                if (['false', '0', 'no'].includes(normalized))
                    return false;
            }
            if (typeof value === 'boolean')
                return value;
            throw new localization_1.LocalizedException('platform_settings.must_be_a_boolean_value_77709283', undefined, undefined, '${key} must be a boolean value');
        }
        if (key === 'EMAIL_PROVIDER' || key === 'SMS_PROVIDER') {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                throw new localization_1.LocalizedException('platform_settings.must_be_a_json_object_c63a32a0', undefined, undefined, '${key} must be a JSON object');
            }
            return value;
        }
        if (key === 'STORAGE_TYPE') {
            const allowed = ['local', 's3', 'minio'];
            const normalized = String(value).trim().toLowerCase();
            if (!allowed.includes(normalized)) {
                throw new localization_1.LocalizedException('platform_settings.storage_type_must_be_one_of_5174a7c3', undefined, undefined, 'storage_type must be one of: ${allowed.join(\', \')}');
            }
            return normalized;
        }
        if (key === 'STORAGE_CONFIG') {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                throw new localization_1.LocalizedException('platform_settings.storage_config_must_be_a_json_object_049ab8ed', undefined, undefined, 'STORAGE_CONFIG must be a JSON object');
            }
            return value;
        }
        if (key.startsWith('attendance_cutoff_')) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                throw new localization_1.LocalizedException('platform_settings.attendance_cutoff_must_be_an_object_5bed594d', undefined, undefined, 'Attendance cutoff must be an object');
            }
            const cutoff = value;
            const hour = Number(cutoff.hour);
            const minute = Number(cutoff.minute);
            if (!Number.isInteger(hour) ||
                !Number.isInteger(minute) ||
                hour < 0 ||
                hour > 23 ||
                minute < 0 ||
                minute > 59) {
                throw new localization_1.LocalizedException('platform_settings.attendance_cutoff_requires_hour_0_23_and_minute_0_59_f3a88e1c', undefined, undefined, 'Attendance cutoff requires hour 0-23 and minute 0-59');
            }
            return { hour, minute };
        }
        throw new localization_1.LocalizedException('platform_settings.unsupported_platform_setting_a0faa290', undefined, undefined, 'Unsupported platform setting: ${key}');
    }
    serializeValue(value) {
        if (typeof value === 'string')
            return value;
        return JSON.stringify(value);
    }
    parseStoredValue(value) {
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
};
exports.PlatformSettingsService = PlatformSettingsService;
exports.PlatformSettingsService = PlatformSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService,
        cache_service_1.CacheService])
], PlatformSettingsService);
//# sourceMappingURL=platform-settings.service.js.map