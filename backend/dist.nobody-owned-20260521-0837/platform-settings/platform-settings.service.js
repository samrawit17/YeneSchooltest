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
const prisma_service_1 = require("../prisma/prisma.service");
const cache_service_1 = require("../infrastructure/cache/cache.service");
const cache_constants_1 = require("../infrastructure/cache/cache.constants");
let PlatformSettingsService = class PlatformSettingsService {
    prisma;
    cacheService;
    constructor(prisma, cacheService) {
        this.prisma = prisma;
        this.cacheService = cacheService;
    }
    getSettingCacheKey(key) {
        return `platform-settings:key:${key}`;
    }
    getAllSettingsCacheKey() {
        return 'platform-settings:all';
    }
    async invalidateCache(...keys) {
        await this.cacheService.del(this.getAllSettingsCacheKey(), ...keys.map((key) => this.getSettingCacheKey(key)));
    }
    async getSetting(key) {
        return this.cacheService.getOrSet(this.getSettingCacheKey(key), cache_constants_1.DEFAULT_CACHE_TTL_SECONDS, async () => {
            const setting = await this.prisma.platformSetting.findUnique({
                where: { key },
            });
            return setting ? this.parseStoredValue(setting.value) : null;
        });
    }
    async getAllSettings() {
        return this.cacheService.getOrSet(this.getAllSettingsCacheKey(), cache_constants_1.DEFAULT_CACHE_TTL_SECONDS, async () => {
            const settings = await this.prisma.platformSetting.findMany();
            const result = {};
            for (const setting of settings) {
                result[setting.key] = this.parseStoredValue(setting.value);
            }
            return result;
        });
    }
    async setSetting(key, value) {
        const storedValue = this.serializeValue(value);
        const setting = await this.prisma.platformSetting.upsert({
            where: { key },
            update: { value: storedValue },
            create: { key, value: storedValue },
        });
        await this.invalidateCache(key);
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
        const results = await this.prisma.$transaction(Object.entries(settings).map(([key, value]) => this.prisma.platformSetting.upsert({
            where: { key },
            update: { value: this.serializeValue(value) },
            create: { key, value: this.serializeValue(value) },
        })));
        await this.invalidateCache(...Object.keys(settings));
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
        cache_service_1.CacheService])
], PlatformSettingsService);
//# sourceMappingURL=platform-settings.service.js.map