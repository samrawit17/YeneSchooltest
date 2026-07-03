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
var LocaleResolver_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocaleResolver = void 0;
const common_1 = require("@nestjs/common");
const localization_interface_1 = require("../interfaces/localization.interface");
const prisma_service_1 = require("../../../prisma/prisma.service");
let LocaleResolver = LocaleResolver_1 = class LocaleResolver {
    prisma;
    logger = new common_1.Logger(LocaleResolver_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveFromRequest(request, schoolId, userId) {
        const headerLocale = this.fromHeader(request);
        if (headerLocale && !schoolId && !userId)
            return headerLocale;
        const userLocale = userId ? await this.fromUser(userId) : null;
        const schoolLocale = schoolId ? await this.fromSchool(schoolId) : null;
        const priority = [
            { value: userLocale, source: 'user' },
            { value: headerLocale, source: 'header' },
            { value: schoolLocale, source: 'school' },
        ];
        for (const candidate of priority) {
            if (candidate.value && localization_interface_1.SUPPORTED_LANGUAGES.includes(candidate.value)) {
                this.logger.debug(`Resolved locale ${candidate.value} from ${candidate.source}`);
                return candidate.value;
            }
        }
        return localization_interface_1.DEFAULT_LANGUAGE;
    }
    async resolve(schoolId, userId) {
        if (userId) {
            const userLocale = await this.fromUser(userId);
            if (userLocale)
                return userLocale;
        }
        if (schoolId) {
            const schoolLocale = await this.fromSchool(schoolId);
            if (schoolLocale)
                return schoolLocale;
        }
        return localization_interface_1.DEFAULT_LANGUAGE;
    }
    fromHeader(request) {
        const explicit = request?.headers?.['x-locale'];
        if (explicit && localization_interface_1.SUPPORTED_LANGUAGES.includes(explicit)) {
            return explicit;
        }
        const acceptLanguage = request?.headers?.['accept-language'];
        if (acceptLanguage) {
            const primary = String(acceptLanguage).split(',')[0]?.split('-')[0]?.trim().toLowerCase();
            if (primary && localization_interface_1.SUPPORTED_LANGUAGES.includes(primary)) {
                return primary;
            }
        }
        return null;
    }
    async fromUser(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { language: true },
            });
            if (user?.language && localization_interface_1.SUPPORTED_LANGUAGES.includes(user.language)) {
                return user.language;
            }
        }
        catch {
            this.logger.warn(`Failed to fetch language for user ${userId}`);
        }
        return null;
    }
    async fromSchool(schoolId) {
        try {
            const settings = await this.prisma.schoolSettings.findUnique({
                where: { schoolId },
                select: { defaultLanguage: true },
            });
            if (settings?.defaultLanguage && localization_interface_1.SUPPORTED_LANGUAGES.includes(settings.defaultLanguage)) {
                return settings.defaultLanguage;
            }
            const setting = await this.prisma.schoolSetting.findFirst({
                where: { schoolId, key: 'default_language' },
            });
            if (setting?.value && localization_interface_1.SUPPORTED_LANGUAGES.includes(setting.value)) {
                return setting.value;
            }
        }
        catch {
            this.logger.warn(`Failed to fetch language for school ${schoolId}`);
        }
        return null;
    }
    validateLocale(locale) {
        return localization_interface_1.SUPPORTED_LANGUAGES.includes(locale);
    }
    normalizeLocale(locale) {
        const normalized = locale.toLowerCase().trim();
        if (localization_interface_1.SUPPORTED_LANGUAGES.includes(normalized)) {
            return normalized;
        }
        if (normalized.startsWith('en'))
            return 'en';
        if (normalized.startsWith('am'))
            return 'am';
        if (normalized.startsWith('om'))
            return 'om';
        if (normalized.startsWith('so'))
            return 'so';
        if (normalized.startsWith('ar'))
            return 'ar';
        return localization_interface_1.DEFAULT_LANGUAGE;
    }
};
exports.LocaleResolver = LocaleResolver;
exports.LocaleResolver = LocaleResolver = LocaleResolver_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LocaleResolver);
//# sourceMappingURL=locale-resolver.service.js.map