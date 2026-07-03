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
exports.PlatformSettingsController = void 0;
const common_1 = require("@nestjs/common");
const platform_settings_service_1 = require("./platform-settings.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let PlatformSettingsController = class PlatformSettingsController {
    platformSettingsService;
    constructor(platformSettingsService) {
        this.platformSettingsService = platformSettingsService;
    }
    async getAllSettings() {
        try {
            return await this.platformSettingsService.getAllSettings();
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get settings: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getFeatureFlags() {
        try {
            const settings = await this.platformSettingsService.getAllSettings();
            const featureFlags = {};
            for (const [key, value] of Object.entries(settings)) {
                if (key.startsWith('FEATURE_FLAG_') || key === 'MAINTENANCE_MODE') {
                    if (typeof value === 'string') {
                        featureFlags[key] = value.toLowerCase() !== 'false';
                    }
                    else {
                        featureFlags[key] = Boolean(value);
                    }
                }
            }
            return featureFlags;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get feature flags: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getSetting(key) {
        try {
            const value = await this.platformSettingsService.getSetting(key);
            return { key, value };
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get setting: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async setSetting(key, body) {
        try {
            const setting = await this.platformSettingsService.setSetting(key, body.value);
            return setting;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to update setting: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async deleteSetting(key) {
        try {
            return await this.platformSettingsService.deleteSetting(key);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to delete setting: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async batchUpdate(settings) {
        try {
            return await this.platformSettingsService.batchUpdate(settings);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to batch update settings: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.PlatformSettingsController = PlatformSettingsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformSettingsController.prototype, "getAllSettings", null);
__decorate([
    (0, common_1.Get)('flags'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformSettingsController.prototype, "getFeatureFlags", null);
__decorate([
    (0, common_1.Get)(':key'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlatformSettingsController.prototype, "getSetting", null);
__decorate([
    (0, common_1.Put)(':key'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PlatformSettingsController.prototype, "setSetting", null);
__decorate([
    (0, common_1.Delete)(':key'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlatformSettingsController.prototype, "deleteSetting", null);
__decorate([
    (0, common_1.Post)('batch'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlatformSettingsController.prototype, "batchUpdate", null);
exports.PlatformSettingsController = PlatformSettingsController = __decorate([
    (0, common_1.Controller)('platform/settings'),
    __metadata("design:paramtypes", [platform_settings_service_1.PlatformSettingsService])
], PlatformSettingsController);
//# sourceMappingURL=platform-settings.controller.js.map